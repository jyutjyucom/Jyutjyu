import type { H3Event } from "h3";

import type { DictionaryEntry } from "../../types/dictionary.ts";
import {
  getCanonicalHeadwordsFromJson,
  getExactQueryForms,
  matchesExactQuery,
  resolveWordEntriesFromJson,
  selectCanonicalWordEntries,
  toComparableHeadwordKey,
  type ResolvedWordResult,
} from "../../utils/headword-exact-match.ts";
import {
  buildGroupedSearchResponse,
  type GroupedSearchResponse,
} from "../../utils/search-result-groups.ts";
import { buildMatchExpression } from "./cjk-tokenize.ts";
import { getD1Binding, getServerDataMode, type D1Database } from "./d1.ts";
import { findEntriesByForms } from "./d1-entries.ts";
import { getEntriesCollection } from "./mongodb.ts";
import {
  getModerationMongoFilter,
  filterRestrictedEntries,
  shouldApplyMainlandModeration,
} from "./moderation.ts";
import { getIsServerApiEnabled } from "./runtime-mode.ts";

export const RELATED_WORDS_DEFAULT_LIMIT = 12;
export const RELATED_WORDS_MAX_LIMIT = 24;

const RELATED_WORDS_CACHE_LIMIT = 256;
const RELATED_WORDS_MIN_CANDIDATE_BUDGET = 16;
const RELATED_WORDS_MAX_CANDIDATE_BUDGET = 32;
const RELATED_WORDS_API_CANDIDATE_TIMEOUT_MS = 3000;
const RELATED_WORDS_API_CANDIDATE_MULTIPLIER = 4;
const RELATED_WORDS_D1_FORM_CHUNK_SIZE = 80;
const RELATED_WORDS_D1_PREFIX_SCAN_MIN = 400;
const RELATED_WORDS_D1_PREFIX_UPPER_BOUND = "\u{10FFFF}";

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type ResolveWordEntries = (
  headword: string,
) => Promise<ResolvedWordResult | null>;

export interface StaticRelatedWordsOptions {
  query: string;
  limit?: number | string;
  event?: H3Event;
  headwords?: string[];
  resolveWordEntries?: ResolveWordEntries;
}

interface RelatedCandidate {
  headword: string;
  key: string;
  priority: number;
}

interface CachedRelatedEntries {
  entries: DictionaryEntry[];
  searchEntries: DictionaryEntry[];
  exact: boolean;
}

const relatedEntriesCache = new Map<string, CachedRelatedEntries>();

const normalizeRelatedLimit = (value: number | string | undefined): number => {
  const parsed = Number.parseInt(String(value ?? RELATED_WORDS_DEFAULT_LIMIT), 10);
  const safeLimit = Number.isFinite(parsed) ? parsed : RELATED_WORDS_DEFAULT_LIMIT;
  return Math.min(Math.max(1, safeLimit), RELATED_WORDS_MAX_LIMIT);
};

const setRelatedEntriesCache = (key: string, value: CachedRelatedEntries) => {
  if (relatedEntriesCache.size >= RELATED_WORDS_CACHE_LIMIT) {
    const firstKey = relatedEntriesCache.keys().next().value;
    if (firstKey) {
      relatedEntriesCache.delete(firstKey);
    }
  }

  relatedEntriesCache.set(key, value);
};

const getCandidateBudget = (limit: number): number => {
  return Math.min(
    RELATED_WORDS_MAX_CANDIDATE_BUDGET,
    Math.max(RELATED_WORDS_MIN_CANDIDATE_BUDGET, limit * 2),
  );
};

const getQueryKeys = async (query: string): Promise<Set<string>> => {
  const forms = await getExactQueryForms(query);
  const keys = forms.map(toComparableHeadwordKey).filter(Boolean);
  const originalKey = toComparableHeadwordKey(query);
  if (originalKey) {
    keys.unshift(originalKey);
  }

  return new Set(keys);
};

const resolveQueryVariants = async (query: string): Promise<string[]> => {
  const queryForms = (await getExactQueryForms(query))
    .map((form) => String(form || "").trim())
    .filter(Boolean);
  return Array.from(new Set([query, ...queryForms]));
};

const classifyCandidatePriority = (
  candidate: string,
  queryKeys: Set<string>,
): number | null => {
  const key = toComparableHeadwordKey(candidate);
  if (!candidate || !key || queryKeys.has(key)) {
    return null;
  }

  let priority = Number.POSITIVE_INFINITY;
  for (const queryKey of queryKeys) {
    if (key.startsWith(queryKey)) {
      priority = 0;
      break;
    }
    if (key.includes(queryKey)) {
      priority = Math.min(priority, 1);
    }
  }

  return Number.isFinite(priority) ? priority : null;
};

const sortRelatedCandidates = (
  candidates: RelatedCandidate[],
  maxCandidates: number,
): RelatedCandidate[] => {
  return candidates
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.headword.length !== b.headword.length) {
        return a.headword.length - b.headword.length;
      }
      return a.headword.localeCompare(b.headword, "zh-Hant");
    })
    .slice(0, maxCandidates);
};

const buildFormsLookupMap = async (headwords: string[]) => {
  const formsByHeadword = new Map<string, string[]>();
  const allForms = new Set<string>();

  for (const headword of headwords) {
    const forms = (await getExactQueryForms(headword))
      .map((form) => String(form || "").trim())
      .filter(Boolean);
    formsByHeadword.set(headword, forms);
    forms.forEach((form) => allForms.add(form));
  }

  return {
    formsByHeadword,
    allForms: Array.from(allForms),
  };
};

const mapEntriesToResolvedByHeadword = (
  entries: DictionaryEntry[],
  formsByHeadword: Map<string, string[]>,
): Map<string, ResolvedWordResult> => {
  const result = new Map<string, ResolvedWordResult>();

  for (const [headword, forms] of formsByHeadword) {
    const originalKey = toComparableHeadwordKey(headword);
    const queryKeys = new Set(forms.map(toComparableHeadwordKey).filter(Boolean));
    const matchingEntries = entries.filter((entry) =>
      matchesExactQuery(entry, queryKeys),
    );
    const resolved = selectCanonicalWordEntries(
      matchingEntries,
      originalKey,
      queryKeys,
    );

    if (resolved) {
      result.set(headword, resolved);
    }
  }

  return result;
};

const buildCandidateResult = async ({
  candidates,
  resolvedByHeadword,
  normalizedQuery,
  maxCandidates,
}: {
  candidates: RelatedCandidate[];
  resolvedByHeadword: Map<string, ResolvedWordResult>;
  normalizedQuery: string;
  maxCandidates: number;
}): Promise<CachedRelatedEntries> => {
  const currentResolved = resolvedByHeadword.get(normalizedQuery);
  const queryKeys = await getQueryKeys(normalizedQuery);
  const entries: DictionaryEntry[] = [];

  for (const candidate of candidates) {
    const resolved = resolvedByHeadword.get(candidate.headword);
    if (!resolved?.entries?.length) {
      continue;
    }

    const canonicalKey = toComparableHeadwordKey(resolved.canonicalHeadword);
    if (canonicalKey && queryKeys.has(canonicalKey)) {
      continue;
    }

    entries.push(...resolved.entries);
  }

  return {
    entries,
    searchEntries: [...(currentResolved?.entries || []), ...entries],
    exact: candidates.length < maxCandidates,
  };
};

export const getRelatedHeadwordCandidates = async ({
  query,
  headwords,
  maxCandidates,
}: {
  query: string;
  headwords: string[];
  maxCandidates: number;
}): Promise<RelatedCandidate[]> => {
  const queryKeys = await getQueryKeys(query);
  if (queryKeys.size === 0) return [];

  const candidates: RelatedCandidate[] = [];
  const seenKeys = new Set<string>();

  for (const headword of headwords) {
    const candidate = String(headword || "").trim();
    const key = toComparableHeadwordKey(candidate);
    if (!candidate || !key || seenKeys.has(key)) {
      continue;
    }

    const priority = classifyCandidatePriority(candidate, queryKeys);
    if (priority === null) {
      continue;
    }

    seenKeys.add(key);
    candidates.push({ headword: candidate, key, priority });
  }

  return sortRelatedCandidates(candidates, maxCandidates);
};

const getApiRelatedHeadwordCandidates = async ({
  query,
  maxCandidates,
  event,
}: {
  query: string;
  maxCandidates: number;
  event?: H3Event;
}): Promise<RelatedCandidate[]> => {
  const normalizedQuery = query.trim();
  const queryKeys = await getQueryKeys(normalizedQuery);
  if (queryKeys.size === 0) return [];

  const variants = await resolveQueryVariants(normalizedQuery);
  const collection = await getEntriesCollection();
  const candidates: RelatedCandidate[] = [];
  const seenKeys = new Set<string>();
  const stageLimit = Math.max(
    maxCandidates * RELATED_WORDS_API_CANDIDATE_MULTIPLIER,
    maxCandidates,
  );
  const mongoFilter = event ? getModerationMongoFilter(event) : {};

  const addCandidate = (headword: string, priority: number) => {
    const candidate = headword.trim();
    const key = toComparableHeadwordKey(candidate);
    if (!candidate || !key || queryKeys.has(key) || seenKeys.has(key)) return;
    seenKeys.add(key);
    candidates.push({ headword: candidate, key, priority });
  };

  const runStage = async (pattern: string, priority: number) => {
    if (candidates.length >= maxCandidates) return;

    let rows: Array<{
      headword?: { normalized?: string; display?: string };
    }>;
    try {
      rows = (await collection
        .find(
          {
            ...mongoFilter,
            $or: [
              { "headword.normalized": { $regex: pattern, $options: "i" } },
              { "headword.display": { $regex: pattern, $options: "i" } },
              { "meta.headword_variants": { $regex: pattern, $options: "i" } },
            ],
          },
          {
            projection: {
              _id: 0,
              "headword.normalized": 1,
              "headword.display": 1,
            },
            maxTimeMS: RELATED_WORDS_API_CANDIDATE_TIMEOUT_MS,
          },
        )
        .limit(stageLimit)
        .toArray()) as Array<{
        headword?: { normalized?: string; display?: string };
      }>;
    } catch (error) {
      // A stage timeout (maxTimeMS) or transient Mongo error must not
      // abort the remaining stages; degrade to fewer candidates instead.
      console.warn("[word-related-api] candidate stage failed", {
        pattern,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    rows
      .map((entry) => entry.headword?.normalized || entry.headword?.display || "")
      .filter(Boolean)
      .sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b, "zh-Hant");
      })
      .forEach((headword) => addCandidate(headword, priority));
  };

  for (const variant of variants) {
    if (candidates.length >= maxCandidates) break;
    await runStage(`^${escapeRegex(variant)}`, 0);
  }

  for (const variant of variants) {
    if (candidates.length >= maxCandidates) break;
    await runStage(escapeRegex(variant), 1);
  }

  return sortRelatedCandidates(candidates, maxCandidates);
};

const resolveEntriesFromApi = async (
  headwords: string[],
  event?: H3Event,
): Promise<Map<string, ResolvedWordResult>> => {
  const { formsByHeadword, allForms } = await buildFormsLookupMap(headwords);

  if (allForms.length === 0) {
    return new Map();
  }

  const collection = await getEntriesCollection();
  const entries = await collection
    .find<DictionaryEntry>(
      {
        ...(event ? getModerationMongoFilter(event) : {}),
        $or: [
          { "headword.normalized": { $in: allForms } },
          { "headword.display": { $in: allForms } },
          { "meta.headword_variants": { $in: allForms } },
        ],
      },
      { projection: { _id: 0 }, maxTimeMS: 8000 },
    )
    .toArray();

  return mapEntriesToResolvedByHeadword(entries, formsByHeadword);
};

const getApiRelatedEntries = async ({
  query,
  limit,
  event,
}: Required<Pick<StaticRelatedWordsOptions, "query" | "limit">> & {
  limit: number;
  event?: H3Event;
}) => {
  const normalizedQuery = query.trim();
  const maxCandidates = getCandidateBudget(limit);
  const candidates = await getApiRelatedHeadwordCandidates({
    query: normalizedQuery,
    maxCandidates,
    event,
  });
  const resolvedByHeadword = await resolveEntriesFromApi(
    [normalizedQuery, ...candidates.map((candidate) => candidate.headword)],
    event,
  );
  return buildCandidateResult({
    candidates,
    resolvedByHeadword,
    normalizedQuery,
    maxCandidates,
  });
};

const getD1RelatedHeadwordCandidates = async ({
  db,
  query,
  maxCandidates,
  isMainland,
}: {
  db: D1Database;
  query: string;
  maxCandidates: number;
  isMainland: boolean;
}): Promise<RelatedCandidate[]> => {
  const normalizedQuery = query.trim();
  const queryKeys = await getQueryKeys(normalizedQuery);
  if (queryKeys.size === 0) return [];

  const variants = await resolveQueryVariants(normalizedQuery);
  const stageLimit = Math.max(
    maxCandidates * RELATED_WORDS_API_CANDIDATE_MULTIPLIER,
    maxCandidates,
  );
  const prefixScanLimit = Math.max(
    RELATED_WORDS_D1_PREFIX_SCAN_MIN,
    stageLimit * 2,
  );
  const restrictedSql = isMainland ? "AND e.restricted = 0 " : "";

  const candidates = new Map<string, RelatedCandidate>();
  const addCandidate = (canon: string) => {
    const trimmed = canon.trim();
    const key = toComparableHeadwordKey(trimmed);
    if (!trimmed || !key || queryKeys.has(key)) return;

    const priority = classifyCandidatePriority(trimmed, queryKeys);
    if (priority === null) return;

    const existing = candidates.get(key);
    if (!existing || priority < existing.priority) {
      candidates.set(key, { headword: trimmed, key, priority });
    }
  };

  const countPrefixCandidates = () => {
    let count = 0;
    for (const candidate of candidates.values()) {
      if (candidate.priority === 0) count += 1;
    }
    return count;
  };

  const prefixVariants = Array.from(
    new Set(
      variants
        .map((variant) => toComparableHeadwordKey(variant))
        .filter(Boolean),
    ),
  );

  for (const prefixKey of prefixVariants) {
    if (countPrefixCandidates() >= maxCandidates) break;

    const sql =
      "SELECT canon FROM (" +
      "SELECT DISTINCT e.canon AS canon, length(f.key) AS key_len " +
      "FROM entry_forms f JOIN entries e ON e.id = f.entry_id " +
      "WHERE f.key > ?1 AND f.key < ?2 " +
      restrictedSql +
      "LIMIT ?3" +
      ") ORDER BY key_len, canon LIMIT ?4";

    const { results } = await db
      .prepare(sql)
      .bind(
        prefixKey,
        prefixKey + RELATED_WORDS_D1_PREFIX_UPPER_BOUND,
        prefixScanLimit,
        stageLimit,
      )
      .all<{ canon?: string | null }>();

    for (const row of results) {
      if (row.canon) addCandidate(row.canon);
    }
  }

  if (countPrefixCandidates() < maxCandidates) {
    const ftsExpressions = variants
      .map((variant) => buildMatchExpression(variant, "{hw vars}", "AND"))
      .filter((expression): expression is string => Boolean(expression))
      .map((expression) => "(" + expression + ")");

    if (ftsExpressions.length > 0) {
      const ftsLimit = Math.max(120, stageLimit * 2);
      const sql =
        "SELECT e.canon, bm25(entry_fts, 10, 9, 6, 4, 1) AS score " +
        "FROM entry_fts JOIN entries e ON e.id = entry_fts.rowid " +
        "WHERE entry_fts MATCH ?1 " +
        restrictedSql +
        "ORDER BY score LIMIT ?2";

      const { results } = await db
        .prepare(sql)
        .bind(ftsExpressions.join(" OR "), ftsLimit)
        .all<{ canon?: string | null }>();

      for (const row of results) {
        if (row.canon) addCandidate(row.canon);
      }
    }
  }

  return sortRelatedCandidates(Array.from(candidates.values()), maxCandidates);
};

const resolveEntriesFromD1 = async (
  db: D1Database,
  headwords: string[],
): Promise<Map<string, ResolvedWordResult>> => {
  const { formsByHeadword, allForms } = await buildFormsLookupMap(headwords);
  if (allForms.length === 0) {
    return new Map();
  }

  const formChunks: string[][] = [];
  for (let i = 0; i < allForms.length; i += RELATED_WORDS_D1_FORM_CHUNK_SIZE) {
    formChunks.push(allForms.slice(i, i + RELATED_WORDS_D1_FORM_CHUNK_SIZE));
  }

  const chunkResults = await Promise.all(
    formChunks.map((chunk) => findEntriesByForms(db, chunk, 500)),
  );
  const entriesById = new Map<string, DictionaryEntry>();
  for (const entries of chunkResults) {
    for (const entry of entries) {
      if (entry?.id && !entriesById.has(entry.id)) {
        entriesById.set(entry.id, entry);
      }
    }
  }

  return mapEntriesToResolvedByHeadword(
    Array.from(entriesById.values()),
    formsByHeadword,
  );
};

const getD1RelatedEntries = async ({
  db,
  query,
  limit,
  event,
}: Required<Pick<StaticRelatedWordsOptions, "query" | "limit">> & {
  db: D1Database;
  limit: number;
  event?: H3Event;
}): Promise<CachedRelatedEntries> => {
  const normalizedQuery = query.trim();
  const isMainland = event ? shouldApplyMainlandModeration(event) : false;
  const cacheKey = `d1:${isMainland ? "cn" : "all"}:${normalizedQuery}||${limit}`;
  const cached = relatedEntriesCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const maxCandidates = getCandidateBudget(limit);
  const candidates = await getD1RelatedHeadwordCandidates({
    db,
    query: normalizedQuery,
    maxCandidates,
    isMainland,
  });
  const resolvedByHeadword = await resolveEntriesFromD1(db, [
    normalizedQuery,
    ...candidates.map((candidate) => candidate.headword),
  ]);
  const result = await buildCandidateResult({
    candidates,
    resolvedByHeadword,
    normalizedQuery,
    maxCandidates,
  });

  setRelatedEntriesCache(cacheKey, result);
  return result;
};

const getStaticRelatedEntries = async ({
  query,
  limit,
  headwords,
  resolveWordEntries,
}: Required<Pick<StaticRelatedWordsOptions, "query" | "limit">> &
  Pick<StaticRelatedWordsOptions, "headwords" | "resolveWordEntries"> & {
    limit: number;
  }) => {
  const normalizedQuery = query.trim();
  const cacheKey = `${normalizedQuery}||${limit}`;
  const cached = relatedEntriesCache.get(cacheKey);
  if (cached && !headwords && !resolveWordEntries) {
    return cached;
  }

  const allHeadwords = headwords ?? (await getCanonicalHeadwordsFromJson());
  const resolver = resolveWordEntries ?? resolveWordEntriesFromJson;
  const maxCandidates = getCandidateBudget(limit);
  const currentResolved = await resolver(normalizedQuery);
  const candidates = await getRelatedHeadwordCandidates({
    query: normalizedQuery,
    headwords: allHeadwords,
    maxCandidates,
  });
  const queryKeys = await getQueryKeys(normalizedQuery);
  const entries: DictionaryEntry[] = [];

  for (const candidate of candidates) {
    const resolved = await resolver(candidate.headword);
    if (!resolved?.entries?.length) {
      continue;
    }

    const canonicalKey = toComparableHeadwordKey(resolved.canonicalHeadword);
    if (canonicalKey && queryKeys.has(canonicalKey)) {
      continue;
    }

    entries.push(...resolved.entries);
  }

  const result = {
    entries,
    searchEntries: [...(currentResolved?.entries || []), ...entries],
    exact: candidates.length < maxCandidates,
  };

  if (!headwords && !resolveWordEntries) {
    setRelatedEntriesCache(cacheKey, result);
  }

  return result;
};

export const buildStaticRelatedWordsResponse = async ({
  query,
  limit = RELATED_WORDS_DEFAULT_LIMIT,
  event,
  headwords,
  resolveWordEntries,
}: StaticRelatedWordsOptions): Promise<GroupedSearchResponse> => {
  const normalizedLimit = normalizeRelatedLimit(limit);
  const normalizedQuery = String(query || "").trim();

  if (!normalizedQuery) {
    return buildGroupedSearchResponse({
      query: "",
      entries: [],
      limit: normalizedLimit,
    });
  }

  try {
    const shouldUseCustomStatic = Boolean(headwords || resolveWordEntries);
    const d1Context = event as Parameters<typeof getD1Binding>[0];
    const dataMode = shouldUseCustomStatic ? "json" : getServerDataMode(d1Context);
    const d1Db = dataMode === "d1" ? getD1Binding(d1Context) : null;
    const relatedEntries =
      dataMode === "d1" && d1Db
        ? await getD1RelatedEntries({
            db: d1Db,
            query: normalizedQuery,
            limit: normalizedLimit,
            event,
          })
        : dataMode === "mongo" ||
            (!shouldUseCustomStatic && getIsServerApiEnabled())
          ? await getApiRelatedEntries({
              query: normalizedQuery,
              limit: normalizedLimit,
              event,
            })
          : await getStaticRelatedEntries({
              query: normalizedQuery,
              limit: normalizedLimit,
              headwords,
              resolveWordEntries,
            });
    const { entries, searchEntries, exact } = relatedEntries;
    const getVisibleEntries = (items: DictionaryEntry[]) =>
      event
        ? filterRestrictedEntries(event, items)
        : items.map((entry) => {
            const { moderation: _moderation, ...cleanEntry } = entry as any;
            return cleanEntry as DictionaryEntry;
          });
    const visibleEntries = getVisibleEntries(entries);
    const visibleSearchEntries = getVisibleEntries(searchEntries);
    const response = buildGroupedSearchResponse({
      query: normalizedQuery,
      entries: visibleEntries as DictionaryEntry[],
      limit: normalizedLimit,
      exact,
    });
    const searchResponse = buildGroupedSearchResponse({
      query: normalizedQuery,
      entries: visibleSearchEntries as DictionaryEntry[],
      limit: normalizedLimit,
      exact,
    });

    return {
      ...response,
      searchTotal: searchResponse.total,
    };
  } catch (error) {
    console.warn("[word-related-api] static lookup failed", {
      query: normalizedQuery,
      error: error instanceof Error ? error.message : String(error),
    });

    return buildGroupedSearchResponse({
      query: normalizedQuery,
      entries: [],
      limit: normalizedLimit,
    });
  }
};

export const resetRelatedWordsRuntimeStateForTests = () => {
  relatedEntriesCache.clear();
};

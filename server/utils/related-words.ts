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
import { getEntriesCollection } from "./mongodb.ts";
import { getModerationMongoFilter, filterRestrictedEntries } from "./moderation.ts";
import { getIsServerApiEnabled } from "./runtime-mode.ts";

export const RELATED_WORDS_DEFAULT_LIMIT = 12;
export const RELATED_WORDS_MAX_LIMIT = 24;

const RELATED_WORDS_CACHE_LIMIT = 256;
const RELATED_WORDS_MIN_CANDIDATE_BUDGET = 16;
const RELATED_WORDS_MAX_CANDIDATE_BUDGET = 32;
const RELATED_WORDS_API_CANDIDATE_TIMEOUT_MS = 3000;
const RELATED_WORDS_API_CANDIDATE_MULTIPLIER = 4;

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
    if (!candidate || !key || queryKeys.has(key) || seenKeys.has(key)) {
      continue;
    }

    let priority = Number.POSITIVE_INFINITY;
    for (const queryKey of queryKeys) {
      if (key.startsWith(queryKey)) {
        priority = Math.min(priority, 0);
      } else if (key.includes(queryKey)) {
        priority = Math.min(priority, 1);
      }
    }

    if (!Number.isFinite(priority)) {
      continue;
    }

    seenKeys.add(key);
    candidates.push({ headword: candidate, key, priority });
  }

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

  const queryForms = (await getExactQueryForms(normalizedQuery))
    .map((form) => String(form || "").trim())
    .filter(Boolean);
  const variants = Array.from(new Set([normalizedQuery, ...queryForms]));
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

    const rows = (await collection
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

const resolveEntriesFromApi = async (
  headwords: string[],
  event?: H3Event,
): Promise<Map<string, ResolvedWordResult>> => {
  const formsByHeadword = new Map<string, string[]>();
  const allForms = new Set<string>();

  for (const headword of headwords) {
    const forms = (await getExactQueryForms(headword))
      .map((form) => String(form || "").trim())
      .filter(Boolean);
    formsByHeadword.set(headword, forms);
    forms.forEach((form) => allForms.add(form));
  }

  if (allForms.size === 0) {
    return new Map();
  }

  const collection = await getEntriesCollection();
  const entries = await collection
    .find<DictionaryEntry>(
      {
        ...(event ? getModerationMongoFilter(event) : {}),
        $or: [
          { "headword.normalized": { $in: Array.from(allForms) } },
          { "headword.display": { $in: Array.from(allForms) } },
          { "meta.headword_variants": { $in: Array.from(allForms) } },
        ],
      },
      { projection: { _id: 0 }, maxTimeMS: 8000 },
    )
    .toArray();

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
    const relatedEntries = getIsServerApiEnabled()
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

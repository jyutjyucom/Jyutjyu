import type { H3Event } from "h3";

import type { DictionaryEntry } from "../../types/dictionary.ts";
import {
  getCanonicalHeadwordsFromJson,
  getExactQueryForms,
  resolveWordEntriesFromJson,
  toComparableHeadwordKey,
  type ResolvedWordResult,
} from "../../utils/headword-exact-match.ts";
import {
  buildGroupedSearchResponse,
  type GroupedSearchResponse,
} from "../../utils/search-result-groups.ts";
import { filterRestrictedEntries } from "./moderation.ts";

export const RELATED_WORDS_DEFAULT_LIMIT = 12;
export const RELATED_WORDS_MAX_LIMIT = 24;

const RELATED_WORDS_CACHE_LIMIT = 256;
const RELATED_WORDS_MIN_CANDIDATE_BUDGET = 16;
const RELATED_WORDS_MAX_CANDIDATE_BUDGET = 32;

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
    const { entries, exact } = await getStaticRelatedEntries({
      query: normalizedQuery,
      limit: normalizedLimit,
      headwords,
      resolveWordEntries,
    });
    const visibleEntries = event
      ? filterRestrictedEntries(event, entries)
      : entries.map((entry) => {
          const { moderation: _moderation, ...cleanEntry } = entry as any;
          return cleanEntry as DictionaryEntry;
        });

    return buildGroupedSearchResponse({
      query: normalizedQuery,
      entries: visibleEntries as DictionaryEntry[],
      limit: normalizedLimit,
      exact,
    });
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

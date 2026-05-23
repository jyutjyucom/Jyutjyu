/**
 * 词典搜索 API
 *
 * GET /api/search?q=查询词&limit=100&offset=0&dict=词典ID&mode=normal|reverse
 *
 * 参数:
 *   q     - 搜索查询词（必填）
 *   limit - 返回分组结果数量限制（默认 100，最大 200）
 *   offset - 分组结果分页偏移量（默认 0）
 *   dict  - 词典 ID 筛选（可选）
 *   dialect - 方言点筛选（可选）
 *   type  - 词条类型筛选（可选）
 *   sort  - 排序: relevance | jyutping | headword | dictionary
 *   mode  - 搜索模式: normal(正常) | reverse(反查释义)
 *
 * 搜索逻辑（与前端保持一致）:
 *   正常模式优先级:
 *     1. 词头精确匹配 (priority 100)
 *     2. 词头前缀匹配 (priority 90)
 *     3. 词头包含匹配 (priority 80)
 *     4. 粤拼精确匹配 (priority 70)
 *     5. 粤拼包含匹配 (priority 60)
 *     6. 关键词匹配 (priority 50)
 *   反查模式:
 *     - 释义精确匹配 (priority 100)
 *     - 释义包含匹配 (priority 80)
 */

import { getEntriesCollection } from "../utils/mongodb.ts";
import {
  filterRestrictedEntries,
  getModerationMongoFilter,
  queryTouchesRestrictedTerm,
  setModerationCacheHeaders,
  shouldApplyMainlandModeration,
} from "../utils/moderation.ts";
import {
  ensureInitialized,
  getQueryVariants,
} from "../utils/opencc.ts";
import {
  buildGroupedSearchResponse,
  buildSearchPageMeta,
  aggregateSearchEntries,
  countSearchGroupFacets,
  createEmptySearchFacetCounts,
  flattenSearchGroups,
  SEARCH_API_MAX_PAGE_SIZE,
  SEARCH_API_PAGE_SIZE,
  type AggregatedSearchEntry,
  type GroupedSearchResponse,
  type SearchResponseFilters,
  type SearchSortOption,
} from "../../utils/search-result-groups.ts";
import { resolveWordEntriesFromJson } from "../../utils/headword-exact-match.ts";
import { isJyutpingQuery as isValidatedJyutpingQuery } from "../../utils/query-classify.ts";
import type { EntryType } from "../../types/dictionary.ts";
import { getIsServerApiEnabled } from "../utils/runtime-mode.ts";

export interface SearchQuery {
  q?: string;
  limit?: string;
  offset?: string;
  dict?: string;
  dialect?: string;
  type?: EntryType;
  sort?: SearchSortOption;
  mode?: "normal" | "reverse";
}

export type SearchMode = "normal" | "reverse";
type SearchStrategy = "atlas" | "fallback" | "exact_asset";
type AtlasSearchAvailability = "unknown" | "available" | "unavailable";

interface SearchMetrics {
  queryHash: string;
  querySample: string;
  mode: SearchMode;
  limit: number;
  offset: number;
  strategy: SearchStrategy;
  phaseMs: Record<string, number>;
  stageMs: Record<string, number>;
  degradedReason?: string;
  resultCount?: number;
  totalMs?: number;
}

interface SearchStage {
  name:
    | "exact_headword"
    | "prefix_headword"
    | "contains_headword"
    | "exact_jyutping"
    | "contains_jyutping"
    | "keyword_contains"
    | "exact_definition"
    | "contains_definition";
  priority: number;
  condition: Record<string, unknown> | null;
}

interface FallbackSearchOptions {
  queryVariants?: string[];
  stageTimings?: Record<string, number>;
  mongoFilter?: Record<string, unknown>;
}

interface SearchFilterOptions {
  dict?: string;
  dialect?: string;
  type?: EntryType;
}

interface ScoredEntry {
  entry: any;
  priority: number;
  secondaryScore: number;
}

const ATLAS_SEARCH_TIMEOUT_MS = 3500;
const FALLBACK_SEARCH_TIMEOUT_MS = 20000;
const SEARCH_HANDLER_TIMEOUT_MS = 30000;
const SLOW_SEARCH_THRESHOLD_MS = 3000;
const QUERY_VARIANT_CACHE_LIMIT = 128;
const FALLBACK_SCAN_LIMIT = 2000;
const FALLBACK_STAGE_OVERSCAN = 20;
const FALLBACK_STAGE_MIN_FETCH = 5;
const FALLBACK_STAGE_TIMEOUT_MAX_MS = 10000;
const ATLAS_GROUPED_CANDIDATE_MIN_LIMIT = 80;
const ATLAS_GROUPED_CANDIDATE_MAX_LIMIT = 800;

let atlasSearchAvailability: AtlasSearchAvailability = "unknown";
const queryVariantsCache = new Map<string, string[]>();

export class SearchTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchTimeoutError";
  }
}

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new SearchTimeoutError(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const isSearchTimeoutError = (error: unknown): boolean => {
  return error instanceof SearchTimeoutError;
};

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildRegexPattern = (values: string[]): string | null => {
  const uniqueValues = Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
  );
  if (uniqueValues.length === 0) {
    return null;
  }

  uniqueValues.sort((a, b) => b.length - a.length);
  return uniqueValues.map((value) => escapeRegex(value)).join("|");
};

const buildFieldRegexOrCondition = (
  fields: string[],
  pattern: string | null,
  prefix: boolean = false,
): Record<string, unknown> | null => {
  if (!pattern) {
    return null;
  }

  const regex = prefix ? `^(?:${pattern})` : `(?:${pattern})`;
  return {
    $or: fields.map((field) => ({
      [field]: { $regex: regex, $options: "i" },
    })),
  };
};

const getStageFetchLimit = (remaining: number): number => {
  return Math.max(
    FALLBACK_STAGE_MIN_FETCH,
    remaining + Math.min(FALLBACK_STAGE_OVERSCAN, Math.max(remaining, 5)),
  );
};

export const getFallbackStageTimeoutMs = (remainingBudgetMs: number): number => {
  return Math.max(
    250,
    Math.min(FALLBACK_STAGE_TIMEOUT_MAX_MS, remainingBudgetMs - 25),
  );
};

const measureAsync = async <T>(
  bucket: Record<string, number>,
  key: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const startedAt = Date.now();
  try {
    return await fn();
  } finally {
    bucket[key] = Date.now() - startedAt;
  }
};

const hashSearchQuery = (value: string): string => {
  const bytes = new TextEncoder().encode(String(value || ""));
  let hash = 0x811c9dc5;

  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
};

const getSearchQuerySample = (query: string): string => {
  const trimmed = String(query || "").trim();
  return trimmed.length > 24 ? `${trimmed.slice(0, 24)}…` : trimmed;
};

const logSlowSearch = (
  label: string,
  metrics: SearchMetrics,
  extra: Record<string, unknown> = {},
) => {
  console.warn(label, {
    queryHash: metrics.queryHash,
    querySample: metrics.querySample,
    mode: metrics.mode,
    limit: metrics.limit,
    offset: metrics.offset,
    strategy: metrics.strategy,
    totalMs: metrics.totalMs,
    resultCount: metrics.resultCount,
    degradedReason: metrics.degradedReason,
    phaseMs: metrics.phaseMs,
    stageMs:
      Object.keys(metrics.stageMs).length > 0 ? metrics.stageMs : undefined,
    ...extra,
  });
};

const logSearchFailure = (
  label: string,
  metrics: SearchMetrics,
  error: unknown,
) => {
  console.error(label, {
    queryHash: metrics.queryHash,
    querySample: metrics.querySample,
    mode: metrics.mode,
    limit: metrics.limit,
    offset: metrics.offset,
    strategy: metrics.strategy,
    totalMs: metrics.totalMs,
    degradedReason: metrics.degradedReason,
    phaseMs: metrics.phaseMs,
    stageMs:
      Object.keys(metrics.stageMs).length > 0 ? metrics.stageMs : undefined,
    error: error instanceof Error ? error.message : String(error),
  });
};

const markAtlasSearchAvailable = () => {
  atlasSearchAvailability = "available";
};

const markAtlasSearchUnavailable = () => {
  atlasSearchAvailability = "unavailable";
};

const getAtlasSearchAvailability = (): AtlasSearchAvailability => {
  return atlasSearchAvailability;
};

const isAtlasUnsupportedError = (error: unknown): boolean => {
  const message = String(
    (error as { message?: string } | null)?.message || error || "",
  );

  return [
    /search index/i,
    /no search index/i,
    /index .* not found/i,
    /unrecognized pipeline stage name:\s*['"]?\$search/i,
    /unknown pipeline stage/i,
  ].some((pattern) => pattern.test(message));
};

const trimVariantCache = () => {
  while (queryVariantsCache.size > QUERY_VARIANT_CACHE_LIMIT) {
    const oldestKey = queryVariantsCache.keys().next().value;
    if (!oldestKey) break;
    queryVariantsCache.delete(oldestKey);
  }
};

export const getCachedQueryVariants = async (query: string): Promise<string[]> => {
  const cacheKey = String(query || "").trim();
  if (!cacheKey) {
    return [];
  }

  const cached = queryVariantsCache.get(cacheKey);
  if (cached) {
    queryVariantsCache.delete(cacheKey);
    queryVariantsCache.set(cacheKey, cached);
    return cached;
  }

  const variants = await getQueryVariants(cacheKey);
  queryVariantsCache.set(cacheKey, variants);
  trimVariantCache();
  return variants;
};

export const shouldAttemptAtlasSearch = ({
  mode,
  hasSymbolCharacters,
  isJyutpingQuery = false,
  atlasAvailabilityState = getAtlasSearchAvailability(),
}: {
  mode: SearchMode;
  hasSymbolCharacters: boolean;
  isJyutpingQuery?: boolean;
  atlasAvailabilityState?: AtlasSearchAvailability;
}): boolean => {
  return (
    (mode === "normal" || mode === "reverse") &&
    !hasSymbolCharacters &&
    !isJyutpingQuery &&
    atlasAvailabilityState !== "unavailable"
  );
};

export const normalizeSearchResultLimit = (value: string | number | undefined): number => {
  const parsed = Number.parseInt(String(value ?? SEARCH_API_PAGE_SIZE), 10);
  const safeLimit = Number.isFinite(parsed) ? parsed : SEARCH_API_PAGE_SIZE;
  return Math.min(Math.max(1, safeLimit), SEARCH_API_MAX_PAGE_SIZE);
};

export const normalizeSearchResultOffset = (
  value: string | number | undefined,
): number => {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  const safeOffset = Number.isFinite(parsed) ? parsed : 0;
  return Math.max(0, safeOffset);
};

const normalizeSearchSort = (value: unknown): SearchSortOption => {
  if (
    value === "jyutping" ||
    value === "headword" ||
    value === "dictionary"
  ) {
    return value;
  }
  return "relevance";
};

const normalizeEntryType = (value: unknown): EntryType | undefined => {
  if (value === "character" || value === "word" || value === "phrase") {
    return value;
  }
  return undefined;
};

const normalizeFilterValue = (value: unknown): string | undefined => {
  const normalized = String(value || "").trim();
  return normalized || undefined;
};

export const shouldFailFastAfterAtlasDegrade = (event: any): boolean => {
  const failFast = String(
    process.env.SEARCH_FAIL_FAST_ON_ATLAS_DEGRADE || "",
  )
    .trim()
    .toLowerCase();
  if (failFast !== "true") {
    return false;
  }

  const isProduction =
    String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";

  return isProduction && Boolean(event?.context?.cloudflare);
};

const calculateSecondaryScore = (entry: any, queryLower: string): number => {
  let score = 0;

  const headwordLength = entry.headword?.display?.length || 0;
  if (headwordLength === queryLower.length) {
    score += 30;
  } else {
    const lengthDiff = Math.abs(headwordLength - queryLower.length);
    score += Math.max(0, 30 - lengthDiff * 3);
  }

  if (entry.senses && entry.senses.length > 0) {
    const firstSense = entry.senses[0];
    const definitionLength = firstSense.definition?.length || 0;

    if (definitionLength > 50) score += 20;
    else if (definitionLength > 20) score += 15;
    else if (definitionLength > 0) score += 10;

    if (firstSense.examples && firstSense.examples.length > 0) {
      score += 5;
    }
  }

  if (entry.source_book === "广州话俗语词典") score += 8;
  else if (entry.source_book === "实用广州话分类词典") score += 10;
  else if (entry.source_book?.includes("粵典")) score += 4;

  return score;
};

const sortScoredEntries = (results: ScoredEntry[]): ScoredEntry[] => {
  return results.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    if (a.secondaryScore !== b.secondaryScore) {
      return b.secondaryScore - a.secondaryScore;
    }
    return a.entry.id.localeCompare(b.entry.id);
  });
};

const buildNormalFallbackStages = (
  queryVariants: string[],
  queryLower: string,
): SearchStage[] => {
  const headwordPattern = buildRegexPattern(queryVariants);
  const keywordPattern = buildRegexPattern(queryVariants);
  const jyutpingPattern = buildRegexPattern([queryLower]);

  return [
    {
      name: "exact_headword",
      priority: 100,
      condition:
        queryVariants.length > 0
          ? {
              $or: [
                { "headword.normalized": { $in: queryVariants } },
                { "headword.display": { $in: queryVariants } },
              ],
            }
          : null,
    },
    {
      name: "prefix_headword",
      priority: 90,
      condition: buildFieldRegexOrCondition(
        ["headword.normalized", "headword.display"],
        headwordPattern,
        true,
      ),
    },
    {
      name: "contains_headword",
      priority: 80,
      condition: buildFieldRegexOrCondition(
        ["headword.normalized", "headword.display"],
        headwordPattern,
      ),
    },
    {
      name: "exact_jyutping",
      priority: 70,
      condition: queryLower
        ? {
            "phonetic.jyutping": { $in: [queryLower] },
          }
        : null,
    },
    {
      name: "contains_jyutping",
      priority: 60,
      condition: jyutpingPattern
        ? {
            "phonetic.jyutping": {
              $regex: `(?:${jyutpingPattern})`,
              $options: "i",
            },
          }
        : null,
    },
    {
      name: "keyword_contains",
      priority: 50,
      condition: keywordPattern
        ? {
            keywords: { $regex: `(?:${keywordPattern})`, $options: "i" },
          }
        : null,
    },
  ];
};

const buildReverseFallbackStages = (queryVariants: string[]): SearchStage[] => {
  const definitionPattern = buildRegexPattern(queryVariants);

  return [
    {
      name: "exact_definition",
      priority: 100,
      condition:
        queryVariants.length > 0
          ? {
              "senses.definition": { $in: queryVariants },
            }
          : null,
    },
    {
      name: "contains_definition",
      priority: 80,
      condition: definitionPattern
        ? {
            "senses.definition": {
              $regex: `(?:${definitionPattern})`,
              $options: "i",
            },
          }
        : null,
    },
  ];
};

const buildFallbackStages = (
  queryVariants: string[],
  queryLower: string,
  mode: SearchMode,
): SearchStage[] => {
  if (mode === "normal" && isValidatedJyutpingQuery(queryLower)) {
    const jyutpingPattern = buildRegexPattern([queryLower]);
    return [
      {
        name: "exact_jyutping",
        priority: 70,
        condition: {
          "phonetic.jyutping": { $in: [queryLower] },
        },
      },
      {
        name: "contains_jyutping",
        priority: 60,
        condition: jyutpingPattern
          ? {
              "phonetic.jyutping": {
                $regex: `(?:${jyutpingPattern})`,
                $options: "i",
              },
            }
          : null,
      },
    ];
  }

  return mode === "reverse"
    ? buildReverseFallbackStages(queryVariants)
    : buildNormalFallbackStages(queryVariants, queryLower);
};

const stripMongoId = (entry: any) => {
  const { _id, ...rest } = entry;
  return rest;
};

const omitSearchFilter = (
  filters: SearchFilterOptions,
  filterKey: keyof SearchFilterOptions,
): SearchFilterOptions => {
  const next = { ...filters };
  delete next[filterKey];
  return next;
};

const buildSearchMongoFilter = (
  filters: SearchFilterOptions,
  moderationMongoFilter: Record<string, unknown> = {},
): Record<string, unknown> => {
  const mongoFilter: Record<string, unknown> = {
    ...moderationMongoFilter,
  };

  if (filters.dict) {
    mongoFilter.source_book = filters.dict;
  }

  if (filters.dialect) {
    mongoFilter["dialect.region_code"] = {
      $regex: `^${escapeRegex(filters.dialect)}$`,
      $options: "i",
    };
  }

  if (filters.type) {
    mongoFilter.entry_type = filters.type;
  }

  return mongoFilter;
};

const entryMatchesSearchFilters = (
  entry: any,
  filters: SearchFilterOptions,
): boolean => {
  if (filters.dict && entry.source_book !== filters.dict) {
    return false;
  }

  if (
    filters.dialect &&
    String(entry.dialect?.region_code || "").toUpperCase() !==
      filters.dialect.toUpperCase()
  ) {
    return false;
  }

  if (filters.type && entry.entry_type !== filters.type) {
    return false;
  }

  return true;
};

const buildExactAssetSearchResponse = async ({
  query,
  mode,
  sort,
  filters,
  offset,
  limit,
}: {
  query: string;
  mode: SearchMode;
  sort: SearchSortOption;
  filters: SearchFilterOptions;
  offset: number;
  limit: number;
}): Promise<GroupedSearchResponse | null> => {
  if (getIsServerApiEnabled() || mode !== "normal") {
    return null;
  }

  const resolved = await resolveWordEntriesFromJson(query);
  const entries = (resolved?.entries || []).filter((entry) =>
    entryMatchesSearchFilters(entry, filters),
  );

  if (entries.length === 0) {
    return null;
  }

  return buildGroupedSearchResponse({
    query,
    mode,
    sort,
    filters: getPublicFilters(filters),
    entries,
    offset,
    limit,
    // This is an emergency exact-headword rescue, not the full fuzzy universe.
    exact: false,
  });
};


const getPublicFilters = (
  filters: SearchFilterOptions,
): SearchResponseFilters => ({
  ...(filters.dict ? { dict: filters.dict } : {}),
  ...(filters.dialect ? { dialect: filters.dialect.toUpperCase() } : {}),
  ...(filters.type ? { type: filters.type } : {}),
});

const buildFacetOptionsFromEntries = async ({
  searchEntries,
  filters,
  getEntries,
}: {
  searchEntries: any[];
  filters: SearchFilterOptions;
  getEntries: (filters: SearchFilterOptions) => Promise<any[]>;
}) => {
  const countFacets = (entries: any[]) =>
    countSearchGroupFacets(aggregateSearchEntries(entries));

  if (!filters.dict && !filters.dialect && !filters.type) {
    return countFacets(searchEntries);
  }

  const [dictionaryEntries, dialectEntries, typeEntries] = await Promise.all([
    getEntries(omitSearchFilter(filters, "dict")),
    getEntries(omitSearchFilter(filters, "dialect")),
    getEntries(omitSearchFilter(filters, "type")),
  ]);

  return {
    dictionaries: countFacets(dictionaryEntries).dictionaries,
    dialects: countFacets(dialectEntries).dialects,
    types: countFacets(typeEntries).types,
  };
};

const buildEmptySearchResponse = ({
  query,
  mode,
  sort = "relevance",
  filters = {},
  offset = 0,
  limit = SEARCH_API_PAGE_SIZE,
  success = true,
  error,
}: {
  query: string;
  mode: SearchMode;
  sort?: SearchSortOption;
  filters?: SearchResponseFilters;
  offset?: number;
  limit?: number;
  success?: boolean;
  error?: string;
}): GroupedSearchResponse => ({
  success,
  query,
  mode,
  sort,
  filters,
  groups: [],
  results: [],
  total: {
    grouped: 0,
    entries: 0,
    exact: true,
  },
  totalGrouped: 0,
  page: buildSearchPageMeta({
    totalGrouped: 0,
    offset,
    limit,
    returned: 0,
  }),
  facets: createEmptySearchFacetCounts(),
  ...(error ? { error } : {}),
});

const buildAtlasSearchStage = (
  query: string,
  mode: SearchMode,
  queryVariants: string[],
) => {
  const searchStage: any = {
    index: "default",
    compound: {
      should: [],
    },
  };

  if (mode === "reverse") {
    for (const variant of queryVariants) {
      searchStage.compound.should.push({
        text: {
          query: variant,
          path: "senses.definition",
          score: { boost: { value: 5 } },
        },
      });
    }
  } else {
    for (const variant of queryVariants) {
      searchStage.compound.should.push(
        {
          text: {
            query: variant,
            path: "headword.normalized",
            score: { boost: { value: 10 } },
          },
        },
        {
          text: {
            query: variant,
            path: "headword.display",
            score: { boost: { value: 8 } },
          },
        },
      );
    }

    searchStage.compound.should.push({
      text: {
        query: query.toLowerCase(),
        path: "phonetic.jyutping",
        score: { boost: { value: 6 } },
      },
    });

    for (const variant of queryVariants) {
      searchStage.compound.should.push({
        text: {
          query: variant,
          path: "keywords",
          score: { boost: { value: 4 } },
        },
      });
    }
  }

  return searchStage;
};

export async function atlasSearch(
  collection: any,
  query: string,
  limit: number,
  dict?: string,
  mode: SearchMode = "normal",
  queryVariants?: string[],
  mongoFilter: Record<string, unknown> = {},
): Promise<any[]> {
  const resolvedVariants = queryVariants ?? (await getCachedQueryVariants(query));
  const searchStage = buildAtlasSearchStage(query, mode, resolvedVariants);

  const pipeline: any[] = [{ $search: searchStage }];
  const matchStage: Record<string, unknown> = { ...mongoFilter };

  if (dict) {
    matchStage.source_book = dict;
  }

  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push(
    { $limit: limit },
    {
      $addFields: {
        _score: { $meta: "searchScore" },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  );

  return await withTimeout(
    collection
      .aggregate(pipeline, { maxTimeMS: ATLAS_SEARCH_TIMEOUT_MS })
      .toArray(),
    ATLAS_SEARCH_TIMEOUT_MS + 250,
    `Atlas Search timed out after ${ATLAS_SEARCH_TIMEOUT_MS}ms`,
  );
}

export async function atlasGroupedSearch(
  collection: any,
  query: string,
  {
    limit,
    offset,
    mode = "normal",
    sort = "relevance",
    queryVariants,
    filters = {},
    mongoFilter = {},
  }: {
    limit: number;
    offset: number;
    mode?: SearchMode;
    sort?: SearchSortOption;
    queryVariants?: string[];
    filters?: SearchFilterOptions;
    mongoFilter?: Record<string, unknown>;
  },
): Promise<GroupedSearchResponse> {
  const requestedWindow = offset + limit;
  const candidateLimit = Math.min(
    ATLAS_GROUPED_CANDIDATE_MAX_LIMIT,
    Math.max(ATLAS_GROUPED_CANDIDATE_MIN_LIMIT, requestedWindow * 4),
  );
  const fetchEntries = async (nextFilters: SearchFilterOptions) =>
    atlasSearch(
      collection,
      query,
      candidateLimit + 1,
      undefined,
      mode,
      queryVariants,
      buildSearchMongoFilter(nextFilters, mongoFilter),
    );
  const entries = await fetchEntries(filters);
  const exact = entries.length <= candidateLimit;
  const responseEntries = exact ? entries : entries.slice(0, candidateLimit);
  const facetOptions =
    offset === 0
      ? await buildFacetOptionsFromEntries({
          searchEntries: responseEntries,
          filters,
          getEntries: async (nextFilters) => {
            const siblingEntries = await fetchEntries(nextFilters);
            return siblingEntries.length <= candidateLimit
              ? siblingEntries
              : siblingEntries.slice(0, candidateLimit);
          },
        })
      : undefined;

  return buildGroupedSearchResponse({
    query,
    mode,
    sort,
    filters: getPublicFilters(filters),
    entries: responseEntries,
    offset,
    limit,
    exact,
    facetOptions,
  });
}

export async function fallbackSearch(
  collection: any,
  query: string,
  limit: number,
  dict?: string,
  mode: SearchMode = "normal",
  options: FallbackSearchOptions = {},
) {
  const queryVariants =
    options.queryVariants ?? (await getCachedQueryVariants(query));
  const queryLower = query.toLowerCase();
  const stageTimings = options.stageTimings || {};
  const stages = buildFallbackStages(queryVariants, queryLower, mode);

  const baseFilter: Record<string, unknown> = {
    ...(options.mongoFilter || {}),
  };
  if (dict) {
    baseFilter.source_book = dict;
  }

  const results: ScoredEntry[] = [];
  const seenIds = new Set<string>();
  const fallbackStartedAt = Date.now();

  for (const stage of stages) {
    if (!stage.condition || results.length >= limit) {
      continue;
    }

    const remainingBudgetMs =
      FALLBACK_SEARCH_TIMEOUT_MS - (Date.now() - fallbackStartedAt);
    if (remainingBudgetMs <= 50) {
      throw new SearchTimeoutError(
        `Fallback search timed out after ${FALLBACK_SEARCH_TIMEOUT_MS}ms`,
      );
    }

    const stageTimeoutMs = getFallbackStageTimeoutMs(remainingBudgetMs);
    const remaining = limit - results.length;
    const queryCondition: Record<string, unknown> = {
      ...baseFilter,
      ...stage.condition,
    };

    if (seenIds.size > 0) {
      queryCondition.id = { $nin: Array.from(seenIds) };
    }

    const candidates = await measureAsync<any[]>(stageTimings, stage.name, () =>
      withTimeout(
        collection
          .find(queryCondition)
          .maxTimeMS(stageTimeoutMs)
          .limit(getStageFetchLimit(remaining))
          .toArray(),
        stageTimeoutMs + 100,
        `Fallback stage ${stage.name} timed out after ${stageTimeoutMs}ms`,
      ),
    );

    for (const candidate of candidates) {
      if (!candidate?.id || seenIds.has(candidate.id)) continue;

      seenIds.add(candidate.id);
      results.push({
        entry: candidate,
        priority: stage.priority,
        secondaryScore: calculateSecondaryScore(candidate, queryLower),
      });
    }
  }

  return sortScoredEntries(results)
    .slice(0, limit)
    .map((result) => stripMongoId(result.entry));
}

const getFallbackGroupedFetchLimit = (offset: number, limit: number): number => {
  const requestedWindow = offset + limit;
  return Math.min(
    FALLBACK_SCAN_LIMIT,
    Math.max(requestedWindow * 4, requestedWindow + SEARCH_API_MAX_PAGE_SIZE),
  );
};

export async function fallbackGroupedSearch(
  collection: any,
  query: string,
  {
    limit,
    offset,
    mode = "normal",
    sort = "relevance",
    queryVariants,
    filters = {},
    stageTimings = {},
    mongoFilter = {},
  }: {
    limit: number;
    offset: number;
    mode?: SearchMode;
    sort?: SearchSortOption;
    queryVariants?: string[];
    filters?: SearchFilterOptions;
    stageTimings?: Record<string, number>;
    mongoFilter?: Record<string, unknown>;
  },
): Promise<GroupedSearchResponse> {
  const fetchLimit =
    mode === "normal" && isValidatedJyutpingQuery(query)
      ? Math.min(FALLBACK_SCAN_LIMIT, offset + limit)
      : getFallbackGroupedFetchLimit(offset, limit);
  const fetchEntries = (nextFilters: SearchFilterOptions) =>
    fallbackSearch(collection, query, fetchLimit, undefined, mode, {
      queryVariants,
      stageTimings,
      mongoFilter: buildSearchMongoFilter(nextFilters, mongoFilter),
    });
  const entries = await fetchEntries(filters);
  const facetOptions =
    offset === 0
      ? await buildFacetOptionsFromEntries({
          searchEntries: entries,
          filters,
          getEntries: fetchEntries,
        })
      : undefined;
  const response = buildGroupedSearchResponse({
    query,
    mode,
    sort,
    filters: getPublicFilters(filters),
    entries,
    offset,
    limit,
    exact: entries.length < fetchLimit,
    facetOptions,
  });

  if (!response.total.exact) {
    response.page.hasMore =
      response.page.hasMore || response.groups.length === limit;
    response.page.nextOffset = response.page.hasMore
      ? response.page.offset + response.page.returned
      : null;
  }

  return response;
}

const stripSearchResponseModerationMetadata = (
  event: any,
  response: GroupedSearchResponse,
): GroupedSearchResponse => {
  const groups = response.groups
    .map((group) => {
      const entries = filterRestrictedEntries(event, group.entries);
      const primary = entries[0];
      if (!primary) return null;

      return {
        ...group,
        primary,
        entries,
      };
    })
    .filter((group): group is AggregatedSearchEntry => Boolean(group));

  return {
    ...response,
    groups,
    results: flattenSearchGroups(groups),
  };
};

export const resetSearchApiRuntimeStateForTests = () => {
  atlasSearchAvailability = "unknown";
  queryVariantsCache.clear();
};

const searchEventHandler = async (event: any) => {
  const query = getQuery<SearchQuery>(event);
  const {
    q,
    limit = String(SEARCH_API_PAGE_SIZE),
    offset = "0",
    dict,
    dialect,
    type,
    sort,
    mode = "normal",
  } = query;
  const normalizedMode: SearchMode = mode === "reverse" ? "reverse" : "normal";
  const resultLimit = normalizeSearchResultLimit(limit);
  const resultOffset = normalizeSearchResultOffset(offset);
  const normalizedSort = normalizeSearchSort(sort);
  const filters: SearchFilterOptions = {
    dict: normalizeFilterValue(dict),
    dialect: normalizeFilterValue(dialect),
    type: normalizeEntryType(type),
  };
  const publicFilters = getPublicFilters(filters);

  if (!q || typeof q !== "string" || q.trim() === "") {
    return {
      error: "请提供搜索关键词",
      ...buildEmptySearchResponse({
        success: false,
        query: "",
        mode: normalizedMode,
        sort: normalizedSort,
        filters: publicFilters,
        offset: resultOffset,
        limit: resultLimit,
      }),
    };
  }

  const searchQuery = q.trim();
  const hasSymbolCharacters = /[\p{P}\p{S}]/u.test(searchQuery);
  const isJyutpingSearchQuery = isValidatedJyutpingQuery(searchQuery);
  const metrics: SearchMetrics = {
    queryHash: hashSearchQuery(searchQuery),
    querySample: getSearchQuerySample(searchQuery),
    mode: normalizedMode,
    limit: resultLimit,
    offset: resultOffset,
    strategy: "atlas",  // ← Default strategy (will be updated based on actual path)
    phaseMs: {},
    stageMs: {},
  };
  const requestStartedAt = Date.now();
  const mainlandModeration = shouldApplyMainlandModeration(event);

  if (mainlandModeration) {
    setModerationCacheHeaders(event);
    if (queryTouchesRestrictedTerm(searchQuery)) {
      return {
        ...buildEmptySearchResponse({
          query: searchQuery,
          mode: normalizedMode,
          sort: normalizedSort,
          filters: publicFilters,
          offset: resultOffset,
          limit: resultLimit,
        }),
      };
    }
  }

  try {
    const response = await withTimeout(
      (async () => {
        await measureAsync(metrics.phaseMs, "init", () => ensureInitialized());
        const queryVariants = await measureAsync(
          metrics.phaseMs,
          "queryVariants",
          () => getCachedQueryVariants(searchQuery),
        );
        const collection = await measureAsync(metrics.phaseMs, "collection", () =>
          getEntriesCollection(),
        );
        const moderationMongoFilter = getModerationMongoFilter(event);

        if (
          shouldAttemptAtlasSearch({
            mode: normalizedMode,
            hasSymbolCharacters,
            isJyutpingQuery: isJyutpingSearchQuery,
          })
        ) {
          metrics.strategy = "atlas";

          try {
            const atlasResponse = await measureAsync(
              metrics.phaseMs,
              "atlas",
              () =>
                atlasGroupedSearch(collection, searchQuery, {
                  limit: resultLimit,
                  offset: resultOffset,
                  mode: normalizedMode,
                  sort: normalizedSort,
                  queryVariants,
                  filters,
                  mongoFilter: moderationMongoFilter,
                }),
            );
            markAtlasSearchAvailable();
            return atlasResponse;
          } catch (error) {
            if (isAtlasUnsupportedError(error)) {
              markAtlasSearchUnavailable();
              metrics.degradedReason = "atlas_unsupported";
            } else if (isSearchTimeoutError(error)) {
              metrics.degradedReason = "atlas_timeout";
            } else {
              metrics.degradedReason = "atlas_error";
            }

            if (getIsServerApiEnabled()) {
              metrics.strategy = "fallback";
              return await measureAsync(metrics.phaseMs, "fallback", () =>
                fallbackGroupedSearch(collection, searchQuery, {
                  limit: resultLimit,
                  offset: resultOffset,
                  mode: normalizedMode,
                  sort: normalizedSort,
                  queryVariants,
                  filters,
                  stageTimings: metrics.stageMs,
                  mongoFilter: moderationMongoFilter,
                }),
              );
            }

            const exactAssetResponse = await measureAsync(
              metrics.phaseMs,
              "exactAsset",
              () =>
                buildExactAssetSearchResponse({
                  query: searchQuery,
                  mode: normalizedMode,
                  sort: normalizedSort,
                  filters,
                  offset: resultOffset,
                  limit: resultLimit,
                }),
            );

            if (exactAssetResponse) {
              metrics.degradedReason =
                metrics.degradedReason || "atlas_exact_asset";
              return exactAssetResponse;
            }

            throw error;
          }
        }

        if (
          normalizedMode === "reverse" ||
          (normalizedMode === "normal" && isJyutpingSearchQuery)
        ) {
          metrics.strategy = "fallback";
          return await measureAsync(metrics.phaseMs, "fallback", () =>
            fallbackGroupedSearch(collection, searchQuery, {
              limit: resultLimit,
              offset: resultOffset,
              mode: normalizedMode,
              sort: normalizedSort,
              queryVariants,
              filters,
              stageTimings: metrics.stageMs,
              mongoFilter: moderationMongoFilter,
            }),
          );
        }

        if (getIsServerApiEnabled()) {
          metrics.strategy = "fallback";
          return await measureAsync(metrics.phaseMs, "fallback", () =>
            fallbackGroupedSearch(collection, searchQuery, {
              limit: resultLimit,
              offset: resultOffset,
              mode: normalizedMode,
              sort: normalizedSort,
              queryVariants,
              filters,
              stageTimings: metrics.stageMs,
              mongoFilter: moderationMongoFilter,
            }),
          );
        }

        metrics.strategy = "exact_asset";
        const exactAssetResponse = await measureAsync(
          metrics.phaseMs,
          "exactAsset",
          () =>
            buildExactAssetSearchResponse({
              query: searchQuery,
              mode: normalizedMode,
              sort: normalizedSort,
              filters,
              offset: resultOffset,
              limit: resultLimit,
            }),
        );

        if (exactAssetResponse) {
          metrics.degradedReason = "atlas_unsupported_exact_asset";
          return exactAssetResponse;
        }

        return buildEmptySearchResponse({
          query: searchQuery,
          mode: normalizedMode,
          sort: normalizedSort,
          filters: publicFilters,
          offset: resultOffset,
          limit: resultLimit,
        });
      })(),
      SEARCH_HANDLER_TIMEOUT_MS,
      `Search handler timed out after ${SEARCH_HANDLER_TIMEOUT_MS}ms`,
    );

    const visibleResponse = stripSearchResponseModerationMetadata(event, response);
    metrics.resultCount = visibleResponse.results.length;
    metrics.totalMs = Date.now() - requestStartedAt;

    if (metrics.degradedReason || metrics.totalMs >= SLOW_SEARCH_THRESHOLD_MS) {
      logSlowSearch("[search-api] slow", metrics, {
        atlasAvailability: getAtlasSearchAvailability(),
      });
    }

    return visibleResponse;
  } catch (error: any) {
    metrics.totalMs = Date.now() - requestStartedAt;

    if (isSearchTimeoutError(error)) {
      logSearchFailure("[search-api] timed out", metrics, error);
    } else {
      logSearchFailure("[search-api] failed", metrics, error);
    }

    try {
      const exactAssetResponse = await measureAsync(
        metrics.phaseMs,
        "exactAsset",
        () =>
          buildExactAssetSearchResponse({
            query: searchQuery,
            mode: normalizedMode,
            sort: normalizedSort,
            filters,
            offset: resultOffset,
            limit: resultLimit,
          }),
      );

      if (exactAssetResponse) {
        metrics.degradedReason =
          metrics.degradedReason || "handler_timeout_exact_asset";
        const visibleResponse = stripSearchResponseModerationMetadata(
          event,
          exactAssetResponse,
        );
        metrics.resultCount = visibleResponse.results.length;
        metrics.totalMs = Date.now() - requestStartedAt;
        logSlowSearch("[search-api] exact asset rescue", metrics, {
          atlasAvailability: getAtlasSearchAvailability(),
        });
        return visibleResponse;
      }
    } catch (exactAssetError) {
      console.error("[search-api] exact asset rescue failed", {
        queryHash: metrics.queryHash,
        error:
          exactAssetError instanceof Error
            ? exactAssetError.message
            : String(exactAssetError),
      });
    }

    return {
      error: error.message || "搜索服务暂时不可用",
      ...buildEmptySearchResponse({
        success: false,
        query: searchQuery,
        mode: normalizedMode,
        sort: normalizedSort,
        filters: publicFilters,
        offset: resultOffset,
        limit: resultLimit,
      }),
    };
  }
};

const exportedSearchHandler =
  typeof defineEventHandler === "function"
    ? defineEventHandler(searchEventHandler)
    : searchEventHandler;

export default exportedSearchHandler;

/**
 * 词典搜索 API
 *
 * GET /api/search?q=查询词&limit=50&dict=词典ID&mode=normal|reverse
 *
 * 参数:
 *   q     - 搜索查询词（必填）
 *   limit - 返回结果数量限制（默认 50，最大 100）
 *   dict  - 词典 ID 筛选（可选）
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
  ensureInitialized,
  getQueryVariants,
} from "../utils/opencc.ts";

export interface SearchQuery {
  q?: string;
  limit?: string;
  dict?: string;
  mode?: "normal" | "reverse";
}

export type SearchMode = "normal" | "reverse";
type SearchStrategy = "atlas" | "fallback";
type AtlasSearchAvailability = "unknown" | "available" | "unavailable";

interface SearchMetrics {
  queryHash: string;
  querySample: string;
  mode: SearchMode;
  limit: number;
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
}

interface ScoredEntry {
  entry: any;
  priority: number;
  secondaryScore: number;
}

const ATLAS_SEARCH_TIMEOUT_MS = 2500;
const FALLBACK_SEARCH_TIMEOUT_MS = 2500;
const SEARCH_HANDLER_TIMEOUT_MS = 3500;
const SLOW_SEARCH_THRESHOLD_MS = 1500;
const QUERY_VARIANT_CACHE_LIMIT = 128;
const FALLBACK_STAGE_OVERSCAN = 20;
const FALLBACK_STAGE_MIN_FETCH = 5;

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
  atlasAvailabilityState = getAtlasSearchAvailability(),
}: {
  mode: SearchMode;
  hasSymbolCharacters: boolean;
  atlasAvailabilityState?: AtlasSearchAvailability;
}): boolean => {
  return (
    mode === "normal" &&
    !hasSymbolCharacters &&
    atlasAvailabilityState !== "unavailable"
  );
};

export const normalizeSearchResultLimit = (value: string | number | undefined): number => {
  const parsed = Number.parseInt(String(value ?? "50"), 10);
  const safeLimit = Number.isFinite(parsed) ? parsed : 50;
  return Math.min(Math.max(1, safeLimit), 100);
};

export const shouldFailFastAfterAtlasDegrade = (event: any): boolean => {
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
  return mode === "reverse"
    ? buildReverseFallbackStages(queryVariants)
    : buildNormalFallbackStages(queryVariants, queryLower);
};

const stripMongoId = (entry: any) => {
  const { _id, ...rest } = entry;
  return rest;
};

export async function atlasSearch(
  collection: any,
  query: string,
  limit: number,
  dict?: string,
  mode: SearchMode = "normal",
  queryVariants?: string[],
) {
  const resolvedVariants = queryVariants ?? (await getCachedQueryVariants(query));

  const searchStage: any = {
    index: "default",
    compound: {
      should: [],
    },
  };

  if (mode === "reverse") {
    for (const variant of resolvedVariants) {
      searchStage.compound.should.push({
        text: {
          query: variant,
          path: "senses.definition",
          score: { boost: { value: 5 } },
        },
      });
    }
  } else {
    for (const variant of resolvedVariants) {
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

    for (const variant of resolvedVariants) {
      searchStage.compound.should.push({
        text: {
          query: variant,
          path: "keywords",
          score: { boost: { value: 4 } },
        },
      });
    }
  }

  const pipeline: any[] = [{ $search: searchStage }];

  if (dict) {
    pipeline.push({ $match: { source_book: dict } });
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

  const baseFilter: Record<string, unknown> = {};
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

    const stageTimeoutMs = Math.max(250, Math.min(900, remainingBudgetMs - 25));
    const remaining = limit - results.length;
    const queryCondition: Record<string, unknown> = {
      ...baseFilter,
      ...stage.condition,
    };

    if (seenIds.size > 0) {
      queryCondition.id = { $nin: Array.from(seenIds) };
    }

    const candidates = await measureAsync(stageTimings, stage.name, () =>
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

export const resetSearchApiRuntimeStateForTests = () => {
  atlasSearchAvailability = "unknown";
  queryVariantsCache.clear();
};

const searchEventHandler = async (event: any) => {
  const query = getQuery<SearchQuery>(event);
  const { q, limit = "50", dict, mode = "normal" } = query;

  if (!q || typeof q !== "string" || q.trim() === "") {
    return {
      success: false,
      error: "请提供搜索关键词",
      results: [],
      total: 0,
    };
  }

  const searchQuery = q.trim();
  const normalizedMode: SearchMode = mode === "reverse" ? "reverse" : "normal";
  const resultLimit = normalizeSearchResultLimit(limit);
  const hasSymbolCharacters = /[\p{P}\p{S}]/u.test(searchQuery);
  const metrics: SearchMetrics = {
    queryHash: hashSearchQuery(searchQuery),
    querySample: getSearchQuerySample(searchQuery),
    mode: normalizedMode,
    limit: resultLimit,
    strategy: "fallback",
    phaseMs: {},
    stageMs: {},
  };
  const requestStartedAt = Date.now();

  try {
    const results = await withTimeout(
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

        if (
          shouldAttemptAtlasSearch({
            mode: normalizedMode,
            hasSymbolCharacters,
          })
        ) {
          metrics.strategy = "atlas";

          try {
            const atlasResults = await measureAsync(metrics.phaseMs, "atlas", () =>
              atlasSearch(
                collection,
                searchQuery,
                resultLimit,
                dict,
                normalizedMode,
                queryVariants,
              ),
            );
            markAtlasSearchAvailable();
            return atlasResults;
          } catch (error) {
            if (isAtlasUnsupportedError(error)) {
              markAtlasSearchUnavailable();
              metrics.degradedReason = "atlas_unsupported";
            } else if (isSearchTimeoutError(error)) {
              metrics.degradedReason = "atlas_timeout";
            } else {
              metrics.degradedReason = "atlas_error";
            }

            if (shouldFailFastAfterAtlasDegrade(event)) {
              throw error;
            }
          }
        }

        metrics.strategy = "fallback";
        return await measureAsync(metrics.phaseMs, "fallback", () =>
          fallbackSearch(collection, searchQuery, resultLimit, dict, normalizedMode, {
            queryVariants,
            stageTimings: metrics.stageMs,
          }),
        );
      })(),
      SEARCH_HANDLER_TIMEOUT_MS,
      `Search handler timed out after ${SEARCH_HANDLER_TIMEOUT_MS}ms`,
    );

    metrics.resultCount = results.length;
    metrics.totalMs = Date.now() - requestStartedAt;

    if (metrics.degradedReason || metrics.totalMs >= SLOW_SEARCH_THRESHOLD_MS) {
      logSlowSearch("[search-api] slow", metrics, {
        atlasAvailability: getAtlasSearchAvailability(),
      });
    }

    return {
      success: true,
      query: searchQuery,
      mode: normalizedMode,
      total: results.length,
      results,
    };
  } catch (error: any) {
    metrics.totalMs = Date.now() - requestStartedAt;

    if (isSearchTimeoutError(error)) {
      logSearchFailure("[search-api] timed out", metrics, error);
    } else {
      logSearchFailure("[search-api] failed", metrics, error);
    }

    return {
      success: false,
      error: error.message || "搜索服务暂时不可用",
      results: [],
      total: 0,
    };
  }
};

const exportedSearchHandler =
  typeof defineEventHandler === "function"
    ? defineEventHandler(searchEventHandler)
    : searchEventHandler;

export default exportedSearchHandler;

import type { H3Event } from "h3";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { getQueryVariants } from "./opencc.ts";
import { getEntriesCollection } from "./mongodb.ts";
import { getModerationMongoFilter } from "./moderation.ts";
import {
  type HeadwordSuggestionRecord,
  normalizeValue,
  rankHeadwordSuggestions,
  toSearchTerm,
} from "./headword-suggestion-ranking.ts";
import { getIsServerApiEnabled } from "./runtime-mode.ts";

interface SuggestionAssetPayload {
  records?: HeadwordSuggestionRecord[];
}

const SUGGESTION_RECORDS_PATH = resolve(
  process.cwd(),
  "public",
  "search-suggestions",
  "records.json",
);

let suggestionRecordsCache: HeadwordSuggestionRecord[] | null = null;
let suggestionRecordsPromise: Promise<HeadwordSuggestionRecord[]> | null = null;

const API_SUGGESTION_STAGE_LIMIT_MULTIPLIER = 4;
const API_SUGGESTION_TIMEOUT_MS = 1500;
const API_SUGGESTION_CACHE_LIMIT = 256;
const API_SUGGESTION_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

interface CachedApiSuggestions {
  suggestions: string[];
  timestamp: number;
}

const apiSuggestionCache = new Map<string, CachedApiSuggestions>();

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getSuggestionCacheKey = (
  query: string,
  limit: number,
  event?: H3Event,
): string => {
  const country = String(
    event?.context?.cloudflare?.request?.cf?.country ||
      event?.node?.req?.headers?.["cf-ipcountry"] ||
      "",
  ).toUpperCase();
  return `${query}:${limit}:${country}`;
};

const getCachedApiSuggestions = (key: string): string[] | null => {
  const cached = apiSuggestionCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > API_SUGGESTION_CACHE_MAX_AGE_MS) {
    apiSuggestionCache.delete(key);
    return null;
  }

  apiSuggestionCache.delete(key);
  apiSuggestionCache.set(key, cached);
  return cached.suggestions;
};

const setCachedApiSuggestions = (key: string, suggestions: string[]) => {
  apiSuggestionCache.set(key, {
    suggestions,
    timestamp: Date.now(),
  });

  while (apiSuggestionCache.size > API_SUGGESTION_CACHE_LIMIT) {
    const oldestKey = apiSuggestionCache.keys().next().value;
    if (!oldestKey) break;
    apiSuggestionCache.delete(oldestKey);
  }
};

const loadSuggestionAsset = async (): Promise<HeadwordSuggestionRecord[]> => {
  const raw = await readFile(SUGGESTION_RECORDS_PATH, "utf8");
  const payload = JSON.parse(raw) as SuggestionAssetPayload;
  return Array.isArray(payload?.records) ? payload.records : [];
};

export const getHeadwordSuggestionRecords = async (): Promise<
  HeadwordSuggestionRecord[]
> => {
  if (suggestionRecordsCache) {
    return suggestionRecordsCache;
  }

  if (suggestionRecordsPromise) {
    return suggestionRecordsPromise;
  }

  suggestionRecordsPromise = loadSuggestionAsset()
    .then((records) => {
      suggestionRecordsCache = records;
      return records;
    })
    .finally(() => {
      suggestionRecordsPromise = null;
    });

  return suggestionRecordsPromise;
};

export const getHeadwordSuggestionsFromApi = async (
  query: string,
  limit: number = 10,
  event?: H3Event,
): Promise<string[]> => {
  const normalizedQuery = normalizeValue(query);
  if (normalizedQuery.length < 2) {
    return [];
  }

  const cacheKey = getSuggestionCacheKey(normalizedQuery, limit, event);
  const cached = getCachedApiSuggestions(cacheKey);
  if (cached) {
    return cached;
  }

  const queryVariants = (await getQueryVariants(normalizedQuery))
    .map(toSearchTerm)
    .filter(Boolean);
  const uniqueVariants = Array.from(new Set(queryVariants));
  if (uniqueVariants.length === 0) {
    return [];
  }

  const collection = await getEntriesCollection();
  const suggestions: string[] = [];
  const seen = new Set<string>();
  const addSuggestion = (value: string) => {
    const normalized = normalizeValue(value);
    const key = toSearchTerm(normalized);
    if (!normalized || seen.has(key) || suggestions.length >= limit) return;
    seen.add(key);
    suggestions.push(normalized);
  };
  const stageLimit = Math.max(
    limit * API_SUGGESTION_STAGE_LIMIT_MULTIPLIER,
    limit,
  );
  const mongoFilter = event ? getModerationMongoFilter(event) : {};

  const runStage = async (condition: Record<string, unknown>) => {
    if (suggestions.length >= limit) return;

    const rows = (await collection
      .find(
        {
          ...mongoFilter,
          ...condition,
        },
        {
          projection: {
            _id: 0,
            "headword.normalized": 1,
            "headword.display": 1,
          },
          maxTimeMS: API_SUGGESTION_TIMEOUT_MS,
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
      .forEach(addSuggestion);
  };

  await runStage({
    $or: [
      { "headword.normalized": { $in: uniqueVariants } },
      { "headword.display": { $in: uniqueVariants } },
      { "meta.headword_variants": { $in: uniqueVariants } },
    ],
  });

  for (const variant of uniqueVariants) {
    if (suggestions.length >= limit) break;
    const prefixRegex = `^${escapeRegex(variant)}`;
    await runStage({
      $or: [
        { "headword.normalized": { $regex: prefixRegex, $options: "i" } },
        { "headword.display": { $regex: prefixRegex, $options: "i" } },
        { "meta.headword_variants": { $regex: prefixRegex, $options: "i" } },
      ],
    });
  }

  for (const variant of uniqueVariants) {
    if (suggestions.length >= limit) break;
    const containsRegex = escapeRegex(variant);
    await runStage({
      $or: [
        { "headword.normalized": { $regex: containsRegex, $options: "i" } },
        { "headword.display": { $regex: containsRegex, $options: "i" } },
        { "meta.headword_variants": { $regex: containsRegex, $options: "i" } },
      ],
    });
  }

  setCachedApiSuggestions(cacheKey, suggestions);
  return suggestions;
};

export const getHeadwordSuggestions = async (
  query: string,
  limit: number = 10,
  event?: H3Event,
): Promise<string[]> => {
  const normalizedQuery = normalizeValue(query);
  if (normalizedQuery.length < 2) {
    return [];
  }

  if (getIsServerApiEnabled()) {
    return getHeadwordSuggestionsFromApi(normalizedQuery, limit, event);
  }

  const records = await getHeadwordSuggestionRecords();
  const queryVariants = await getQueryVariants(normalizedQuery);
  return rankHeadwordSuggestions(records, queryVariants, limit);
};

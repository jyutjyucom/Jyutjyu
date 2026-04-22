import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { getQueryVariants } from "./opencc.ts";
import {
  type HeadwordSuggestionRecord,
  normalizeValue,
  rankHeadwordSuggestions,
} from "./headword-suggestion-ranking.ts";

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

export const getHeadwordSuggestions = async (
  query: string,
  limit: number = 10,
): Promise<string[]> => {
  const normalizedQuery = normalizeValue(query);
  if (normalizedQuery.length < 2) {
    return [];
  }

  const records = await getHeadwordSuggestionRecords();
  const queryVariants = await getQueryVariants(normalizedQuery);
  return rankHeadwordSuggestions(records, queryVariants, limit);
};

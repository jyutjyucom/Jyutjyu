import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { DictionaryEntry } from "~/types/dictionary";
import { getQueryVariants } from "./opencc";
import {
  type HeadwordSuggestionRecord,
  normalizeValue,
  toSearchTerm,
  rankHeadwordSuggestions,
} from "./headword-suggestion-ranking";

interface DictionaryIndexItem {
  id: string;
  file?: string;
  chunked?: boolean;
  chunk_dir?: string;
}

interface DictionaryIndex {
  dictionaries?: DictionaryIndexItem[];
}

interface ChunkInfo {
  file?: string;
}

interface ChunkManifest {
  chunks?: Record<string, ChunkInfo>;
}

const DICTIONARY_ROOT = resolve(process.cwd(), "public/dictionaries");
const DICTIONARY_INDEX_PATH = resolve(DICTIONARY_ROOT, "index.json");

let suggestionRecordsCache: HeadwordSuggestionRecord[] | null = null;
let suggestionRecordsPromise: Promise<HeadwordSuggestionRecord[]> | null = null;

const getEntrySuggestionRecord = (
  entry: DictionaryEntry,
): HeadwordSuggestionRecord | null => {
  const display = normalizeValue(entry?.headword?.display);
  const normalized = normalizeValue(entry?.headword?.normalized);
  const suggestion = normalized || display;

  if (!suggestion) {
    return null;
  }

  const searchTerms = Array.from(
    new Set(
      [
        toSearchTerm(suggestion),
        toSearchTerm(display),
        toSearchTerm(normalized),
      ].filter(Boolean),
    ),
  );

  if (searchTerms.length === 0) {
    return null;
  }

  return {
    suggestion,
    searchTerms,
  };
};

const mergeSuggestionRecord = (
  target: Map<string, HeadwordSuggestionRecord>,
  entry: DictionaryEntry,
) => {
  const record = getEntrySuggestionRecord(entry);
  if (!record) return;

  const existing = target.get(record.suggestion);
  if (!existing) {
    target.set(record.suggestion, record);
    return;
  }

  const mergedTerms = new Set<string>(existing.searchTerms);
  record.searchTerms.forEach((term) => mergedTerms.add(term));
  existing.searchTerms = Array.from(mergedTerms);
};

const readJsonFile = async <T>(filePath: string): Promise<T | null> => {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
};

const loadEntriesFromFile = async (
  filePath: string,
): Promise<DictionaryEntry[]> => {
  const payload = await readJsonFile<unknown>(filePath);
  return Array.isArray(payload) ? (payload as DictionaryEntry[]) : [];
};

const buildSuggestionRecords = async (): Promise<
  HeadwordSuggestionRecord[]
> => {
  const index = await readJsonFile<DictionaryIndex>(DICTIONARY_INDEX_PATH);
  const dictionaries = Array.isArray(index?.dictionaries)
    ? index.dictionaries
    : [];
  const suggestions = new Map<string, HeadwordSuggestionRecord>();

  for (const dict of dictionaries) {
    if (dict.chunked && dict.chunk_dir) {
      const manifestPath = resolve(
        DICTIONARY_ROOT,
        dict.chunk_dir,
        "manifest.json",
      );
      const manifest = await readJsonFile<ChunkManifest>(manifestPath);
      const chunkFiles = Object.values(manifest?.chunks || {})
        .map((chunk) => chunk?.file)
        .filter((file): file is string => Boolean(file));

      for (const chunkFile of chunkFiles) {
        const entries = await loadEntriesFromFile(
          resolve(DICTIONARY_ROOT, dict.chunk_dir, chunkFile),
        );
        entries.forEach((entry) => mergeSuggestionRecord(suggestions, entry));
      }
      continue;
    }

    if (!dict.file) continue;

    const entries = await loadEntriesFromFile(
      resolve(DICTIONARY_ROOT, dict.file),
    );
    entries.forEach((entry) => mergeSuggestionRecord(suggestions, entry));
  }

  return Array.from(suggestions.values());
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

  suggestionRecordsPromise = buildSuggestionRecords()
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
  if (!normalizedQuery) {
    return [];
  }

  const records = await getHeadwordSuggestionRecords();
  const queryVariants = await getQueryVariants(normalizedQuery);
  return rankHeadwordSuggestions(records, queryVariants, limit);
};

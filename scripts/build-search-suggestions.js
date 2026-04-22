import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const DICTIONARY_ROOT = resolve(process.cwd(), "public", "dictionaries");
const DICTIONARY_INDEX_PATH = resolve(DICTIONARY_ROOT, "index.json");
const SUGGESTION_ROOT = resolve(process.cwd(), "public", "search-suggestions");
const SUGGESTION_RECORDS_PATH = join(SUGGESTION_ROOT, "records.json");

const normalizeValue = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const toSearchTerm = (value) => normalizeValue(value).toLowerCase();

const readJsonFile = async (filePath) => {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
};

const loadEntriesFromFile = async (filePath) => {
  const payload = await readJsonFile(filePath);
  return Array.isArray(payload) ? payload : [];
};

const loadDictionaryIndex = async () => {
  const parsed = await readJsonFile(DICTIONARY_INDEX_PATH);
  if (!Array.isArray(parsed?.dictionaries)) {
    throw new Error(`Invalid dictionary index at ${DICTIONARY_INDEX_PATH}`);
  }
  return parsed.dictionaries;
};

const getEntrySuggestionRecord = (entry) => {
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

const mergeSuggestionRecord = (target, entry) => {
  const record = getEntrySuggestionRecord(entry);
  if (!record) {
    return;
  }

  const existing = target.get(record.suggestion);
  if (!existing) {
    target.set(record.suggestion, record);
    return;
  }

  const mergedTerms = new Set(existing.searchTerms);
  record.searchTerms.forEach((term) => mergedTerms.add(term));
  existing.searchTerms = Array.from(mergedTerms);
};

const getDictionaryEntries = async (dict) => {
  if (!dict?.chunked && dict?.file) {
    return loadEntriesFromFile(resolve(DICTIONARY_ROOT, dict.file));
  }

  if (dict?.chunked && dict?.chunk_dir) {
    const manifestPath = resolve(
      DICTIONARY_ROOT,
      dict.chunk_dir,
      "manifest.json",
    );
    const manifest = await readJsonFile(manifestPath);
    const entries = [];

    for (const chunk of Object.values(manifest?.chunks || {})) {
      if (!chunk?.file) {
        continue;
      }

      const chunkEntries = await loadEntriesFromFile(
        resolve(DICTIONARY_ROOT, dict.chunk_dir, chunk.file),
      );
      entries.push(...chunkEntries);
    }

    return entries;
  }

  return [];
};

const buildSuggestionRecords = async () => {
  const dictionaries = await loadDictionaryIndex();
  const suggestions = new Map();
  let totalEntries = 0;

  for (const dict of dictionaries) {
    const entries = await getDictionaryEntries(dict);
    totalEntries += entries.length;
    entries.forEach((entry) => mergeSuggestionRecord(suggestions, entry));
  }

  return {
    totalEntries,
    records: Array.from(suggestions.values()).sort((a, b) =>
      a.suggestion.localeCompare(b.suggestion, "zh-Hant"),
    ),
  };
};

const main = async () => {
  const startTime = process.hrtime.bigint();
  console.log("Building search suggestion asset...");

  await rm(SUGGESTION_ROOT, { recursive: true, force: true });
  await mkdir(SUGGESTION_ROOT, { recursive: true });

  const { totalEntries, records } = await buildSuggestionRecords();
  const payload = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    total_entries: totalEntries,
    total_suggestions: records.length,
    records,
  };

  await writeFile(SUGGESTION_RECORDS_PATH, JSON.stringify(payload), "utf8");

  const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
  console.log("Search suggestion asset built in public/search-suggestions");
  console.log(
    [
      "Summary:",
      `entries=${totalEntries}`,
      `suggestions=${records.length}`,
      `elapsed_ms=${elapsedMs.toFixed(1)}`,
    ].join(" "),
  );
};

main().catch((error) => {
  console.error("Failed to build search suggestion asset:", error);
  process.exitCode = 1;
});

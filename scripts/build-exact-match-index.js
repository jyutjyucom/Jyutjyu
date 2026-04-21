import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const DICTIONARY_ROOT = resolve(process.cwd(), "public", "dictionaries");
const DICTIONARY_INDEX_PATH = resolve(DICTIONARY_ROOT, "index.json");
const EXACT_MATCH_ROOT = resolve(process.cwd(), "public", "exact-match");
const FORM_BUCKET_ROOT = join(EXACT_MATCH_ROOT, "forms");
const WORD_BUCKET_ROOT = join(EXACT_MATCH_ROOT, "words");
const EXACT_MATCH_BUCKET_MOD = 256;

const normalizeSpace = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();
const toComparableKey = (value) => normalizeSpace(value).toLowerCase();

const readJsonFile = async (filePath) => {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
};

const readDictionaryEntriesFile = async (filePath) => {
  const parsed = await readJsonFile(filePath);
  return Array.isArray(parsed) ? parsed : [];
};

const getBucketId = (value) => {
  const normalized = normalizeSpace(value);
  const firstChar = Array.from(normalized)[0];
  const codePoint = firstChar?.codePointAt(0);

  if (!firstChar || typeof codePoint !== "number") {
    return "misc";
  }

  return (codePoint % EXACT_MATCH_BUCKET_MOD).toString(16).padStart(2, "0");
};

const getCanonicalHeadword = (entry) => {
  const normalized = normalizeSpace(entry?.headword?.normalized || "");
  if (normalized) return normalized;
  return normalizeSpace(entry?.headword?.display || "");
};

const getBaseExactForms = (entry) => {
  const forms = new Set();

  const add = (value) => {
    const normalized = normalizeSpace(value || "");
    if (normalized) {
      forms.add(normalized);
    }
  };

  add(entry?.headword?.display);
  add(entry?.headword?.normalized);

  if (Array.isArray(entry?.meta?.headword_variants)) {
    entry.meta.headword_variants.forEach((value) => add(value));
  }

  return Array.from(forms);
};

const sortEntries = (entries) =>
  [...entries].sort((a, b) => String(a?.id || "").localeCompare(String(b?.id || "")));

const loadDictionaryFiles = async () => {
  const parsed = await readJsonFile(DICTIONARY_INDEX_PATH);
  const files = [];

  for (const dict of parsed?.dictionaries || []) {
    if (dict?.chunked && dict?.chunk_dir) {
      const manifest = await readJsonFile(
        resolve(DICTIONARY_ROOT, dict.chunk_dir, "manifest.json"),
      );

      for (const chunk of Object.values(manifest?.chunks || {})) {
        if (chunk?.file) {
          files.push(resolve(DICTIONARY_ROOT, dict.chunk_dir, chunk.file));
        }
      }

      continue;
    }

    if (dict?.file) {
      files.push(resolve(DICTIONARY_ROOT, dict.file));
    }
  }

  return files;
};

const createConverters = async () => {
  const OpenCC = await import("opencc-js");
  return {
    toSimplified: OpenCC.Converter({ from: "hk", to: "cn" }),
    toTraditional: OpenCC.Converter({ from: "cn", to: "hk" }),
  };
};

const getQueryForms = (query, converters) => {
  const cleaned = normalizeSpace(query);
  if (!cleaned) return [];

  const forms = new Set([cleaned]);

  try {
    forms.add(normalizeSpace(converters.toSimplified(cleaned)));
    forms.add(normalizeSpace(converters.toTraditional(cleaned)));
  } catch {
    // Keep the original query when OpenCC conversion fails.
  }

  return Array.from(forms).filter(Boolean);
};

const main = async () => {
  const startTime = process.hrtime.bigint();
  console.log("Building exact match index...");

  const converters = await createConverters();
  const files = await loadDictionaryFiles();

  const canonicalBuckets = new Map();
  const canonicalHeadwordMap = new Map();
  const entryFormMap = new Map();
  const querySeedSet = new Set();
  let totalEntries = 0;

  for (const filePath of files) {
    const entries = await readDictionaryEntriesFile(filePath);

    for (const entry of entries) {
      totalEntries += 1;

      const canonicalHeadword = getCanonicalHeadword(entry);
      const canonicalKey = toComparableKey(canonicalHeadword);
      if (!canonicalKey) continue;

      canonicalHeadwordMap.set(canonicalKey, canonicalHeadword);

      let bucket = canonicalBuckets.get(canonicalKey);
      if (!bucket) {
        bucket = {
          canonicalHeadword,
          entries: [],
        };
        canonicalBuckets.set(canonicalKey, bucket);
      }

      bucket.entries.push(entry);

      const forms = getBaseExactForms(entry);
      for (const form of forms) {
        const formKey = toComparableKey(form);
        if (!formKey) continue;

        let candidates = entryFormMap.get(formKey);
        if (!candidates) {
          candidates = new Map();
          entryFormMap.set(formKey, candidates);
        }

        candidates.set(canonicalKey, canonicalHeadword);

        querySeedSet.add(normalizeSpace(form));

        try {
          querySeedSet.add(normalizeSpace(converters.toSimplified(form)));
          querySeedSet.add(normalizeSpace(converters.toTraditional(form)));
        } catch {
          // Keep the original form when OpenCC conversion fails.
        }
      }
    }
  }

  const formBucketMaps = new Map();

  for (const querySeed of querySeedSet) {
    const queryKey = toComparableKey(querySeed);
    if (!queryKey) continue;

    const matchedCandidates = new Map();
    for (const queryForm of getQueryForms(querySeed, converters)) {
      const records = entryFormMap.get(toComparableKey(queryForm));
      if (!records) continue;

      for (const [canonicalKey, canonicalHeadword] of records.entries()) {
        matchedCandidates.set(canonicalKey, canonicalHeadword);
      }
    }

    if (matchedCandidates.size === 0) {
      continue;
    }

    const bucketId = getBucketId(queryKey);
    let formMap = formBucketMaps.get(bucketId);
    if (!formMap) {
      formMap = new Map();
      formBucketMaps.set(bucketId, formMap);
    }

    formMap.set(queryKey, matchedCandidates);
  }

  await rm(EXACT_MATCH_ROOT, { recursive: true, force: true });
  await mkdir(FORM_BUCKET_ROOT, { recursive: true });
  await mkdir(WORD_BUCKET_ROOT, { recursive: true });

  const wordBucketMaps = new Map();

  for (const [canonicalKey, record] of canonicalBuckets.entries()) {
    const bucketId = getBucketId(canonicalKey);
    let bucket = wordBucketMaps.get(bucketId);
    if (!bucket) {
      bucket = {};
      wordBucketMaps.set(bucketId, bucket);
    }

    bucket[canonicalKey] = {
      canonicalHeadword: record.canonicalHeadword,
      entries: sortEntries(record.entries),
    };
  }

  for (const [bucketId, formMap] of formBucketMaps.entries()) {
    const formsPayload = {};

    for (const formKey of Array.from(formMap.keys()).sort((a, b) =>
      a.localeCompare(b, "zh-Hant"),
    )) {
      const candidates = formMap.get(formKey);
      formsPayload[formKey] = Array.from(candidates.entries())
        .map(([key, canonicalHeadword]) => ({
          key,
          canonicalHeadword,
        }))
        .sort((a, b) =>
          a.canonicalHeadword.localeCompare(b.canonicalHeadword, "zh-Hant"),
        );
    }

    await writeFile(
      join(FORM_BUCKET_ROOT, `${bucketId}.json`),
      JSON.stringify({ forms: formsPayload }),
      "utf8",
    );
  }

  for (const [bucketId, wordsPayload] of wordBucketMaps.entries()) {
    const sortedWordsPayload = {};

    for (const canonicalKey of Object.keys(wordsPayload).sort((a, b) =>
      a.localeCompare(b, "zh-Hant"),
    )) {
      sortedWordsPayload[canonicalKey] = wordsPayload[canonicalKey];
    }

    await writeFile(
      join(WORD_BUCKET_ROOT, `${bucketId}.json`),
      JSON.stringify({ words: sortedWordsPayload }),
      "utf8",
    );
  }

  const canonicalHeadwords = Array.from(canonicalHeadwordMap.values()).sort(
    (a, b) => a.localeCompare(b, "zh-Hant"),
  );

  await writeFile(
    join(EXACT_MATCH_ROOT, "manifest.json"),
    JSON.stringify(
      {
        schema_version: "1.0.0",
        bucket_mod: EXACT_MATCH_BUCKET_MOD,
        exact_forms: Array.from(formBucketMaps.values()).reduce(
          (total, formMap) => total + formMap.size,
          0,
        ),
        canonical_headwords: canonicalHeadwords,
      },
      null,
      2,
    ),
    "utf8",
  );

  const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
  console.log("Exact match index built in public/exact-match");
  console.log(
    [
      "Summary:",
      `entries=${totalEntries}`,
      `canonical_headwords=${canonicalHeadwords.length}`,
      `form_buckets=${formBucketMaps.size}`,
      `word_buckets=${wordBucketMaps.size}`,
      `elapsed_ms=${Math.round(elapsedMs)}`,
    ].join(" "),
  );
};

main().catch((error) => {
  console.error("Failed to build exact match index:", error);
  process.exitCode = 1;
});

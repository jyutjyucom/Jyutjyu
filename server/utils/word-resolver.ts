import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DictionaryEntry } from "~/types/dictionary";
import { getEntriesCollection } from "./mongodb";
import { ensureInitialized, toSimplified, toTraditional } from "./opencc";

interface DictionaryIndexItem {
  id: string;
  file?: string;
  chunked?: boolean;
  chunk_dir?: string;
}

interface DictionaryIndex {
  dictionaries: DictionaryIndexItem[];
}

interface ChunkInfo {
  file: string;
}

interface ChunkManifest {
  chunks: Record<string, ChunkInfo>;
  headwordIndex?: Record<string, string[]>;
}

interface WordBucket {
  key: string;
  canonicalHeadword: string;
  entries: DictionaryEntry[];
}

export interface ResolvedWordResult {
  canonicalHeadword: string;
  entries: DictionaryEntry[];
}

const DICTIONARY_ROOT = resolve(process.cwd(), "public/dictionaries");
const DICTIONARY_INDEX_PATH = resolve(DICTIONARY_ROOT, "index.json");

const CHUNK_CACHE_LIMIT = 24;

let dictionaryIndexCache: DictionaryIndexItem[] | null = null;
let dictionaryIndexPromise: Promise<DictionaryIndexItem[]> | null = null;

let nonChunkedEntriesCache: DictionaryEntry[] | null = null;
let nonChunkedEntriesPromise: Promise<DictionaryEntry[]> | null = null;

const chunkManifestCache = new Map<string, ChunkManifest>();
const chunkManifestPromiseCache = new Map<string, Promise<ChunkManifest>>();

const chunkEntriesCache = new Map<string, DictionaryEntry[]>();
const chunkEntriesPromiseCache = new Map<string, Promise<DictionaryEntry[]>>();

const chunkedDictionaryEntriesCache = new Map<string, DictionaryEntry[]>();
const chunkedDictionaryEntriesPromiseCache = new Map<
  string,
  Promise<DictionaryEntry[]>
>();

let jsonCanonicalHeadwordsCache: string[] | null = null;
let jsonCanonicalHeadwordsPromise: Promise<string[]> | null = null;

let apiCanonicalHeadwordsCache: string[] | null = null;
let apiCanonicalHeadwordsPromise: Promise<string[]> | null = null;

const normalizeSpace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const toComparableKey = (value: string): string =>
  normalizeSpace(value).toLowerCase();

const getCanonicalHeadword = (entry: DictionaryEntry): string => {
  const normalized = normalizeSpace(entry.headword?.normalized || "");
  if (normalized) {
    return normalized;
  }
  return normalizeSpace(entry.headword?.display || "");
};

const getEntryHeadwordForms = (entry: DictionaryEntry): string[] => {
  const forms = new Set<string>();

  const add = (value: string | undefined | null) => {
    if (!value) return;
    const cleaned = normalizeSpace(value);
    if (cleaned) forms.add(cleaned);
  };

  add(entry.headword?.display);
  add(entry.headword?.normalized);

  if (Array.isArray(entry.meta?.headword_variants)) {
    entry.meta.headword_variants.forEach((value: string) => add(value));
  }

  return Array.from(forms);
};

const dedupeEntriesById = (entries: DictionaryEntry[]): DictionaryEntry[] => {
  const map = new Map<string, DictionaryEntry>();
  for (const entry of entries) {
    if (!entry?.id) continue;
    if (!map.has(entry.id)) {
      map.set(entry.id, entry);
    }
  }
  return Array.from(map.values());
};

const sortEntries = (entries: DictionaryEntry[]): DictionaryEntry[] => {
  return [...entries].sort((a, b) => a.id.localeCompare(b.id));
};

const getIsApiEnabled = (): boolean => {
  const config = useRuntimeConfig();
  return (
    config.public.useApi === true || String(config.public.useApi) === "true"
  );
};

const getDictionaryIndex = async (): Promise<DictionaryIndexItem[]> => {
  if (dictionaryIndexCache) {
    return dictionaryIndexCache;
  }
  if (dictionaryIndexPromise) {
    return dictionaryIndexPromise;
  }

  dictionaryIndexPromise = (async () => {
    const raw = await readFile(DICTIONARY_INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw) as DictionaryIndex;
    const dictionaries = Array.isArray(parsed?.dictionaries)
      ? parsed.dictionaries
      : [];
    dictionaryIndexCache = dictionaries;
    return dictionaries;
  })();

  return dictionaryIndexPromise;
};

const readDictionaryEntriesFile = async (
  filePath: string,
): Promise<DictionaryEntry[]> => {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed as DictionaryEntry[];
};

const getNonChunkedEntries = async (): Promise<DictionaryEntry[]> => {
  if (nonChunkedEntriesCache) {
    return nonChunkedEntriesCache;
  }
  if (nonChunkedEntriesPromise) {
    return nonChunkedEntriesPromise;
  }

  nonChunkedEntriesPromise = (async () => {
    const dictionaries = await getDictionaryIndex();
    const entries: DictionaryEntry[] = [];

    for (const dict of dictionaries) {
      if (dict.chunked || !dict.file) continue;
      const filePath = resolve(DICTIONARY_ROOT, dict.file);
      const chunk = await readDictionaryEntriesFile(filePath);
      entries.push(...chunk);
    }

    nonChunkedEntriesCache = entries;
    return entries;
  })();

  return nonChunkedEntriesPromise;
};

const getChunkManifest = async (chunkDir: string): Promise<ChunkManifest> => {
  const cached = chunkManifestCache.get(chunkDir);
  if (cached) {
    return cached;
  }

  const pending = chunkManifestPromiseCache.get(chunkDir);
  if (pending) {
    return pending;
  }

  const manifestPromise = (async () => {
    const filePath = resolve(DICTIONARY_ROOT, chunkDir, "manifest.json");
    const raw = await readFile(filePath, "utf8");
    const manifest = JSON.parse(raw) as ChunkManifest;
    chunkManifestCache.set(chunkDir, manifest);
    return manifest;
  })();

  chunkManifestPromiseCache.set(chunkDir, manifestPromise);
  return manifestPromise;
};

const touchChunkCache = (cacheKey: string, entries: DictionaryEntry[]) => {
  if (chunkEntriesCache.has(cacheKey)) {
    chunkEntriesCache.delete(cacheKey);
  }
  chunkEntriesCache.set(cacheKey, entries);

  while (chunkEntriesCache.size > CHUNK_CACHE_LIMIT) {
    const oldestKey = chunkEntriesCache.keys().next().value;
    if (!oldestKey) break;
    chunkEntriesCache.delete(oldestKey);
  }
};

const getChunkEntries = async (
  chunkDir: string,
  chunkFile: string,
): Promise<DictionaryEntry[]> => {
  const cacheKey = `${chunkDir}/${chunkFile}`;
  const cached = chunkEntriesCache.get(cacheKey);
  if (cached) {
    touchChunkCache(cacheKey, cached);
    return cached;
  }

  const pending = chunkEntriesPromiseCache.get(cacheKey);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    const filePath = resolve(DICTIONARY_ROOT, chunkDir, chunkFile);
    const entries = await readDictionaryEntriesFile(filePath);
    touchChunkCache(cacheKey, entries);
    return entries;
  })().finally(() => {
    chunkEntriesPromiseCache.delete(cacheKey);
  });

  chunkEntriesPromiseCache.set(cacheKey, promise);
  return promise;
};

const getAllEntriesForChunkedDictionary = async (
  dict: DictionaryIndexItem,
): Promise<DictionaryEntry[]> => {
  const cacheKey = dict.id;
  const cached = chunkedDictionaryEntriesCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = chunkedDictionaryEntriesPromiseCache.get(cacheKey);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    if (!dict.chunk_dir) return [];

    const manifest = await getChunkManifest(dict.chunk_dir);
    const entries: DictionaryEntry[] = [];

    for (const chunkKey of Object.keys(manifest.chunks || {})) {
      const info = manifest.chunks?.[chunkKey];
      if (!info?.file) continue;
      const chunkEntries = await getChunkEntries(dict.chunk_dir, info.file);
      entries.push(...chunkEntries);
    }

    chunkedDictionaryEntriesCache.set(cacheKey, entries);
    return entries;
  })().finally(() => {
    chunkedDictionaryEntriesPromiseCache.delete(cacheKey);
  });

  chunkedDictionaryEntriesPromiseCache.set(cacheKey, promise);
  return promise;
};

const getQueryForms = async (headword: string): Promise<string[]> => {
  const cleaned = normalizeSpace(headword);
  if (!cleaned) return [];

  await ensureInitialized();

  const forms = new Set<string>();
  forms.add(cleaned);

  try {
    forms.add(normalizeSpace(await toSimplified(cleaned)));
    forms.add(normalizeSpace(await toTraditional(cleaned)));
  } catch {
    // 转换失败时保留原文查询
  }

  return Array.from(forms).filter(Boolean);
};

const matchesQuery = (
  entry: DictionaryEntry,
  queryKeys: Set<string>,
): boolean => {
  const forms = getEntryHeadwordForms(entry);
  for (const form of forms) {
    const key = toComparableKey(form);
    if (key && queryKeys.has(key)) {
      return true;
    }
  }
  return false;
};

const selectBestBucket = (
  buckets: Map<string, WordBucket>,
  originalKey: string,
  queryKeys: Set<string>,
): WordBucket | null => {
  const candidates = Array.from(buckets.values());
  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    // Highest priority: exact match on original (pre-conversion) headword
    const aOriginal = a.key === originalKey ? 1 : 0;
    const bOriginal = b.key === originalKey ? 1 : 0;
    if (aOriginal !== bOriginal) {
      return bOriginal - aOriginal;
    }

    // Next: match on any query form (including converted forms)
    const aExact = queryKeys.has(a.key) ? 1 : 0;
    const bExact = queryKeys.has(b.key) ? 1 : 0;
    if (aExact !== bExact) {
      return bExact - aExact;
    }

    if (a.entries.length !== b.entries.length) {
      return b.entries.length - a.entries.length;
    }

    return a.canonicalHeadword.localeCompare(b.canonicalHeadword, "zh-Hant");
  });

  return candidates[0] || null;
};

const groupEntriesByCanonical = (
  entries: DictionaryEntry[],
  originalKey: string,
  queryKeys: Set<string>,
): WordBucket | null => {
  const buckets = new Map<string, WordBucket>();

  for (const entry of entries) {
    const canonicalHeadword = getCanonicalHeadword(entry);
    const key = toComparableKey(canonicalHeadword);
    if (!key) continue;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        canonicalHeadword,
        entries: [],
      };
      buckets.set(key, bucket);
    }

    bucket.entries.push(entry);
  }

  return selectBestBucket(buckets, originalKey, queryKeys);
};

const findEntriesFromChunkedDictionary = async (
  dict: DictionaryIndexItem,
  queryForms: string[],
  queryKeys: Set<string>,
): Promise<DictionaryEntry[]> => {
  if (!dict.chunk_dir) return [];

  const manifest = await getChunkManifest(dict.chunk_dir);
  const chunkKeys = new Set<string>();

  for (const form of queryForms) {
    const firstChar = Array.from(form)[0];
    if (!firstChar) continue;
    const variants = new Set([
      firstChar,
      firstChar.toLowerCase(),
      firstChar.toUpperCase(),
    ]);
    for (const variant of variants) {
      const mapped = manifest.headwordIndex?.[variant];
      if (!mapped) continue;
      mapped.forEach((value) => chunkKeys.add(value));
    }
  }

  if (chunkKeys.size === 0) {
    const allEntries = await getAllEntriesForChunkedDictionary(dict);
    return allEntries.filter((entry) => matchesQuery(entry, queryKeys));
  }

  const candidateEntries: DictionaryEntry[] = [];
  for (const chunkKey of chunkKeys) {
    const info = manifest.chunks?.[chunkKey];
    if (!info?.file) continue;
    const entries = await getChunkEntries(dict.chunk_dir, info.file);
    candidateEntries.push(...entries);
  }

  return candidateEntries.filter((entry) => matchesQuery(entry, queryKeys));
};

const resolveFromJson = async (
  headword: string,
): Promise<ResolvedWordResult | null> => {
  const queryForms = await getQueryForms(headword);
  if (queryForms.length === 0) {
    return null;
  }

  const originalKey = toComparableKey(normalizeSpace(headword));
  const queryKeys = new Set(queryForms.map(toComparableKey).filter(Boolean));
  const dictionaries = await getDictionaryIndex();

  const candidateEntries: DictionaryEntry[] = [];
  const nonChunked = await getNonChunkedEntries();
  candidateEntries.push(
    ...nonChunked.filter((entry) => matchesQuery(entry, queryKeys)),
  );

  for (const dict of dictionaries) {
    if (!dict.chunked) continue;
    const entries = await findEntriesFromChunkedDictionary(
      dict,
      queryForms,
      queryKeys,
    );
    candidateEntries.push(...entries);
  }

  const deduped = dedupeEntriesById(candidateEntries);
  const selected = groupEntriesByCanonical(deduped, originalKey, queryKeys);
  if (!selected) {
    return null;
  }

  return {
    canonicalHeadword: selected.canonicalHeadword,
    entries: sortEntries(dedupeEntriesById(selected.entries)),
  };
};

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const resolveFromApi = async (
  headword: string,
): Promise<ResolvedWordResult | null> => {
  const queryForms = await getQueryForms(headword);
  if (queryForms.length === 0) {
    return null;
  }

  const originalKey = toComparableKey(normalizeSpace(headword));
  const queryKeys = new Set(queryForms.map(toComparableKey).filter(Boolean));
  const collection = await getEntriesCollection();

  const orConditions: any[] = [];
  for (const form of queryForms) {
    const safe = escapeRegex(form);
    const matcher = { $regex: `^${safe}$`, $options: "i" };
    orConditions.push(
      { "headword.normalized": matcher },
      { "headword.display": matcher },
      { "meta.headword_variants": { $elemMatch: matcher } },
    );
  }

  const entries = await collection
    .find<DictionaryEntry>({ $or: orConditions }, { projection: { _id: 0 } })
    .toArray();

  const deduped = dedupeEntriesById(entries).filter((entry) =>
    matchesQuery(entry, queryKeys),
  );
  const selected = groupEntriesByCanonical(deduped, originalKey, queryKeys);
  if (!selected) {
    return null;
  }

  return {
    canonicalHeadword: selected.canonicalHeadword,
    entries: sortEntries(dedupeEntriesById(selected.entries)),
  };
};

const buildJsonCanonicalHeadwords = async (): Promise<string[]> => {
  const set = new Map<string, string>();
  const dictionaries = await getDictionaryIndex();

  const collectFromEntries = (entries: DictionaryEntry[]) => {
    for (const entry of entries) {
      const canonical = getCanonicalHeadword(entry);
      const key = toComparableKey(canonical);
      if (!key) continue;
      if (!set.has(key)) {
        set.set(key, canonical);
      }
    }
  };

  collectFromEntries(await getNonChunkedEntries());

  for (const dict of dictionaries) {
    if (!dict.chunked || !dict.chunk_dir) continue;

    collectFromEntries(await getAllEntriesForChunkedDictionary(dict));
  }

  return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "zh-Hant"));
};

const getCanonicalHeadwordsFromJson = async (): Promise<string[]> => {
  if (jsonCanonicalHeadwordsCache) {
    return jsonCanonicalHeadwordsCache;
  }
  if (jsonCanonicalHeadwordsPromise) {
    return jsonCanonicalHeadwordsPromise;
  }

  jsonCanonicalHeadwordsPromise = buildJsonCanonicalHeadwords().then(
    (headwords) => {
      jsonCanonicalHeadwordsCache = headwords;
      return headwords;
    },
  );

  return jsonCanonicalHeadwordsPromise;
};

const getCanonicalHeadwordsFromApi = async (): Promise<string[]> => {
  if (apiCanonicalHeadwordsCache) {
    return apiCanonicalHeadwordsCache;
  }
  if (apiCanonicalHeadwordsPromise) {
    return apiCanonicalHeadwordsPromise;
  }

  apiCanonicalHeadwordsPromise = (async () => {
    const collection = await getEntriesCollection();

    const rows = (await collection
      .aggregate(
        [
          {
            $project: {
              canonicalHeadword: {
                $let: {
                  vars: {
                    normalized: {
                      $trim: {
                        input: { $ifNull: ["$headword.normalized", ""] },
                      },
                    },
                    display: {
                      $trim: { input: { $ifNull: ["$headword.display", ""] } },
                    },
                  },
                  in: {
                    $cond: [
                      { $ne: ["$$normalized", ""] },
                      "$$normalized",
                      "$$display",
                    ],
                  },
                },
              },
            },
          },
          {
            $match: {
              canonicalHeadword: { $ne: "" },
            },
          },
          {
            $group: {
              _id: { $toLower: "$canonicalHeadword" },
              canonicalHeadword: { $first: "$canonicalHeadword" },
            },
          },
          {
            $project: {
              _id: 0,
              canonicalHeadword: 1,
            },
          },
        ],
        { allowDiskUse: true },
      )
      .toArray()) as Array<{ canonicalHeadword: string }>;

    const headwords = rows
      .map((row) => normalizeSpace(row.canonicalHeadword || ""))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "zh-Hant"));

    apiCanonicalHeadwordsCache = headwords;
    return headwords;
  })();

  return apiCanonicalHeadwordsPromise;
};

export const resolveWordEntries = async (
  headword: string,
): Promise<ResolvedWordResult | null> => {
  const cleaned = normalizeSpace(headword);
  if (!cleaned) {
    return null;
  }

  const useApi = getIsApiEnabled();

  if (useApi) {
    try {
      return await resolveFromApi(cleaned);
    } catch (error) {
      console.error(
        "Word resolve (API mode) failed, fallback to JSON mode:",
        error,
      );
      return resolveFromJson(cleaned);
    }
  }

  return resolveFromJson(cleaned);
};

export const getCanonicalHeadwords = async (): Promise<string[]> => {
  const useApi = getIsApiEnabled();

  if (useApi) {
    try {
      return await getCanonicalHeadwordsFromApi();
    } catch (error) {
      console.error(
        "Canonical headwords (API mode) failed, fallback to JSON mode:",
        error,
      );
      return getCanonicalHeadwordsFromJson();
    }
  }

  return getCanonicalHeadwordsFromJson();
};

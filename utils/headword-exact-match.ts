import type { DictionaryEntry } from "../types/dictionary.ts";
import {
  ensureInitialized,
  toSimplified,
  toTraditional,
} from "../server/utils/opencc.ts";
import {
  EXACT_MATCH_BUCKET_HASH,
  EXACT_MATCH_BUCKET_MOD,
  getExactMatchBucketId,
  getExactMatchBucketWidth,
} from "../server/utils/exact-match-bucket.js";
import { isJyutpingQuery, normalizeSearchQuery } from "./query-classify.ts";

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

interface CandidateResolution {
  originalKey: string;
  queryKeys: Set<string>;
  entries: DictionaryEntry[];
}

export type WordResolveStrategy =
  | "exact_index"
  | "scanned_json"
  | "api_fallback";

export interface WordResolveTrace {
  phaseMs: Record<string, number>;
  counts: Record<string, number>;
  strategy?: WordResolveStrategy;
}

export interface ResolvedWordResult {
  canonicalHeadword: string;
  entries: DictionaryEntry[];
}

export interface SearchLandingResolution {
  type: "word" | "search";
  reason:
    | "exact_unique"
    | "empty_query"
    | "reverse_search"
    | "jyutping_query"
    | "ambiguous_exact_match"
    | "no_exact_match";
  canonicalHeadword?: string;
}

const DICTIONARY_ASSET_ROOT = "/dictionaries";
const EXACT_MATCH_ASSET_ROOT = "/exact-match";
const CHUNK_CACHE_LIMIT = 24;
const DEFAULT_CANONICAL_HEADWORDS_ASSET = "canonical-headwords.json";

interface WorkerAssetsBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface ExactMatchCandidateRecord {
  key: string;
  canonicalHeadword: string;
}

interface ExactMatchFormsBucket {
  forms?: Record<string, ExactMatchCandidateRecord[]>;
}

interface ExactMatchWordRecord {
  canonicalHeadword: string;
  entries: DictionaryEntry[];
}

interface ExactMatchWordsBucket {
  words?: Record<string, ExactMatchWordRecord>;
}

interface ExactMatchManifest {
  schema_version?: string;
  bucket_hash?: string;
  bucket_mod?: number;
  bucket_width?: number;
  canonical_headwords_asset?: string;
  canonical_headwords_count?: number;
}

interface ExactMatchConfig {
  bucketMod: number;
  bucketWidth: number;
  canonicalHeadwordsAsset: string;
}

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

let exactMatchManifestCache: ExactMatchManifest | null | undefined;
let exactMatchManifestPromise: Promise<ExactMatchManifest | null> | null = null;

const exactMatchFormsBucketCache = new Map<string, ExactMatchFormsBucket>();
const exactMatchFormsBucketPromiseCache = new Map<
  string,
  Promise<ExactMatchFormsBucket>
>();

const exactMatchWordsBucketCache = new Map<string, ExactMatchWordsBucket>();
const exactMatchWordsBucketPromiseCache = new Map<
  string,
  Promise<ExactMatchWordsBucket>
>();

const normalizeSpace = (value: string): string => normalizeSearchQuery(value);

const measureTraceAsync = async <T>(
  trace: WordResolveTrace | undefined,
  key: string,
  fn: () => Promise<T>,
): Promise<T> => {
  if (!trace) {
    return await fn();
  }

  const startedAt = Date.now();
  try {
    return await fn();
  } finally {
    trace.phaseMs[key] = (trace.phaseMs[key] || 0) + (Date.now() - startedAt);
  }
};

const measureTraceSync = <T>(
  trace: WordResolveTrace | undefined,
  key: string,
  fn: () => T,
): T => {
  if (!trace) {
    return fn();
  }

  const startedAt = Date.now();
  try {
    return fn();
  } finally {
    trace.phaseMs[key] = (trace.phaseMs[key] || 0) + (Date.now() - startedAt);
  }
};

const setTraceCount = (
  trace: WordResolveTrace | undefined,
  key: string,
  value: number,
) => {
  if (!trace) {
    return;
  }

  trace.counts[key] = value;
};

const getWorkerAssetsBinding = (): WorkerAssetsBinding | null => {
  const runtimeEnv = (
    globalThis as typeof globalThis & {
      __env__?: {
        ASSETS?: WorkerAssetsBinding;
      };
    }
  ).__env__;

  const assets = runtimeEnv?.ASSETS;
  return assets && typeof assets.fetch === "function" ? assets : null;
};

const isWorkerAssetsRuntime = (): boolean => {
  return Boolean(getWorkerAssetsBinding());
};

const buildDictionaryAssetPath = (...segments: string[]): string => {
  const cleaned = segments
    .map((segment) => String(segment || "").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);

  return [DICTIONARY_ASSET_ROOT, ...cleaned].join("/");
};

const buildExactMatchAssetPath = (...segments: string[]): string => {
  const cleaned = segments
    .map((segment) => String(segment || "").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);

  return [EXACT_MATCH_ASSET_ROOT, ...cleaned].join("/");
};

const readDictionaryText = async (assetPath: string): Promise<string> => {
  const assets = getWorkerAssetsBinding();

  if (assets) {
    const response = await assets.fetch(
      new Request(new URL(assetPath, "https://assets.local").toString()),
    );

    if (!response.ok) {
      throw new Error(
        `Failed to read static dictionary asset: ${assetPath} (${response.status})`,
      );
    }

    return await response.text();
  }

  const [{ readFile }, { resolve }] = await Promise.all([
    import("node:fs/promises"),
    import("node:path"),
  ]);
  const localPath = resolve(process.cwd(), "public", assetPath.replace(/^\/+/, ""));
  return readFile(localPath, "utf8");
};

export const toComparableHeadwordKey = (value: string): string => {
  return normalizeSpace(value).toLowerCase();
};

const isMissingAssetError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("ENOENT") ||
    message.includes("(404)") ||
    message.includes("(400)") ||
    message.includes("Cannot find module")
  );
};

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
    if (cleaned) {
      forms.add(cleaned);
    }
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

const getExactMatchManifest = async (): Promise<ExactMatchManifest | null> => {
  if (exactMatchManifestCache !== undefined) {
    return exactMatchManifestCache;
  }

  if (exactMatchManifestPromise) {
    return exactMatchManifestPromise;
  }

  exactMatchManifestPromise = (async () => {
    try {
      const raw = await readDictionaryText(
        buildExactMatchAssetPath("manifest.json"),
      );
      const parsed = JSON.parse(raw) as ExactMatchManifest;
      exactMatchManifestCache = parsed;
      return parsed;
    } catch (error) {
      if (isMissingAssetError(error)) {
        exactMatchManifestCache = null;
        return null;
      }

      throw error;
    }
  })();

  return exactMatchManifestPromise;
};

const getExactMatchConfig = async (): Promise<ExactMatchConfig | null> => {
  const manifest = await getExactMatchManifest();
  if (!manifest) {
    return null;
  }

  const bucketHash = String(manifest.bucket_hash || "").trim();
  if (bucketHash && bucketHash !== EXACT_MATCH_BUCKET_HASH) {
    throw new Error(`Unsupported exact-match bucket hash: ${bucketHash}`);
  }

  const bucketMod =
    Number.isInteger(manifest.bucket_mod) && Number(manifest.bucket_mod) > 0
      ? Number(manifest.bucket_mod)
      : EXACT_MATCH_BUCKET_MOD;
  const bucketWidth =
    Number.isInteger(manifest.bucket_width) && Number(manifest.bucket_width) > 0
      ? Number(manifest.bucket_width)
      : getExactMatchBucketWidth(bucketMod);

  return {
    bucketMod,
    bucketWidth,
    canonicalHeadwordsAsset:
      String(manifest.canonical_headwords_asset || "").trim() ||
      DEFAULT_CANONICAL_HEADWORDS_ASSET,
  };
};

const getExactMatchFormsBucket = async (
  bucketId: string,
  trace?: WordResolveTrace,
): Promise<ExactMatchFormsBucket> => {
  const cached = exactMatchFormsBucketCache.get(bucketId);
  if (cached) {
    return cached;
  }

  const pending = exactMatchFormsBucketPromiseCache.get(bucketId);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    try {
      const raw = await measureTraceAsync(trace, "exact.forms_fetch", () =>
        readDictionaryText(buildExactMatchAssetPath("forms", `${bucketId}.json`)),
      );
      const parsed = measureTraceSync(trace, "exact.forms_parse", () =>
        JSON.parse(raw) as ExactMatchFormsBucket,
      );
      exactMatchFormsBucketCache.set(bucketId, parsed);
      return parsed;
    } catch (error) {
      if (isMissingAssetError(error)) {
        const emptyBucket: ExactMatchFormsBucket = { forms: {} };
        exactMatchFormsBucketCache.set(bucketId, emptyBucket);
        return emptyBucket;
      }

      throw error;
    }
  })().finally(() => {
    exactMatchFormsBucketPromiseCache.delete(bucketId);
  });

  exactMatchFormsBucketPromiseCache.set(bucketId, promise);
  return promise;
};

const getExactMatchWordsBucket = async (
  bucketId: string,
  trace?: WordResolveTrace,
): Promise<ExactMatchWordsBucket> => {
  const cached = exactMatchWordsBucketCache.get(bucketId);
  if (cached) {
    return cached;
  }

  const pending = exactMatchWordsBucketPromiseCache.get(bucketId);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    try {
      const raw = await measureTraceAsync(trace, "exact.words_fetch", () =>
        readDictionaryText(buildExactMatchAssetPath("words", `${bucketId}.json`)),
      );
      const parsed = measureTraceSync(trace, "exact.words_parse", () =>
        JSON.parse(raw) as ExactMatchWordsBucket,
      );
      exactMatchWordsBucketCache.set(bucketId, parsed);
      return parsed;
    } catch (error) {
      if (isMissingAssetError(error)) {
        const emptyBucket: ExactMatchWordsBucket = { words: {} };
        exactMatchWordsBucketCache.set(bucketId, emptyBucket);
        return emptyBucket;
      }

      throw error;
    }
  })().finally(() => {
    exactMatchWordsBucketPromiseCache.delete(bucketId);
  });

  exactMatchWordsBucketPromiseCache.set(bucketId, promise);
  return promise;
};

const getDictionaryIndex = async (): Promise<DictionaryIndexItem[]> => {
  if (dictionaryIndexCache) {
    return dictionaryIndexCache;
  }

  if (dictionaryIndexPromise) {
    return dictionaryIndexPromise;
  }

  dictionaryIndexPromise = (async () => {
    const raw = await readDictionaryText(buildDictionaryAssetPath("index.json"));
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
  assetPath: string,
): Promise<DictionaryEntry[]> => {
  const raw = await readDictionaryText(assetPath);
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

      const chunk = await readDictionaryEntriesFile(
        buildDictionaryAssetPath(dict.file),
      );
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
    const raw = await readDictionaryText(
      buildDictionaryAssetPath(chunkDir, "manifest.json"),
    );
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
    const entries = await readDictionaryEntriesFile(
      buildDictionaryAssetPath(chunkDir, chunkFile),
    );

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

export const getExactQueryForms = async (
  headword: string,
): Promise<string[]> => {
  const cleaned = normalizeSpace(headword);
  if (!cleaned) return [];

  await ensureInitialized();

  const forms = new Set<string>();
  forms.add(cleaned);

  try {
    forms.add(normalizeSpace(await toSimplified(cleaned)));
    forms.add(normalizeSpace(await toTraditional(cleaned)));
  } catch {
    // Keep the original query when conversion fails.
  }

  return Array.from(forms).filter(Boolean);
};

export const matchesExactQuery = (
  entry: DictionaryEntry,
  queryKeys: Set<string>,
): boolean => {
  const forms = getEntryHeadwordForms(entry);

  for (const form of forms) {
    const key = toComparableHeadwordKey(form);
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
    const aOriginal = a.key === originalKey ? 1 : 0;
    const bOriginal = b.key === originalKey ? 1 : 0;
    if (aOriginal !== bOriginal) {
      return bOriginal - aOriginal;
    }

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

const groupEntriesIntoBuckets = (
  entries: DictionaryEntry[],
): Map<string, WordBucket> => {
  const buckets = new Map<string, WordBucket>();

  for (const entry of entries) {
    const canonicalHeadword = getCanonicalHeadword(entry);
    const key = toComparableHeadwordKey(canonicalHeadword);
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

  return buckets;
};

export const countExactCanonicalBuckets = (
  entries: DictionaryEntry[],
): number => {
  return groupEntriesIntoBuckets(dedupeEntriesById(entries)).size;
};

export const resolveUniqueCanonicalHeadwordFromEntries = (
  entries: DictionaryEntry[],
): string | null => {
  const buckets = groupEntriesIntoBuckets(dedupeEntriesById(entries));
  if (buckets.size !== 1) {
    return null;
  }

  return buckets.values().next().value?.canonicalHeadword || null;
};

export const resolvePreferredSearchLandingHeadwordFromEntries = (
  entries: DictionaryEntry[],
  originalQuery: string,
): string | null => {
  const dedupedEntries = dedupeEntriesById(entries);
  const buckets = groupEntriesIntoBuckets(dedupedEntries);

  if (buckets.size === 1) {
    return buckets.values().next().value?.canonicalHeadword || null;
  }

  const originalKey = toComparableHeadwordKey(originalQuery);
  if (!originalKey) {
    return null;
  }

  const exactOriginalBuckets = Array.from(buckets.values()).filter(
    (bucket) => bucket.key === originalKey,
  );

  if (exactOriginalBuckets.length !== 1) {
    return null;
  }

  return exactOriginalBuckets[0]?.canonicalHeadword || null;
};

export const resolveSearchLandingFromEntries = (
  entries: DictionaryEntry[],
  originalQuery: string = "",
): SearchLandingResolution => {
  const canonicalHeadword =
    resolvePreferredSearchLandingHeadwordFromEntries(entries, originalQuery);

  if (!canonicalHeadword) {
    return {
      type: "search",
      reason: entries.length > 0 ? "ambiguous_exact_match" : "no_exact_match",
    };
  }

  return {
    type: "word",
    reason: "exact_unique",
    canonicalHeadword,
  };
};

export const selectCanonicalWordEntries = (
  entries: DictionaryEntry[],
  originalKey: string,
  queryKeys: Set<string>,
): ResolvedWordResult | null => {
  const selected = selectBestBucket(
    groupEntriesIntoBuckets(dedupeEntriesById(entries)),
    originalKey,
    queryKeys,
  );

  if (!selected) {
    return null;
  }

  return {
    canonicalHeadword: selected.canonicalHeadword,
    entries: sortEntries(dedupeEntriesById(selected.entries)),
  };
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
    return allEntries.filter((entry) => matchesExactQuery(entry, queryKeys));
  }

  const candidateEntries: DictionaryEntry[] = [];
  for (const chunkKey of chunkKeys) {
    const info = manifest.chunks?.[chunkKey];
    if (!info?.file) continue;

    const entries = await getChunkEntries(dict.chunk_dir, info.file);
    candidateEntries.push(...entries);
  }

  return candidateEntries.filter((entry) =>
    matchesExactQuery(entry, queryKeys),
  );
};

const resolveCandidatesFromExactMatchIndex = async (
  headword: string,
  trace?: WordResolveTrace,
): Promise<CandidateResolution | null> => {
  const config = await getExactMatchConfig();
  if (!config) {
    return null;
  }

  const cleaned = normalizeSpace(headword);
  const originalKey = toComparableHeadwordKey(cleaned);
  if (!originalKey) {
    return null;
  }

  if (trace) {
    trace.strategy = "exact_index";
  }

  const formsBucket = await getExactMatchFormsBucket(
    getExactMatchBucketId(originalKey, config),
    trace,
  );
  const candidates = formsBucket.forms?.[originalKey] || [];
  if (candidates.length === 0) {
    setTraceCount(trace, "exact.words_bucket_count", 0);
    return {
      originalKey,
      queryKeys: new Set([originalKey]),
      entries: [],
    };
  }

  const wordBuckets = new Map<string, ExactMatchWordsBucket>();
  const wordBucketIds = new Set<string>();
  const entries: DictionaryEntry[] = [];

  for (const candidate of candidates) {
    const bucketId = getExactMatchBucketId(candidate.key, config);
    wordBucketIds.add(bucketId);
    let wordsBucket = wordBuckets.get(bucketId);
    if (!wordsBucket) {
      wordsBucket = await getExactMatchWordsBucket(bucketId, trace);
      wordBuckets.set(bucketId, wordsBucket);
    }

    const record = wordsBucket.words?.[candidate.key];
    if (!record?.entries?.length) {
      continue;
    }

    entries.push(...record.entries);
  }

  setTraceCount(trace, "exact.words_bucket_count", wordBucketIds.size);

  return {
    originalKey,
    queryKeys: new Set([originalKey]),
    entries: dedupeEntriesById(entries),
  };
};

const resolveCandidatesFromScannedJson = async (
  headword: string,
  trace?: WordResolveTrace,
): Promise<CandidateResolution | null> => {
  if (trace) {
    trace.strategy = "scanned_json";
  }

  const queryForms = await getExactQueryForms(headword);
  if (queryForms.length === 0) {
    return null;
  }

  const originalKey = toComparableHeadwordKey(normalizeSpace(headword));
  const queryKeys = new Set(
    queryForms.map(toComparableHeadwordKey).filter(Boolean),
  );
  const dictionaries = await getDictionaryIndex();

  const candidateEntries: DictionaryEntry[] = [];
  const nonChunked = await getNonChunkedEntries();
  candidateEntries.push(
    ...nonChunked.filter((entry) => matchesExactQuery(entry, queryKeys)),
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

  return {
    originalKey,
    queryKeys,
    entries: dedupeEntriesById(candidateEntries),
  };
};

const resolveCandidatesFromJson = async (
  headword: string,
  trace?: WordResolveTrace,
): Promise<CandidateResolution | null> => {
  const indexedCandidates = await resolveCandidatesFromExactMatchIndex(
    headword,
    trace,
  );
  if (indexedCandidates) {
    return indexedCandidates;
  }

  if (isWorkerAssetsRuntime()) {
    return null;
  }

  return resolveCandidatesFromScannedJson(headword, trace);
};

export const resolveWordEntriesFromJson = async (
  headword: string,
  trace?: WordResolveTrace,
): Promise<ResolvedWordResult | null> => {
  const candidates = await resolveCandidatesFromJson(headword, trace);
  if (!candidates) {
    return null;
  }

  return selectCanonicalWordEntries(
    candidates.entries,
    candidates.originalKey,
    candidates.queryKeys,
  );
};

export const resolveSearchLandingFromJson = async (
  query: string,
  options: { reverse?: boolean } = {},
): Promise<SearchLandingResolution> => {
  const cleaned = normalizeSpace(query);
  if (!cleaned) {
    return {
      type: "search",
      reason: "empty_query",
    };
  }

  if (options.reverse) {
    return {
      type: "search",
      reason: "reverse_search",
    };
  }

  if (isJyutpingQuery(cleaned)) {
    return {
      type: "search",
      reason: "jyutping_query",
    };
  }

  const candidates = await resolveCandidatesFromJson(cleaned);
  return resolveSearchLandingFromEntries(candidates?.entries || [], cleaned);
};

const buildJsonCanonicalHeadwords = async (): Promise<string[]> => {
  const set = new Map<string, string>();
  const dictionaries = await getDictionaryIndex();

  const collectFromEntries = (entries: DictionaryEntry[]) => {
    for (const entry of entries) {
      const canonical = getCanonicalHeadword(entry);
      const key = toComparableHeadwordKey(canonical);
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

export const getCanonicalHeadwordsFromJson = async (): Promise<string[]> => {
  if (jsonCanonicalHeadwordsCache) {
    return jsonCanonicalHeadwordsCache;
  }

  if (jsonCanonicalHeadwordsPromise) {
    return jsonCanonicalHeadwordsPromise;
  }

  jsonCanonicalHeadwordsPromise = (async () => {
    const config = await getExactMatchConfig();

    let headwords: string[] | null = null;

    if (config) {
      try {
        const raw = await readDictionaryText(
          buildExactMatchAssetPath(config.canonicalHeadwordsAsset),
        );
        const parsed = JSON.parse(raw) as
          | { canonical_headwords?: string[] }
          | string[];
        headwords = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.canonical_headwords)
            ? parsed.canonical_headwords
            : [];
      } catch (error) {
        if (!isMissingAssetError(error)) {
          throw error;
        }

        if (isWorkerAssetsRuntime()) {
          console.error(
            "Exact-match canonical headwords asset missing in Worker runtime:",
            error,
          );
          headwords = [];
        }
      }
    }

    if (!headwords) {
      headwords = isWorkerAssetsRuntime()
        ? []
        : await buildJsonCanonicalHeadwords();
    }

    jsonCanonicalHeadwordsCache = headwords;
    return headwords;
  })();

  return jsonCanonicalHeadwordsPromise;
};

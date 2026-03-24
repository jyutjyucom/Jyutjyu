import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DictionaryEntry } from "~/types/dictionary";
import { getEntriesCollection } from "./mongodb";
import bundledDictionaryIndex from "~/content/dictionaries/index.json";

interface DictionaryIndexItem {
  id: string;
  name?: string | Record<string, string>;
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
}

interface BrowseScopeHeadwords {
  byHeadword: string[];
  byJyutping: string[];
}

interface BrowseDataset {
  scopes: Map<string, BrowseScopeHeadwords>;
  dictionaries: BrowseDictionaryScope[];
}

interface BrowseIndexManifestScope {
  total: number;
  total_pages_by_size?: Record<string, number>;
}

interface BrowseIndexManifest {
  schema_version?: string;
  generated_at?: string;
  page_sizes?: number[];
  dictionaries?: BrowseDictionaryScope[];
  scopes?: Record<string, BrowseIndexManifestScope>;
}

interface BrowsePageOptions {
  page: number;
  scope?: string;
  pageSize?: number;
  sort?: BrowseSort;
}

interface ApiCanonicalRow {
  _id: {
    sourceBook: string;
    canonicalKey: string;
  };
  canonicalHeadword: string;
  jyutpingSortKey?: string;
}

export type BrowseSort = "headword" | "jyutping";

export interface BrowseDictionaryScope {
  id: string;
  label: string;
  total: number;
}

export interface BrowsePageData {
  headwords: string[];
  total: number;
  allTotal: number;
  page: number;
  totalPages: number;
  pageSize: number;
  sort: BrowseSort;
  scope: string;
  dictionaries: BrowseDictionaryScope[];
}

const DEFAULT_PAGE_SIZE = 100;
const ALLOWED_PAGE_SIZES = new Set([100, 500, 1000]);
const DEFAULT_SORT: BrowseSort = "headword";
const ALLOWED_SORTS = new Set<BrowseSort>(["headword", "jyutping"]);
const DICTIONARY_ROOT = resolve(process.cwd(), "public/dictionaries");
const DICTIONARY_INDEX_PATH = resolve(DICTIONARY_ROOT, "index.json");
const BROWSE_INDEX_ROOT = resolve(process.cwd(), "public/browse-index");
const BROWSE_MANIFEST_PATH = resolve(BROWSE_INDEX_ROOT, "manifest.json");

const bundledDictionaries = Array.isArray(
  (bundledDictionaryIndex as DictionaryIndex)?.dictionaries,
)
  ? (bundledDictionaryIndex as DictionaryIndex).dictionaries
  : [];

let browseDatasetCache: BrowseDataset | null = null;
let browseDatasetPromise: Promise<BrowseDataset> | null = null;
let browseManifestCache: BrowseIndexManifest | null = null;
let browseManifestPromise: Promise<BrowseIndexManifest | null> | null = null;

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

const getIsApiEnabled = (): boolean => {
  const config = useRuntimeConfig();
  return (
    config.public.useApi === true || String(config.public.useApi) === "true"
  );
};

const pickDictionaryLabel = (dict: DictionaryIndexItem): string => {
  if (!dict.name) return dict.id;
  if (typeof dict.name === "string") return dict.name;

  return (
    dict.name["yue-Hant"] ||
    dict.name["yue-Hans"] ||
    Object.values(dict.name).find(
      (value) => typeof value === "string" && value.trim(),
    ) ||
    dict.id
  );
};

const getDictionaryNameVariants = (dict: DictionaryIndexItem): string[] => {
  const variants = new Set<string>();
  variants.add(dict.id);

  if (typeof dict.name === "string") {
    const cleaned = normalizeSpace(dict.name);
    if (cleaned) variants.add(cleaned);
  } else if (dict.name && typeof dict.name === "object") {
    Object.values(dict.name).forEach((value) => {
      if (typeof value !== "string") return;
      const cleaned = normalizeSpace(value);
      if (cleaned) variants.add(cleaned);
    });
  }

  return Array.from(variants);
};

const normalizePageSize = (value: number | undefined): number => {
  const parsed = Number.isFinite(value) ? Number(value) : DEFAULT_PAGE_SIZE;
  return ALLOWED_PAGE_SIZES.has(parsed) ? parsed : DEFAULT_PAGE_SIZE;
};

const normalizeSort = (value: string | undefined): BrowseSort => {
  const lowered = normalizeSpace(value || "").toLowerCase() as BrowseSort;
  return ALLOWED_SORTS.has(lowered) ? lowered : DEFAULT_SORT;
};

const sortHeadwords = (headwords: string[]): string[] => {
  return [...headwords].sort((a, b) => a.localeCompare(b, "zh-Hant"));
};

const getPrimaryJyutping = (entry: DictionaryEntry): string => {
  const primary = entry.phonetic?.jyutping?.[0] || "";
  return normalizeSpace(primary).toLowerCase();
};

const sortByJyutping = (
  headwordMap: Map<string, string>,
  jyutpingMap: Map<string, string>,
): string[] => {
  const rows = Array.from(headwordMap.entries()).map(
    ([comparable, headword]) => ({
      comparable,
      headword,
      jyutping: jyutpingMap.get(comparable) || "",
    }),
  );

  rows.sort((a, b) => {
    const aMissing = a.jyutping ? 0 : 1;
    const bMissing = b.jyutping ? 0 : 1;
    if (aMissing !== bMissing) {
      return aMissing - bMissing;
    }

    const jyutpingCompare = a.jyutping.localeCompare(b.jyutping, "en");
    if (jyutpingCompare !== 0) {
      return jyutpingCompare;
    }

    return a.headword.localeCompare(b.headword, "zh-Hant");
  });

  return rows.map((row) => row.headword);
};

const toScopeHeadwords = (
  headwordMap: Map<string, string>,
  jyutpingMap: Map<string, string>,
): BrowseScopeHeadwords => {
  return {
    byHeadword: sortHeadwords(Array.from(headwordMap.values())),
    byJyutping: sortByJyutping(headwordMap, jyutpingMap),
  };
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

const loadDictionaryIndex = async (): Promise<DictionaryIndexItem[]> => {
  if (bundledDictionaries.length > 0) {
    return bundledDictionaries;
  }

  const raw = await readFile(DICTIONARY_INDEX_PATH, "utf8");
  const parsed = JSON.parse(raw) as DictionaryIndex;
  return Array.isArray(parsed?.dictionaries) ? parsed.dictionaries : [];
};

const loadBrowseManifest = async (): Promise<BrowseIndexManifest | null> => {
  try {
    const raw = await readFile(BROWSE_MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw) as BrowseIndexManifest;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

const getBrowseManifest = async (): Promise<BrowseIndexManifest | null> => {
  if (browseManifestCache) {
    return browseManifestCache;
  }
  if (browseManifestPromise) {
    return browseManifestPromise;
  }

  browseManifestPromise = loadBrowseManifest()
    .then((manifest) => {
      browseManifestCache = manifest;
      return manifest;
    })
    .finally(() => {
      browseManifestPromise = null;
    });

  return browseManifestPromise;
};

const getDictionaryEntries = async (
  dict: DictionaryIndexItem,
): Promise<DictionaryEntry[]> => {
  if (!dict.chunked && dict.file) {
    return readDictionaryEntriesFile(resolve(DICTIONARY_ROOT, dict.file));
  }

  if (dict.chunked && dict.chunk_dir) {
    const manifestRaw = await readFile(
      resolve(DICTIONARY_ROOT, dict.chunk_dir, "manifest.json"),
      "utf8",
    );
    const manifest = JSON.parse(manifestRaw) as ChunkManifest;
    const entries: DictionaryEntry[] = [];

    for (const info of Object.values(manifest.chunks || {})) {
      if (!info?.file) continue;
      const chunk = await readDictionaryEntriesFile(
        resolve(DICTIONARY_ROOT, dict.chunk_dir, info.file),
      );
      entries.push(...chunk);
    }

    return entries;
  }

  return [];
};

const buildBrowseDatasetFromJson = async (): Promise<BrowseDataset> => {
  const dictionaries = await loadDictionaryIndex();
  const scopes = new Map<string, BrowseScopeHeadwords>();
  const dictionaryScopes: BrowseDictionaryScope[] = [];
  const allHeadwordMap = new Map<string, string>();
  const allJyutpingMap = new Map<string, string>();

  for (const dict of dictionaries) {
    const entries = await getDictionaryEntries(dict);
    const headwordMap = new Map<string, string>();
    const jyutpingMap = new Map<string, string>();

    for (const entry of entries) {
      const canonical = getCanonicalHeadword(entry);
      const comparable = toComparableKey(canonical);
      if (!comparable) continue;
      const primaryJyutping = getPrimaryJyutping(entry);

      if (!headwordMap.has(comparable)) {
        headwordMap.set(comparable, canonical);
      }

      if (primaryJyutping) {
        const existingJyutping = jyutpingMap.get(comparable);
        if (
          !existingJyutping ||
          primaryJyutping.localeCompare(existingJyutping, "en") < 0
        ) {
          jyutpingMap.set(comparable, primaryJyutping);
        }
      }

      if (!allHeadwordMap.has(comparable)) {
        allHeadwordMap.set(comparable, canonical);
      }

      if (primaryJyutping) {
        const existingGlobalJyutping = allJyutpingMap.get(comparable);
        if (
          !existingGlobalJyutping ||
          primaryJyutping.localeCompare(existingGlobalJyutping, "en") < 0
        ) {
          allJyutpingMap.set(comparable, primaryJyutping);
        }
      }
    }

    const scopeHeadwords = toScopeHeadwords(headwordMap, jyutpingMap);
    scopes.set(dict.id, scopeHeadwords);
    dictionaryScopes.push({
      id: dict.id,
      label: pickDictionaryLabel(dict),
      total: scopeHeadwords.byHeadword.length,
    });
  }

  scopes.set("all", toScopeHeadwords(allHeadwordMap, allJyutpingMap));

  return {
    scopes,
    dictionaries: dictionaryScopes,
  };
};

const buildBrowseDatasetFromApi = async (): Promise<BrowseDataset> => {
  const dictionaries = await loadDictionaryIndex();
  const sourceToDictionaryId = new Map<string, string>();
  const headwordMapByDictionary = new Map<string, Map<string, string>>();
  const jyutpingMapByDictionary = new Map<string, Map<string, string>>();
  const allHeadwordMap = new Map<string, string>();
  const allJyutpingMap = new Map<string, string>();

  dictionaries.forEach((dict) => {
    headwordMapByDictionary.set(dict.id, new Map<string, string>());
    jyutpingMapByDictionary.set(dict.id, new Map<string, string>());
    getDictionaryNameVariants(dict).forEach((variant) => {
      const key = toComparableKey(variant);
      if (!key || sourceToDictionaryId.has(key)) return;
      sourceToDictionaryId.set(key, dict.id);
    });
  });

  const collection = await getEntriesCollection();
  const rows = (await collection
    .aggregate(
      [
        {
          $project: {
            sourceBook: {
              $trim: { input: { $ifNull: ["$source_book", ""] } },
            },
            canonicalHeadword: {
              $let: {
                vars: {
                  normalized: {
                    $trim: { input: { $ifNull: ["$headword.normalized", ""] } },
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
            jyutpingSortKey: {
              $toLower: {
                $trim: {
                  input: {
                    $ifNull: [{ $arrayElemAt: ["$phonetic.jyutping", 0] }, ""],
                  },
                },
              },
            },
          },
        },
        {
          $match: {
            sourceBook: { $ne: "" },
            canonicalHeadword: { $ne: "" },
          },
        },
        {
          $group: {
            _id: {
              sourceBook: "$sourceBook",
              canonicalKey: { $toLower: "$canonicalHeadword" },
            },
            canonicalHeadword: { $first: "$canonicalHeadword" },
            jyutpingSortKey: { $min: "$jyutpingSortKey" },
          },
        },
      ],
      { allowDiskUse: true },
    )
    .toArray()) as ApiCanonicalRow[];

  for (const row of rows) {
    const sourceBook = normalizeSpace(row._id?.sourceBook || "");
    const sourceKey = toComparableKey(sourceBook);
    const dictId = sourceToDictionaryId.get(sourceKey);
    if (!dictId) continue;

    const canonical = normalizeSpace(row.canonicalHeadword || "");
    const canonicalKey = row._id?.canonicalKey || toComparableKey(canonical);
    if (!canonicalKey || !canonical) continue;
    const jyutpingSortKey = normalizeSpace(
      row.jyutpingSortKey || "",
    ).toLowerCase();

    const dictHeadwords = headwordMapByDictionary.get(dictId);
    const dictJyutpings = jyutpingMapByDictionary.get(dictId);
    if (!dictHeadwords || !dictJyutpings) continue;

    if (!dictHeadwords.has(canonicalKey)) {
      dictHeadwords.set(canonicalKey, canonical);
    }

    if (jyutpingSortKey) {
      const existingJyutping = dictJyutpings.get(canonicalKey);
      if (
        !existingJyutping ||
        jyutpingSortKey.localeCompare(existingJyutping, "en") < 0
      ) {
        dictJyutpings.set(canonicalKey, jyutpingSortKey);
      }
    }

    if (!allHeadwordMap.has(canonicalKey)) {
      allHeadwordMap.set(canonicalKey, canonical);
    }

    if (jyutpingSortKey) {
      const existingGlobalJyutping = allJyutpingMap.get(canonicalKey);
      if (
        !existingGlobalJyutping ||
        jyutpingSortKey.localeCompare(existingGlobalJyutping, "en") < 0
      ) {
        allJyutpingMap.set(canonicalKey, jyutpingSortKey);
      }
    }
  }

  const scopes = new Map<string, BrowseScopeHeadwords>();
  const dictionaryScopes: BrowseDictionaryScope[] = dictionaries.map((dict) => {
    const headwordMap =
      headwordMapByDictionary.get(dict.id) || new Map<string, string>();
    const jyutpingMap =
      jyutpingMapByDictionary.get(dict.id) || new Map<string, string>();
    const scopeHeadwords = toScopeHeadwords(headwordMap, jyutpingMap);
    scopes.set(dict.id, scopeHeadwords);
    return {
      id: dict.id,
      label: pickDictionaryLabel(dict),
      total: scopeHeadwords.byHeadword.length,
    };
  });

  scopes.set("all", toScopeHeadwords(allHeadwordMap, allJyutpingMap));

  return {
    scopes,
    dictionaries: dictionaryScopes,
  };
};

const buildBrowseDataset = async (): Promise<BrowseDataset> => {
  if (getIsApiEnabled()) {
    try {
      return await buildBrowseDatasetFromApi();
    } catch (apiError) {
      console.error(
        "Browse index (API mode) failed, fallback to JSON mode:",
        apiError,
      );
      try {
        return await buildBrowseDatasetFromJson();
      } catch (jsonError) {
        console.error("Browse index JSON fallback failed:", jsonError);
        throw apiError;
      }
    }
  }

  return buildBrowseDatasetFromJson();
};

const getBrowseDataset = async (): Promise<BrowseDataset> => {
  if (browseDatasetCache) {
    return browseDatasetCache;
  }
  if (browseDatasetPromise) {
    return browseDatasetPromise;
  }

  browseDatasetPromise = buildBrowseDataset()
    .then((dataset) => {
      browseDatasetCache = dataset;
      return dataset;
    })
    .finally(() => {
      browseDatasetPromise = null;
    });

  return browseDatasetPromise;
};

const getBrowsePageFromPrecomputed = async (
  options: BrowsePageOptions,
): Promise<BrowsePageData | null> => {
  const manifest = await getBrowseManifest();
  if (!manifest?.scopes) return null;

  const safeScope = normalizeSpace(options.scope || "all") || "all";
  const scopeInfo = manifest.scopes[safeScope];
  if (!scopeInfo) return null;

  const safeSort = normalizeSort(options.sort);
  const safePageSize = normalizePageSize(options.pageSize);
  const total = Number.isFinite(scopeInfo.total) ? scopeInfo.total : 0;
  const totalPages =
    typeof scopeInfo.total_pages_by_size?.[String(safePageSize)] === "number"
      ? Number(scopeInfo.total_pages_by_size?.[String(safePageSize)])
      : Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.max(1, Math.min(options.page, totalPages));
  const pagePath = resolve(
    BROWSE_INDEX_ROOT,
    safeScope,
    safeSort,
    `size-${safePageSize}`,
    `page-${safePage}.json`,
  );

  let headwords: string[] = [];
  try {
    const raw = await readFile(pagePath, "utf8");
    const parsed = JSON.parse(raw) as { headwords?: string[] };
    if (Array.isArray(parsed?.headwords)) {
      headwords = parsed.headwords;
    }
  } catch {
    return null;
  }

  const allTotal = manifest.scopes["all"]?.total ?? total;
  const dictionaries = Array.isArray(manifest.dictionaries)
    ? manifest.dictionaries
    : [];

  return {
    headwords,
    total,
    allTotal,
    page: safePage,
    totalPages,
    pageSize: safePageSize,
    sort: safeSort,
    scope: safeScope,
    dictionaries,
  };
};

export const isBrowseScopeSupported = async (
  scope: string,
): Promise<boolean> => {
  const manifest = await getBrowseManifest();
  if (manifest?.scopes) {
    return scope === "all" || Boolean(manifest.scopes[scope]);
  }

  const dataset = await getBrowseDataset();
  return scope === "all" || dataset.scopes.has(scope);
};

export const getBrowseTotalPages = async (
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<number> => {
  return getBrowseScopeTotalPages("all", pageSize);
};

export const getBrowseScopeTotalPages = async (
  scope: string,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<number> => {
  const safeScope = normalizeSpace(scope || "all") || "all";
  const safePageSize = normalizePageSize(pageSize);
  const manifest = await getBrowseManifest();
  if (manifest?.scopes?.[safeScope]) {
    const scopeInfo = manifest.scopes[safeScope];
    const totalPages = scopeInfo.total_pages_by_size?.[String(safePageSize)];
    if (typeof totalPages === "number") {
      return Math.max(1, totalPages);
    }

    const total = Number.isFinite(scopeInfo.total) ? scopeInfo.total : 0;
    return Math.max(1, Math.ceil(total / safePageSize));
  }

  const dataset = await getBrowseDataset();
  const headwords = dataset.scopes.get(safeScope)?.byHeadword || [];
  return Math.max(1, Math.ceil(headwords.length / safePageSize));
};

export const getBrowsePage = async (
  options: BrowsePageOptions,
): Promise<BrowsePageData> => {
  const precomputed = await getBrowsePageFromPrecomputed(options);
  if (precomputed) {
    return precomputed;
  }

  const dataset = await getBrowseDataset();
  const safeScope = normalizeSpace(options.scope || "all") || "all";
  const safeSort = normalizeSort(options.sort);
  const scopeHeadwords = dataset.scopes.get(safeScope);

  if (!scopeHeadwords) {
    throw new Error(`Unknown browse scope: ${safeScope}`);
  }

  const sortedHeadwords =
    safeSort === "jyutping"
      ? scopeHeadwords.byJyutping
      : scopeHeadwords.byHeadword;

  const safePageSize = normalizePageSize(options.pageSize);
  const total = sortedHeadwords.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.max(1, Math.min(options.page, totalPages));
  const start = (safePage - 1) * safePageSize;
  const headwords = sortedHeadwords.slice(start, start + safePageSize);
  const allHeadwords = dataset.scopes.get("all")?.byHeadword || [];

  return {
    headwords,
    total,
    allTotal: allHeadwords.length,
    page: safePage,
    totalPages,
    pageSize: safePageSize,
    sort: safeSort,
    scope: safeScope,
    dictionaries: dataset.dictionaries,
  };
};

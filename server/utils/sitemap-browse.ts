import { fetchAssetJson } from "~/utils/asset-json";

import { getBrowseScopeTotalPages, getBrowseTotalPages } from "./browse-index";

const DICTIONARY_INDEX_ASSETS = [
  "/browse-index/manifest.json",
  "/dictionaries/index.json",
];

let dictionaryIdsCache: string[] | null = null;
let dictionaryIdsPromise: Promise<string[]> | null = null;
const browseStaticPathsCache = new Map<number, string[]>();
const browseStaticPathsPromiseCache = new Map<number, Promise<string[]>>();

const readDictionaryIdsFromAsset = async (
  assetPath: string,
): Promise<string[]> => {
  try {
    const parsed = await fetchAssetJson<{
      dictionaries?: Array<{ id?: string }>;
    }>(assetPath);
    if (!Array.isArray(parsed?.dictionaries)) return [];
    return parsed.dictionaries
      .map((dict) => String(dict?.id || "").trim())
      .filter((id) => id);
  } catch {
    return [];
  }
};

const resolveDictionaryIds = async (): Promise<string[]> => {
  for (const assetPath of DICTIONARY_INDEX_ASSETS) {
    const ids = await readDictionaryIdsFromAsset(assetPath);
    if (ids.length > 0) return ids;
  }
  return [];
};

const getDictionaryIds = async (): Promise<string[]> => {
  if (dictionaryIdsCache) return dictionaryIdsCache;
  if (dictionaryIdsPromise) return dictionaryIdsPromise;

  dictionaryIdsPromise = resolveDictionaryIds()
    .then((ids) => {
      dictionaryIdsCache = ids;
      return ids;
    })
    .finally(() => {
      dictionaryIdsPromise = null;
    });

  return dictionaryIdsPromise;
};

export const getBrowseSitemapStaticPaths = async (
  pageSize = 100,
): Promise<string[]> => {
  if (browseStaticPathsCache.has(pageSize)) {
    return browseStaticPathsCache.get(pageSize) || [];
  }

  const pending = browseStaticPathsPromiseCache.get(pageSize);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    const dictionaryIds = await getDictionaryIds();
    const paths = new Set<string>(["", "/about", "/browse"]);

    for (const dictId of dictionaryIds) {
      paths.add(`/browse/${encodeURIComponent(dictId)}`);
    }

    const browsePages = await getBrowseTotalPages(pageSize);
    for (let page = 2; page <= browsePages; page += 1) {
      paths.add(`/browse?page=${page}`);
    }

    const dictionaryPageCounts = await Promise.all(
      dictionaryIds.map(async (dictId) => ({
        dictId,
        totalPages: await getBrowseScopeTotalPages(dictId, pageSize),
      })),
    );

    for (const { dictId, totalPages } of dictionaryPageCounts) {
      for (let page = 2; page <= totalPages; page += 1) {
        paths.add(`/browse/${encodeURIComponent(dictId)}?page=${page}`);
      }
    }

    const resolved = Array.from(paths);
    browseStaticPathsCache.set(pageSize, resolved);
    return resolved;
  })().finally(() => {
    browseStaticPathsPromiseCache.delete(pageSize);
  });

  browseStaticPathsPromiseCache.set(pageSize, promise);
  return promise;
};

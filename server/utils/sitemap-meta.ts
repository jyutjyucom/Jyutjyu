import { fetchAssetJson } from "~/utils/asset-json";

interface DictionaryIndexMeta {
  last_updated?: string;
}

const INDEX_CANDIDATE_ASSETS = [
  "/dictionaries/index.json",
  "/browse-index/manifest.json",
];

const BUILD_TIME_FALLBACK = (() => {
  const candidates = [
    process.env.BUILD_TIMESTAMP,
    process.env.VERCEL_GIT_COMMIT_DATE,
  ];

  for (const value of candidates) {
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
})();

let cachedLastmod: string | null = null;
let pendingLastmod: Promise<string> | null = null;

const toIsoOrNull = (value: unknown): string | null => {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const readLastmodFromAsset = async (
  assetPath: string,
): Promise<string | null> => {
  try {
    const parsed = await fetchAssetJson<
      DictionaryIndexMeta & { generated_at?: string }
    >(assetPath);
    return (
      toIsoOrNull(parsed?.last_updated) ??
      toIsoOrNull(parsed?.generated_at) ??
      null
    );
  } catch {
    return null;
  }
};

const resolveSitemapLastmod = async (): Promise<string> => {
  for (const assetPath of INDEX_CANDIDATE_ASSETS) {
    const lastmod = await readLastmodFromAsset(assetPath);
    if (lastmod) return lastmod;
  }

  return BUILD_TIME_FALLBACK;
};

export const getSitemapLastmod = async (): Promise<string> => {
  if (cachedLastmod) return cachedLastmod;
  if (pendingLastmod) return pendingLastmod;

  pendingLastmod = resolveSitemapLastmod()
    .then((lastmod) => {
      cachedLastmod = lastmod;
      return lastmod;
    })
    .finally(() => {
      pendingLastmod = null;
    });

  return pendingLastmod;
};

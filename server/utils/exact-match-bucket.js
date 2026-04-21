const TEXT_ENCODER = new TextEncoder();

export const EXACT_MATCH_BUCKET_HASH = "fnv1a32-utf8";
export const EXACT_MATCH_BUCKET_MOD = 2048;

export const getExactMatchBucketWidth = (bucketMod = EXACT_MATCH_BUCKET_MOD) => {
  return Math.max(
    2,
    Math.ceil(Math.log(Math.max(1, bucketMod)) / Math.log(16)),
  );
};

export const EXACT_MATCH_BUCKET_WIDTH =
  getExactMatchBucketWidth(EXACT_MATCH_BUCKET_MOD);

export const hashExactMatchComparableKey = (value) => {
  const bytes = TEXT_ENCODER.encode(String(value || ""));
  let hash = 0x811c9dc5;

  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
};

export const getExactMatchBucketId = (
  comparableKey,
  options = {},
) => {
  const normalized = String(comparableKey || "").trim();
  if (!normalized) {
    return "misc";
  }

  const bucketMod =
    Number.isInteger(options.bucketMod) && Number(options.bucketMod) > 0
      ? Number(options.bucketMod)
      : EXACT_MATCH_BUCKET_MOD;
  const bucketWidth =
    Number.isInteger(options.bucketWidth) && Number(options.bucketWidth) > 0
      ? Number(options.bucketWidth)
      : getExactMatchBucketWidth(bucketMod);

  const bucket = hashExactMatchComparableKey(normalized) % bucketMod;
  return bucket.toString(16).padStart(bucketWidth, "0");
};

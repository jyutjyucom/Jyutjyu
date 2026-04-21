import test from "node:test";
import assert from "node:assert/strict";

import {
  EXACT_MATCH_BUCKET_HASH,
  EXACT_MATCH_BUCKET_MOD,
  EXACT_MATCH_BUCKET_WIDTH,
  getExactMatchBucketId,
  getExactMatchBucketWidth,
} from "../server/utils/exact-match-bucket.js";

test("exact-match bucket defaults stay aligned with the Cloudflare index", () => {
  assert.equal(EXACT_MATCH_BUCKET_HASH, "fnv1a32-utf8");
  assert.equal(EXACT_MATCH_BUCKET_MOD, 2048);
  assert.equal(EXACT_MATCH_BUCKET_WIDTH, 3);
  assert.equal(getExactMatchBucketWidth(EXACT_MATCH_BUCKET_MOD), 3);
});

test("exact-match buckets are stable for representative comparable keys", () => {
  assert.equal(getExactMatchBucketId("三年唔發市，發市當三年"), "6fd");
  assert.equal(getExactMatchBucketId("凸額"), "3b4");
  assert.equal(getExactMatchBucketId("中氣十足"), "31f");
  assert.equal(getExactMatchBucketId("睇準起筷"), "091");
  assert.equal(getExactMatchBucketId("alsir"), "4d6");
  assert.equal(getExactMatchBucketId(""), "misc");
});

test("exact-match bucket helper respects custom bucket config", () => {
  assert.equal(
    getExactMatchBucketId("中氣十足", { bucketMod: 16, bucketWidth: 2 }),
    "0f",
  );
});

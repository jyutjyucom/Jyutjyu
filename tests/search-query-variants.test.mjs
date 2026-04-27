import assert from "node:assert/strict";
import test from "node:test";

import { rankHeadwordSuggestions } from "../server/utils/headword-suggestion-ranking.ts";
import { ensureInitialized, getQueryVariants } from "../server/utils/opencc.ts";

test("simplified query expands to multiple traditional variants", async () => {
  await ensureInitialized();

  const variants = new Set(await getQueryVariants("过钟"));

  assert.ok(variants.has("过钟"));
  assert.ok(variants.has("過鍾"));
  assert.ok(variants.has("過鐘"));
});

test("traditional query still includes simplified and alternate traditional forms", async () => {
  await ensureInitialized();

  const variants = new Set(await getQueryVariants("過鐘"));

  assert.ok(variants.has("过钟"));
  assert.ok(variants.has("過鐘"));
  assert.ok(variants.has("過鍾"));
});

test("variant expansion stays within the configured ambiguity budget", async () => {
  await ensureInitialized();

  const variants = await getQueryVariants("发干后面台钟曲");

  assert.ok(variants.includes("发干后面台钟曲"));
  assert.ok(variants.includes("發乾後面枱鐘曲"));
  assert.ok(variants.length <= 32);
});

test("non-CJK queries keep only normalized seed variants", async () => {
  const variants = new Set(await getQueryVariants("  AA3 soe4!!  "));

  assert.deepEqual(variants, new Set(["  aa3 soe4!!  ", "aa3 soe4", "aa3soe4"]));
});

test("headword suggestions rank exact and prefix matches ahead of contains matches", async () => {
  await ensureInitialized();

  const variants = await getQueryVariants("過鐘");
  const suggestions = rankHeadwordSuggestions(
    [
      {
        suggestion: "過鐘",
        searchTerms: ["過鐘", "过钟"].map((value) => value.toLowerCase()),
      },
      {
        suggestion: "過鐘食飯",
        searchTerms: ["過鐘食飯", "过钟食饭"].map((value) =>
          value.toLowerCase(),
        ),
      },
      {
        suggestion: "食完過鐘",
        searchTerms: ["食完過鐘", "食完过钟"].map((value) =>
          value.toLowerCase(),
        ),
      },
    ],
    variants,
    10,
  );

  assert.deepEqual(suggestions, ["過鐘", "過鐘食飯", "食完過鐘"]);
});

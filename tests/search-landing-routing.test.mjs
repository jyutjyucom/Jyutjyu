import assert from "node:assert/strict";
import test from "node:test";

import {
  countExactCanonicalBuckets,
  resolveUniqueCanonicalHeadwordFromEntries,
  resolveSearchLandingFromJson as resolveSearchLanding,
  resolveWordEntriesFromJson,
} from "../utils/headword-exact-match.ts";
import {
  isJyutpingQuery,
  normalizeSearchQuery,
} from "../utils/query-classify.ts";

const createEntry = ({ id, display, normalized = display, variants = [] }) => ({
  id,
  source_book: "test-dict",
  dialect: {
    name: "粵語",
    region_code: "YUE",
  },
  headword: {
    display,
    search: display,
    normalized,
    is_placeholder: false,
  },
  phonetic: {
    original: "",
    jyutping: [],
  },
  entry_type: "word",
  senses: [
    {
      definition: "test definition",
    },
  ],
  keywords: [],
  meta: {
    headword_variants: variants,
  },
});

test("normalizeSearchQuery collapses repeated whitespace", () => {
  assert.equal(normalizeSearchQuery("  過  鐘  "), "過 鐘");
});

test("isJyutpingQuery only short-circuits obvious digit-bearing Jyutping", () => {
  assert.equal(isJyutpingQuery("aa3 soe4"), true);
  assert.equal(isJyutpingQuery("bonus"), false);
  assert.equal(isJyutpingQuery("阿Sir"), false);
});

test("synthetic ambiguous exact entries do not resolve to a unique canonical headword", () => {
  const entries = [
    createEntry({
      id: "entry-1",
      display: "阿甲",
      normalized: "阿甲",
      variants: ["甲"],
    }),
    createEntry({
      id: "entry-2",
      display: "阿乙",
      normalized: "阿乙",
      variants: ["甲"],
    }),
  ];

  assert.equal(countExactCanonicalBuckets(entries), 2);
  assert.equal(resolveUniqueCanonicalHeadwordFromEntries(entries), null);
});

test("exact Latin-script headword can resolve directly to a word page", async () => {
  const resolution = await resolveSearchLanding("bonus");

  assert.equal(resolution.type, "word");
  assert.equal(resolution.reason, "exact_unique");
  assert.equal(resolution.canonicalHeadword, "bonus");
});

test("exact simplified and traditional equivalents can resolve to one canonical headword", async () => {
  const simplifiedResolution = await resolveSearchLanding("过钟");
  const traditionalResolution = await resolveSearchLanding("過鍾");

  assert.equal(simplifiedResolution.type, "word");
  assert.equal(simplifiedResolution.reason, "exact_unique");
  assert.equal(simplifiedResolution.canonicalHeadword, "过钟");

  assert.equal(traditionalResolution.type, "word");
  assert.equal(traditionalResolution.reason, "exact_unique");
  assert.equal(traditionalResolution.canonicalHeadword, "过钟");
});

test("exact variant query can resolve to the canonical headword", async () => {
  const resolution = await resolveSearchLanding("亞SIR");

  assert.equal(resolution.type, "word");
  assert.equal(resolution.reason, "exact_unique");
  assert.equal(resolution.canonicalHeadword, "阿SIR");
});

test("exact word lookup resolves stable bundled entries for problematic words", async () => {
  const person = await resolveWordEntriesFromJson("一個人");
  const mason = await resolveWordEntriesFromJson("泥水師傅");

  assert.equal(person?.canonicalHeadword, "一個人");
  assert.equal(person?.entries.length, 2);

  assert.equal(mason?.canonicalHeadword, "泥水師傅");
  assert.equal(mason?.entries.length, 1);
});

test("ambiguous exact matches stay on the search page", async () => {
  const resolution = await resolveSearchLanding("過鐘");

  assert.equal(resolution.type, "search");
  assert.equal(resolution.reason, "ambiguous_exact_match");
});

test("reverse search never resolves directly to a word page", async () => {
  const resolution = await resolveSearchLanding("bonus", { reverse: true });

  assert.equal(resolution.type, "search");
  assert.equal(resolution.reason, "reverse_search");
});

test("Jyutping-looking queries stay on the search page", async () => {
  const resolution = await resolveSearchLanding("aa3 soe4");

  assert.equal(resolution.type, "search");
  assert.equal(resolution.reason, "jyutping_query");
});

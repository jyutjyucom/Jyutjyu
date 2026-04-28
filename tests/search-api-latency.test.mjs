import assert from "node:assert/strict";
import test from "node:test";

import {
  atlasGroupedSearch,
  fallbackGroupedSearch,
  fallbackSearch,
  getFallbackStageTimeoutMs,
  normalizeSearchResultOffset,
  normalizeSearchResultLimit,
  resetSearchApiRuntimeStateForTests,
  shouldFailFastAfterAtlasDegrade,
  shouldAttemptAtlasSearch,
} from "../server/api/search.ts";
import { ensureInitialized } from "../server/utils/opencc.ts";

const originalNodeEnv = process.env.NODE_ENV;
const originalSearchFailFast = process.env.SEARCH_FAIL_FAST_ON_ATLAS_DEGRADE;

test.afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalSearchFailFast === undefined) {
    delete process.env.SEARCH_FAIL_FAST_ON_ATLAS_DEGRADE;
  } else {
    process.env.SEARCH_FAIL_FAST_ON_ATLAS_DEGRADE = originalSearchFailFast;
  }
});

const flattenValues = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenValues(item));
  }
  return [value];
};

const getValuesAtPath = (value, pathParts) => {
  if (pathParts.length === 0) {
    return flattenValues(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => getValuesAtPath(item, pathParts));
  }

  if (value && typeof value === "object") {
    const [head, ...tail] = pathParts;
    return getValuesAtPath(value[head], tail);
  }

  return [undefined];
};

const matchesFieldCondition = (entry, field, expected) => {
  const values = getValuesAtPath(entry, field.split("."));

  if (
    expected &&
    typeof expected === "object" &&
    !Array.isArray(expected)
  ) {
    if (Array.isArray(expected.$in)) {
      return values.some((value) => expected.$in.includes(value));
    }

    if (Array.isArray(expected.$nin)) {
      return values.every((value) => !expected.$nin.includes(value));
    }

    if (typeof expected.$regex === "string") {
      const regex = new RegExp(expected.$regex, expected.$options || "");
      return values.some((value) => regex.test(String(value || "")));
    }
  }

  return values.some((value) => value === expected);
};

const matchesCondition = (entry, condition) => {
  return Object.entries(condition).every(([key, expected]) => {
    if (key === "$or" && Array.isArray(expected)) {
      return expected.some((item) => matchesCondition(entry, item));
    }

    return matchesFieldCondition(entry, key, expected);
  });
};

const createMockCollection = (entries) => {
  return {
    find(condition) {
      let limitValue = Infinity;

      return {
        maxTimeMS() {
          return this;
        },
        limit(value) {
          limitValue = value;
          return this;
        },
        async toArray() {
          return entries
            .filter((entry) => matchesCondition(entry, condition))
            .slice(0, limitValue);
        },
      };
    },
  };
};

test("Atlas strategy skips reverse mode, symbol-heavy queries, and unavailable Atlas", () => {
  assert.equal(
    shouldAttemptAtlasSearch({
      mode: "normal",
      hasSymbolCharacters: false,
      atlasAvailabilityState: "unknown",
    }),
    true,
  );
  assert.equal(
    shouldAttemptAtlasSearch({
      mode: "normal",
      hasSymbolCharacters: true,
      atlasAvailabilityState: "unknown",
    }),
    false,
  );
  assert.equal(
    shouldAttemptAtlasSearch({
      mode: "reverse",
      hasSymbolCharacters: false,
      atlasAvailabilityState: "available",
    }),
    false,
  );
  assert.equal(
    shouldAttemptAtlasSearch({
      mode: "normal",
      hasSymbolCharacters: false,
      atlasAvailabilityState: "unavailable",
    }),
    false,
  );
});

test("staged fallback preserves normal-mode priority for 阿SIR-like queries", async () => {
  resetSearchApiRuntimeStateForTests();
  await ensureInitialized();

  const entries = [
    {
      id: "keyword",
      headword: { display: "差人", normalized: "差人" },
      phonetic: { jyutping: ["caa1 jan4"] },
      keywords: ["阿SIR", "警察"],
      senses: [{ definition: "警員" }],
      source_book: "詞典A",
    },
    {
      id: "prefix",
      headword: { display: "阿SIR哥", normalized: "阿SIR哥" },
      phonetic: { jyutping: ["aa3 sir1 go1"] },
      keywords: [],
      senses: [{ definition: "稱呼警察" }],
      source_book: "詞典A",
    },
    {
      id: "exact",
      headword: { display: "阿SIR", normalized: "阿SIR" },
      phonetic: { jyutping: ["aa3 sir1"] },
      keywords: ["警察"],
      senses: [{ definition: "警員" }],
      source_book: "詞典A",
    },
    {
      id: "contains",
      headword: { display: "我是阿SIR呀", normalized: "我是阿SIR呀" },
      phonetic: { jyutping: ["ngo5 si6 aa3 sir1 aa3"] },
      keywords: [],
      senses: [{ definition: "帶有關鍵詞的詞條" }],
      source_book: "詞典A",
    },
  ];

  const results = await fallbackSearch(
    createMockCollection(entries),
    "阿SIR",
    10,
    undefined,
    "normal",
  );

  assert.deepEqual(
    results.map((entry) => entry.id),
    ["exact", "prefix", "contains", "keyword"],
  );
});

test("staged fallback keeps exact Chinese headword matches ahead of weaker matches", async () => {
  resetSearchApiRuntimeStateForTests();
  await ensureInitialized();

  const entries = [
    {
      id: "keyword",
      headword: { display: "撩火棍", normalized: "撩火棍" },
      phonetic: { jyutping: ["liu4 fo2 gwan3"] },
      keywords: ["撩火棍唔掉得轉頭"],
      senses: [{ definition: "比喻惹咗事走唔甩" }],
      source_book: "詞典B",
    },
    {
      id: "contains",
      headword: {
        display: "撩火棍唔掉得轉頭呀",
        normalized: "撩火棍唔掉得轉頭呀",
      },
      phonetic: { jyutping: ["liu4 fo2 gwan3 m4 diu6 dak1 zyun2 tau4 aa3"] },
      keywords: [],
      senses: [{ definition: "包含完整查詢的更長詞條" }],
      source_book: "詞典B",
    },
    {
      id: "exact",
      headword: {
        display: "撩火棍唔掉得轉頭",
        normalized: "撩火棍唔掉得轉頭",
      },
      phonetic: { jyutping: ["liu4 fo2 gwan3 m4 diu6 dak1 zyun2 tau4"] },
      keywords: [],
      senses: [{ definition: "比喻惹咗麻煩走唔甩" }],
      source_book: "詞典B",
    },
  ];

  const results = await fallbackSearch(
    createMockCollection(entries),
    "撩火棍唔掉得轉頭",
    10,
    undefined,
    "normal",
  );

  assert.deepEqual(
    results.map((entry) => entry.id),
    ["exact", "contains", "keyword"],
  );
});

test("reverse fallback keeps exact definition hits ahead of contains hits", async () => {
  resetSearchApiRuntimeStateForTests();
  await ensureInitialized();

  const entries = [
    {
      id: "contains-definition",
      headword: { display: "有蝕底", normalized: "有蝕底" },
      phonetic: { jyutping: ["jau5 sik1 dai2"] },
      keywords: [],
      senses: [{ definition: "做人唔好成日食虧" }],
      source_book: "詞典C",
    },
    {
      id: "exact-definition",
      headword: { display: "食虧", normalized: "食虧" },
      phonetic: { jyutping: ["sik6 kwai1"] },
      keywords: [],
      senses: [{ definition: "食虧" }],
      source_book: "詞典C",
    },
  ];

  const results = await fallbackSearch(
    createMockCollection(entries),
    "食虧",
    10,
    undefined,
    "reverse",
  );

  assert.deepEqual(
    results.map((entry) => entry.id),
    ["exact-definition", "contains-definition"],
  );
});

test("search result limit is clamped to 200", () => {
  assert.equal(normalizeSearchResultLimit("500"), 200);
  assert.equal(normalizeSearchResultLimit("200"), 200);
  assert.equal(normalizeSearchResultLimit("0"), 1);
  assert.equal(normalizeSearchResultLimit(undefined), 100);
});

test("search result offset is clamped to a non-negative grouped offset", () => {
  assert.equal(normalizeSearchResultOffset("500"), 500);
  assert.equal(normalizeSearchResultOffset("-10"), 0);
  assert.equal(normalizeSearchResultOffset(undefined), 0);
});

test("fallback stages use the paid-plan budget instead of the old 900ms cap", async () => {
  resetSearchApiRuntimeStateForTests();
  await ensureInitialized();

  assert.equal(getFallbackStageTimeoutMs(8000), 4000);

  const maxTimeValues = [];
  const collection = {
    find() {
      return {
        maxTimeMS(value) {
          maxTimeValues.push(value);
          return this;
        },
        limit() {
          return this;
        },
        async toArray() {
          return [];
        },
      };
    },
  };

  await fallbackSearch(collection, "女", 1, undefined, "normal");

  assert.ok(maxTimeValues.length > 0);
  assert.ok(maxTimeValues[0] > 900);
});

test("Atlas grouped search bounds the candidate window before grouping", async () => {
  resetSearchApiRuntimeStateForTests();
  await ensureInitialized();

  let capturedPipeline;
  const collection = {
    aggregate(pipeline) {
      capturedPipeline = pipeline;
      return {
        async toArray() {
          return [
            {
              groups: [],
              total: [{ grouped: 501, entries: 501 }],
              dictionaries: [],
              dialects: [],
              types: [],
            },
          ];
        },
      };
    },
  };

  const response = await atlasGroupedSearch(collection, "女", {
    limit: 12,
    offset: 0,
  });
  const limitIndex = capturedPipeline.findIndex((stage) => "$limit" in stage);
  const sortIndex = capturedPipeline.findIndex((stage) => "$sort" in stage);
  const groupIndex = capturedPipeline.findIndex((stage) => "$group" in stage);

  assert.ok(limitIndex > 0);
  assert.ok(sortIndex > limitIndex);
  assert.ok(groupIndex > limitIndex);
  assert.equal(capturedPipeline[limitIndex].$limit, 501);
  assert.equal(response.total.exact, false);
});

test("workers production request only fails fast behind the emergency env flag", () => {
  process.env.NODE_ENV = "production";

  assert.equal(
    shouldFailFastAfterAtlasDegrade({
      context: { cloudflare: { env: {} } },
    }),
    false,
  );

  process.env.SEARCH_FAIL_FAST_ON_ATLAS_DEGRADE = "true";

  assert.equal(
    shouldFailFastAfterAtlasDegrade({
      context: { cloudflare: { env: {} } },
    }),
    true,
  );
  assert.equal(shouldFailFastAfterAtlasDegrade({ context: {} }), false);
});

test("grouped fallback search returns grouped pagination metadata and facets", async () => {
  resetSearchApiRuntimeStateForTests();
  await ensureInitialized();

  const entries = [
    {
      id: "a",
      headword: { display: "我哋", normalized: "我哋" },
      phonetic: { jyutping: ["ngo5 dei6"] },
      keywords: [],
      senses: [{ definition: "we" }],
      source_book: "詞典A",
      dialect: { region_code: "HK" },
      entry_type: "word",
    },
    {
      id: "b",
      headword: { display: "我哋", normalized: "我哋" },
      phonetic: { jyutping: ["ngo5 dei6"] },
      keywords: [],
      senses: [{ definition: "we" }],
      source_book: "詞典B",
      dialect: { region_code: "HK" },
      entry_type: "word",
    },
    {
      id: "c",
      headword: { display: "你哋", normalized: "你哋" },
      phonetic: { jyutping: ["nei5 dei6"] },
      keywords: [],
      senses: [{ definition: "you plural" }],
      source_book: "詞典A",
      dialect: { region_code: "GZ" },
      entry_type: "word",
    },
  ];

  const response = await fallbackGroupedSearch(
    createMockCollection(entries),
    "哋",
    {
      limit: 1,
      offset: 0,
      mode: "normal",
    },
  );

  assert.equal(response.success, true);
  assert.equal(response.groups.length, 1);
  assert.equal(response.total.grouped, 2);
  assert.equal(response.total.entries, 3);
  assert.equal(response.page.hasMore, true);
  assert.equal(response.page.nextOffset, 1);
  assert.deepEqual(response.facets.dialects, [
    { value: "GZ", count: 1 },
    { value: "HK", count: 1 },
  ]);
});

test("grouped fallback search applies filters and non-relevance sorting", async () => {
  resetSearchApiRuntimeStateForTests();
  await ensureInitialized();

  const entries = [
    {
      id: "b",
      headword: { display: "banana哋", normalized: "banana哋" },
      phonetic: { jyutping: ["jyut6 dei6"] },
      keywords: [],
      senses: [{ definition: "second" }],
      source_book: "詞典A",
      dialect: { region_code: "HK" },
      entry_type: "word",
    },
    {
      id: "a",
      headword: { display: "apple哋", normalized: "apple哋" },
      phonetic: { jyutping: ["gaap3 dei6"] },
      keywords: [],
      senses: [{ definition: "first" }],
      source_book: "詞典A",
      dialect: { region_code: "HK" },
      entry_type: "word",
    },
    {
      id: "c",
      headword: { display: "cherry哋", normalized: "cherry哋" },
      phonetic: { jyutping: ["bing2 dei6"] },
      keywords: [],
      senses: [{ definition: "filtered" }],
      source_book: "詞典A",
      dialect: { region_code: "GZ" },
      entry_type: "phrase",
    },
  ];

  const response = await fallbackGroupedSearch(
    createMockCollection(entries),
    "哋",
    {
      limit: 10,
      offset: 0,
      mode: "normal",
      sort: "headword",
      filters: {
        dialect: "HK",
        type: "word",
      },
    },
  );

  assert.deepEqual(
    response.groups.map((group) => group.primary.id),
    ["a", "b"],
  );
  assert.equal(response.total.grouped, 2);
  assert.deepEqual(response.facets.types, [{ value: "word", count: 2 }]);
});

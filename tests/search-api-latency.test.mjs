import assert from "node:assert/strict";
import test from "node:test";

import {
  fallbackSearch,
  normalizeSearchResultLimit,
  resetSearchApiRuntimeStateForTests,
  shouldFailFastAfterAtlasDegrade,
  shouldAttemptAtlasSearch,
} from "../server/api/search.ts";
import { ensureInitialized } from "../server/utils/opencc.ts";

const originalNodeEnv = process.env.NODE_ENV;

test.afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
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

test("search result limit is clamped to 100", () => {
  assert.equal(normalizeSearchResultLimit("500"), 100);
  assert.equal(normalizeSearchResultLimit("100"), 100);
  assert.equal(normalizeSearchResultLimit("0"), 1);
  assert.equal(normalizeSearchResultLimit(undefined), 50);
});

test("workers production request fails fast instead of running fallback search", () => {
  process.env.NODE_ENV = "production";

  assert.equal(
    shouldFailFastAfterAtlasDegrade({
      context: { cloudflare: { env: {} } },
    }),
    true,
  );
  assert.equal(shouldFailFastAfterAtlasDegrade({ context: {} }), false);
});

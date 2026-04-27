import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateSearchEntries,
  buildGroupedSearchResponse,
  pickRicherSearchEntries,
  SEARCH_API_MAX_PAGE_SIZE,
  SEARCH_PAGE_SIZE,
  summarizeGroupedSearchCount,
} from "../utils/search-result-groups.ts";

const createEntry = ({
  id,
  display,
  normalized = display,
  jyutping = "ngo5",
  source = "詞典A",
}) => ({
  id,
  headword: {
    display,
    normalized,
    search: normalized,
    is_placeholder: false,
  },
  phonetic: {
    original: [],
    jyutping: [jyutping],
  },
  senses: [{ definition: `${display} definition` }],
  source_book: source,
  entry_type: "word",
});

test("aggregateSearchEntries groups by headword display and normalized form", () => {
  const entries = [
    createEntry({ id: "1", display: "我哋", normalized: "我哋", source: "詞典A" }),
    createEntry({ id: "2", display: "我哋", normalized: "我哋", source: "詞典B" }),
    createEntry({ id: "3", display: "佢哋", normalized: "佢哋" }),
  ];

  const grouped = aggregateSearchEntries(entries);

  assert.equal(grouped.length, 2);
  assert.equal(grouped[0]?.entries.length, 2);
  assert.equal(grouped[1]?.primary.headword.display, "佢哋");
});

test("summarizeGroupedSearchCount returns an overflow label when capped", () => {
  const entries = [
    createEntry({ id: "1", display: "我哋" }),
    createEntry({ id: "2", display: "你哋" }),
  ];

  assert.equal(SEARCH_PAGE_SIZE, 100);
  assert.equal(SEARCH_API_MAX_PAGE_SIZE, 200);
  assert.deepEqual(
    summarizeGroupedSearchCount(entries, {
      ceiling: 1000,
      isOverflow: true,
    }),
    {
      count: 2,
      label: "1000+",
      isOverflow: true,
    },
  );
});

test("buildGroupedSearchResponse paginates grouped cards by offset", () => {
  const entries = [
    createEntry({ id: "1", display: "我哋", source: "詞典A" }),
    createEntry({ id: "2", display: "我哋", source: "詞典B" }),
    createEntry({ id: "3", display: "你哋", source: "詞典A" }),
    createEntry({ id: "4", display: "佢哋", source: "詞典A" }),
  ];

  const response = buildGroupedSearchResponse({
    query: "哋",
    entries,
    offset: 1,
    limit: 1,
  });

  assert.equal(response.total.grouped, 3);
  assert.equal(response.total.entries, 4);
  assert.equal(response.total.exact, true);
  assert.equal(response.groups.length, 1);
  assert.equal(response.groups[0]?.primary.headword.display, "你哋");
  assert.deepEqual(response.page, {
    offset: 1,
    limit: 1,
    returned: 1,
    hasMore: true,
    nextOffset: 2,
  });
});

test("buildGroupedSearchResponse returns grouped facet counts", () => {
  const entries = [
    createEntry({ id: "1", display: "我哋", source: "詞典A" }),
    createEntry({ id: "2", display: "我哋", source: "詞典B" }),
    createEntry({ id: "3", display: "你哋", source: "詞典A" }),
  ];

  const response = buildGroupedSearchResponse({
    query: "哋",
    entries,
  });

  assert.deepEqual(response.facets.dictionaries, [
    { value: "詞典A", count: 2 },
    { value: "詞典B", count: 1 },
  ]);
  assert.deepEqual(response.facets.types, [{ value: "word", count: 2 }]);
});

test("summarizeGroupedSearchCount keeps exact grouped count when not capped", () => {
  const entries = [
    createEntry({ id: "1", display: "我哋" }),
    createEntry({ id: "2", display: "我哋", source: "詞典B" }),
    createEntry({ id: "3", display: "你哋" }),
  ];

  assert.deepEqual(summarizeGroupedSearchCount(entries), {
    count: 2,
    label: "2",
    isOverflow: false,
  });
});

test("pickRicherSearchEntries keeps the API result universe when it has more grouped matches", () => {
  const apiEntries = [
    createEntry({ id: "1", display: "馬死落地行", source: "詞典A" }),
    createEntry({ id: "2", display: "落地", source: "詞典A" }),
    createEntry({ id: "3", display: "踩落地", source: "詞典A" }),
  ];
  const localEntries = [
    createEntry({ id: "4", display: "馬死落地行", source: "詞典A" }),
    createEntry({ id: "5", display: "馬死落地行", source: "詞典B" }),
  ];

  assert.deepEqual(pickRicherSearchEntries(apiEntries, localEntries), {
    entries: apiEntries,
    source: "primary",
    primaryGroupedCount: 3,
    candidateGroupedCount: 1,
  });
});

test("pickRicherSearchEntries prefers the local result universe when grouped coverage is at least as rich", () => {
  const apiEntries = [
    createEntry({ id: "1", display: "馬死落地行", source: "詞典A" }),
    createEntry({ id: "2", display: "落地", source: "詞典A" }),
  ];
  const localEntries = [
    createEntry({ id: "3", display: "馬死落地行", source: "詞典A" }),
    createEntry({ id: "4", display: "落地", source: "詞典A" }),
    createEntry({ id: "5", display: "落地", source: "詞典B" }),
  ];

  assert.deepEqual(pickRicherSearchEntries(apiEntries, localEntries), {
    entries: localEntries,
    source: "candidate",
    primaryGroupedCount: 2,
    candidateGroupedCount: 2,
  });
});

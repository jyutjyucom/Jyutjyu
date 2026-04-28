import assert from "node:assert/strict";
import test from "node:test";

import restrictedEntryIdsArtifact from "../server/assets/moderation/cn-restricted-entry-ids.json" with { type: "json" };
import {
  buildStaticRelatedWordsResponse,
  getRelatedHeadwordCandidates,
  resetRelatedWordsRuntimeStateForTests,
} from "../server/utils/related-words.ts";

const createEntry = ({ id, display, jyutping = "si6", definition = "test" }) => ({
  id,
  source_book: "mock",
  headword: {
    display,
    normalized: display,
  },
  phonetic: {
    jyutping: [jyutping],
  },
  entry_type: "word",
  senses: [{ definition }],
  dialect: { region_code: "HK" },
  keywords: [display],
});

const createEvent = (headers = {}) => ({
  context: {},
  node: {
    req: {
      headers,
    },
  },
});

test.afterEach(() => {
  resetRelatedWordsRuntimeStateForTests();
  delete process.env.NUXT_MODERATION_TEST_COUNTRY;
});

test("related headword candidates prefer prefix and exclude current headword", async () => {
  const candidates = await getRelatedHeadwordCandidates({
    query: "沙士",
    headwords: ["沙士", "沙士茶", "新沙士", "業界"],
    maxCandidates: 10,
  });

  assert.deepEqual(
    candidates.map((candidate) => candidate.headword),
    ["沙士茶", "新沙士"],
  );
});

test("static related response returns grouped entries without full search dependencies", async () => {
  const resolved = [];
  const response = await buildStaticRelatedWordsResponse({
    query: "沙士",
    limit: 5,
    headwords: ["沙士", "沙士茶", "新沙士", "沙士狗"],
    resolveWordEntries: async (headword) => {
      resolved.push(headword);
      return {
        canonicalHeadword: headword,
        entries: [createEntry({ id: headword, display: headword })],
      };
    },
  });

  assert.equal(response.success, true);
  assert.deepEqual(
    response.groups.map((group) => group.primary.headword.display),
    ["沙士狗", "沙士茶", "新沙士"],
  );
  assert.deepEqual(resolved, ["沙士狗", "沙士茶", "新沙士"]);
});

test("static related response applies mainland moderation filtering", async () => {
  const restrictedId = restrictedEntryIdsArtifact.entry_ids[0];
  process.env.NUXT_MODERATION_TEST_COUNTRY = "CN";

  const response = await buildStaticRelatedWordsResponse({
    query: "沙士",
    limit: 5,
    event: createEvent(),
    headwords: ["沙士茶", "新沙士"],
    resolveWordEntries: async (headword) => ({
      canonicalHeadword: headword,
      entries:
        headword === "沙士茶"
          ? [createEntry({ id: restrictedId, display: "沙士茶" })]
          : [createEntry({ id: "visible", display: "新沙士" })],
    }),
  });

  assert.deepEqual(
    response.results.map((entry) => entry.id),
    ["visible"],
  );
});

test("static related response fails closed to empty results", async () => {
  const response = await buildStaticRelatedWordsResponse({
    query: "沙士",
    limit: 5,
    headwords: ["沙士茶"],
    resolveWordEntries: async () => {
      throw new Error("asset unavailable");
    },
  });

  assert.equal(response.success, true);
  assert.equal(response.groups.length, 0);
  assert.equal(response.total.grouped, 0);
});

import assert from "node:assert/strict";
import test from "node:test";

import restrictedEntryIdsArtifact from "../server/assets/moderation/cn-restricted-entry-ids.json" with { type: "json" };
import {
  filterRestrictedEntries,
  getCountryCode,
  isRestrictedEntryId,
  queryTouchesRestrictedTerm,
  shouldApplyMainlandModeration,
} from "../server/utils/moderation.ts";

const createEvent = (headers = {}) => ({
  context: {},
  node: {
    req: {
      headers,
    },
  },
});

test.afterEach(() => {
  delete process.env.NUXT_MODERATION_TEST_COUNTRY;
});

test("mainland moderation detects Cloudflare country headers", () => {
  const event = createEvent({ "cf-ipcountry": "CN" });

  assert.equal(getCountryCode(event), "CN");
  assert.equal(shouldApplyMainlandModeration(event), true);
});

test("restricted query terms are detected without flagging ordinary entries", () => {
  assert.equal(queryTouchesRestrictedTerm("中共病毒"), true);
  assert.equal(queryTouchesRestrictedTerm("武肺"), true);
  assert.equal(queryTouchesRestrictedTerm("ccp virus"), true);
  assert.equal(queryTouchesRestrictedTerm("共匪"), true);
  assert.equal(queryTouchesRestrictedTerm("64"), true);
  assert.equal(queryTouchesRestrictedTerm("六四"), true);
  assert.equal(queryTouchesRestrictedTerm("臺獨"), true);
  assert.equal(queryTouchesRestrictedTerm("台獨"), true);
  assert.equal(queryTouchesRestrictedTerm("台独"), true);
  assert.equal(queryTouchesRestrictedTerm("光復香港、時代革命"), true);
  assert.equal(queryTouchesRestrictedTerm("缺一不可"), true);
  assert.equal(queryTouchesRestrictedTerm("光時"), true);
  assert.equal(queryTouchesRestrictedTerm("香港獨立"), true);
  assert.equal(queryTouchesRestrictedTerm("港獨"), true);
  assert.equal(queryTouchesRestrictedTerm("反送中"), true);
  assert.equal(queryTouchesRestrictedTerm("反修例"), true);
  assert.equal(queryTouchesRestrictedTerm("攬炒"), true);
  assert.equal(queryTouchesRestrictedTerm("五大訴求"), true);
  assert.equal(queryTouchesRestrictedTerm("臺灣獨立"), true);
  assert.equal(queryTouchesRestrictedTerm("臺灣國"), true);
  assert.equal(queryTouchesRestrictedTerm("藏独"), true);
  assert.equal(queryTouchesRestrictedTerm("疆独"), true);
  assert.equal(queryTouchesRestrictedTerm("坦克人"), true);
  assert.equal(queryTouchesRestrictedTerm("王維林"), true);
  assert.equal(queryTouchesRestrictedTerm("Liberate Hong Kong"), true);
  assert.equal(queryTouchesRestrictedTerm("連登"), true);
  assert.equal(queryTouchesRestrictedTerm("LIHKG"), true);
  assert.equal(queryTouchesRestrictedTerm("黑警"), true);
  assert.equal(queryTouchesRestrictedTerm("黃之鋒"), true);
  assert.equal(queryTouchesRestrictedTerm("民陣"), true);
  assert.equal(queryTouchesRestrictedTerm("支聯會"), true);
  assert.equal(queryTouchesRestrictedTerm("再教育營"), true);
  assert.equal(queryTouchesRestrictedTerm("種族滅絕"), true);
  assert.equal(queryTouchesRestrictedTerm("阿二"), false);
  assert.equal(queryTouchesRestrictedTerm("性交"), false);
  assert.equal(queryTouchesRestrictedTerm("閪窿"), false);
  assert.equal(queryTouchesRestrictedTerm("打飛機"), false);
  assert.equal(queryTouchesRestrictedTerm("環境保護"), false);
  assert.equal(queryTouchesRestrictedTerm("真人表演"), false);
  assert.equal(queryTouchesRestrictedTerm("社會保障"), false);
});

test("restricted entries are filtered for mainland requests", () => {
  const restrictedId = restrictedEntryIdsArtifact.entry_ids[0];
  assert.ok(restrictedId);
  assert.equal(isRestrictedEntryId(restrictedId), true);

  process.env.NUXT_MODERATION_TEST_COUNTRY = "CN";
  const results = filterRestrictedEntries(createEvent(), [
    { id: restrictedId, headword: "restricted", moderation: { policy: "test" } },
    { id: "not-restricted", headword: "visible", moderation: { policy: "test" } },
  ]);

  assert.deepEqual(results, [{ id: "not-restricted", headword: "visible" }]);
});

test("restricted entries are not filtered for non-mainland requests", () => {
  const restrictedId = restrictedEntryIdsArtifact.entry_ids[0];
  assert.ok(restrictedId);

  const results = filterRestrictedEntries(createEvent({ "cf-ipcountry": "US" }), [
    { id: restrictedId, headword: "restricted", moderation: { policy: "test" } },
    { id: "not-restricted", headword: "visible", moderation: { policy: "test" } },
  ]);

  assert.deepEqual(results, [
    { id: restrictedId, headword: "restricted" },
    { id: "not-restricted", headword: "visible" },
  ]);
});

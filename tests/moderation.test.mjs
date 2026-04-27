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

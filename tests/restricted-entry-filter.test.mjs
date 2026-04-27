import assert from "node:assert/strict";
import test from "node:test";

import publicRestrictedEntryIdsArtifact from "../public/moderation/cn-restricted-entry-ids.json" with { type: "json" };
import serverRestrictedEntryIdsArtifact from "../server/assets/moderation/cn-restricted-entry-ids.json" with { type: "json" };
import {
  createRestrictedEntryIdSet,
  filterRestrictedEntryIds,
  isRestrictedEntry,
} from "../utils/restricted-entry-filter.ts";

test("public restricted entry artifact stays in sync with server artifact", () => {
  assert.deepEqual(
    publicRestrictedEntryIdsArtifact,
    serverRestrictedEntryIdsArtifact,
  );
  assert.ok(
    publicRestrictedEntryIdsArtifact.entry_ids.includes(
      "wiktionary-cantonese_00099439",
    ),
  );
  assert.ok(
    publicRestrictedEntryIdsArtifact.entry_ids.includes(
      "wiktionary-cantonese_00116958",
    ),
  );
  assert.ok(
    publicRestrictedEntryIdsArtifact.entry_ids.includes(
      "hk-cantowords_110860",
    ),
  );
  assert.ok(
    publicRestrictedEntryIdsArtifact.entry_ids.includes(
      "wiktionary-cantonese_00104647",
    ),
  );
  assert.ok(
    publicRestrictedEntryIdsArtifact.entry_ids.includes(
      "wiktionary-cantonese_00100363",
    ),
  );
});

test("restricted entry filter removes romanization-searchable entries by id", () => {
  const restrictedEntryIds = createRestrictedEntryIdSet([
    " wiktionary-cantonese_00099439 ",
  ]);
  const entries = [
    {
      id: "wiktionary-cantonese_00099439",
      headword: { display: "中共病毒" },
      keywords: ["zunggungbengduk"],
    },
    {
      id: "visible",
      headword: { display: "中" },
      keywords: ["zung"],
    },
  ];

  assert.equal(isRestrictedEntry(entries[0], restrictedEntryIds), true);
  assert.deepEqual(filterRestrictedEntryIds(entries, restrictedEntryIds), [
    entries[1],
  ]);
});

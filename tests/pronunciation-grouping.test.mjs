import assert from "node:assert/strict";
import test from "node:test";

import {
  groupEntriesByPronunciation,
  UNANNOTATED_PRONUNCIATION_KEY,
} from "../utils/pronunciation-groups.ts";

test("multi-pronunciation entries contribute to each pronunciation group", () => {
  const wikiEntry = {
    id: "wiki",
    phonetic: { jyutping: ["pung1", "bung6"] },
  };
  const grouped = groupEntriesByPronunciation(
    [
      wikiEntry,
      { id: "dict", phonetic: { jyutping: ["bung6"] } },
      { id: "dialect", phonetic: { jyutping: ["bung4"] } },
    ],
    (entry) => entry.phonetic.jyutping,
  );

  assert.deepEqual([...grouped.keys()], ["pung1", "bung6", "bung4"]);
  assert.deepEqual(
    grouped.get("pung1")?.map((entry) => entry.id),
    ["wiki"],
  );
  assert.deepEqual(
    grouped.get("bung6")?.map((entry) => entry.id),
    ["wiki", "dict"],
  );
  assert.deepEqual(
    grouped.get("bung4")?.map((entry) => entry.id),
    ["dialect"],
  );
});

test("entries without pronunciation fall back to the unannotated group", () => {
  const grouped = groupEntriesByPronunciation(
    [{ id: "no-jp", phonetic: { jyutping: [] } }],
    (entry) => entry.phonetic.jyutping,
  );

  assert.deepEqual([...grouped.keys()], [UNANNOTATED_PRONUNCIATION_KEY]);
  assert.deepEqual(
    grouped.get(UNANNOTATED_PRONUNCIATION_KEY)?.map((entry) => entry.id),
    ["no-jp"],
  );
});

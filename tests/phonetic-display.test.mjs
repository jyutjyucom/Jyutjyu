import assert from "node:assert/strict";
import test from "node:test";

import {
  getOriginalPhoneticForIndex,
  getPhoneticDisplayRows,
} from "../utils/phonetic-display.ts";

test("phonetic display rows split multi-pronunciation entries into separate lines", () => {
  const phonetic = {
    jyutping: ["pung1", "bung6"],
    original: ["/pʰʊŋ⁵⁵/", "/pʊŋ²²/"],
  };

  assert.deepEqual(getPhoneticDisplayRows(phonetic), [
    { jyutping: "pung1", original: "/pʰʊŋ⁵⁵/" },
    { jyutping: "bung6", original: "/pʊŋ²²/" },
  ]);
});

test("colon-separated original phonetics already covered by jyutping stay hidden", () => {
  const phonetic = {
    jyutping: ["nei5", "hou2"],
    original: "nei5: hou2",
  };

  assert.equal(getOriginalPhoneticForIndex(phonetic, 0), null);
  assert.equal(getOriginalPhoneticForIndex(phonetic, 1), null);
});

test("parenthesized variant originals already covered by jyutping stay hidden", () => {
  const phonetic = {
    jyutping: ["baau6", "biu6", "beu6"],
    original: "baau6 (biu6, beu6)",
  };

  assert.equal(getOriginalPhoneticForIndex(phonetic, 0), null);
});

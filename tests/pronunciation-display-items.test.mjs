import assert from "node:assert/strict";
import test from "node:test";

import {
  getAggregatePronunciationDisplayItems,
  getEntryPronunciationDisplayItems,
  getTtsPhonemeJyutping,
  normalizeTtsJyutping,
} from "../utils/pronunciation-display.ts";

test("entry pronunciation display items preserve split rows and source eligibility", () => {
  const items = getEntryPronunciationDisplayItems({
    source_book: "廣州話詞典（第2版）",
    phonetic: {
      jyutping: ["zaap6", "caap6"],
      original: ["zaap6", "caap6"],
    },
  });

  assert.deepEqual(
    items.map((item) => ({
      label: item.label,
      normalized: item.normalized,
      ttsEligible: item.ttsEligible,
      original: item.original,
    })),
    [
      {
        label: "zaap6",
        normalized: "zaap6",
        ttsEligible: true,
        original: null,
      },
      {
        label: "caap6",
        normalized: "caap6",
        ttsEligible: true,
        original: null,
      },
    ],
  );
});

test("aggregate pronunciation items stay non-playable when sourced only from skipped dictionaries", () => {
  const items = getAggregatePronunciationDisplayItems([
    {
      source_book: "欽州粵拼",
      phonetic: {
        jyutping: ["zaam6"],
        original: "",
      },
    },
  ]);

  assert.deepEqual(items, [
    {
      label: "zaam6",
      normalized: "zaam6",
      ttsEligible: false,
    },
  ]);
});

test("aggregate pronunciation items become playable when any supported source contributes the same pronunciation", () => {
  const items = getAggregatePronunciationDisplayItems([
    {
      source_book: "欽州粵拼",
      phonetic: {
        jyutping: ["zaam6"],
        original: "",
      },
    },
    {
      source_book: "廣州話詞典（第2版）",
      phonetic: {
        jyutping: ["zaam6", "zaap6"],
        original: "",
      },
    },
  ]);

  assert.deepEqual(items, [
    {
      label: "zaam6",
      normalized: "zaam6",
      ttsEligible: true,
    },
    {
      label: "zaap6",
      normalized: "zaap6",
      ttsEligible: true,
    },
  ]);
});

test("TTS normalization collapses whitespace and lowercases pronunciation keys", () => {
  assert.equal(normalizeTtsJyutping(" Jyut6   Ping3 "), "jyut6 ping3");
});

test("TTS phoneme generation uses the tone after star and hyphen override markers", () => {
  assert.equal(
    getTtsPhonemeJyutping("tong4 ci1 dau6*2"),
    "tong4 ci1 dau2",
  );
  assert.equal(
    getTtsPhonemeJyutping("tung4 faa1 seon6*2"),
    "tung4 faa1 seon2",
  );
  assert.equal(
    getTtsPhonemeJyutping("hai6 gam2 ji3-2"),
    "hai6 gam2 ji2",
  );
  assert.equal(
    getTtsPhonemeJyutping("maau1 ji1 sai2 min6 hai6 gam2 ji3-2"),
    "maau1 ji1 sai2 min6 hai6 gam2 ji2",
  );
  assert.equal(getTtsPhonemeJyutping("jyut6 ping3"), "jyut6 ping3");
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  getCjkChunkProbeCharacters,
  getCjkSearchSubstringSeeds,
} from "../utils/search-query-expansion.ts";

test("CJK search substrings preserve full query and useful 2-char spans", () => {
  assert.deepEqual(getCjkSearchSubstringSeeds("地方志"), [
    "地方志",
    "地方",
    "方志",
  ]);
});

test("CJK search substrings ignore punctuation boundaries", () => {
  assert.deepEqual(getCjkSearchSubstringSeeds("上天無路，入地無門"), [
    "上天無路",
    "上天無",
    "天無路",
    "上天",
    "天無",
    "無路",
    "入地無門",
    "入地無",
    "地無門",
    "入地",
    "地無",
    "無門",
  ]);
});

test("CJK search substrings stay bounded for long bot/crawler queries", () => {
  const seeds = getCjkSearchSubstringSeeds("天地玄黃宇宙洪荒日月盈昃辰宿列張");

  assert.ok(seeds.length <= 32);
  assert.equal(seeds[0], "天地玄黃宇宙洪荒日月盈昃辰宿列張");
});

test("CJK chunk probes use multiple distinct characters with a cap", () => {
  assert.deepEqual(getCjkChunkProbeCharacters("地方志"), ["地", "方", "志"]);
  assert.deepEqual(getCjkChunkProbeCharacters("地方地方志"), ["地", "方", "志"]);
  assert.equal(getCjkChunkProbeCharacters("一二三四五六七八九十").length, 8);
});

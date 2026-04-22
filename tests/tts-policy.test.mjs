import assert from "node:assert/strict";
import test from "node:test";

import {
  isTtsSkippedDictionaryId,
  isTtsSkippedSourceBook,
  isTtsSupportedDictionaryId,
  isTtsSupportedSourceBook,
} from "../utils/tts-policy.ts";

test("TTS policy excludes the three non-standard dictionary ids", () => {
  assert.equal(isTtsSkippedDictionaryId("qz-jyutping"), true);
  assert.equal(isTtsSkippedDictionaryId("kp-dialect"), true);
  assert.equal(isTtsSkippedDictionaryId("ts-english-dict"), true);

  assert.equal(isTtsSupportedDictionaryId("gz-dict"), true);
  assert.equal(isTtsSupportedDictionaryId("wiktionary-cantonese"), true);
});

test("TTS policy excludes the non-standard source_book labels", () => {
  assert.equal(isTtsSkippedSourceBook("欽州粵拼"), true);
  assert.equal(isTtsSkippedSourceBook("開平方言"), true);
  assert.equal(isTtsSkippedSourceBook("开平方言"), true);
  assert.equal(isTtsSkippedSourceBook("台山話英文字典"), true);

  assert.equal(isTtsSupportedSourceBook("廣州話詞典（第2版）"), true);
  assert.equal(isTtsSupportedSourceBook("粵典 (words.hk)"), true);
});

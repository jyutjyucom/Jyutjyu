import assert from "node:assert/strict";
import test from "node:test";

import { parseDefinitionLinkSegments } from "../utils/definition-links.ts";

test("parseDefinitionLinkSegments returns empty array for empty input", () => {
  assert.deepEqual(parseDefinitionLinkSegments(""), []);
});

test("parseDefinitionLinkSegments preserves plain text without hash links", () => {
  assert.deepEqual(parseDefinitionLinkSegments("普通釋義文字 example 123"), [
    { type: "text", text: "普通釋義文字 example 123" },
  ]);
});

test("parseDefinitionLinkSegments splits #word cross-references cleanly", () => {
  assert.deepEqual(parseDefinitionLinkSegments("即係 #飲茶，又可以講 #一盅兩件。"), [
    { type: "text", text: "即係 " },
    { type: "word-link", text: "#飲茶", word: "飲茶" },
    { type: "text", text: "，又可以講 " },
    { type: "word-link", text: "#一盅兩件", word: "一盅兩件" },
    { type: "text", text: "。" },
  ]);
});

test("parseDefinitionLinkSegments treats raw HTML markup as plain text segments", () => {
  const payload = '<img src=x onerror="alert(1)"> #飲茶 <script>alert(1)</script>';
  const segments = parseDefinitionLinkSegments(payload);

  assert.deepEqual(segments, [
    { type: "text", text: '<img src=x onerror="alert(1)"> ' },
    { type: "word-link", text: "#飲茶", word: "飲茶" },
    { type: "text", text: " <script>alert(1)</script>" },
  ]);
});

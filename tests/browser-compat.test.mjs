import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { sortSearchGroups } from "../utils/search-result-groups.ts";

const collectSourceFiles = (dir) => {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(fullPath));
    } else if (/\.(ts|vue|js|mjs)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
};

test("runtime code avoids Array.prototype.toSorted and sorts immutably without it", () => {
  const dirs = ["components", "composables", "pages", "utils", "server"];
  const offenders = [];
  for (const dir of dirs) {
    for (const file of collectSourceFiles(dir)) {
      const content = readFileSync(file, "utf8");
      if (content.includes(".toSorted(")) {
        offenders.push(file);
      }
    }
  }
  assert.deepEqual(offenders, []);

  const originalDescriptor = Object.getOwnPropertyDescriptor(
    Array.prototype,
    "toSorted",
  );
  delete Array.prototype.toSorted;
  try {
    const groups = [
      {
        key: "b",
        primary: {
          id: "2",
          source_book: "b",
          headword: { display: "b-word", normalized: "b-word" },
          phonetic: { jyutping: ["ba1"] },
          senses: [],
        },
        entries: [],
      },
      {
        key: "a",
        primary: {
          id: "1",
          source_book: "a",
          headword: { display: "a-word", normalized: "a-word" },
          phonetic: { jyutping: ["aa1"] },
          senses: [],
        },
        entries: [],
      },
    ];
    const sorted = sortSearchGroups(groups, "headword");
    assert.deepEqual(
      sorted.map((item) => item.key),
      ["a", "b"],
    );
    assert.deepEqual(
      groups.map((item) => item.key),
      ["b", "a"],
    );
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(Array.prototype, "toSorted", originalDescriptor);
    }
  }
});

test("modern-web CSS provides legacy fallbacks for popovers, spinner, and units", () => {
  const css = readFileSync("styles/modern-web.css", "utf8");

  assert.match(css, /@supports not selector\(:popover-open\)/);
  assert.match(css, /\[data-popover-open="true"\]/);
  assert.match(css, /max-height:\s*70vh;\s*max-height:\s*70dvh;/);
  assert.match(css, /min-height:\s*11rem;\s*min-block-size:\s*8lh;/);
  assert.match(css, /--track-color:\s*rgb\(181 58 37 \/ 0\.16\);/);
  assert.match(css, /-webkit-mask-image:\s*radial-gradient/);
});

test("popover menu components wire fallback open state and trigger handler", () => {
  for (const file of [
    "components/LanguageSwitcher.vue",
    "components/SearchSortSelect.vue",
    "components/SearchFilterControls.vue",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /usePopoverMenu/);
    assert.match(source, /:data-popover-open=/);
    assert.match(source, /@click="toggle/);
  }
});

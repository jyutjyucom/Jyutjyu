import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import test from "node:test";

import { getHeadwordSuggestions } from "../server/utils/headword-suggestions.ts";

const execFileAsync = promisify(execFile);
const suggestionAssetPath = resolve(
  process.cwd(),
  "public",
  "search-suggestions",
  "records.json",
);

const ensureSuggestionAsset = async () => {
  try {
    await access(suggestionAssetPath);
  } catch {
    await execFileAsync(process.execPath, ["scripts/build-search-suggestions.js"], {
      cwd: process.cwd(),
    });
  }
};

test("headword suggestions require at least 2 characters", async () => {
  assert.deepEqual(await getHeadwordSuggestions("我", 10), []);
});

test("headword suggestions are served from the built static asset", async () => {
  await ensureSuggestionAsset();

  const suggestions = await getHeadwordSuggestions("我哋", 5);

  assert.ok(Array.isArray(suggestions));
  assert.ok(suggestions.length > 0);
  assert.ok(suggestions.includes("我哋"));
});

import assert from "node:assert/strict";
import test from "node:test";

import { resolveServerUseApi } from "../server/utils/runtime-mode.ts";

test("resolveServerUseApi respects explicit public API mode", () => {
  assert.equal(
    resolveServerUseApi({
      publicUseApi: true,
      mongodbUri: "",
    }),
    true,
  );
});

test("resolveServerUseApi enables API mode when MongoDB is only available at runtime", () => {
  assert.equal(
    resolveServerUseApi({
      publicUseApi: false,
      mongodbUri: "mongodb+srv://example.mongodb.net/jyutjyu",
    }),
    true,
  );
});

test("resolveServerUseApi stays in JSON mode when neither flag nor MongoDB URI exists", () => {
  assert.equal(
    resolveServerUseApi({
      publicUseApi: false,
      mongodbUri: "",
    }),
    false,
  );
});

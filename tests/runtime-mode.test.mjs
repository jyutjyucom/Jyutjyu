import assert from "node:assert/strict";
import test from "node:test";

import { resolveServerUseApi } from "../server/utils/runtime-mode.ts";

test.afterEach(() => {
  delete process.env.NUXT_PUBLIC_USE_API;
  delete process.env.MONGODB_URI;
});

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
  process.env.MONGODB_URI = "mongodb+srv://runtime.mongodb.net/jyutjyu";

  assert.equal(
    resolveServerUseApi({
      publicUseApi: false,
      mongodbUri: "",
    }),
    true,
  );
});

test("resolveServerUseApi respects runtime disable flag over available MongoDB URI", () => {
  process.env.NUXT_PUBLIC_USE_API = "false";
  process.env.MONGODB_URI = "mongodb+srv://runtime.mongodb.net/jyutjyu";

  assert.equal(
    resolveServerUseApi({
      publicUseApi: true,
      mongodbUri: "mongodb+srv://build.mongodb.net/jyutjyu",
    }),
    false,
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

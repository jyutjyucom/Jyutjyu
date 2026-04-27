import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_RANDOM_QUERY_TIMEOUT_MS,
  WORKER_RANDOM_QUERY_TIMEOUT_MS,
  resolveRandomEntries,
} from "../server/utils/random-entries.ts";

const originalNodeEnv = process.env.NODE_ENV;

test.afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

test("production Worker random queries use the paid-plan Mongo timeout budget", async () => {
  process.env.NODE_ENV = "production";

  let observedTimeoutMs = 0;
  const result = await resolveRandomEntries({
    count: 2,
    event: { context: { cloudflare: {} } },
    fallbackEntries: [],
    fetchFromMongo: async (_count, timeoutMs) => {
      observedTimeoutMs = timeoutMs;
      return [{ id: "entry-1" }];
    },
  });

  assert.equal(observedTimeoutMs, WORKER_RANDOM_QUERY_TIMEOUT_MS);
  assert.equal(result.success, true);
  assert.equal(result.count, 1);
});

test("non-Worker random queries keep the default Mongo timeout budget", async () => {
  process.env.NODE_ENV = "production";

  let observedTimeoutMs = 0;
  const result = await resolveRandomEntries({
    count: 2,
    event: {},
    fallbackEntries: [],
    fetchFromMongo: async (_count, timeoutMs) => {
      observedTimeoutMs = timeoutMs;
      return [{ id: "entry-1" }, { id: "entry-2" }];
    },
  });

  assert.equal(observedTimeoutMs, DEFAULT_RANDOM_QUERY_TIMEOUT_MS);
  assert.equal(result.success, true);
  assert.equal(result.count, 2);
});

test("random queries fall back to bundled entries on timeout without changing response shape", async () => {
  const result = await resolveRandomEntries({
    count: 2,
    timeoutMsOverride: 5,
    fallbackEntries: [{ id: "fallback-1" }, { id: "fallback-2" }],
    fetchFromMongo: async () =>
      await new Promise(() => {
        // Never resolves so the timeout path can take over.
      }),
  });

  assert.equal(result.success, true);
  assert.equal(result.count, 2);
  assert.deepEqual(
    result.results.map((entry) => entry.id).sort(),
    ["fallback-1", "fallback-2"],
  );
});

test("random queries fall back to bundled entries on Mongo errors", async () => {
  const result = await resolveRandomEntries({
    count: 1,
    fallbackEntries: [{ id: "fallback-1" }, { id: "fallback-2" }],
    fetchFromMongo: async () => {
      throw new Error("mongo unavailable");
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.count, 1);
  assert.equal(result.results.length, 1);
  assert.ok(result.results[0]?.id?.startsWith("fallback-"));
});

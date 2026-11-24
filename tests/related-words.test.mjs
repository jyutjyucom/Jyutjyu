import assert from "node:assert/strict";
import test from "node:test";

import restrictedEntryIdsArtifact from "../server/assets/moderation/cn-restricted-entry-ids.json" with { type: "json" };
import {
  buildStaticRelatedWordsResponse,
  getRelatedHeadwordCandidates,
  resetRelatedWordsRuntimeStateForTests,
} from "../server/utils/related-words.ts";

const createEntry = ({ id, display, jyutping = "si6", definition = "test" }) => ({
  id,
  source_book: "mock",
  headword: {
    display,
    normalized: display,
  },
  phonetic: {
    jyutping: [jyutping],
  },
  entry_type: "word",
  senses: [{ definition }],
  dialect: { region_code: "HK" },
  keywords: [display],
});

const createEvent = (headers = {}, db = undefined) => ({
  context: db ? { cloudflare: { env: { DB: db } } } : {},
  node: {
    req: {
      headers,
    },
  },
});

const createMockD1 = ({ entries, onPrepare }) => {
  const formIndex = new Map();
  for (const entry of entries) {
    const forms = [
      entry.headword?.display,
      entry.headword?.normalized,
      ...(entry.meta?.headword_variants || []),
    ]
      .map((form) => String(form || "").replace(/\s+/g, " ").trim().toLowerCase())
      .filter(Boolean);
    for (const form of new Set(forms)) {
      if (!formIndex.has(form)) formIndex.set(form, []);
      formIndex.get(form).push(entry);
    }
  }

  return {
    prepare(sql) {
      return {
        bind(...params) {
          onPrepare?.(sql, params);
          return {
            async all() {
              if (sql.includes("WHERE f.key > ?1 AND f.key < ?2")) {
                const [low, high, _scanLimit, outerLimit] = params;
                const excludeRestricted = sql.includes("AND e.restricted = 0");
                const rows = [];
                const seen = new Set();
                for (const [key, list] of formIndex.entries()) {
                  if (!(key > low && key < high)) continue;
                  for (const entry of list) {
                    if (excludeRestricted && entry._restricted) continue;
                    const canon = entry.headword.normalized || entry.headword.display;
                    if (!seen.has(canon)) {
                      seen.add(canon);
                      rows.push({ canon, len: key.length });
                    }
                  }
                }
                rows.sort((a, b) =>
                  a.len !== b.len ? a.len - b.len : a.canon.localeCompare(b.canon),
                );
                return {
                  results: rows.slice(0, outerLimit).map(({ canon }) => ({ canon })),
                };
              }

              if (sql.includes("FROM entry_fts JOIN entries")) {
                const [matchExpr, limit] = params;
                const excludeRestricted = sql.includes("AND e.restricted = 0");
                const normalizedTokens = Array.from(
                  matchExpr.matchAll(/"([^"]+)"/g),
                ).map((m) => m[1]);
                const rows = [];
                for (const entry of entries) {
                  if (excludeRestricted && entry._restricted) continue;
                  const hay = [
                    entry.headword?.display,
                    entry.headword?.normalized,
                    ...(entry.meta?.headword_variants || []),
                  ]
                    .filter(Boolean)
                    .join(" ");
                  if (normalizedTokens.some((tok) => hay.includes(tok))) {
                    rows.push({ canon: entry.headword.normalized || entry.headword.display });
                  }
                }
                return { results: rows.slice(0, limit) };
              }

              if (sql.includes("WHERE f.key IN (")) {
                const limit = params[params.length - 1];
                const keys = new Set(params.slice(0, -1));
                const seenIds = new Set();
                const payloads = [];
                for (const key of keys) {
                  for (const entry of formIndex.get(key) || []) {
                    if (seenIds.has(entry.id)) continue;
                    seenIds.add(entry.id);
                    const { _restricted, ...clean } = entry;
                    payloads.push({ payload: JSON.stringify(clean) });
                    if (payloads.length >= limit) break;
                  }
                  if (payloads.length >= limit) break;
                }
                return { results: payloads };
              }

              return { results: [] };
            },
            async first() {
              return null;
            },
            async run() {
              return {};
            },
          };
        },
      };
    },
  };
};

test.afterEach(() => {
  resetRelatedWordsRuntimeStateForTests();
  delete process.env.NUXT_MODERATION_TEST_COUNTRY;
});

test("related headword candidates prefer prefix and exclude current headword", async () => {
  const candidates = await getRelatedHeadwordCandidates({
    query: "沙士",
    headwords: ["沙士", "沙士茶", "新沙士", "業界"],
    maxCandidates: 10,
  });

  assert.deepEqual(
    candidates.map((candidate) => candidate.headword),
    ["沙士茶", "新沙士"],
  );
});

test("static related response returns grouped entries without full search dependencies", async () => {
  const resolved = [];
  const response = await buildStaticRelatedWordsResponse({
    query: "沙士",
    limit: 5,
    headwords: ["沙士", "沙士茶", "新沙士", "沙士狗"],
    resolveWordEntries: async (headword) => {
      resolved.push(headword);
      return {
        canonicalHeadword: headword,
        entries: [createEntry({ id: headword, display: headword })],
      };
    },
  });

  assert.equal(response.success, true);
  assert.deepEqual(
    response.groups.map((group) => group.primary.headword.display),
    ["沙士狗", "沙士茶", "新沙士"],
  );
  assert.deepEqual(resolved, ["沙士", "沙士狗", "沙士茶", "新沙士"]);
  assert.equal(response.total.grouped, 3);
  assert.equal(response.searchTotal.grouped, 4);
});

test("static related response applies mainland moderation filtering", async () => {
  const restrictedId = restrictedEntryIdsArtifact.entry_ids[0];
  process.env.NUXT_MODERATION_TEST_COUNTRY = "CN";

  const response = await buildStaticRelatedWordsResponse({
    query: "沙士",
    limit: 5,
    event: createEvent(),
    headwords: ["沙士茶", "新沙士"],
    resolveWordEntries: async (headword) => ({
      canonicalHeadword: headword,
      entries:
        headword === "沙士茶"
          ? [createEntry({ id: restrictedId, display: "沙士茶" })]
          : [createEntry({ id: "visible", display: "新沙士" })],
    }),
  });

  assert.deepEqual(
    response.results.map((entry) => entry.id),
    ["visible"],
  );
});

test("static related response fails closed to empty results", async () => {
  const response = await buildStaticRelatedWordsResponse({
    query: "沙士",
    limit: 5,
    headwords: ["沙士茶"],
    resolveWordEntries: async () => {
      throw new Error("asset unavailable");
    },
  });

  assert.equal(response.success, true);
  assert.equal(response.groups.length, 0);
  assert.equal(response.total.grouped, 0);
});

test("d1 related words uses entry_forms prefix then entry_fts contains and batches form lookups", async () => {
  const queries = [];
  const entries = [
    createEntry({ id: "main", display: "沙士" }),
    createEntry({ id: "prefix-1", display: "沙士糖" }),
    createEntry({ id: "contains-1", display: "新沙士" }),
  ];
  const db = createMockD1({
    entries,
    onPrepare: (sql, params) => queries.push({ sql, params }),
  });

  const response = await buildStaticRelatedWordsResponse({
    query: "沙士",
    limit: 5,
    event: createEvent({}, db),
  });

  assert.equal(response.success, true);
  assert.deepEqual(
    response.groups.map((group) => group.primary.headword.display),
    ["沙士糖", "新沙士"],
  );
  assert.equal(response.total.grouped, 2);
  assert.equal(response.searchTotal.grouped, 3);
  assert.ok(queries.some((q) => q.sql.includes("FROM entry_forms f JOIN entries e")));
  assert.ok(queries.some((q) => q.sql.includes("FROM entry_fts JOIN entries e")));
});

test("d1 related words respects mainland moderation and chunks >80 form keys", async () => {
  const restrictedId = restrictedEntryIdsArtifact.entry_ids[0];
  process.env.NUXT_MODERATION_TEST_COUNTRY = "CN";
  const queries = [];
  const entries = [createEntry({ id: "visible-0", display: "发裏" })];
  for (let i = 1; i <= 34; i += 1) {
    entries.push({
      ...createEntry({ id: `prefix-${i}`, display: `发裏店${i}` }),
      meta: { headword_variants: [`发里店${i}`, `發裏店${i}`] },
    });
  }
  entries.push({
    ...createEntry({ id: restrictedId, display: "发裏室" }),
    _restricted: true,
  });

  const db = createMockD1({
    entries,
    onPrepare: (sql, params) => queries.push({ sql, params }),
  });

  const response = await buildStaticRelatedWordsResponse({
    query: "发裏",
    limit: 24,
    event: createEvent({}, db),
  });

  const prefixQueries = queries.filter((q) =>
    q.sql.includes("WHERE f.key > ?1 AND f.key < ?2"),
  );
  const formBatchQueries = queries.filter((q) => q.sql.includes("WHERE f.key IN ("));
  const ftsQueries = queries.filter((q) =>
    q.sql.includes("FROM entry_fts JOIN entries"),
  );

  assert.ok(prefixQueries.every((q) => q.sql.includes("AND e.restricted = 0")));
  assert.equal(ftsQueries.length, 0);
  assert.ok(formBatchQueries.length >= 2);
  assert.ok(!response.results.some((entry) => entry.id === restrictedId));
  assert.equal(response.groups.length, 24);
});

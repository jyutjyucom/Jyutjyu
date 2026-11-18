#!/usr/bin/env node
/**
 * 把 public/dictionaries/*.json 匯出成 D1 可用的 SQL（entries + FTS5）。
 *
 * 用法：
 *   node scripts/import-to-d1.js                 # 全量
 *   node scripts/import-to-d1.js --limit 20000   # 只取前 N 條（quick check）
 *   node scripts/import-to-d1.js --dict gz-modern
 *
 * 產物：data/d1/schema.sql, data/d1/seed.sql
 */

import {
  appendFileSync,
  createWriteStream,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { tokenizeCjk } from "../server/utils/cjk-tokenize.ts";
import { stableId } from "./utils/stable-id.js";

const ROOT = resolve(process.cwd(), "public/dictionaries");
const OUT_DIR = resolve(process.cwd(), "data/d1");
const BATCH_ROWS = 10;

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const limit = Number.parseInt(getArg("--limit") || "0", 10) || 0;
const onlyDict = getArg("--dict");
const outDir = getArg("--out") ? resolve(process.cwd(), getArg("--out")) : OUT_DIR;

const index = JSON.parse(readFileSync(resolve(ROOT, "index.json"), "utf8"));
const restricted = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "server/assets/moderation/cn-restricted-entry-ids.json"),
    "utf8",
  ),
);
const restrictedIds = new Set(restricted.entry_ids || []);

const quote = (value) => {
  if (value === null || value === undefined) return "NULL";
  const text = String(value)
    .split(String.fromCharCode(0))
    .join("")
    .replace(/'/g, "''");
  return "'" + text + "'";
};

const flattenStrings = (value) =>
  (Array.isArray(value) ? value : []).filter(
    (item) => typeof item === "string" && item.trim(),
  );

const collectDefinitions = (entry) => {
  const parts = [];
  for (const sense of entry.senses || []) {
    if (sense?.definition) parts.push(sense.definition);
    for (const example of sense?.examples || []) {
      if (typeof example === "string") parts.push(example);
      else if (example?.text) parts.push(example.text);
    }
  }
  return parts.join(" ");
};

const buildFiles = () => {
  const files = [];
  for (const dict of index.dictionaries) {
    if (onlyDict && dict.id !== onlyDict) continue;
    if (dict.chunked && dict.chunk_dir) {
      const manifest = JSON.parse(
        readFileSync(resolve(ROOT, dict.chunk_dir, "manifest.json"), "utf8"),
      );
      for (const info of Object.values(manifest.chunks || {})) {
        if (info?.file) files.push(resolve(ROOT, dict.chunk_dir, info.file));
      }
    } else if (dict.file) {
      files.push(resolve(ROOT, dict.file));
    }
  }
  return files;
};

class BufferedWriter {
  constructor(path) {
    mkdirSync(dirname(path), { recursive: true });
    this.stream = createWriteStream(path);
  }

  async write(chunk) {
    if (!this.stream.write(chunk)) {
      await new Promise((resolveDrain) => this.stream.once("drain", resolveDrain));
    }
  }

  async close() {
    await new Promise((resolveEnd) => this.stream.end(resolveEnd));
  }
}

const schemaSql = readFileSync(
  resolve(process.cwd(), "scripts/d1-spike/schema.sql"),
  "utf8",
);

const writer = new BufferedWriter(resolve(outDir, "seed.sql"));

const seen = new Set();
const seenIds = new Map();
let total = 0;
let skipped = 0;
// rowid 由 entry_id 哈希决定，不再依赖出现顺序

// 先按 id 高 8 位分桶落盘，再逐桶按 id 升序写出。
// 顺序插入让 SQLite 以 append 方式填 B-tree（约 90% 填充率）；
// 随机插入只有约 57%，同样数据会多占三成空间。
const BUCKETS = 256;
const bucketDir = mkdtempSync(join(tmpdir(), "jyutjyu-d1-"));
const bucketPaths = Array.from({ length: BUCKETS }, (_, i) =>
  join(bucketDir, `b${i}.ndjson`),
);
const bucketBuffers = Array.from({ length: BUCKETS }, () => []);

const flushBucket = (bucket) => {
  if (bucketBuffers[bucket].length === 0) return;
  appendFileSync(bucketPaths[bucket], bucketBuffers[bucket].join("\n") + "\n");
  bucketBuffers[bucket] = [];
};

let entryBatch = [];
let ftsBatch = [];
let formBatch = [];

const flush = async () => {
  if (entryBatch.length > 0) {
    await writer.write(
      "INSERT INTO entries (id, entry_id, source_book, dialect, entry_type, canon, hw, jp, restricted, payload) VALUES\n" +
        entryBatch.join(",\n") +
        ";\n",
    );
    entryBatch = [];
  }
  if (ftsBatch.length > 0) {
    await writer.write(
      "INSERT INTO entry_fts (rowid, hw, vars, jp, kw, def) VALUES\n" +
        ftsBatch.join(",\n") +
        ";\n",
    );
    ftsBatch = [];
  }
  if (formBatch.length > 0) {
    await writer.write(
      "INSERT INTO entry_forms (key, entry_id) VALUES\n" +
        formBatch.join(",\n") +
        ";\n",
    );
    formBatch = [];
  }
};

const startedAt = Date.now();
for (const file of buildFiles()) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    continue;
  }
  const entries = Array.isArray(parsed)
    ? parsed
    : parsed.entries || parsed.items || [];

  for (const entry of entries) {
    if (!entry?.id || seen.has(entry.id)) {
      skipped += 1;
      continue;
    }
    if (limit > 0 && total >= limit) break;
    seen.add(entry.id);
    const rowId = stableId(entry.id);
    if (seenIds.has(rowId)) {
      throw new Error(
        "stable id collision: " + entry.id + " 与 " + seenIds.get(rowId),
      );
    }
    seenIds.set(rowId, entry.id);
    total += 1;

    const headword = entry.headword || {};
    const canon = String(headword.normalized || headword.display || "").trim();
    const display = String(headword.display || "");
    const jyutping = flattenStrings(entry.phonetic?.jyutping).join(" ");
    const variants = flattenStrings(entry.meta?.headword_variants).join(" ");
    const keywords = flattenStrings(entry.keywords).join(" ");
    const definitions = collectDefinitions(entry);
    const payload = JSON.stringify(entry);

    const entryTuple =
      "(" +
      [
        rowId,
        quote(entry.id),
        quote(entry.source_book || ""),
        quote(entry.dialect?.name || ""),
        quote(entry.entry_type || ""),
        quote(canon),
        quote(display + " " + canon),
        quote(jyutping),
        restrictedIds.has(entry.id) ? 1 : 0,
        quote(payload),
      ].join(", ") +
      ")";
    const ftsTuple =
      "(" +
      [
        rowId,
        quote(tokenizeCjk(display + " " + canon)),
        quote(tokenizeCjk(variants)),
        quote(tokenizeCjk(jyutping)),
        quote(tokenizeCjk(keywords)),
        quote(tokenizeCjk(definitions)),
      ].join(", ") +
      ")";

    const forms = new Set(
      [
        display,
        canon,
        ...flattenStrings(entry.meta?.headword_variants),
      ]
        .map((form) => String(form || "").replace(/\s+/g, " ").trim().toLowerCase())
        .filter(Boolean),
    );
    const formTuples = [];
    for (const form of forms) {
      formTuples.push("(" + quote(form) + ", " + rowId + ")");
    }

    const bucket = Number((rowId >> 55n) & 0xffn);
    bucketBuffers[bucket].push(
      JSON.stringify({
        id: rowId.toString(),
        e: entryTuple,
        f: ftsTuple,
        m: formTuples,
      }),
    );
    if (bucketBuffers[bucket].length >= 500) flushBucket(bucket);
    if (total % 20000 === 0) {
      console.log("rows", total, "elapsed_ms", Date.now() - startedAt);
    }
  }
  if (limit > 0 && total >= limit) break;
}

for (let i = 0; i < BUCKETS; i += 1) flushBucket(i);

await writer.write(schemaSql + "\n");

for (let b = 0; b < BUCKETS; b += 1) {
  let lines = [];
  try {
    lines = readFileSync(bucketPaths[b], "utf8").split("\n").filter(Boolean);
  } catch {
    continue;
  }
  if (lines.length === 0) continue;

  const records = lines.map((line) => JSON.parse(line));
  records.sort((left, right) => {
    const a = BigInt(left.id);
    const bId = BigInt(right.id);
    return a < bId ? -1 : a > bId ? 1 : 0;
  });

  for (const record of records) {
    entryBatch.push(record.e);
    ftsBatch.push(record.f);
    for (const form of record.m) formBatch.push(form);
    if (entryBatch.length >= BATCH_ROWS) await flush();
  }
}

await flush();
await writer.write("ANALYZE;\n");
await writer.close();
rmSync(bucketDir, { recursive: true, force: true });

console.log(
  JSON.stringify({
    rows: total,
    skipped,
    restricted: restrictedIds.size,
    elapsedMs: Date.now() - startedAt,
    out: resolve(outDir, "seed.sql"),
  }),
);

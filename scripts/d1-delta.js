#!/usr/bin/env node
/**
 * 產生 D1 增量更新 SQL（只更新有變動的詞條）。
 *
 * 背景：scripts/import-to-d1.js 產生的是「全量」seed.sql（DROP TABLE + 全量 INSERT），
 * 每次小改動都重灌 27 萬條會浪費 D1 的 rows-written 配額。這個腳本改為比對舊/新
 * 詞典快照，只輸出：
 *   - 新增詞條 INSERT
 *   - 變動詞條 UPDATE + FTS 'delete'/INSERT + entry_forms 重建
 *   - 刪除詞條 DELETE + FTS 'delete' + entry_forms 清理
 *
 * 用法：
 *   node scripts/d1-delta.js --old /path/to/old/public/dictionaries
 *   node scripts/d1-delta.js --old ... --new public/dictionaries --out data/d1/delta.sql
 *
 * 注意：沿用舊快照的 rowid，不重新編號；新增詞條的 id 由舊快照最大 id 遞增。
 */

import { readFileSync, mkdirSync, createWriteStream } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { tokenizeCjk } from "../server/utils/cjk-tokenize.ts";

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const oldDir = getArg("--old");
const newDir = getArg("--new") || resolve(process.cwd(), "public/dictionaries");
const outPath = getArg("--out") || resolve(process.cwd(), "data/d1/delta.sql");

if (!oldDir) {
  console.error("用法: node scripts/d1-delta.js --old <舊快照目錄> [--new ...] [--out ...]");
  process.exit(1);
}

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

function loadIndex(dir) {
  return JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
}

function listEntryFiles(dir) {
  const index = loadIndex(dir);
  const files = [];
  for (const dict of index.dictionaries) {
    if (dict.chunked && dict.chunk_dir) {
      const manifest = JSON.parse(
        readFileSync(join(dir, dict.chunk_dir, "manifest.json"), "utf8"),
      );
      for (const info of Object.values(manifest.chunks || {})) {
        if (info?.file) files.push(join(dir, dict.chunk_dir, info.file));
      }
    } else if (dict.file) {
      files.push(join(dir, dict.file));
    }
  }
  return files;
}

/** 依 import-to-d1 的順序建立 id → 詞條 對應 */
function buildRows(dir) {
  const rows = new Map(); // entry_id -> { id, entry, fields... }
  const byId = new Map();
  const seen = new Set();
  let rowId = 0;

  for (const file of listEntryFiles(dir)) {
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
      if (!entry?.id || seen.has(entry.id)) continue;
      seen.add(entry.id);
      rowId += 1;

      const headword = entry.headword || {};
      const canon = String(headword.normalized || headword.display || "").trim();
      const display = String(headword.display || "");
      const jyutping = flattenStrings(entry.phonetic?.jyutping).join(" ");
      const variants = flattenStrings(entry.meta?.headword_variants).join(" ");
      const keywords = flattenStrings(entry.keywords).join(" ");
      const definitions = collectDefinitions(entry);

      const forms = [
        display,
        canon,
        ...flattenStrings(entry.meta?.headword_variants),
      ]
        .map((form) => String(form || "").replace(/\s+/g, " ").trim().toLowerCase())
        .filter(Boolean);

      const row = {
        id: rowId,
        entry,
        entryId: entry.id,
        sourceBook: entry.source_book || "",
        dialect: entry.dialect?.name || "",
        entryType: entry.entry_type || "",
        canon,
        hw: display + " " + canon,
        jp: jyutping,
        restricted: entry.restricted ? 1 : 0,
        payload: JSON.stringify(entry),
        fts: {
          hw: tokenizeCjk(display + " " + canon),
          vars: tokenizeCjk(variants),
          jp: tokenizeCjk(jyutping),
          kw: tokenizeCjk(keywords),
          def: tokenizeCjk(definitions),
        },
        forms: [...new Set(forms)],
      };
      rows.set(entry.id, row);
      byId.set(rowId, row);
    }
  }

  return { rows, byId, maxId: rowId };
}

const withoutCreatedAt = (entry) => {
  const { created_at: _createdAt, ...rest } = entry;
  return rest;
};

const oldRows = buildRows(oldDir).rows;
const newData = buildRows(newDir);
const newRows = newData.rows;

const changed = [];
const added = [];
const removed = [];

for (const [entryId, row] of newRows) {
  const oldRow = oldRows.get(entryId);
  if (!oldRow) {
    added.push(row);
    continue;
  }
  if (
    JSON.stringify(withoutCreatedAt(oldRow.entry)) !==
    JSON.stringify(withoutCreatedAt(row.entry))
  ) {
    changed.push({ oldRow, newRow: row });
  }
}

for (const [entryId, oldRow] of oldRows) {
  if (!newRows.has(entryId)) removed.push(oldRow);
}

mkdirSync(dirname(outPath), { recursive: true });
const stream = createWriteStream(outPath);

const write = (chunk) =>
  new Promise((resolveDrain) => {
    if (!stream.write(chunk)) stream.once("drain", resolveDrain);
    else resolveDrain();
  });

const ftsDelete = (row) =>
  "INSERT INTO entry_fts (entry_fts, rowid, hw, vars, jp, kw, def) VALUES ('delete', " +
  [
    row.id,
    quote(row.fts.hw),
    quote(row.fts.vars),
    quote(row.fts.jp),
    quote(row.fts.kw),
    quote(row.fts.def),
  ].join(", ") +
  ");\n";

const ftsInsert = (row) =>
  "INSERT INTO entry_fts (rowid, hw, vars, jp, kw, def) VALUES (" +
  [
    row.id,
    quote(row.fts.hw),
    quote(row.fts.vars),
    quote(row.fts.jp),
    quote(row.fts.kw),
    quote(row.fts.def),
  ].join(", ") +
  ");\n";

const formsInsert = (row) =>
  row.forms.length === 0
    ? ""
    : "INSERT INTO entry_forms (key, entry_id) VALUES\n" +
      row.forms.map((form) => "(" + quote(form) + ", " + row.id + ")").join(",\n") +
      ";\n";

const entryInsert = (row) =>
  "INSERT INTO entries (id, entry_id, source_book, dialect, entry_type, canon, hw, jp, restricted, payload) VALUES (" +
  [
    row.id,
    quote(row.entryId),
    quote(row.sourceBook),
    quote(row.dialect),
    quote(row.entryType),
    quote(row.canon),
    quote(row.hw),
    quote(row.jp),
    row.restricted,
    quote(row.payload),
  ].join(", ") +
  ");\n";

const entryUpdate = (row) =>
  "UPDATE entries SET entry_id = " +
  quote(row.entryId) +
  ", source_book = " +
  quote(row.sourceBook) +
  ", dialect = " +
  quote(row.dialect) +
  ", entry_type = " +
  quote(row.entryType) +
  ", canon = " +
  quote(row.canon) +
  ", hw = " +
  quote(row.hw) +
  ", jp = " +
  quote(row.jp) +
  ", restricted = " +
  row.restricted +
  ", payload = " +
  quote(row.payload) +
  " WHERE id = " +
  row.id +
  ";\n";

await write("-- D1 incremental update generated by scripts/d1-delta.js\n");
await write(
  "-- changed: " +
    changed.length +
    ", added: " +
    added.length +
    ", removed: " +
    removed.length +
    "\n",
);

// entry_forms 的主鍵是 (key, entry_id)，沒有 entry_id 索引，
// 逐條 DELETE ... WHERE entry_id = ? 會整表掃描；改成一次 IN (...) 批次刪除。
const staleIds = [
  ...changed.map(({ oldRow }) => oldRow.id),
  ...removed.map((row) => row.id),
];
const FORMS_DELETE_BATCH = 500;

// 1. 先刪 FTS 舊值
for (const { oldRow } of changed) {
  await write(ftsDelete(oldRow));
}
for (const row of removed) {
  await write(ftsDelete(row));
}

// 2. 批次清掉舊的 entry_forms
for (let i = 0; i < staleIds.length; i += FORMS_DELETE_BATCH) {
  const batch = staleIds.slice(i, i + FORMS_DELETE_BATCH);
  await write(
    "DELETE FROM entry_forms WHERE entry_id IN (" + batch.join(", ") + ");\n",
  );
}

// 3. 更新／刪除 entries（rowid 沿用舊快照，不重新編號）
for (const { oldRow, newRow } of changed) {
  await write(entryUpdate({ ...newRow, id: oldRow.id }));
}
for (const row of removed) {
  await write("DELETE FROM entries WHERE id = " + row.id + ";\n");
}

// 4. 寫回新的 FTS 與 entry_forms
for (const { oldRow, newRow } of changed) {
  const row = { ...newRow, id: oldRow.id };
  await write(ftsInsert(row));
  await write(formsInsert(row));
}

// 新增（id 接在舊快照之後，避免影响既有 rowid）
let nextId = newData.maxId;
for (const row of added) {
  nextId += 1;
  row.id = nextId;
  await write(entryInsert(row));
  await write(ftsInsert(row));
  await write(formsInsert(row));
}

await new Promise((resolveEnd) => stream.end(resolveEnd));

console.log(
  JSON.stringify(
    {
      changed: changed.length,
      added: added.length,
      removed: removed.length,
      out: outPath,
    },
    null,
    1,
  ),
);

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { normalizeSearchQuery } from "../utils/query-classify.ts";

const DICTIONARY_ROOT = resolve(process.cwd(), "public/dictionaries");
const DICTIONARY_INDEX_PATH = resolve(DICTIONARY_ROOT, "index.json");

const DEFAULT_LIMIT = 50;

const parseLimit = () => {
  const index = process.argv.indexOf("--limit");
  if (index === -1) return DEFAULT_LIMIT;

  const value = Number.parseInt(process.argv[index + 1] || "", 10);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_LIMIT;
};

const shouldOutputJson = process.argv.includes("--json");
const limit = parseLimit();

const readJsonFile = async (filePath) => {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
};

const getCanonicalHeadword = (entry) => {
  return normalizeSearchQuery(
    entry?.headword?.normalized || entry?.headword?.display || "",
  );
};

const getExactForms = (entry) => {
  const forms = new Set();

  const add = (value) => {
    const normalized = normalizeSearchQuery(value || "");
    if (normalized) {
      forms.add(normalized);
    }
  };

  add(entry?.headword?.display);
  add(entry?.headword?.normalized);

  if (Array.isArray(entry?.meta?.headword_variants)) {
    entry.meta.headword_variants.forEach((value) => add(value));
  }

  return Array.from(forms);
};

const addEntryToFormMap = (formMap, entry) => {
  const canonicalHeadword = getCanonicalHeadword(entry);
  if (!canonicalHeadword) return;

  const forms = getExactForms(entry);
  for (const form of forms) {
    let record = formMap.get(form);
    if (!record) {
      record = {
        canonicalHeadwords: new Set(),
        sourceBooks: new Set(),
        entryIds: new Set(),
      };
      formMap.set(form, record);
    }

    record.canonicalHeadwords.add(canonicalHeadword);
    if (entry?.source_book) {
      record.sourceBooks.add(String(entry.source_book));
    }
    if (entry?.id) {
      record.entryIds.add(String(entry.id));
    }
  }
};

const getDictionaryFiles = async () => {
  const index = await readJsonFile(DICTIONARY_INDEX_PATH);
  const files = [];

  for (const dict of index?.dictionaries || []) {
    if (dict?.chunked && dict?.chunk_dir) {
      const manifest = await readJsonFile(
        resolve(DICTIONARY_ROOT, dict.chunk_dir, "manifest.json"),
      );
      for (const chunk of Object.values(manifest?.chunks || {})) {
        if (chunk?.file) {
          files.push(resolve(DICTIONARY_ROOT, dict.chunk_dir, chunk.file));
        }
      }
      continue;
    }

    if (dict?.file) {
      files.push(resolve(DICTIONARY_ROOT, dict.file));
    }
  }

  return files;
};

const main = async () => {
  const formMap = new Map();
  let totalEntries = 0;

  const files = await getDictionaryFiles();
  for (const filePath of files) {
    const entries = await readJsonFile(filePath);
    if (!Array.isArray(entries)) continue;

    totalEntries += entries.length;
    entries.forEach((entry) => addEntryToFormMap(formMap, entry));
  }

  const collisions = Array.from(formMap.entries())
    .map(([form, record]) => ({
      form,
      canonicalHeadwords: Array.from(record.canonicalHeadwords).sort(),
      sourceBooks: Array.from(record.sourceBooks).sort(),
      entryCount: record.entryIds.size,
    }))
    .filter((record) => record.canonicalHeadwords.length > 1)
    .sort((a, b) => {
      if (b.canonicalHeadwords.length !== a.canonicalHeadwords.length) {
        return b.canonicalHeadwords.length - a.canonicalHeadwords.length;
      }
      if (b.entryCount !== a.entryCount) {
        return b.entryCount - a.entryCount;
      }
      return a.form.localeCompare(b.form, "zh-Hant");
    });

  const summary = {
    totalEntries,
    totalExactForms: formMap.size,
    collidingForms: collisions.length,
    maxCanonicalHeadwordsPerForm: collisions[0]?.canonicalHeadwords.length || 0,
  };

  if (shouldOutputJson) {
    console.log(
      JSON.stringify(
        {
          summary,
          collisions: collisions.slice(0, limit),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log("Exact-match collision audit");
  console.log(`Entries scanned: ${summary.totalEntries}`);
  console.log(`Exact forms scanned: ${summary.totalExactForms}`);
  console.log(`Colliding forms: ${summary.collidingForms}`);
  console.log(
    `Max canonical headwords per form: ${summary.maxCanonicalHeadwordsPerForm}`,
  );

  if (collisions.length === 0) {
    return;
  }

  console.log("");
  console.log(`Top ${Math.min(limit, collisions.length)} collisions:`);

  collisions.slice(0, limit).forEach((collision, index) => {
    console.log(
      `${index + 1}. ${collision.form} (${collision.canonicalHeadwords.length} canonical headwords, ${collision.entryCount} entries)`,
    );
    console.log(`   Canonical: ${collision.canonicalHeadwords.join(", ")}`);
    console.log(`   Sources: ${collision.sourceBooks.join(", ")}`);
  });
};

main().catch((error) => {
  console.error("Failed to audit exact-match collisions:", error);
  process.exitCode = 1;
});

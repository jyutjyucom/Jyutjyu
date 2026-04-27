#!/usr/bin/env node
/**
 * Build mainland China moderation reports and restricted entry IDs.
 *
 * This script keeps upstream dictionary data unchanged. It scans selected
 * dictionaries with an effective sensitive-term list, applies project
 * overrides, and writes runtime artifacts used by MongoDB import and APIs.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { basename, join, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

import * as OpenCC from "opencc-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const DICTIONARIES_DIR = join(ROOT_DIR, "public", "dictionaries");
const MODERATION_DIR = join(ROOT_DIR, "data", "moderation");
const VENDOR_DIR = join(
  MODERATION_DIR,
  "vendor",
  "konsheng-sensitive-lexicon",
);
const VENDOR_VOCABULARY_DIR = join(VENDOR_DIR, "Vocabulary");
const VENDOR_ORGANIZED_DIR = join(VENDOR_DIR, "Organized");
const REPORT_DIR = join(MODERATION_DIR, "reports");
const RUNTIME_DIR = join(ROOT_DIR, "server", "assets", "moderation");
const RESTRICTED_IDS_PATH = join(RUNTIME_DIR, "cn-restricted-entry-ids.json");
const RESTRICTED_TERMS_PATH = join(RUNTIME_DIR, "cn-restricted-terms.json");
const MATCH_REPORT_PATH = join(REPORT_DIR, "cn-matches.json");
const SUMMARY_REPORT_PATH = join(REPORT_DIR, "cn-matches-summary.md");

const TARGET_DICTIONARIES = new Set([
  "hk-cantowords",
  "wiktionary-cantonese",
]);
const TRUSTED_CROSS_DICTIONARY_ALLOWLIST = new Set([
  "gz-practical-classified",
  "gz-colloquialisms",
  "gz-word-origins",
  "gz-dialect",
  "gz-modern",
  "gz-dict",
  "qz-jyutping",
  "kp-dialect",
  "ts-english-dict",
]);
const CANTONESE_COARSE_HEADWORD_MARKERS = [
  "屌",
  "𨳒",
  "閪",
  "屄",
  "㞗",
  "𨳊",
  "鳩",
  "撚",
  "柒",
];

const MAX_TERM_SAMPLES = 20;
const MAX_ENTRY_MATCHED_TERMS = 50;
const MAX_TEXT_SAMPLE_LENGTH = 180;
const MAX_MATCHES_PER_TEXT = 100;

const toSimplified = OpenCC.Converter({ from: "hk", to: "cn" });
const toTraditional = OpenCC.Converter({ from: "cn", to: "hk" });

const normalizeLine = (value) =>
  String(value || "")
    .replace(/^\uFEFF/, "")
    .trim();

const normalizeText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const containsHan = (value) => /\p{Script=Han}/u.test(value);
const isLatinLike = (value) => /^[a-z0-9._:/?#[\]@!$&'()*+,;=%-]+$/i.test(value);

const shouldKeepVendorTerm = (term) => {
  if (!term) return false;
  if (term.startsWith("#")) return false;

  const chars = Array.from(term);
  if (containsHan(term)) {
    return chars.length >= 2;
  }

  if (isLatinLike(term)) {
    return chars.length >= 4;
  }

  return chars.length >= 3;
};

const readLines = (filePath) => {
  if (!existsSync(filePath)) return [];

  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter((line) => line && !line.startsWith("#"));
};

const listTextFiles = (dirPath) => {
  if (!existsSync(dirPath)) return [];

  return readdirSync(dirPath, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(dirPath, entry.name);
      if (entry.isDirectory()) return listTextFiles(path);
      if (entry.isFile() && entry.name.endsWith(".txt")) return [path];
      return [];
    })
    .sort((a, b) => a.localeCompare(b));
};

const getTermKind = (term) => {
  if (/^[a-z0-9][a-z0-9\s._:/?#[\]@!$&'()*+,;=%-]*$/i.test(term)) {
    return "latin";
  }
  return "text";
};

const addTermVariants = (target, term, source) => {
  const normalized = normalizeText(term);
  if (!normalized) return;

  const variants = new Set([
    normalized,
    normalizeText(toSimplified(normalized)),
    normalizeText(toTraditional(normalized)),
  ]);

  for (const variant of variants) {
    if (!variant) continue;
    const existing = target.get(variant);
    if (existing) {
      existing.sources.add(source);
      continue;
    }
    target.set(variant, {
      term: variant,
      kind: getTermKind(variant),
      sources: new Set([source]),
    });
  }
};

class TrieNode {
  constructor() {
    this.children = new Map();
    this.terms = [];
  }
}

class TermTrie {
  constructor(terms, metadata) {
    this.root = new TrieNode();
    this.metadata = metadata;
    terms.forEach((term) => this.add(term));
  }

  add(term) {
    let node = this.root;
    for (const char of Array.from(term)) {
      let next = node.children.get(char);
      if (!next) {
        next = new TrieNode();
        node.children.set(char, next);
      }
      node = next;
    }
    node.terms.push(term);
  }

  match(text) {
    const chars = Array.from(text);
    const matches = new Set();

    for (let start = 0; start < chars.length; start += 1) {
      let node = this.root;
      for (let index = start; index < chars.length; index += 1) {
        node = node.children.get(chars[index]);
        if (!node) break;

        node.terms.forEach((term) => {
          if (this.isValidMatch(chars, start, index + 1, term)) {
            matches.add(term);
          }
        });
        if (matches.size >= MAX_MATCHES_PER_TEXT) {
          return matches;
        }
      }
    }

    return matches;
  }

  isValidMatch(chars, start, end, term) {
    const termInfo = this.metadata.get(term);
    if (termInfo?.kind !== "latin") {
      return true;
    }

    const before = start > 0 ? chars[start - 1] : "";
    const after = end < chars.length ? chars[end] : "";
    const wordCharPattern = /[a-z0-9]/i;
    return !wordCharPattern.test(before) && !wordCharPattern.test(after);
  }
}

const parseAllowlist = () => {
  const entryIds = new Set();
  const entryTermPairs = new Set();

  for (const line of readLines(join(MODERATION_DIR, "cn-allowlist.txt"))) {
    if (line.startsWith("entry:")) {
      const entryId = line.slice("entry:".length).trim();
      if (entryId) entryIds.add(entryId);
      continue;
    }

    const [entryId, term] = line.split("\t").map((part) => part?.trim());
    if (entryId && term) {
      entryTermPairs.add(`${entryId}\t${normalizeText(term)}`);
    }
  }

  return { entryIds, entryTermPairs };
};

const readDisabledSources = () => {
  const values = readLines(join(MODERATION_DIR, "cn-disabled-sources.txt"));
  return new Set(values.map((value) => normalizeText(value)));
};

const isSourceDisabled = (filePath, disabledSources) => {
  const relativePath = normalizeText(relative(ROOT_DIR, filePath));
  const fileName = normalizeText(basename(filePath));
  return disabledSources.has(relativePath) || disabledSources.has(fileName);
};

const buildEffectiveTerms = () => {
  const terms = new Map();
  const disabledSources = readDisabledSources();
  const vendorFiles = [
    ...listTextFiles(VENDOR_VOCABULARY_DIR),
    ...listTextFiles(VENDOR_ORGANIZED_DIR),
  ].filter((filePath) => !isSourceDisabled(filePath, disabledSources));

  for (const filePath of vendorFiles) {
    const source = relative(ROOT_DIR, filePath);
    for (const term of readLines(filePath)) {
      if (shouldKeepVendorTerm(term)) {
        addTermVariants(terms, term, source);
      }
    }
  }

  for (const term of readLines(join(MODERATION_DIR, "cn-extra-terms.txt"))) {
    addTermVariants(terms, term, "data/moderation/cn-extra-terms.txt");
  }

  for (const disabled of readLines(join(MODERATION_DIR, "cn-disabled-terms.txt"))) {
    const disabledVariants = new Set([
      normalizeText(disabled),
      normalizeText(toSimplified(disabled)),
      normalizeText(toTraditional(disabled)),
    ]);
    disabledVariants.forEach((variant) => terms.delete(variant));
  }

  return {
    terms: Array.from(terms.keys()).sort((a, b) => {
      const lengthDiff = Array.from(b).length - Array.from(a).length;
      if (lengthDiff !== 0) return lengthDiff;
      return a.localeCompare(b);
    }),
    metadata: terms,
    vendorFiles,
  };
};

const loadDictionaryIndex = () => {
  const indexPath = join(DICTIONARIES_DIR, "index.json");
  return JSON.parse(readFileSync(indexPath, "utf8"));
};

const loadJson = (filePath) => JSON.parse(readFileSync(filePath, "utf8"));

function* loadDictionaryEntries(dict) {
  if (dict.chunked && dict.chunk_dir) {
    const manifest = loadJson(join(DICTIONARIES_DIR, dict.chunk_dir, "manifest.json"));
    const chunks = Object.values(manifest.chunks || {})
      .map((chunk) => chunk?.file)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    for (const chunkFile of chunks) {
      const chunkPath = join(DICTIONARIES_DIR, dict.chunk_dir, chunkFile);
      const entries = loadJson(chunkPath);
      for (const entry of entries) {
        yield { entry, file: relative(ROOT_DIR, chunkPath) };
      }
    }
    return;
  }

  if (!dict.file) return;
  const filePath = join(DICTIONARIES_DIR, dict.file);
  const entries = loadJson(filePath);
  for (const entry of entries) {
    yield { entry, file: relative(ROOT_DIR, filePath) };
  }
}

const getEntryHeadwordKeys = (entry) => {
  return Array.from(
    new Set(
      [
        entry.headword?.display,
        entry.headword?.normalized,
        entry.headword?.search,
      ]
        .map(normalizeText)
        .filter(Boolean),
    ),
  );
};

const buildTrustedHeadwordKeys = (dictionaries) => {
  const keys = new Set();

  for (const dict of dictionaries) {
    if (!TRUSTED_CROSS_DICTIONARY_ALLOWLIST.has(dict.id)) {
      continue;
    }

    for (const { entry } of loadDictionaryEntries(dict)) {
      getEntryHeadwordKeys(entry).forEach((key) => keys.add(key));
    }
  }

  return keys;
};

const isTrustedCrossDictionaryHeadword = (entry, trustedHeadwordKeys) => {
  return getEntryHeadwordKeys(entry).some((key) => trustedHeadwordKeys.has(key));
};

const isCantoneseCoarseHeadword = (entry) => {
  return getEntryHeadwordKeys(entry).some((key) =>
    CANTONESE_COARSE_HEADWORD_MARKERS.some((marker) => key.includes(marker)),
  );
};

const pushText = (fields, field, value) => {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item) => pushText(fields, field, item));
    return;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => pushText(fields, field, item));
    return;
  }

  const text = normalizeText(value);
  if (text) fields.push({ field, text });
};

const getEntrySearchFields = (entry) => {
  const fields = [];

  pushText(fields, "headword.display", entry.headword?.display);
  pushText(fields, "headword.normalized", entry.headword?.normalized);
  pushText(fields, "headword.search", entry.headword?.search);

  for (const [senseIndex, sense] of (entry.senses || []).entries()) {
    pushText(fields, `senses.${senseIndex}.definition`, sense.definition);
    for (const [exampleIndex, example] of (sense.examples || []).entries()) {
      pushText(
        fields,
        `senses.${senseIndex}.examples.${exampleIndex}.text`,
        example.text,
      );
      pushText(
        fields,
        `senses.${senseIndex}.examples.${exampleIndex}.translation`,
        example.translation,
      );
    }
    for (const [subSenseIndex, subSense] of (sense.sub_senses || []).entries()) {
      pushText(
        fields,
        `senses.${senseIndex}.sub_senses.${subSenseIndex}.definition`,
        subSense.definition,
      );
    }
  }

  pushText(fields, "refs.target", (entry.refs || []).map((ref) => ref.target));
  pushText(fields, "meta.etymology", entry.meta?.etymology);
  pushText(fields, "meta.notes", entry.meta?.notes);

  return fields;
};

const addTermReportSample = (termReport, sample) => {
  if (termReport.samples.length >= MAX_TERM_SAMPLES) return;
  if (termReport.samples.some((item) => item.entry_id === sample.entry_id)) return;
  termReport.samples.push(sample);
};

const scanEntries = (trie, termMetadata, allowlist) => {
  const index = loadDictionaryIndex();
  const allDictionaries = index.dictionaries || [];
  const trustedHeadwordKeys = buildTrustedHeadwordKeys(allDictionaries);
  const dictionaries = (index.dictionaries || []).filter((dict) =>
    TARGET_DICTIONARIES.has(dict.id),
  );

  const restrictedEntries = [];
  const termReports = new Map();
  const dictionaryStats = new Map();
  let scannedEntries = 0;

  for (const dict of dictionaries) {
    const stats = {
      dictionary_id: dict.id,
      scanned_entries: 0,
      restricted_entries: 0,
    };
    dictionaryStats.set(dict.id, stats);

    for (const { entry, file } of loadDictionaryEntries(dict)) {
      scannedEntries += 1;
      stats.scanned_entries += 1;

      if (allowlist.entryIds.has(entry.id)) {
        continue;
      }

      if (isTrustedCrossDictionaryHeadword(entry, trustedHeadwordKeys)) {
        continue;
      }

      if (isCantoneseCoarseHeadword(entry)) {
        continue;
      }

      const fieldMatches = [];
      const matchedTerms = new Set();

      for (const { field, text } of getEntrySearchFields(entry)) {
        const matches = trie.match(text);
        if (matches.size === 0) continue;

        const terms = Array.from(matches)
          .filter((term) => !allowlist.entryTermPairs.has(`${entry.id}\t${term}`))
          .slice(0, MAX_ENTRY_MATCHED_TERMS);

        if (terms.length === 0) continue;

        terms.forEach((term) => matchedTerms.add(term));
        fieldMatches.push({
          field,
          terms,
          sample: text.slice(0, MAX_TEXT_SAMPLE_LENGTH),
        });
      }

      if (matchedTerms.size === 0) {
        continue;
      }

      stats.restricted_entries += 1;

      const entryReport = {
        id: entry.id,
        dictionary_id: dict.id,
        source_book: entry.source_book,
        headword: entry.headword?.normalized || entry.headword?.display || "",
        file,
        matched_terms: Array.from(matchedTerms).sort((a, b) => a.localeCompare(b)),
        field_matches: fieldMatches,
      };
      restrictedEntries.push(entryReport);

      for (const term of matchedTerms) {
        const termInfo = termMetadata.get(term);
        let termReport = termReports.get(term);
        if (!termReport) {
          termReport = {
            term,
            count: 0,
            dictionaries: {},
            sources: Array.from(termInfo?.sources || []).sort(),
            samples: [],
          };
          termReports.set(term, termReport);
        }

        termReport.count += 1;
        termReport.dictionaries[dict.id] =
          (termReport.dictionaries[dict.id] || 0) + 1;
        addTermReportSample(termReport, {
          entry_id: entry.id,
          dictionary_id: dict.id,
          headword: entryReport.headword,
          sample: fieldMatches[0]?.sample || "",
        });
      }
    }
  }

  return {
    scannedEntries,
    dictionaryStats: Array.from(dictionaryStats.values()),
    restrictedEntries,
    termReports: Array.from(termReports.values()).sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return a.term.localeCompare(b.term);
    }),
  };
};

const writeReports = ({
  effectiveTerms,
  vendorFiles,
  scanResult,
}) => {
  mkdirSync(REPORT_DIR, { recursive: true });
  mkdirSync(RUNTIME_DIR, { recursive: true });

  const generatedAt = new Date().toISOString();
  const entryIds = Array.from(
    new Set(scanResult.restrictedEntries.map((entry) => entry.id)),
  ).sort();
  const runtimeTerms = scanResult.termReports
    .map((termReport) => termReport.term)
    .sort((a, b) => {
      const lengthDiff = Array.from(b).length - Array.from(a).length;
      if (lengthDiff !== 0) return lengthDiff;
      return a.localeCompare(b);
    });

  const matchReport = {
    region: "CN",
    policy: "cn-sensitive-lexicon-v1",
    generated_at: generatedAt,
    target_dictionaries: Array.from(TARGET_DICTIONARIES).sort(),
    vendor_files: vendorFiles.map((filePath) => relative(ROOT_DIR, filePath)),
    effective_term_count: effectiveTerms.length,
    scanned_entries: scanResult.scannedEntries,
    restricted_entry_count: entryIds.length,
    dictionaries: scanResult.dictionaryStats,
    terms: scanResult.termReports,
    entries: scanResult.restrictedEntries,
  };

  const runtimeArtifact = {
    region: "CN",
    policy: "cn-sensitive-lexicon-v1",
    generated_at: generatedAt,
    source_report: relative(ROOT_DIR, MATCH_REPORT_PATH),
    effective_term_count: effectiveTerms.length,
    restricted_entry_count: entryIds.length,
    entry_ids: entryIds,
  };
  const runtimeTermsArtifact = {
    region: "CN",
    policy: "cn-sensitive-lexicon-v1",
    generated_at: generatedAt,
    effective_term_count: effectiveTerms.length,
    restricted_term_count: runtimeTerms.length,
    terms: runtimeTerms,
  };

  writeFileSync(MATCH_REPORT_PATH, `${JSON.stringify(matchReport, null, 2)}\n`);
  writeFileSync(
    RESTRICTED_IDS_PATH,
    `${JSON.stringify(runtimeArtifact, null, 2)}\n`,
  );
  writeFileSync(
    RESTRICTED_TERMS_PATH,
    `${JSON.stringify(runtimeTermsArtifact, null, 2)}\n`,
  );

  const topTerms = scanResult.termReports.slice(0, 100);
  const summaryLines = [
    "# Mainland China Moderation Match Summary",
    "",
    `Generated at: ${generatedAt}`,
    "",
    `Effective terms: ${effectiveTerms.length}`,
    `Scanned entries: ${scanResult.scannedEntries}`,
    `Restricted entries: ${entryIds.length}`,
    "",
    "## Dictionaries",
    "",
    "| Dictionary | Scanned | Restricted |",
    "| --- | ---: | ---: |",
    ...scanResult.dictionaryStats.map(
      (stat) =>
        `| ${stat.dictionary_id} | ${stat.scanned_entries} | ${stat.restricted_entries} |`,
    ),
    "",
    "## Top Matched Terms",
    "",
    "| Term | Count | Sources | Samples |",
    "| --- | ---: | --- | --- |",
    ...topTerms.map((term) => {
      const sources = term.sources.map((source) => basename(source)).join(", ");
      const samples = term.samples
        .slice(0, 3)
        .map((sample) => `${sample.headword} (${sample.entry_id})`)
        .join("; ");
      return `| ${term.term.replaceAll("|", "\\|")} | ${term.count} | ${sources.replaceAll("|", "\\|")} | ${samples.replaceAll("|", "\\|")} |`;
    }),
    "",
  ];

  writeFileSync(SUMMARY_REPORT_PATH, `${summaryLines.join("\n")}\n`);

  return { entryIds, generatedAt };
};

const main = () => {
  console.log("Building mainland China moderation index...");

  if (!existsSync(VENDOR_DIR)) {
    console.error(`Missing vendor lexicon: ${relative(ROOT_DIR, VENDOR_DIR)}`);
    process.exit(1);
  }

  const allowlist = parseAllowlist();
  const { terms, metadata, vendorFiles } = buildEffectiveTerms();
  console.log(`Effective terms: ${terms.length}`);
  console.log(`Vendor files: ${vendorFiles.length}`);

  const trie = new TermTrie(terms, metadata);
  const scanResult = scanEntries(trie, metadata, allowlist);
  const { entryIds } = writeReports({
    effectiveTerms: terms,
    vendorFiles,
    scanResult,
  });

  console.log(`Scanned entries: ${scanResult.scannedEntries}`);
  console.log(`Restricted entries: ${entryIds.length}`);
  console.log(`Report: ${relative(ROOT_DIR, MATCH_REPORT_PATH)}`);
  console.log(`Summary: ${relative(ROOT_DIR, SUMMARY_REPORT_PATH)}`);
  console.log(`Runtime artifact: ${relative(ROOT_DIR, RESTRICTED_IDS_PATH)}`);
  console.log(`Runtime terms: ${relative(ROOT_DIR, RESTRICTED_TERMS_PATH)}`);
};

main();

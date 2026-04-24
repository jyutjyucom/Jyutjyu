import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_LIMIT = 500;
const DEFAULT_INPUT_PATH = "tmp/cloudflare-word-hot-paths.json";
const DEFAULT_CANONICAL_HEADWORDS_PATH =
  "public/exact-match/canonical-headwords.json";
const DEFAULT_OUTPUT_PATH = "server/generated/hot-word-prerender-routes.json";

const LOCALE_PREFIXES = ["/en", "/yue-Hans", "/zh-Hant", "/zh-Hans"];
const HAN_PATTERN = /\p{Script=Han}/u;
const PURE_HAN_PATTERN = /^[\p{Script=Han}]+$/u;
const ZERO_WIDTH_CHARACTERS = /[\u200B-\u200D\uFEFF]/g;

const KNOWN_WORKER_FAILURE_HEADWORDS = [
  "火水",
  "爆炸",
  "石油",
  "人話",
  "消毒",
  "平方哩",
  "太平天國",
  "上天無路，入地無門",
  "一言以蔽之",
  "一般來說",
  "世界大戰",
  "唔知死字点写",
];

const resolveProjectPath = (path) => resolve(process.cwd(), path);

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getHotWordPrerenderLimit = (env = process.env) =>
  parsePositiveInteger(env.HOT_WORD_PRERENDER_LIMIT, DEFAULT_LIMIT);

const normalizeHeadword = (value) =>
  String(value || "")
    .replace(ZERO_WIDTH_CHARACTERS, "")
    .trim();

const decodePathSegment = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const toPathname = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    return new URL(raw).pathname;
  } catch {
    return raw.split("?")[0].split("#")[0];
  }
};

const stripLocalePrefix = (pathname) => {
  for (const prefix of LOCALE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length) || "/";
    }
  }
  return pathname;
};

export const normalizeWordPathToHeadword = (value) => {
  const pathname = stripLocalePrefix(toPathname(value));
  const match = pathname.match(/^\/word\/([^/]+)(?:\/_payload\.json)?\/?$/);
  if (!match) return "";
  return normalizeHeadword(decodePathSegment(match[1]));
};

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

export const loadCanonicalHeadwords = async (
  canonicalHeadwordsPath = DEFAULT_CANONICAL_HEADWORDS_PATH,
) => {
  const parsed = await readJson(resolveProjectPath(canonicalHeadwordsPath));
  const headwords = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.canonical_headwords)
      ? parsed.canonical_headwords
      : [];

  return headwords.map(normalizeHeadword).filter(Boolean);
};

const getEntryPath = (entry) => {
  if (typeof entry === "string") return entry;
  if (!entry || typeof entry !== "object") return "";
  return (
    entry.path ||
    entry.pathname ||
    entry.url ||
    entry.requestPath ||
    entry.request_path ||
    entry.clientRequestPath ||
    entry.ClientRequestPath ||
    ""
  );
};

const getEntryWeight = (entry) => {
  if (!entry || typeof entry !== "object") return 1;

  const count =
    entry.count ??
    entry.requests ??
    entry.requestCount ??
    entry.visits ??
    entry.total ??
    1;
  const failures =
    entry.failures ??
    entry.errors ??
    entry.exceededResources ??
    entry.exceeded_resources ??
    entry.workerExceededResources ??
    0;

  return (
    Math.max(1, Number(count) || 1) + Math.max(0, Number(failures) || 0) * 10
  );
};

const flattenHotPathEntries = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  for (const key of ["rows", "data", "result", "paths", "requests"]) {
    if (Array.isArray(value[key])) return value[key];
  }

  return Object.entries(value).map(([path, count]) => ({ path, count }));
};

export const scoreHotHeadwordsFromEntries = (entries, canonicalHeadwords) => {
  const canonicalSet = new Set(canonicalHeadwords);
  const scores = new Map();

  for (const entry of flattenHotPathEntries(entries)) {
    const headword = normalizeWordPathToHeadword(getEntryPath(entry));
    if (!headword || !canonicalSet.has(headword)) continue;
    scores.set(headword, (scores.get(headword) || 0) + getEntryWeight(entry));
  }

  return scores;
};

const isPureHan = (headword) => PURE_HAN_PATTERN.test(headword);

const fallbackRank = (headword) => {
  const chars = Array.from(headword);
  const length = chars.length;
  const hasHan = HAN_PATTERN.test(headword);
  const pureHan = isPureHan(headword);

  return [
    pureHan ? 0 : hasHan ? 1 : 2,
    Math.abs(length - 2),
    length,
    /[.…,，、()（）[\]［］]/u.test(headword) ? 1 : 0,
    headword,
  ];
};

const compareFallbackHeadwords = (a, b) => {
  const left = fallbackRank(a);
  const right = fallbackRank(b);

  for (let index = 0; index < left.length - 1; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }

  return String(left.at(-1)).localeCompare(String(right.at(-1)), "zh-Hant");
};

export const buildHotWordRoutes = ({
  canonicalHeadwords,
  hotEntries = [],
  limit = DEFAULT_LIMIT,
} = {}) => {
  const safeLimit = parsePositiveInteger(limit, DEFAULT_LIMIT);
  const canonical = [
    ...new Set((canonicalHeadwords || []).map(normalizeHeadword)),
  ].filter(Boolean);
  const canonicalSet = new Set(canonical);
  const hotScores = scoreHotHeadwordsFromEntries(hotEntries, canonical);
  const selected = [];
  const selectedSet = new Set();

  const addHeadword = (headword) => {
    const normalized = normalizeHeadword(headword);
    if (
      selected.length >= safeLimit ||
      !normalized ||
      !canonicalSet.has(normalized) ||
      selectedSet.has(normalized)
    ) {
      return;
    }
    selectedSet.add(normalized);
    selected.push(normalized);
  };

  [...hotScores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hant"))
    .forEach(([headword]) => addHeadword(headword));

  KNOWN_WORKER_FAILURE_HEADWORDS.forEach(addHeadword);

  canonical.sort(compareFallbackHeadwords).forEach(addHeadword);

  return selected.map((headword) => `/word/${encodeURIComponent(headword)}`);
};

const loadHotEntries = async (inputPath) => {
  const resolvedInputPath = resolveProjectPath(inputPath);
  if (!existsSync(resolvedInputPath)) {
    return [];
  }
  return flattenHotPathEntries(await readJson(resolvedInputPath));
};

export const writeHotWordRoutes = async ({
  inputPath = DEFAULT_INPUT_PATH,
  canonicalHeadwordsPath = DEFAULT_CANONICAL_HEADWORDS_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  limit = getHotWordPrerenderLimit(),
} = {}) => {
  const canonicalHeadwords = await loadCanonicalHeadwords(
    canonicalHeadwordsPath,
  );
  const hotEntries = await loadHotEntries(inputPath);
  const routes = buildHotWordRoutes({
    canonicalHeadwords,
    hotEntries,
    limit,
  });
  const output = {
    limit,
    input: inputPath,
    routes,
  };
  const resolvedOutputPath = resolveProjectPath(outputPath);

  await mkdir(dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, `${JSON.stringify(output, null, 2)}\n`);

  return output;
};

const isDirectRun = () =>
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun()) {
  writeHotWordRoutes()
    .then(({ routes, input, limit }) => {
      console.log(
        `Hot word prerender routes built: routes=${routes.length} limit=${limit} input=${input}`,
      );
    })
    .catch((error) => {
      console.error("Failed to build hot word prerender routes:", error);
      process.exitCode = 1;
    });
}

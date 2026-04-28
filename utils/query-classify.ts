const HAN_CHARACTER_REGEX = /\p{Script=Han}/u;
const TOKEN_EDGE_PUNCTUATION_REGEX = /^[.'’_-]+|[.'’_-]+$/g;
const JYUTPING_INITIALS = [
  "gw",
  "kw",
  "ng",
  "b",
  "p",
  "m",
  "f",
  "d",
  "t",
  "n",
  "l",
  "g",
  "k",
  "h",
  "w",
  "z",
  "c",
  "s",
  "j",
];
const JYUTPING_FINALS = new Set([
  "aa",
  "aai",
  "aau",
  "aam",
  "aan",
  "aang",
  "aap",
  "aat",
  "aak",
  "ai",
  "au",
  "am",
  "an",
  "ang",
  "ap",
  "at",
  "ak",
  "e",
  "ei",
  "eng",
  "ek",
  "i",
  "iu",
  "im",
  "in",
  "ing",
  "ip",
  "it",
  "ik",
  "o",
  "oi",
  "ou",
  "on",
  "ong",
  "ot",
  "ok",
  "oe",
  "oeng",
  "oek",
  "eoi",
  "eon",
  "eot",
  "yu",
  "yun",
  "yut",
  "u",
  "ui",
  "un",
  "ung",
  "ut",
  "uk",
  "m",
  "ng",
]);
const JYUTPING_TOKEN_REGEX = /^!?([a-z]+)([1-6])(?:\*[1-6]?|-[1-6])?$/i;

export const normalizeSearchQuery = (query: string): string => {
  return String(query || "")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeRomanizedToken = (token: string): string => {
  return token.replace(TOKEN_EDGE_PUNCTUATION_REGEX, "");
};

const isValidJyutpingSyllable = (base: string): boolean => {
  const normalized = base.toLowerCase();
  if (JYUTPING_FINALS.has(normalized)) return true;

  for (const initial of JYUTPING_INITIALS) {
    if (!normalized.startsWith(initial)) continue;
    const final = normalized.slice(initial.length);
    if (JYUTPING_FINALS.has(final)) return true;
  }

  return false;
};

export const hasHanCharacters = (query: string): boolean => {
  return HAN_CHARACTER_REGEX.test(normalizeSearchQuery(query));
};

export const isJyutpingQuery = (query: string): boolean => {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return false;
  if (hasHanCharacters(normalized)) return false;

  const tokens = normalized
    .split(" ")
    .map(normalizeRomanizedToken)
    .filter(Boolean);

  if (tokens.length === 0) return false;
  if (!tokens.some((token) => /[1-6]/.test(token))) return false;

  return tokens.every((token) => {
    const match = token.match(JYUTPING_TOKEN_REGEX);
    if (!match?.[1]) return false;
    return isValidJyutpingSyllable(match[1].replace(/^!/, ""));
  });
};

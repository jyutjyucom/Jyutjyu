const HAN_CHARACTER_REGEX = /\p{Script=Han}/u;
const TOKEN_EDGE_PUNCTUATION_REGEX = /^[.'’_-]+|[.'’_-]+$/g;
const JYUTPING_TOKEN_REGEX = /^[a-z!]+(?:\*[1-6]?|[1-6])$/i;

export const normalizeSearchQuery = (query: string): string => {
  return String(query || "")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeRomanizedToken = (token: string): string => {
  return token.replace(TOKEN_EDGE_PUNCTUATION_REGEX, "");
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

  return tokens.every((token) => JYUTPING_TOKEN_REGEX.test(token));
};

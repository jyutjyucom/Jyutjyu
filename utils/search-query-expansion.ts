const CJK_PATTERN = /[\u3400-\u9fff]/u;
const MAX_CJK_SUBSTRING_SEEDS = 32;
const MAX_CJK_CHUNK_PROBE_CHARS = 8;

const isCjkChar = (value: string): boolean => CJK_PATTERN.test(value);

export const getCjkSearchSubstringSeeds = (
  query: string,
  maxSeeds = MAX_CJK_SUBSTRING_SEEDS,
): string[] => {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return [];

  const cjkRuns = normalized.match(/[\u3400-\u9fff]+/gu) || [];
  const seeds: string[] = [];
  const seen = new Set<string>();

  const addSeed = (value: string) => {
    if (!value || value.length < 2 || seen.has(value)) return;
    seen.add(value);
    seeds.push(value);
  };

  for (const run of cjkRuns) {
    addSeed(run);

    const chars = Array.from(run);
    for (let length = chars.length - 1; length >= 2; length--) {
      for (let start = 0; start + length <= chars.length; start++) {
        addSeed(chars.slice(start, start + length).join(""));
        if (seeds.length >= maxSeeds) {
          return seeds;
        }
      }
    }
  }

  return seeds;
};

export const getCjkChunkProbeCharacters = (
  query: string,
  maxChars = MAX_CJK_CHUNK_PROBE_CHARS,
): string[] => {
  const chars: string[] = [];
  const seen = new Set<string>();

  for (const char of Array.from(String(query || "").toLowerCase())) {
    if (!isCjkChar(char) || seen.has(char)) continue;

    seen.add(char);
    chars.push(char);
    if (chars.length >= maxChars) break;
  }

  return chars;
};

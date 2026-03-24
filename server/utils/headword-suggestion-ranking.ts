export interface HeadwordSuggestionRecord {
  suggestion: string;
  searchTerms: string[];
}

export const normalizeValue = (value: string | null | undefined): string => {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
};

export const toSearchTerm = (value: string | null | undefined): string => {
  return normalizeValue(value).toLowerCase();
};

const getSuggestionScore = (
  record: HeadwordSuggestionRecord,
  queryVariants: string[],
): number => {
  let bestScore = -1;

  for (const term of record.searchTerms) {
    for (const variant of queryVariants) {
      if (!variant) continue;

      if (term === variant) {
        bestScore = Math.max(bestScore, 4000 - record.suggestion.length);
        continue;
      }

      if (term.startsWith(variant)) {
        bestScore = Math.max(bestScore, 3000 - record.suggestion.length);
        continue;
      }

      const index = term.indexOf(variant);
      if (index > 0) {
        bestScore = Math.max(
          bestScore,
          2000 - index * 10 - record.suggestion.length,
        );
      }
    }
  }

  return bestScore;
};

export const rankHeadwordSuggestions = (
  records: HeadwordSuggestionRecord[],
  rawQueryVariants: string[],
  limit: number,
): string[] => {
  const queryVariants = Array.from(
    new Set(
      rawQueryVariants.map((value) => toSearchTerm(value)).filter(Boolean),
    ),
  );

  if (queryVariants.length === 0) {
    return [];
  }

  const ranked = records
    .map((record) => ({
      suggestion: record.suggestion,
      score: getSuggestionScore(record, queryVariants),
      length: record.suggestion.length,
    }))
    .filter((record) => record.score >= 0)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.length !== b.length) return a.length - b.length;
      return a.suggestion.localeCompare(b.suggestion);
    });

  return ranked.slice(0, limit).map((record) => record.suggestion);
};

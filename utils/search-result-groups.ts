import type { DictionaryEntry } from "~/types/dictionary";

export interface AggregatedSearchEntry {
  key: string;
  primary: DictionaryEntry;
  entries: DictionaryEntry[];
}

export interface GroupedSearchCountSummary {
  count: number;
  label: string;
  isOverflow: boolean;
}

export const SEARCH_API_FIRST_PAGE_LIMIT = 100;
export const SEARCH_PAGE_SIZE = 100;
export const SEARCH_LOCAL_RESULT_LIMIT = 1000;

const normalizeHeadwordPart = (value: string | null | undefined): string => {
  return String(value || "").trim();
};

export const getSearchResultAggregationKey = (
  entry: DictionaryEntry,
): string => {
  return [
    normalizeHeadwordPart(entry.headword.display),
    normalizeHeadwordPart(entry.headword.normalized),
  ].join("||");
};

export const aggregateSearchEntries = (
  entries: DictionaryEntry[],
): AggregatedSearchEntry[] => {
  const groupedEntries = new Map<string, DictionaryEntry[]>();

  for (const entry of entries) {
    const key = getSearchResultAggregationKey(entry);
    const items = groupedEntries.get(key) || [];
    items.push(entry);
    groupedEntries.set(key, items);
  }

  const aggregated: AggregatedSearchEntry[] = [];
  const seenKeys = new Set<string>();

  for (const entry of entries) {
    const key = getSearchResultAggregationKey(entry);
    if (seenKeys.has(key)) {
      continue;
    }

    const items = groupedEntries.get(key);
    const primary = items?.[0];
    if (!items || items.length === 0 || !primary) {
      continue;
    }

    seenKeys.add(key);
    aggregated.push({
      key,
      primary,
      entries: items,
    });
  }

  return aggregated;
};

export const summarizeGroupedSearchCount = (
  entries: DictionaryEntry[],
  options: {
    ceiling?: number;
    isOverflow?: boolean;
  } = {},
): GroupedSearchCountSummary => {
  const ceiling = Math.max(
    1,
    Number.isFinite(options.ceiling)
      ? Number(options.ceiling)
      : SEARCH_LOCAL_RESULT_LIMIT,
  );
  const count = aggregateSearchEntries(entries).length;
  const isOverflow = options.isOverflow === true;

  return {
    count,
    label: isOverflow ? `${ceiling}+` : String(count),
    isOverflow,
  };
};

import type { DictionaryEntry, EntryType } from "~/types/dictionary";

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

export interface PreferredSearchEntriesSelection {
  entries: DictionaryEntry[];
  source: "primary" | "candidate";
  primaryGroupedCount: number;
  candidateGroupedCount: number;
}

export type SearchSortOption =
  | "relevance"
  | "jyutping"
  | "headword"
  | "dictionary";

export interface SearchFacetBucket {
  value: string;
  count: number;
}

export interface SearchFacetCounts {
  dictionaries: SearchFacetBucket[];
  dialects: SearchFacetBucket[];
  types: SearchFacetBucket[];
}

export interface SearchTotalMeta {
  grouped: number;
  entries: number;
  exact: boolean;
}

export interface SearchPageMeta {
  offset: number;
  limit: number;
  returned: number;
  hasMore: boolean;
  nextOffset: number | null;
}

export interface SearchResponseFilters {
  dict?: string;
  dialect?: string;
  type?: EntryType;
}

export interface GroupedSearchResponse {
  success: boolean;
  query?: string;
  mode?: "normal" | "reverse";
  sort?: SearchSortOption;
  filters?: SearchResponseFilters;
  groups: AggregatedSearchEntry[];
  results: DictionaryEntry[];
  total: SearchTotalMeta;
  totalGrouped: number;
  page: SearchPageMeta;
  facets: SearchFacetCounts;
  error?: string;
}

export const SEARCH_API_PAGE_SIZE = 100;
export const SEARCH_API_MAX_PAGE_SIZE = 200;
export const SEARCH_API_FIRST_PAGE_LIMIT = SEARCH_API_PAGE_SIZE;
export const SEARCH_PAGE_SIZE = SEARCH_API_PAGE_SIZE;
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

export const countAggregatedSearchEntries = (
  entries: DictionaryEntry[],
): number => {
  return aggregateSearchEntries(entries).length;
};

export const flattenSearchGroups = (
  groups: AggregatedSearchEntry[],
): DictionaryEntry[] => {
  return groups.flatMap((group) => group.entries);
};

const getFirstJyutping = (entry: DictionaryEntry): string => {
  return entry.phonetic?.jyutping?.[0]?.trim() || "";
};

const getHeadwordSortValue = (entry: DictionaryEntry): string => {
  return (
    entry.headword?.normalized?.trim() ||
    entry.headword?.display?.trim() ||
    ""
  );
};

const sortValue = (value: string): string => value.trim().toLowerCase();

export const sortSearchGroups = (
  groups: AggregatedSearchEntry[],
  sort: SearchSortOption = "relevance",
): AggregatedSearchEntry[] => {
  if (sort === "relevance") {
    return [...groups];
  }

  return [...groups].sort((a, b) => {
    const primaryA = a.primary;
    const primaryB = b.primary;

    if (sort === "jyutping") {
      const compared = sortValue(getFirstJyutping(primaryA)).localeCompare(
        sortValue(getFirstJyutping(primaryB)),
      );
      if (compared !== 0) return compared;
    }

    if (sort === "dictionary") {
      const compared = sortValue(primaryA.source_book || "").localeCompare(
        sortValue(primaryB.source_book || ""),
      );
      if (compared !== 0) return compared;
    }

    const headwordCompared = sortValue(
      getHeadwordSortValue(primaryA),
    ).localeCompare(sortValue(getHeadwordSortValue(primaryB)));
    if (headwordCompared !== 0) return headwordCompared;

    return String(primaryA.id || "").localeCompare(String(primaryB.id || ""));
  });
};

export const createEmptySearchFacetCounts = (): SearchFacetCounts => ({
  dictionaries: [],
  dialects: [],
  types: [],
});

const pushFacetCount = (
  bucket: Map<string, number>,
  value: string | null | undefined,
) => {
  const normalized = String(value || "").trim();
  if (!normalized) return;
  bucket.set(normalized, (bucket.get(normalized) || 0) + 1);
};

const toFacetBuckets = (bucket: Map<string, number>): SearchFacetBucket[] => {
  return Array.from(bucket.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return a.value.localeCompare(b.value);
    });
};

export const countSearchGroupFacets = (
  groups: AggregatedSearchEntry[],
): SearchFacetCounts => {
  const dictionaries = new Map<string, number>();
  const dialects = new Map<string, number>();
  const types = new Map<string, number>();

  for (const group of groups) {
    const groupDictionaries = new Set<string>();
    const groupDialects = new Set<string>();
    const groupTypes = new Set<string>();

    for (const entry of group.entries) {
      const sourceBook = entry.source_book?.trim();
      if (sourceBook) groupDictionaries.add(sourceBook);

      const dialect = entry.dialect?.region_code?.trim().toUpperCase();
      if (dialect) groupDialects.add(dialect);

      const type = entry.entry_type?.trim();
      if (type) groupTypes.add(type);
    }

    groupDictionaries.forEach((value) => pushFacetCount(dictionaries, value));
    groupDialects.forEach((value) => pushFacetCount(dialects, value));
    groupTypes.forEach((value) => pushFacetCount(types, value));
  }

  return {
    dictionaries: toFacetBuckets(dictionaries),
    dialects: toFacetBuckets(dialects),
    types: toFacetBuckets(types),
  };
};

export const buildSearchPageMeta = ({
  totalGrouped,
  offset,
  limit,
  returned,
}: {
  totalGrouped: number;
  offset: number;
  limit: number;
  returned: number;
}): SearchPageMeta => {
  const nextOffset = offset + returned;
  const hasMore = nextOffset < totalGrouped;

  return {
    offset,
    limit,
    returned,
    hasMore,
    nextOffset: hasMore ? nextOffset : null,
  };
};

export const buildGroupedSearchResponse = ({
  query,
  mode = "normal",
  sort = "relevance",
  filters = {},
  entries,
  offset = 0,
  limit = SEARCH_API_PAGE_SIZE,
  exact = true,
}: {
  query: string;
  mode?: "normal" | "reverse";
  sort?: SearchSortOption;
  filters?: SearchResponseFilters;
  entries: DictionaryEntry[];
  offset?: number;
  limit?: number;
  exact?: boolean;
}): GroupedSearchResponse => {
  const groups = sortSearchGroups(aggregateSearchEntries(entries), sort);
  const pageGroups = groups.slice(offset, offset + limit);
  const totalEntries = groups.reduce(
    (count, group) => count + group.entries.length,
    0,
  );

  return {
    success: true,
    query,
    mode,
    sort,
    filters,
    groups: pageGroups,
    results: flattenSearchGroups(pageGroups),
    total: {
      grouped: groups.length,
      entries: totalEntries,
      exact,
    },
    totalGrouped: groups.length,
    page: buildSearchPageMeta({
      totalGrouped: groups.length,
      offset,
      limit,
      returned: pageGroups.length,
    }),
    facets: countSearchGroupFacets(groups),
  };
};

export const pickRicherSearchEntries = (
  primaryEntries: DictionaryEntry[],
  candidateEntries: DictionaryEntry[],
): PreferredSearchEntriesSelection => {
  const primaryGroupedCount = countAggregatedSearchEntries(primaryEntries);
  const candidateGroupedCount = countAggregatedSearchEntries(candidateEntries);

  if (candidateGroupedCount > primaryGroupedCount) {
    return {
      entries: candidateEntries,
      source: "candidate",
      primaryGroupedCount,
      candidateGroupedCount,
    };
  }

  if (candidateGroupedCount < primaryGroupedCount) {
    return {
      entries: primaryEntries,
      source: "primary",
      primaryGroupedCount,
      candidateGroupedCount,
    };
  }

  if (candidateEntries.length >= primaryEntries.length) {
    return {
      entries: candidateEntries,
      source: "candidate",
      primaryGroupedCount,
      candidateGroupedCount,
    };
  }

  return {
    entries: primaryEntries,
    source: "primary",
    primaryGroupedCount,
    candidateGroupedCount,
  };
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
  const count = countAggregatedSearchEntries(entries);
  const isOverflow = options.isOverflow === true;

  return {
    count,
    label: isOverflow ? `${ceiling}+` : String(count),
    isOverflow,
  };
};

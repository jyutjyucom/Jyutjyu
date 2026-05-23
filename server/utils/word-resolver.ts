import type { DictionaryEntry } from "~/types/dictionary";
import {
  getCanonicalHeadwordsFromJson,
  getExactQueryForms,
  matchesExactQuery,
  resolveSearchLandingFromEntries,
  resolveSearchLandingFromJson,
  resolveWordEntriesFromJson,
  selectCanonicalWordEntries,
  toComparableHeadwordKey,
  type ResolvedWordResult,
  type SearchLandingResolution,
  type WordResolveTrace,
} from "~/utils/headword-exact-match";
import { isJyutpingQuery, normalizeSearchQuery } from "~/utils/query-classify";

import { getEntriesCollection } from "./mongodb";
import { getIsServerApiEnabled } from "./runtime-mode";

interface CandidateResolution {
  originalKey: string;
  queryKeys: Set<string>;
  entries: DictionaryEntry[];
}

let apiCanonicalHeadwordCountCache: { count: number; timestamp: number } | null = null;
let apiCanonicalHeadwordCountPromise: Promise<number> | null = null;

const API_CANONICAL_HEADWORD_COUNT_CACHE_MS = 60 * 60 * 1000;
const API_CANONICAL_HEADWORD_AGGREGATE_TIMEOUT_MS = 15000;

const normalizeSpace = (value: string): string => normalizeSearchQuery(value);

const measureTraceAsync = async <T>(
  trace: WordResolveTrace | undefined,
  key: string,
  fn: () => Promise<T>,
): Promise<T> => {
  if (!trace) {
    return await fn();
  }

  const startedAt = Date.now();
  try {
    return await fn();
  } finally {
    trace.phaseMs[key] = (trace.phaseMs[key] || 0) + (Date.now() - startedAt);
  }
};

const resolveCandidatesFromApi = async (
  headword: string,
): Promise<CandidateResolution | null> => {
  const queryForms = await getExactQueryForms(headword);
  if (queryForms.length === 0) {
    return null;
  }

  const originalKey = toComparableHeadwordKey(normalizeSpace(headword));
  const queryKeys = new Set(
    queryForms.map(toComparableHeadwordKey).filter(Boolean),
  );
  const exactForms = Array.from(
    new Set(queryForms.map((form) => normalizeSpace(form)).filter(Boolean)),
  );
  const collection = await getEntriesCollection();

  const entries = await collection
    .find<DictionaryEntry>(
      {
        $or: [
          { "headword.normalized": { $in: exactForms } },
          { "headword.display": { $in: exactForms } },
          { "meta.headword_variants": { $in: exactForms } },
        ],
      },
      { projection: { _id: 0 }, maxTimeMS: 5000 },
    )
    .toArray();

  return {
    originalKey,
    queryKeys,
    entries: entries.filter((entry) => matchesExactQuery(entry, queryKeys)),
  };
};

const resolveFromApi = async (
  headword: string,
): Promise<ResolvedWordResult | null> => {
  const candidates = await resolveCandidatesFromApi(headword);
  if (!candidates) {
    return null;
  }

  return selectCanonicalWordEntries(
    candidates.entries,
    candidates.originalKey,
    candidates.queryKeys,
  );
};

const getCanonicalHeadwordStages = () => [
  {
    $project: {
      canonicalHeadword: {
        $let: {
          vars: {
            normalized: {
              $trim: {
                input: { $ifNull: ["$headword.normalized", ""] },
              },
            },
            display: {
              $trim: { input: { $ifNull: ["$headword.display", ""] } },
            },
          },
          in: {
            $cond: [
              { $ne: ["$$normalized", ""] },
              "$$normalized",
              "$$display",
            ],
          },
        },
      },
    },
  },
  {
    $match: {
      canonicalHeadword: { $ne: "" },
    },
  },
  {
    $group: {
      _id: { $toLower: "$canonicalHeadword" },
      canonicalHeadword: { $first: "$canonicalHeadword" },
    },
  },
];

export const getCanonicalHeadwordCountFromApi = async (): Promise<number> => {
  const now = Date.now();
  if (
    apiCanonicalHeadwordCountCache &&
    now - apiCanonicalHeadwordCountCache.timestamp <
      API_CANONICAL_HEADWORD_COUNT_CACHE_MS
  ) {
    return apiCanonicalHeadwordCountCache.count;
  }

  if (apiCanonicalHeadwordCountPromise) {
    return apiCanonicalHeadwordCountPromise;
  }

  apiCanonicalHeadwordCountPromise = (async () => {
    const collection = await getEntriesCollection();
    const rows = (await collection
      .aggregate(
        [...getCanonicalHeadwordStages(), { $count: "total" }],
        {
          allowDiskUse: true,
          maxTimeMS: API_CANONICAL_HEADWORD_AGGREGATE_TIMEOUT_MS,
        },
      )
      .toArray()) as Array<{ total?: number }>;
    const count = Number(rows[0]?.total || 0);
    apiCanonicalHeadwordCountCache = { count, timestamp: Date.now() };
    return count;
  })().finally(() => {
    apiCanonicalHeadwordCountPromise = null;
  });

  return apiCanonicalHeadwordCountPromise;
};

export const getCanonicalHeadwordPageFromApi = async ({
  offset,
  limit,
}: {
  offset: number;
  limit: number;
}): Promise<string[]> => {
  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.min(Math.max(0, Math.floor(limit)), 50000);
  if (safeLimit === 0) {
    return [];
  }

  const collection = await getEntriesCollection();
  const rows = (await collection
    .aggregate(
      [
        ...getCanonicalHeadwordStages(),
        { $sort: { canonicalHeadword: 1 } },
        { $skip: safeOffset },
        { $limit: safeLimit },
        { $project: { _id: 0, canonicalHeadword: 1 } },
      ],
      {
        allowDiskUse: true,
        maxTimeMS: API_CANONICAL_HEADWORD_AGGREGATE_TIMEOUT_MS,
      },
    )
    .toArray()) as Array<{ canonicalHeadword?: string }>;

  return rows
    .map((row) => normalizeSpace(row.canonicalHeadword || ""))
    .filter(Boolean);
};

const getCanonicalHeadwordsFromApi = async (): Promise<string[]> => {
  console.warn(
    "getCanonicalHeadwords() is disabled in API mode; use bounded canonical headword helpers instead",
  );
  return [];
};

export const resolveWordEntries = async (
  headword: string,
  trace?: WordResolveTrace,
): Promise<ResolvedWordResult | null> => {
  return await measureTraceAsync(trace, "resolve.total", async () => {
    const cleaned = normalizeSpace(headword);
    if (!cleaned) {
      return null;
    }

    if (getIsServerApiEnabled()) {
      if (trace) {
        trace.strategy = "api_fallback";
      }

      try {
        return await resolveFromApi(cleaned);
      } catch (error) {
        console.error("Word resolve (API mode) failed:", error);
        return null;
      }
    }

    try {
      return await resolveWordEntriesFromJson(cleaned, trace);
    } catch (error) {
      console.error("Word resolve (JSON mode) failed:", error);
      return null;
    }
  });
};

export const resolveSearchLanding = async (
  query: string,
  options: { reverse?: boolean } = {},
): Promise<SearchLandingResolution> => {
  const cleaned = normalizeSpace(query);
  if (!cleaned) {
    return {
      type: "search",
      reason: "empty_query",
    };
  }

  if (options.reverse) {
    return {
      type: "search",
      reason: "reverse_search",
    };
  }

  if (isJyutpingQuery(cleaned)) {
    return {
      type: "search",
      reason: "jyutping_query",
    };
  }

  if (getIsServerApiEnabled()) {
    try {
      const candidates = await resolveCandidatesFromApi(cleaned);
      return resolveSearchLandingFromEntries(candidates?.entries || [], cleaned);
    } catch (error) {
      console.error(
        "Search landing resolve (API mode) failed, fallback to search result:",
        error,
      );
      return {
        type: "search",
        reason: "no_exact_match",
      };
    }
  }

  try {
    return await resolveSearchLandingFromJson(cleaned, options);
  } catch (error) {
    console.error(
      "Search landing resolve (JSON mode) failed, fallback to search result:",
      error,
    );
  }

  return {
    type: "search",
    reason: "no_exact_match",
  };
};

export const getCanonicalHeadwords = async (): Promise<string[]> => {
  if (getIsServerApiEnabled()) {
    try {
      return await getCanonicalHeadwordsFromApi();
    } catch (error) {
      console.error("Canonical headwords (API mode) failed:", error);
      return [];
    }
  }

  try {
    return await getCanonicalHeadwordsFromJson();
  } catch (error) {
    console.error("Canonical headwords (JSON mode) failed:", error);
    return [];
  }
};

export {
  countExactCanonicalBuckets,
  resolveUniqueCanonicalHeadwordFromEntries,
} from "~/utils/headword-exact-match";

export type {
  ResolvedWordResult,
  SearchLandingResolution,
} from "~/utils/headword-exact-match";

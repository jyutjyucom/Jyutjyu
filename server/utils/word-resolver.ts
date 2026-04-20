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
} from "~/utils/headword-exact-match";
import { isJyutpingQuery, normalizeSearchQuery } from "~/utils/query-classify";

import { getEntriesCollection } from "./mongodb";
import { getIsServerApiEnabled } from "./runtime-mode";

interface CandidateResolution {
  originalKey: string;
  queryKeys: Set<string>;
  entries: DictionaryEntry[];
}

let apiCanonicalHeadwordsCache: string[] | null = null;
let apiCanonicalHeadwordsPromise: Promise<string[]> | null = null;

const normalizeSpace = (value: string): string => normalizeSearchQuery(value);

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
      { projection: { _id: 0 } },
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

const getCanonicalHeadwordsFromApi = async (): Promise<string[]> => {
  if (apiCanonicalHeadwordsCache) {
    return apiCanonicalHeadwordsCache;
  }

  if (apiCanonicalHeadwordsPromise) {
    return apiCanonicalHeadwordsPromise;
  }

  apiCanonicalHeadwordsPromise = (async () => {
    const collection = await getEntriesCollection();

    const rows = (await collection
      .aggregate(
        [
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
          {
            $project: {
              _id: 0,
              canonicalHeadword: 1,
            },
          },
        ],
        { allowDiskUse: true },
      )
      .toArray()) as Array<{ canonicalHeadword: string }>;

    const headwords = rows
      .map((row) => normalizeSpace(row.canonicalHeadword || ""))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "zh-Hant"));

    apiCanonicalHeadwordsCache = headwords;
    return headwords;
  })();

  return apiCanonicalHeadwordsPromise;
};

export const resolveWordEntries = async (
  headword: string,
): Promise<ResolvedWordResult | null> => {
  const cleaned = normalizeSpace(headword);
  if (!cleaned) {
    return null;
  }

  const useApi = getIsServerApiEnabled();

  if (useApi) {
    try {
      return await resolveFromApi(cleaned);
    } catch (error) {
      console.error(
        "Word resolve (API mode) failed, fallback to JSON mode:",
        error,
      );
      return resolveWordEntriesFromJson(cleaned);
    }
  }

  return resolveWordEntriesFromJson(cleaned);
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

  const useApi = getIsServerApiEnabled();

  if (useApi) {
    try {
      const candidates = await resolveCandidatesFromApi(cleaned);
      return resolveSearchLandingFromEntries(candidates?.entries || []);
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

  return resolveSearchLandingFromJson(cleaned, options);
};

export const getCanonicalHeadwords = async (): Promise<string[]> => {
  const useApi = getIsServerApiEnabled();

  if (useApi) {
    try {
      return await getCanonicalHeadwordsFromApi();
    } catch (error) {
      console.error(
        "Canonical headwords (API mode) failed, fallback to JSON mode:",
        error,
      );
      return getCanonicalHeadwordsFromJson();
    }
  }

  return getCanonicalHeadwordsFromJson();
};

export {
  countExactCanonicalBuckets,
  resolveUniqueCanonicalHeadwordFromEntries,
} from "~/utils/headword-exact-match";

export type {
  ResolvedWordResult,
  SearchLandingResolution,
} from "~/utils/headword-exact-match";

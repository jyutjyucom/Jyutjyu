import type { DictionaryEntry, EntryType } from "~/types/dictionary";
import { buildMatchExpression } from "./cjk-tokenize.ts";
import {
  buildGroupedSearchResponse,
  type GroupedSearchResponse,
  type SearchResponseFilters,
  type SearchSortOption,
} from "../../utils/search-result-groups.ts";

import type { D1Database } from "./d1.ts";
import { buildPlaceholders } from "./d1.ts";
import { getQueryVariants } from "./han-variants.ts";

const BM25 = "bm25(entry_fts, 10, 9, 6, 4, 1)";
const LATIN_RE = /^[a-z0-9' ]+$/i;
const MAX_CANDIDATES = 800;
const MIN_CANDIDATES = 80;

const parseEntry = (raw: unknown): DictionaryEntry | null => {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as DictionaryEntry;
  } catch {
    return null;
  }
};

const buildFtsExpression = (
  variants: string[],
  column: string,
): string | null => {
  const expressions = variants
    .map((variant) => buildMatchExpression(variant, column, "OR"))
    .filter((expression): expression is string => Boolean(expression))
    .map((expression) => "(" + expression + ")");

  return expressions.length > 0 ? expressions.join(" OR ") : null;
};

export const searchEntriesFromD1 = async (
  db: D1Database,
  {
    query,
    mode = "normal",
    sort = "relevance",
    filters = {},
    offset = 0,
    limit = 20,
  }: {
    query: string;
    mode?: "normal" | "reverse";
    sort?: SearchSortOption;
    filters?: SearchResponseFilters;
    offset?: number;
    limit?: number;
  },
): Promise<GroupedSearchResponse | null> => {
  const isLatin = LATIN_RE.test(query);
  const variants =
    mode === "reverse" || isLatin ? [query] : await getQueryVariants(query);
  const column =
    mode === "reverse" ? "def" : isLatin ? "jp" : "{hw vars jp kw}";
  const match = buildFtsExpression(variants, column);
  if (!match) return null;

  const requestedWindow = offset + limit;
  const candidateLimit = Math.min(
    MAX_CANDIDATES,
    Math.max(MIN_CANDIDATES, requestedWindow * 4),
  );

  const params: unknown[] = [match];
  const where = ["entry_fts MATCH ?1"];

  if (filters.dict) {
    params.push(filters.dict);
    where.push("e.source_book = ?" + params.length);
  }
  if (filters.dialect) {
    params.push(filters.dialect);
    where.push("e.dialect = ?" + params.length);
  }
  if (filters.type as EntryType | undefined) {
    params.push(filters.type);
    where.push("e.entry_type = ?" + params.length);
  }

  let orderBy = "score";
  if (mode === "normal") {
    params.push(isLatin ? query.toLowerCase() : query);
    orderBy = isLatin
      ? "(e.jp = ?" + params.length + ") DESC, score"
      : "(e.canon = ?" + params.length + ") DESC, score";
  }

  params.push(candidateLimit + 1);

  const sql =
    "SELECT e.payload, " +
    BM25 +
    " AS score FROM entry_fts JOIN entries e ON e.id = entry_fts.rowid " +
    "WHERE " +
    where.join(" AND ") +
    " ORDER BY " +
    orderBy +
    " LIMIT ?" +
    params.length;

  const result = await db
    .prepare(sql)
    .bind(...params)
    .all<{ payload: string; score: number }>();

  const entries = result.results
    .map((row) => parseEntry(row.payload))
    .filter((entry): entry is DictionaryEntry => Boolean(entry));

  const exact = entries.length <= candidateLimit;
  const responseEntries = exact ? entries : entries.slice(0, candidateLimit);

  return buildGroupedSearchResponse({
    query,
    mode,
    sort,
    filters,
    entries: responseEntries,
    offset,
    limit,
    exact,
  });
};

export const getHeadwordSuggestionsFromD1 = async (
  db: D1Database,
  query: string,
  limit = 10,
): Promise<string[]> => {
  const variants = await getQueryVariants(query);
  const expressions = variants
    .map((variant) => {
      const tokens = buildMatchExpression(variant, "hw")
        ?.split(" ")
        .pop();
      const token = tokens?.replace(/^hw:"|"$/g, "");
      return token ? `hw:${token}*` : null;
    })
    .filter((expression): expression is string => Boolean(expression));

  if (expressions.length === 0) return [];

  const { results } = await db
    .prepare(
      "SELECT e.canon, " +
        BM25 +
        " AS score FROM entry_fts JOIN entries e ON e.id = entry_fts.rowid " +
        "WHERE entry_fts MATCH ?1 " +
        "ORDER BY (e.canon LIKE ?2) DESC, score LIMIT ?3",
    )
    .bind(expressions.join(" OR "), query + "%", limit * 3)
    .all<{ canon: string }>();

  const seen = new Set<string>();
  const suggestions: string[] = [];
  for (const row of results) {
    if (!row.canon || seen.has(row.canon)) continue;
    seen.add(row.canon);
    suggestions.push(row.canon);
    if (suggestions.length >= limit) break;
  }

  return suggestions;
};

export const getD1FacetCounts = async (
  db: D1Database,
  query: string,
): Promise<{ dict: string; count: number }[]> => {
  const variants = await getQueryVariants(query);
  const match = buildFtsExpression(variants, "{hw vars jp kw}");
  if (!match) return [];

  const { results } = await db
    .prepare(
      "SELECT e.source_book AS dict, count(*) AS count " +
        "FROM entry_fts JOIN entries e ON e.id = entry_fts.rowid " +
        "WHERE entry_fts MATCH ?1 GROUP BY e.source_book ORDER BY count DESC",
    )
    .bind(match)
    .all<{ dict: string; count: number }>();

  return results;
};

export const buildD1PlaceholderList = (count: number): string =>
  buildPlaceholders(count);

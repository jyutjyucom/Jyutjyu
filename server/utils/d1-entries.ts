import type { DictionaryEntry } from "~/types/dictionary";

import type { D1Database } from "./d1.ts";
import { buildPlaceholders } from "./d1.ts";

const parseEntry = (raw: unknown): DictionaryEntry | null => {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as DictionaryEntry;
  } catch {
    return null;
  }
};

export const getEntryByIdFromD1 = async (
  db: D1Database,
  id: string,
): Promise<DictionaryEntry | null> => {
  const row = await db
    .prepare("SELECT payload FROM entries WHERE entry_id = ?1 LIMIT 1")
    .bind(id)
    .first<{ payload: string }>();

  return row ? parseEntry(row.payload) : null;
};

export const getDictionaryStatsFromD1 = async (
  db: D1Database,
): Promise<{
  totalEntries: number;
  dictionaries: { name: string; entries_count: number; dialect?: string }[];
}> => {
  const [stats, total] = await Promise.all([
    db
      .prepare(
        "SELECT source_book AS name, count(*) AS entries_count, min(dialect) AS dialect " +
          "FROM entries GROUP BY source_book ORDER BY entries_count DESC",
      )
      .all<{ name: string; entries_count: number; dialect: string | null }>(),
    db
      .prepare("SELECT count(*) AS n FROM entries")
      .first<{ n: number }>(),
  ]);

  return {
    totalEntries: total?.n ?? 0,
    dictionaries: stats.results.map((row) => ({
      name: row.name,
      entries_count: row.entries_count,
      dialect: row.dialect || undefined,
    })),
  };
};

/**
 * 用預先建好的 entry_forms（display / normalized / headword_variants 的小寫形式）
 * 做精確查詢，對應原本 Mongo 的 $or: normalized/display/headword_variants。
 */
export const findEntriesByForms = async (
  db: D1Database,
  forms: string[],
  limit = 200,
): Promise<DictionaryEntry[]> => {
  const keys = Array.from(
    new Set(
      forms
        .map((form) =>
          String(form || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  ).slice(0, 90);

  if (keys.length === 0) return [];

  const rows = await db
    .prepare(
      "SELECT e.payload FROM entry_forms f JOIN entries e ON e.id = f.entry_id " +
        "WHERE f.key IN (" +
        buildPlaceholders(keys.length) +
        ") LIMIT ?",
    )
    .bind(...keys, limit)
    .all<{ payload: string }>();

  return rows.results
    .map((row) => parseEntry(row.payload))
    .filter((entry): entry is DictionaryEntry => Boolean(entry));
};

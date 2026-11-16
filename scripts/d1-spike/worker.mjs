/**
 * D1 spike worker：用真實的 Workers + D1 runtime 驗證搜尋可行性。
 * 只讀，不寫。所有回應都帶 _d1 meta（duration / rows_read），方便計費評估。
 */
import { buildMatchExpression } from "../../server/utils/cjk-tokenize.ts";
import tradToSimplifiedMap from "../../server/generated/trad-to-simplified-map.json";
import preferredTraditionalMap from "../../server/generated/simplified-to-traditional-map.json";
import traditionalVariantMap from "../../server/generated/trad-variant-map.json";

const toSimplified = (text) =>
  Array.from(text)
    .map((char) => tradToSimplifiedMap[char] || char)
    .join("");

const toTraditional = (text) =>
  Array.from(text)
    .map((char) => preferredTraditionalMap[char] || char)
    .join("");

const MAX_VARIANTS = 16;

/** 查詢變體展開：原文 + 簡體 + 繁體 + 異體組合（與 server/utils/han-variants.ts 同源） */
const expandQueryVariants = (query) => {
  const variants = new Set([query, toSimplified(query), toTraditional(query)]);
  const simplified = toSimplified(query);
  let combinations = [""];
  for (const char of simplified) {
    const options = (traditionalVariantMap[char] || [char]).slice(0, 4);
    const next = [];
    for (const prefix of combinations) {
      for (const option of options) {
        next.push(prefix + option);
        if (next.length >= MAX_VARIANTS) break;
      }
      if (next.length >= MAX_VARIANTS) break;
    }
    combinations = next;
  }
  for (const combination of combinations) variants.add(combination);
  return Array.from(variants).slice(0, MAX_VARIANTS);
};

const BM25 = "bm25(entry_fts, 10, 9, 6, 4, 1)";
const LATIN_RE = /^[a-z0-9' ]+$/i;

const json = (data, meta) =>
  Response.json(data, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
      "x-d1-duration": String(meta?.duration ?? ""),
      "x-d1-rows-read": String(meta?.rows_read ?? ""),
    },
  });

const d1Meta = (results) => {
  const first = Array.isArray(results) ? results[0] : results;
  return first?.meta ?? {};
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const DB = env.DB;

    try {
      if (path === "/health") {
        const row = await DB.prepare("SELECT count(*) AS n FROM entries").first();
        return json({ ok: true, entries: row?.n ?? 0 });
      }

      if (path === "/search") {
        const q = (url.searchParams.get("q") || "").trim();
        const limit = Math.min(Number(url.searchParams.get("limit") || 20), 5000);
        const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
        const dict = url.searchParams.get("dict") || "";
        const mode = url.searchParams.get("mode") === "reverse" ? "reverse" : "normal";
        if (!q) return json({ error: "q required" }, {});

        const isLatin = LATIN_RE.test(q);
        const column = mode === "reverse" ? "def" : isLatin ? "jp" : "{hw vars jp kw}";
        const variants = isLatin ? [q] : expandQueryVariants(q);
        const match = variants
          .map((variant) => buildMatchExpression(variant, column, "OR"))
          .filter(Boolean)
          .map((expression) => "(" + expression + ")")
          .join(" OR ");
        if (!match) return json({ error: "no tokens" }, {});

        const where = ["entry_fts MATCH ?1", "e.restricted = 0"];
        const params = [match];
        if (dict) {
          params.push(dict);
          where.push("e.source_book = ?" + params.length);
        }
        // 與現有產品行為對齊：正查且非粵拼時，詞頭完全相等的排最前；
        // 粵拼查詢則用整串粵拼相等做 boost；反查不加 boost。
        let orderBy = "score";
        if (mode === "normal") {
          if (isLatin) {
            params.push(q.toLowerCase());
            orderBy = "(e.jp = ?" + params.length + ") DESC, score";
          } else {
            params.push(q);
            orderBy = "(e.canon = ?" + params.length + ") DESC, score";
          }
        }
        params.push(limit + 1, offset);
        const sql =
          "SELECT e.entry_id, e.canon, e.source_book, e.entry_type, e.dialect, " +
          BM25 + " AS score " +
          "FROM entry_fts JOIN entries e ON e.id = entry_fts.rowid " +
          "WHERE " + where.join(" AND ") + " " +
          "ORDER BY " + orderBy + " " +
          "LIMIT ?" + (params.length - 1) + " OFFSET ?" + params.length;

        const result = await DB.prepare(sql).bind(...params).all();
        return json(
          {
            query: q,
            mode,
            rows: result.results,
          },
          result.meta,
        );
      }

      if (path === "/grouped") {
        const q = (url.searchParams.get("q") || "").trim();
        const limit = Math.min(Number(url.searchParams.get("limit") || 10), 50);
        if (!q) return json({ error: "q required" }, {});
        const match = buildMatchExpression(q, "{hw vars jp kw}");
        const sql =
          "SELECT e.entry_id, e.canon, e.source_book, e.entry_type, e.dialect, " +
          BM25 + " AS score " +
          "FROM entry_fts JOIN entries e ON e.id = entry_fts.rowid " +
          "WHERE entry_fts MATCH ?1 AND e.restricted = 0 ORDER BY score LIMIT ?2";
        const result = await DB.prepare(sql).bind(match, limit * 6).all();
        const groups = new Map();
        for (const row of result.results) {
          const key = row.canon;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(row);
        }
        const out = Array.from(groups.entries())
          .slice(0, limit)
          .map(([canon, entries]) => ({ canon, count: entries.length, top: entries[0] }));
        return json({ query: q, groups: out, scanned: result.results.length }, result.meta);
      }

      if (path === "/facets") {
        const q = (url.searchParams.get("q") || "").trim();
        if (!q) return json({ error: "q required" }, {});
        const match = buildMatchExpression(q, "{hw vars jp kw}");
        const sql =
          "SELECT e.source_book AS dict, count(*) AS n " +
          "FROM entry_fts JOIN entries e ON e.id = entry_fts.rowid " +
          "WHERE entry_fts MATCH ?1 AND e.restricted = 0 " +
          "GROUP BY e.source_book ORDER BY n DESC";
        const result = await DB.prepare(sql).bind(match).all();
        return json({ query: q, facets: result.results }, result.meta);
      }

      if (path === "/suggest") {
        const q = (url.searchParams.get("q") || "").trim();
        if (!q) return json({ error: "q required" }, {});
        const tokens = (await import("../../server/utils/cjk-tokenize.ts")).tokenizeCjk(q).split(" ").filter(Boolean);
        if (tokens.length === 0) return json({ suggestions: [] }, {});
        const pattern = "hw:" + tokens[tokens.length - 1] + "*";
        const sql =
          "SELECT e.canon, " + BM25 + " AS score " +
          "FROM entry_fts JOIN entries e ON e.id = entry_fts.rowid " +
          "WHERE entry_fts MATCH ?1 ORDER BY score LIMIT 10";
        const result = await DB.prepare(sql).bind(pattern).all();
        return json({ query: q, suggestions: result.results }, result.meta);
      }

      if (path === "/word") {
        const headword = (url.searchParams.get("h") || "").trim();
        if (!headword) return json({ error: "h required" }, {});
        const sql =
          "SELECT entry_id, canon, payload FROM entries " +
          "WHERE canon = ?1 AND restricted = 0 LIMIT 50";
        const result = await DB.prepare(sql).bind(headword).all();
        return json({ headword, entries: result.results }, result.meta);
      }

      if (path === "/browse") {
        const after = url.searchParams.get("after") || "";
        const limit = Math.min(Number(url.searchParams.get("limit") || 100), 500);
        const sql =
          "SELECT DISTINCT canon FROM entries WHERE canon > ?1 ORDER BY canon LIMIT ?2";
        const result = await DB.prepare(sql).bind(after, limit).all();
        return json({ after, headwords: result.results }, result.meta);
      }

      if (path === "/random") {
        const sql = "SELECT entry_id, canon, payload FROM entries ORDER BY random() LIMIT 3";
        const result = await DB.prepare(sql).all();
        return json({ entries: result.results }, result.meta);
      }

      return json({ error: "not found" }, {});
    } catch (error) {
      return json({ error: String(error && error.message ? error.message : error) }, {});
    }
  },
};

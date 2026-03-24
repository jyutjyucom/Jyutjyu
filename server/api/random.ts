/**
 * 随机推荐词条 API
 *
 * GET /api/random?count=3
 *
 * 参数:
 *   count - 返回词条数量（默认 3，最大 20）
 *
 * 策略（与前端保持一致）:
 *   1. 只从高质量词典中选取（广州话俗语词典、实用广州话分类词典）
 *   2. 过滤无效词条（无释义、释义含 "NO DATA"、释义太短）
 *   3. 真正随机选取
 *
 * 回退策略:
 *   - MongoDB 不可用时，回退到预生成的 recommendations.json
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getEntriesCollection } from "../utils/mongodb";

// 高质量词典列表（与前端一致）
const QUALITY_DICTIONARIES = ["广州话俗语词典", "实用广州话分类词典"];

const RECOMMENDATION_FILE_CANDIDATES = [
  resolve(process.cwd(), "public/recommendations.json"),
  resolve(process.cwd(), ".output/public/recommendations.json"),
  resolve(process.cwd(), "recommendations.json"),
];

let cachedFallbackEntries: any[] | null = null;

interface RandomQuery {
  count?: string;
}

const parseFallbackEntries = (payload: unknown): any[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const entries = (payload as { entries?: unknown }).entries;
    if (Array.isArray(entries)) return entries;
  }
  return [];
};

const loadFallbackEntries = (): any[] => {
  if (cachedFallbackEntries) {
    return cachedFallbackEntries;
  }

  for (const filePath of RECOMMENDATION_FILE_CANDIDATES) {
    try {
      const raw = readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      const entries = parseFallbackEntries(parsed);
      if (entries.length > 0) {
        cachedFallbackEntries = entries;
        return entries;
      }
    } catch {
      // try next candidate
    }
  }

  cachedFallbackEntries = [];
  return cachedFallbackEntries;
};

const pickRandomEntries = <T>(entries: T[], count: number): T[] => {
  if (entries.length <= count) {
    return [...entries];
  }

  const shuffled = [...entries];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  return shuffled.slice(0, count);
};

export default defineEventHandler(async (event) => {
  const query = getQuery<RandomQuery>(event);
  const count = Math.min(Math.max(1, parseInt(query.count || "3") || 3), 20);

  try {
    const collection = await getEntriesCollection();

    // 使用 MongoDB 聚合管道获取随机词条
    const pipeline = [
      // 1. 只从高质量词典中选取
      {
        $match: {
          source_book: { $in: QUALITY_DICTIONARIES },
        },
      },
      // 2. 过滤无效词条
      {
        $match: {
          "senses.0.definition": {
            $exists: true,
            $ne: "",
            $not: /NO DATA/i,
          },
        },
      },
      // 3. 过滤释义太短的词条（少于3个字符）
      {
        $match: {
          $expr: {
            $gte: [
              {
                $strLenCP: {
                  $ifNull: [{ $arrayElemAt: ["$senses.definition", 0] }, ""],
                },
              },
              3,
            ],
          },
        },
      },
      // 4. 随机采样
      {
        $sample: { size: count },
      },
      // 5. 排除 _id
      {
        $project: { _id: 0 },
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();

    return {
      success: true,
      count: results.length,
      results,
    };
  } catch (error: any) {
    console.error("MongoDB 隨機詞條失敗，改用靜態推薦回退:", error);

    const fallbackEntries = loadFallbackEntries();
    if (fallbackEntries.length > 0) {
      const results = pickRandomEntries(fallbackEntries, count);
      return {
        success: true,
        count: results.length,
        results,
      };
    }

    return {
      success: false,
      error: error?.message || "服务暂时不可用",
      results: [],
    };
  }
});

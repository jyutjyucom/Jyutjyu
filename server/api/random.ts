/**
 * 随机推荐词条 API
 *
 * GET /api/random?count=3
 *
 * 参数:
 *   count - 返回词条数量（默认 3，最大 20）
 *
 * 策略（与原行为保持一致）:
 *   1. 优先从高质量词典子集实时随机抽样
 *   2. 若 MongoDB 超时或不可用，则回退到预生成的 recommendations.json
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bundledRecommendations from "~/public/recommendations.json";
import { getEntriesCollection } from "../utils/mongodb";

const QUALITY_DICTIONARIES = ["广州话俗语词典", "实用广州话分类词典"];
const RANDOM_QUERY_TIMEOUT_MS = 1200;

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

  const bundledEntries = parseFallbackEntries(bundledRecommendations);
  if (bundledEntries.length > 0) {
    cachedFallbackEntries = bundledEntries;
    return bundledEntries;
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

class RandomQueryTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RandomQueryTimeoutError";
  }
}

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new RandomQueryTimeoutError(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const fetchRandomEntriesFromMongo = async (count: number) => {
  const collection = await getEntriesCollection();

  const pipeline = [
    {
      $match: {
        source_book: { $in: QUALITY_DICTIONARIES },
      },
    },
    {
      $match: {
        "senses.0.definition": {
          $exists: true,
          $ne: "",
          $not: /NO DATA/i,
        },
      },
    },
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
    {
      $sample: { size: count },
    },
    {
      $project: { _id: 0 },
    },
  ];

  return await collection
    .aggregate(pipeline, { maxTimeMS: RANDOM_QUERY_TIMEOUT_MS })
    .toArray();
};

export default defineEventHandler(async (event) => {
  const query = getQuery<RandomQuery>(event);
  const count = Math.min(Math.max(1, parseInt(query.count || "3") || 3), 20);

  try {
    const results = await withTimeout(
      fetchRandomEntriesFromMongo(count),
      RANDOM_QUERY_TIMEOUT_MS,
      `Random entry query timed out after ${RANDOM_QUERY_TIMEOUT_MS}ms`,
    );

    return {
      success: true,
      count: results.length,
      results,
    };
  } catch (error) {
    console.error("MongoDB 隨機詞條失敗，改用靜態推薦回退:", error);
  }

  const recommendationEntries = loadFallbackEntries();
  if (recommendationEntries.length > 0) {
    const results = pickRandomEntries(recommendationEntries, count);

    return {
      success: true,
      count: results.length,
      results,
    };
  }

  return {
    success: false,
    error: "推荐词条暂时不可用",
    results: [],
  };
});

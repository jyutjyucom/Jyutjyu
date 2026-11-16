/**
 * 词典列表和统计 API
 *
 * GET /api/dictionaries
 *   返回所有词典的元数据和统计信息
 */

import { getServerDataMode, requireD1 } from "../utils/d1";
import { getDictionaryStatsFromD1 } from "../utils/d1-entries";
import { getEntriesCollection } from "../utils/mongodb";

export default defineEventHandler(async (event) => {
  try {
    if (getServerDataMode(event) === "d1") {
      const stats = await getDictionaryStatsFromD1(requireD1(event));
      return {
        success: true,
        total_entries: stats.totalEntries,
        dictionaries: stats.dictionaries,
      };
    }

    const collection = await getEntriesCollection();

    // 按词典分组统计
    const stats = await collection
      .aggregate([
        {
          $group: {
            _id: "$source_book",
            count: { $sum: 1 },
            dialect: { $first: "$dialect.name" },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();

    // 获取总数
    const totalCount = await collection.countDocuments();

    return {
      success: true,
      total_entries: totalCount,
      dictionaries: stats.map((s) => ({
        name: s._id,
        entries_count: s.count,
        dialect: s.dialect,
      })),
    };
  } catch (error: any) {
    console.error("讀取詞典清單失敗:", error);

    return {
      success: false,
      error: error.message || "服务暂时不可用",
      dictionaries: [],
    };
  }
});

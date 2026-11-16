/**
 * 获取单个词条 API
 *
 * GET /api/entry/:id
 *   返回指定 ID 的词条详情
 */

import { getServerDataMode, requireD1 } from "../../utils/d1";
import { getEntryByIdFromD1 } from "../../utils/d1-entries";
import { getEntriesCollection } from "../../utils/mongodb";
import {
  filterRestrictedEntries,
  getModerationMongoFilter,
  setModerationCacheHeaders,
  shouldApplyMainlandModeration,
  stripModerationMetadata,
} from "../../utils/moderation";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    return {
      success: false,
      error: "请提供词条 ID",
      entry: null,
    };
  }

  try {
    if (shouldApplyMainlandModeration(event)) {
      setModerationCacheHeaders(event);
    }

    const mode = getServerDataMode(event);
    let entry: any = null;

    if (mode === "d1") {
      const found = await getEntryByIdFromD1(requireD1(event), id);
      entry = found
        ? (filterRestrictedEntries(event, [found])[0] ?? null)
        : null;
    } else {
      const collection = await getEntriesCollection();
      entry = await collection.findOne(
        {
          id,
          ...getModerationMongoFilter(event),
        },
        { projection: { _id: 0 } },
      );
    }

    if (!entry) {
      return {
        success: false,
        error: "词条不存在",
        entry: null,
      };
    }

    return {
      success: true,
      entry: stripModerationMetadata(entry),
    };
  } catch (error: any) {
    console.error("讀取詞條失敗:", error);

    return {
      success: false,
      error: error.message || "服务暂时不可用",
      entry: null,
    };
  }
});

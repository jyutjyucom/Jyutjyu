import { getHeadwordSuggestions } from "../utils/headword-suggestions";
import {
  queryTouchesRestrictedTerm,
  setModerationCacheHeaders,
  shouldApplyMainlandModeration,
} from "../utils/moderation";

interface SuggestQuery {
  q?: string;
  limit?: string;
}

export default defineEventHandler(async (event) => {
  const query = getQuery<SuggestQuery>(event);
  const searchQuery = String(query.q || "").trim();
  const limit = Math.min(
    Math.max(1, parseInt(query.limit || "10", 10) || 10),
    20,
  );

  if (searchQuery.length < 2) {
    return {
      success: true,
      query: searchQuery,
      total: 0,
      suggestions: [],
    };
  }

  try {
    const mainlandModeration = shouldApplyMainlandModeration(event);
    if (mainlandModeration) {
      setModerationCacheHeaders(event);
    }

    if (mainlandModeration && queryTouchesRestrictedTerm(searchQuery)) {
      return {
        success: true,
        query: searchQuery,
        total: 0,
        suggestions: [],
      };
    }

    const rawSuggestions = await getHeadwordSuggestions(
      searchQuery,
      limit,
      event,
    );
    const suggestions = mainlandModeration
      ? rawSuggestions.filter(
          (suggestion) => !queryTouchesRestrictedTerm(suggestion),
        )
      : rawSuggestions;
    return {
      success: true,
      query: searchQuery,
      total: suggestions.length,
      suggestions,
    };
  } catch (error: any) {
    console.error("讀取搜尋建議失敗:", error);

    return {
      success: false,
      query: searchQuery,
      total: 0,
      suggestions: [],
      error: error?.message || "服務暫時不可用",
    };
  }
});

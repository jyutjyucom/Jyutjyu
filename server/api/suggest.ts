import { getHeadwordSuggestions } from "../utils/headword-suggestions";

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
    const suggestions = await getHeadwordSuggestions(searchQuery, limit);
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

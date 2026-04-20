import { resolveSearchLanding } from "../../utils/word-resolver";

interface SearchResolveQuery {
  q?: string;
  reverse?: string;
}

export default defineEventHandler(async (event) => {
  const query = getQuery<SearchResolveQuery>(event);
  const searchQuery = String(query.q || "").trim();
  const reverse = query.reverse === "1";

  try {
    const resolution = await resolveSearchLanding(searchQuery, { reverse });
    return {
      success: true,
      query: searchQuery,
      reverse,
      resolution,
    };
  } catch (error: any) {
    console.error("讀取搜尋落點失敗，回退到普通搜尋:", error);
    return {
      success: true,
      query: searchQuery,
      reverse,
      resolution: {
        type: "search",
        reason: "no_exact_match",
      },
      degraded: true,
    };
  }
});

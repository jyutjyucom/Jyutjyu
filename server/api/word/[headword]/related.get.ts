import { buildStaticRelatedWordsResponse } from "../../../utils/related-words.ts";

interface RelatedWordsQuery {
  limit?: string;
}

export default defineEventHandler(async (event) => {
  const headwordParam = getRouterParam(event, "headword");
  let headword = "";

  try {
    headword = decodeURIComponent(headwordParam || "").trim();
  } catch {
    headword = String(headwordParam || "").trim();
  }

  const query = getQuery<RelatedWordsQuery>(event);

  return await buildStaticRelatedWordsResponse({
    query: headword,
    limit: query.limit,
    event,
  });
});

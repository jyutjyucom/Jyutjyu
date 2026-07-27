import {
  getBrowsePage,
  getBrowsePageFromPrecomputed,
  shouldAllowBrowseDatasetFallback,
} from "../../utils/browse-index";
import {
  queryTouchesRestrictedTerm,
  setModerationCacheHeaders,
  shouldApplyMainlandModeration,
} from "../../utils/moderation";

interface BrowseQuery {
  page?: string | string[];
  size?: string | string[];
  dict?: string | string[];
  sort?: string | string[];
}

const getFirstQueryValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
};

const shouldRequirePrecomputedBrowseAssets = (): boolean =>
  !shouldAllowBrowseDatasetFallback();

export default defineEventHandler(async (event) => {
  const query = getQuery<BrowseQuery>(event);
  const page = Math.max(
    1,
    parseInt(getFirstQueryValue(query.page) || "1", 10) || 1,
  );
  const size = Math.max(
    1,
    parseInt(getFirstQueryValue(query.size) || "100", 10) || 100,
  );
  const dict = getFirstQueryValue(query.dict).trim() || "all";
  const sortRaw = getFirstQueryValue(query.sort).trim().toLowerCase();
  const sort = sortRaw === "jyutping" ? "jyutping" : "headword";
  const mainlandModeration = shouldApplyMainlandModeration(event);

  if (shouldRequirePrecomputedBrowseAssets() && !mainlandModeration) {
    // Try requested scope first
    let precomputed = await getBrowsePageFromPrecomputed({
      page,
      scope: dict,
      pageSize: size,
      sort,
    });

    // If not found, try "all" scope
    if (!precomputed && dict !== "all") {
      precomputed = await getBrowsePageFromPrecomputed({
        page,
        scope: "all",
        pageSize: size,
        sort,
      });
    }

    if (!precomputed) {
      throw createError({
        statusCode: 503,
        statusMessage: "Missing precomputed browse asset for this request",
      });
    }

    setHeader(
      event,
      "cache-control",
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    );
    return precomputed;
  }

  let data;
  try {
    data = await getBrowsePage({
      page,
      scope: dict,
      pageSize: size,
      sort,
    });
  } catch (error) {
    // Keep parity with the non-moderated path above: missing precomputed
    // assets are a temporary data-availability problem (503), not a 500.
    if (
      error instanceof Error &&
      error.message.includes("dataset fallback disabled")
    ) {
      throw createError({
        statusCode: 503,
        statusMessage: "Missing precomputed browse asset for this request",
      });
    }
    throw error;
  }

  if (mainlandModeration) {
    setModerationCacheHeaders(event);
    const headwords = data.headwords.filter(
      (headword) => !queryTouchesRestrictedTerm(headword),
    );
    return {
      ...data,
      headwords,
      total: Math.max(0, data.total - (data.headwords.length - headwords.length)),
    };
  }

  setHeader(
    event,
    "cache-control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  );
  return data;
});

import {
  getBrowsePage,
  getBrowsePageFromPrecomputed,
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

// Sanitize dict parameter to avoid invalid values like ":dict()"
const sanitizeDictParam = (dict: string): string => {
  const cleaned = dict.trim();

  // Reject obviously invalid values that look like unresolved route params
  if (!cleaned || cleaned.includes(":") || cleaned.includes("(") || cleaned.includes(")")) {
    return "all";
  }

  return cleaned;
};

const shouldRequirePrecomputedBrowseAssets = (event: any): boolean => {
  const isProduction =
    String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";

  return isProduction && Boolean(event?.context?.cloudflare);
};

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
  const dict = sanitizeDictParam(getFirstQueryValue(query.dict));
  const sortRaw = getFirstQueryValue(query.sort).trim().toLowerCase();
  const sort = sortRaw === "jyutping" ? "jyutping" : "headword";
  const mainlandModeration = shouldApplyMainlandModeration(event);

  if (shouldRequirePrecomputedBrowseAssets(event) && !mainlandModeration) {
    const precomputed = await getBrowsePageFromPrecomputed({
      page,
      scope: dict,
      pageSize: size,
      sort,
    });

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

  const data = await getBrowsePage({
    page,
    scope: dict,
    pageSize: size,
    sort,
  });

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

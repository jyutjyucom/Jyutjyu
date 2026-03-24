import {
  getBrowsePage,
  isBrowseScopeSupported,
} from "../../utils/browse-index";

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

  if (!(await isBrowseScopeSupported(dict))) {
    throw createError({
      statusCode: 404,
      statusMessage: `Dictionary scope not found: ${dict}`,
    });
  }

  const data = await getBrowsePage({
    page,
    scope: dict,
    pageSize: size,
    sort,
  });

  setHeader(
    event,
    "cache-control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  );
  return data;
});

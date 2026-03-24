import { getCanonicalHeadwords } from "../../utils/word-resolver";
import { getSitemapLastmod } from "../../utils/sitemap-meta";
import { getBrowseSitemapStaticPaths } from "../../utils/sitemap-browse";
import {
  SITEMAP_GROUP_CAPACITY,
  buildSitemapUrlEntryXml,
} from "../../../utils/route-paths";

const getSiteUrl = () => {
  const config = useRuntimeConfig();
  return String(config.public.siteUrl || "https://jyutjyu.com").replace(
    /\/+$/,
    "",
  );
};

const toPageNumber = (value: string | undefined | null): number => {
  if (!value) return NaN;
  const cleaned = value.replace(/\.xml$/i, "");
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export default defineEventHandler(async (event) => {
  const pathMatch = getRequestURL(event).pathname.match(
    /\/sitemaps\/([^/]+?)(?:\.xml)?$/i,
  );
  const page = toPageNumber(pathMatch?.[1] || getRouterParam(event, "page"));
  const headwords = await getCanonicalHeadwords();
  const browseStaticPaths = await getBrowseSitemapStaticPaths();
  const totalGroups = browseStaticPaths.length + headwords.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalGroups / SITEMAP_GROUP_CAPACITY),
  );
  const siteUrl = getSiteUrl();
  const lastmod = await getSitemapLastmod();

  if (!Number.isInteger(page) || page < 1 || page > totalPages) {
    setResponseStatus(event, 404);
    setHeader(event, "content-type", "application/xml; charset=UTF-8");
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"></urlset>\n';
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml +=
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  const start = (page - 1) * SITEMAP_GROUP_CAPACITY;
  const end = start + SITEMAP_GROUP_CAPACITY;

  const browseSlice = browseStaticPaths.slice(
    start,
    Math.min(end, browseStaticPaths.length),
  );
  for (const path of browseSlice) {
    xml += `${buildSitemapUrlEntryXml(path, siteUrl, lastmod)}\n`;
  }

  const headwordStart = Math.max(0, start - browseStaticPaths.length);
  const headwordEnd = Math.max(0, end - browseStaticPaths.length);
  const pageHeadwords = headwords.slice(headwordStart, headwordEnd);

  for (const headword of pageHeadwords) {
    xml += `${buildSitemapUrlEntryXml(`/word/${encodeURIComponent(headword)}`, siteUrl, lastmod)}\n`;
  }

  xml += "</urlset>\n";

  setHeader(event, "content-type", "application/xml; charset=UTF-8");
  setHeader(
    event,
    "cache-control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  );
  return xml;
});

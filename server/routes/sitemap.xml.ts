import {
  getCanonicalHeadwordCountFromApi,
  getCanonicalHeadwords,
} from "../utils/word-resolver";
import { getSitemapLastmod } from "../utils/sitemap-meta";
import { getBrowseSitemapStaticPaths } from "../utils/sitemap-browse";
import { getIsServerApiEnabled } from "../utils/runtime-mode";
import { SITEMAP_GROUP_CAPACITY } from "../../utils/route-paths";

const getSiteUrl = () => {
  const config = useRuntimeConfig();
  return String(config.public.siteUrl || "https://jyutjyu.com").replace(
    /\/+$/,
    "",
  );
};

export default defineEventHandler(async (event) => {
  // Degrade gracefully when MongoDB or precomputed browse assets are
  // unavailable: serve a partial sitemap index instead of a 500.
  let degraded = false;
  let headwordCount = 0;
  try {
    headwordCount = getIsServerApiEnabled()
      ? await getCanonicalHeadwordCountFromApi()
      : (await getCanonicalHeadwords()).length;
  } catch {
    degraded = true;
  }
  let browseStaticPaths: string[] = [];
  try {
    browseStaticPaths = await getBrowseSitemapStaticPaths();
  } catch {
    degraded = true;
  }
  const totalGroups = browseStaticPaths.length + headwordCount;
  const totalPages = Math.max(
    1,
    Math.ceil(totalGroups / SITEMAP_GROUP_CAPACITY),
  );
  const siteUrl = getSiteUrl();
  const lastmod = await getSitemapLastmod();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (let page = 1; page <= totalPages; page += 1) {
    xml += "  <sitemap>\n";
    xml += `    <loc>${siteUrl}/sitemaps/${page}.xml</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += "  </sitemap>\n";
  }

  xml += "</sitemapindex>\n";

  setHeader(event, "content-type", "application/xml; charset=UTF-8");
  // Avoid caching a degraded (partial) sitemap for a full day.
  setHeader(
    event,
    "cache-control",
    degraded
      ? "public, max-age=60, s-maxage=60"
      : "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  );
  return xml;
});

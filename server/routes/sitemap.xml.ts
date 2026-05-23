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
  const headwordCount = getIsServerApiEnabled()
    ? await getCanonicalHeadwordCountFromApi()
    : (await getCanonicalHeadwords()).length;
  const browseStaticPaths = await getBrowseSitemapStaticPaths();
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
  setHeader(
    event,
    "cache-control",
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  );
  return xml;
});

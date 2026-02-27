import { getCanonicalHeadwords } from '../../utils/word-resolver'
import { getSitemapLastmod } from '../../utils/sitemap-meta'
import { getBrowseSitemapStaticPaths } from '../../utils/sitemap-browse'

const PAGE_SIZE = 50000

const getSiteUrl = () => {
  const config = useRuntimeConfig()
  return String(config.public.siteUrl || 'https://jyutjyu.com').replace(/\/+$/, '')
}

const toPageNumber = (value: string | undefined | null): number => {
  if (!value) return NaN
  const cleaned = value.replace(/\.xml$/i, '')
  const parsed = Number.parseInt(cleaned, 10)
  return Number.isFinite(parsed) ? parsed : NaN
}

const buildUrlEntry = (loc: string, lastmod: string): string => {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>\n`
}

export default defineEventHandler(async (event) => {
  const pathMatch = getRequestURL(event).pathname.match(/\/sitemaps\/([^/]+?)(?:\.xml)?$/i)
  const page = toPageNumber(pathMatch?.[1] || getRouterParam(event, 'page'))
  const headwords = await getCanonicalHeadwords()
  const browseStaticPaths = await getBrowseSitemapStaticPaths()
  const firstPageWordCapacity = Math.max(0, PAGE_SIZE - browseStaticPaths.length)
  const totalPages = headwords.length <= firstPageWordCapacity
    ? 1
    : 1 + Math.ceil((headwords.length - firstPageWordCapacity) / PAGE_SIZE)
  const siteUrl = getSiteUrl()
  const lastmod = await getSitemapLastmod()

  if (!Number.isInteger(page) || page < 1 || page > totalPages) {
    setResponseStatus(event, 404)
    setHeader(event, 'content-type', 'application/xml; charset=UTF-8')
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n'
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  if (page === 1) {
    for (const path of browseStaticPaths) {
      const location = path ? `${siteUrl}${path}` : siteUrl
      xml += buildUrlEntry(location, lastmod)
    }
  }

  const start = page === 1
    ? 0
    : firstPageWordCapacity + (page - 2) * PAGE_SIZE
  const limit = page === 1 ? firstPageWordCapacity : PAGE_SIZE
  const pageHeadwords = limit > 0
    ? headwords.slice(start, start + limit)
    : []

  for (const headword of pageHeadwords) {
    xml += buildUrlEntry(`${siteUrl}/word/${encodeURIComponent(headword)}`, lastmod)
  }

  xml += '</urlset>\n'

  setHeader(event, 'content-type', 'application/xml; charset=UTF-8')
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800')
  return xml
})

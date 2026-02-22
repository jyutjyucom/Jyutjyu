import { getCanonicalHeadwords } from '../../utils/word-resolver'
import { getBrowseTotalPages } from '../../utils/browse-index'
import { getSitemapLastmod } from '../../utils/sitemap-meta'

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
  const siteUrl = getSiteUrl()
  const totalPages = Math.max(1, Math.ceil(headwords.length / PAGE_SIZE))
  const lastmod = await getSitemapLastmod()

  if (!Number.isInteger(page) || page < 1 || page > totalPages) {
    setResponseStatus(event, 404)
    setHeader(event, 'content-type', 'application/xml; charset=UTF-8')
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n'
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  if (page === 1) {
    xml += buildUrlEntry(siteUrl, lastmod)
    xml += buildUrlEntry(`${siteUrl}/about`, lastmod)
    xml += buildUrlEntry(`${siteUrl}/browse`, lastmod)

    const browsePages = await getBrowseTotalPages()
    for (let p = 2; p <= browsePages; p++) {
      xml += buildUrlEntry(`${siteUrl}/browse?page=${p}`, lastmod)
    }
  }

  const start = (page - 1) * PAGE_SIZE
  const pageHeadwords = headwords.slice(start, start + PAGE_SIZE)

  for (const headword of pageHeadwords) {
    xml += buildUrlEntry(`${siteUrl}/word/${encodeURIComponent(headword)}`, lastmod)
  }

  xml += '</urlset>\n'

  setHeader(event, 'content-type', 'application/xml; charset=UTF-8')
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800')
  return xml
})

import { getCanonicalHeadwords } from '../../utils/word-resolver'

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

export default defineEventHandler(async (event) => {
  const pathMatch = getRequestURL(event).pathname.match(/\/sitemaps\/([^/]+?)(?:\.xml)?$/i)
  const page = toPageNumber(pathMatch?.[1] || getRouterParam(event, 'page'))
  const headwords = await getCanonicalHeadwords()
  const siteUrl = getSiteUrl()
  const totalPages = Math.max(1, Math.ceil(headwords.length / PAGE_SIZE))

  if (!Number.isInteger(page) || page < 1 || page > totalPages) {
    setResponseStatus(event, 404)
    setHeader(event, 'content-type', 'application/xml; charset=UTF-8')
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n'
  }

  const start = (page - 1) * PAGE_SIZE
  const pageHeadwords = headwords.slice(start, start + PAGE_SIZE)
  const now = new Date().toISOString()

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  for (const headword of pageHeadwords) {
    const url = `${siteUrl}/word/${encodeURIComponent(headword)}`
    xml += '  <url>\n'
    xml += `    <loc>${url}</loc>\n`
    xml += `    <lastmod>${now}</lastmod>\n`
    xml += '  </url>\n'
  }

  xml += '</urlset>\n'

  setHeader(event, 'content-type', 'application/xml; charset=UTF-8')
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800')
  return xml
})

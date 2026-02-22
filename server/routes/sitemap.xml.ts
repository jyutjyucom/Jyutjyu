import { getCanonicalHeadwords } from '../utils/word-resolver'
import { getSitemapLastmod } from '../utils/sitemap-meta'

const PAGE_SIZE = 50000

const getSiteUrl = () => {
  const config = useRuntimeConfig()
  return String(config.public.siteUrl || 'https://jyutjyu.com').replace(/\/+$/, '')
}

export default defineEventHandler(async (event) => {
  const headwords = await getCanonicalHeadwords()
  const siteUrl = getSiteUrl()
  const totalPages = Math.max(1, Math.ceil(headwords.length / PAGE_SIZE))
  const lastmod = await getSitemapLastmod()

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  for (let page = 1; page <= totalPages; page += 1) {
    xml += '  <sitemap>\n'
    xml += `    <loc>${siteUrl}/sitemaps/${page}.xml</loc>\n`
    xml += `    <lastmod>${lastmod}</lastmod>\n`
    xml += '  </sitemap>\n'
  }

  xml += '</sitemapindex>\n'

  setHeader(event, 'content-type', 'application/xml; charset=UTF-8')
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800')
  return xml
})

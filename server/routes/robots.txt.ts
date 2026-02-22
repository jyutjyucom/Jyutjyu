const getSiteUrl = () => {
  const config = useRuntimeConfig()
  return String(config.public.siteUrl || 'https://jyutjyu.com').replace(/\/+$/, '')
}

export default defineEventHandler((event) => {
  const siteUrl = getSiteUrl()
  const content = [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${siteUrl}/sitemap.xml`
  ].join('\n')

  setHeader(event, 'content-type', 'text/plain; charset=UTF-8')
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800')
  return content
})

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const shouldRedirect = config.enforceCanonicalHostRedirect === true || String(config.enforceCanonicalHostRedirect) === 'true'

  // Keep disabled by default to avoid host-level redirect conflicts.
  if (!shouldRedirect) return

  const rawSiteUrl = String(config.public.siteUrl || '').trim()
  if (!rawSiteUrl) return

  let canonicalUrl: URL
  try {
    canonicalUrl = new URL(rawSiteUrl)
  } catch {
    return
  }

  const requestUrl = getRequestURL(event)
  const requestHost = requestUrl.host.toLowerCase()
  const canonicalHost = canonicalUrl.host.toLowerCase()

  if (!requestHost || requestHost === canonicalHost) return
  if (requestHost.includes('localhost') || requestHost.startsWith('127.0.0.1')) return

  const redirectUrl = new URL(requestUrl.toString())
  redirectUrl.protocol = canonicalUrl.protocol
  redirectUrl.host = canonicalHost

  return sendRedirect(event, redirectUrl.toString(), 301)
})

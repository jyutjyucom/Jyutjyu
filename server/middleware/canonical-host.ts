export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const shouldRedirectAllHosts =
    config.enforceCanonicalHostRedirect === true ||
    String(config.enforceCanonicalHostRedirect) === "true";

  const rawSiteUrl = String(config.public.siteUrl || "").trim();
  if (!rawSiteUrl) return;

  let canonicalUrl: URL;
  try {
    canonicalUrl = new URL(rawSiteUrl);
  } catch {
    return;
  }

  const requestUrl = getRequestURL(event);
  const requestHost = requestUrl.host.toLowerCase();
  const canonicalHost = canonicalUrl.host.toLowerCase();

  if (!requestHost || requestHost === canonicalHost) return;
  if (requestHost.includes("localhost") || requestHost.startsWith("127.0.0.1"))
    return;

  const shouldRedirectCommonWwwAlias =
    !canonicalHost.startsWith("www.") &&
    requestHost === `www.${canonicalHost}`;

  // By default, only collapse the common www alias onto the canonical apex
  // host. The runtime flag expands this to every non-canonical host.
  if (!shouldRedirectAllHosts && !shouldRedirectCommonWwwAlias) return;

  const redirectUrl = new URL(requestUrl.toString());
  redirectUrl.protocol = canonicalUrl.protocol;
  redirectUrl.host = canonicalHost;

  return sendRedirect(event, redirectUrl.toString(), 301);
});

const CROSS_ORIGIN_RESOURCE_PATHS = new Set(["/og.png", "/favicon.svg"]);

/**
 * Compute baseline security response headers for dynamic SSR and API responses.
 */
export function getSecurityHeaders(pathname: string): Record<string, string> {
  const normalizedPath = pathname.split("?")[0] || "/";
  const isCrossOriginAsset =
    CROSS_ORIGIN_RESOURCE_PATHS.has(normalizedPath) ||
    normalizedPath.startsWith("/tts/");

  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "Cross-Origin-Resource-Policy": isCrossOriginAsset
      ? "cross-origin"
      : "same-origin",
    "Content-Security-Policy":
      "frame-ancestors 'none'; object-src 'none'; base-uri 'none'",
  };
}

const CRAWLER_USER_AGENT_PATTERN =
  /\b(?:adsbot-google|applebot|baiduspider|bingbot|duckduckbot|google-inspectiontool|googlebot|googleother|petalbot|slurp|yandexbot)\b/i;

export const isLikelyCrawlerUserAgent = (
  userAgent: string | null | undefined,
): boolean => CRAWLER_USER_AGENT_PATTERN.test(String(userAgent || ""));

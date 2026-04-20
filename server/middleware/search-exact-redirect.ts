import {
  LOCALE_ROUTE_DEFINITIONS,
  applyLocalePrefix,
  buildWordRoutePath,
  stripLocalePrefix,
} from "../../utils/route-paths";
import { getIsServerApiEnabled } from "../utils/runtime-mode";
import { resolveSearchLanding } from "../utils/word-resolver";

const getLocalePrefixFromPath = (path: string): string => {
  const locale = LOCALE_ROUTE_DEFINITIONS.find(
    (entry) =>
      entry.prefix &&
      (path === entry.prefix || path.startsWith(`${entry.prefix}/`)),
  );
  return locale?.prefix || "";
};

export default defineEventHandler(async (event) => {
  const method = String(event.method || "").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return;

  // In API mode this redirect depends on a live Mongo lookup, and on Workers
  // that extra request-path resolution has proven less reliable than letting
  // the client navigation/search flow handle the fallback directly.
  if (getIsServerApiEnabled()) return;

  const requestUrl = getRequestURL(event);
  if (stripLocalePrefix(requestUrl.pathname) !== "/search") return;

  const query = getQuery<{ q?: string; reverse?: string }>(event);
  const searchQuery = String(query.q || "").trim();
  const reverse = query.reverse === "1";

  if (!searchQuery || reverse) return;

  let resolution;

  try {
    resolution = await resolveSearchLanding(searchQuery, { reverse });
  } catch (error) {
    console.error("Search exact redirect resolve failed:", error);
    return;
  }

  if (
    resolution.type !== "word" ||
    !resolution.canonicalHeadword ||
    !resolution.canonicalHeadword.trim()
  ) {
    return;
  }

  const targetPath = applyLocalePrefix(
    buildWordRoutePath(resolution.canonicalHeadword),
    getLocalePrefixFromPath(requestUrl.pathname),
  );

  return sendRedirect(event, targetPath, 302);
});

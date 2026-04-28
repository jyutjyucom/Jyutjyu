import {
  LOCALE_ROUTE_DEFINITIONS,
  applyLocalePrefix,
  buildWordRoutePath,
  isSearchResultsViewQuery,
  isSearchRoutePath,
} from "../../utils/route-paths";
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

  const requestUrl = getRequestURL(event);
  if (!isSearchRoutePath(requestUrl.pathname)) return;

  const query = getQuery<{ q?: string; reverse?: string }>(event);
  const searchQuery = String(query.q || "").trim();
  const reverse = query.reverse === "1";

  if (!searchQuery || reverse || isSearchResultsViewQuery(query)) return;

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

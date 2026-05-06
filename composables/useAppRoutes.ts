import {
  buildBrowseRoutePath,
  buildSearchOriginRouteQuery,
  buildSearchRouteQuery,
  buildSearchRouteQueryFromOrigin,
  buildSearchRouteQueryFromState,
  buildWordRoutePath,
  buildWordRouteQueryWithSearchOrigin,
  type SearchRouteState,
} from "~/utils/route-paths";

interface BrowsePathOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  defaultPageSize?: number;
  defaultSortBy?: string;
}

type SearchPathOptions = Omit<SearchRouteState, "query" | "reverse">;

interface WordPathOptions {
  searchOrigin?: SearchRouteState | null;
}

type RouteQueryValue = string | number | undefined | null;

export const useAppRoutes = () => {
  const localePath = useLocalePath();
  const config = useRuntimeConfig();

  const siteUrl = computed(() =>
    String(config.public.siteUrl || "").replace(/\/+$/, ""),
  );

  const localizedPath = (
    path: string,
    query?: Record<string, RouteQueryValue>,
  ): string => {
    const sanitizedQuery = Object.fromEntries(
      Object.entries(query || {}).filter(([, value]) => {
        if (value === undefined || value === null) return false;
        if (typeof value === "string") return value.trim() !== "";
        return true;
      }),
    );

    if (Object.keys(sanitizedQuery).length === 0) {
      return localePath(path);
    }

    return localePath({ path, query: sanitizedQuery });
  };

  const homePath = () => localePath("/");

  const wordPath = (headword: string, options: WordPathOptions = {}) => {
    return localizedPath(
      buildWordRoutePath(headword),
      buildWordRouteQueryWithSearchOrigin(options.searchOrigin),
    );
  };

  const browsePath = (dictId?: string, options: BrowsePathOptions = {}) => {
    return localizedPath(buildBrowseRoutePath(dictId), {
      page: options.page && options.page > 1 ? options.page : undefined,
      size:
        options.pageSize !== undefined &&
        options.pageSize !== options.defaultPageSize
          ? options.pageSize
          : undefined,
      sort:
        options.sortBy && options.sortBy !== options.defaultSortBy
          ? options.sortBy
          : undefined,
    });
  };

  const searchPath = (
    query = "",
    reverse = false,
    options: SearchPathOptions = {},
  ) => {
    return localizedPath(
      "/search",
      buildSearchRouteQuery(query, reverse, options),
    );
  };

  const searchPathFromState = (state: SearchRouteState) => {
    return localizedPath("/search", buildSearchRouteQueryFromState(state));
  };

  const searchPathFromOrigin = (origin: SearchRouteState) => {
    return localizedPath("/search", buildSearchRouteQueryFromOrigin(origin));
  };

  const wordPathWithSearchOrigin = (
    headword: string,
    origin: SearchRouteState | null,
  ) => {
    return localizedPath(
      buildWordRoutePath(headword),
      buildSearchOriginRouteQuery(origin || { query: "" }),
    );
  };

  const absoluteUrl = (path: string) => {
    if (!siteUrl.value) return "";
    if (/^https?:\/\//.test(path)) return path;
    return new URL(path || "/", `${siteUrl.value}/`).toString();
  };

  return {
    localePath,
    siteUrl,
    localizedPath,
    homePath,
    wordPath,
    browsePath,
    searchPath,
    searchPathFromState,
    searchPathFromOrigin,
    wordPathWithSearchOrigin,
    absoluteUrl,
  };
};

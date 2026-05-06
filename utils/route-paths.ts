export interface LocaleRouteDefinition {
  code: string;
  name: string;
  language: string;
  prefix: string;
}

export type RouteQueryValue =
  | string
  | Array<string | null>
  | ReadonlyArray<string | null>
  | null
  | undefined;
export type RouteQueryLike = Record<string, RouteQueryValue>;

export interface SeoAlternateLinkDefinition {
  id: string;
  hreflang: string;
  href: string;
}

export const DEFAULT_LOCALE_CODE = "yue-Hant";
export const SEARCH_RESULTS_VIEW_QUERY_KEY = "show";
export const SEARCH_RESULTS_VIEW_QUERY_VALUE = "results";
export const SEARCH_ORIGIN_QUERY_VALUE = "search";

export type SearchRouteEntryType = "character" | "word" | "phrase";
export type SearchRouteSort = "relevance" | "jyutping" | "headword" | "dictionary";
export type SearchRouteView = "card" | "list";

export interface SearchRouteState {
  query: string;
  reverse?: boolean;
  showResults?: boolean;
  dict?: string;
  dialect?: string;
  type?: SearchRouteEntryType;
  sort?: SearchRouteSort;
  view?: SearchRouteView;
  resultCount?: string;
}

export const LOCALE_ROUTE_DEFINITIONS: LocaleRouteDefinition[] = [
  { code: "yue-Hant", name: "粵文", language: "yue-Hant", prefix: "" },
  {
    code: "yue-Hans",
    name: "简体粤文",
    language: "yue-Hans",
    prefix: "/yue-Hans",
  },
  {
    code: "zh-Hant",
    name: "繁體普通話",
    language: "zh-Hant",
    prefix: "/zh-Hant",
  },
  {
    code: "zh-Hans",
    name: "简体普通话",
    language: "zh-Hans",
    prefix: "/zh-Hans",
  },
  { code: "en", name: "English", language: "en", prefix: "/en" },
];

export const NON_DEFAULT_LOCALE_PREFIXES = LOCALE_ROUTE_DEFINITIONS.map(
  (locale) => locale.prefix,
).filter(Boolean);
export const SITEMAP_PAGE_SIZE = 50000;
export const SITEMAP_GROUP_CAPACITY = Math.max(
  1,
  Math.floor(SITEMAP_PAGE_SIZE / LOCALE_ROUTE_DEFINITIONS.length),
);

const ZERO_WIDTH_CHARACTERS = /[\u200B-\u200D\uFEFF]/g;
const BROWSE_SEO_QUERY_KEYS = ["page", "size", "sort"];
const SEARCH_ROUTE_ENTRY_TYPES = new Set<SearchRouteEntryType>([
  "character",
  "word",
  "phrase",
]);
const SEARCH_ROUTE_SORTS = new Set<SearchRouteSort>([
  "relevance",
  "jyutping",
  "headword",
  "dictionary",
]);
const SEARCH_ROUTE_VIEWS = new Set<SearchRouteView>(["card", "list"]);
const WORD_ROUTE_PRESERVED_QUERY_KEYS = new Set([
  "jp",
  "source",
  "from",
  "search_q",
  "search_reverse",
  "search_dict",
  "search_dialect",
  "search_type",
  "search_sort",
  "search_view",
  "search_count",
]);
const SEARCH_COUNT_PATTERN = /^\d{1,7}\+?$/;

export const cleanHeadwordForPath = (headword: string): string => {
  return String(headword || "")
    .replace(ZERO_WIDTH_CHARACTERS, "")
    .trim();
};

export const buildWordRoutePath = (headword: string): string => {
  const cleaned = cleanHeadwordForPath(headword);
  return cleaned ? `/word/${encodeURIComponent(cleaned)}` : "/search";
};

export const buildBrowseRoutePath = (dictId?: string): string => {
  const cleaned = String(dictId || "").trim();
  return cleaned ? `/browse/${encodeURIComponent(cleaned)}` : "/browse";
};

const getFirstQueryValue = (value: RouteQueryValue): string => {
  if (Array.isArray(value)) {
    return value.find((item): item is string => typeof item === "string") || "";
  }

  return typeof value === "string" ? value : "";
};

const cleanQueryParam = (value?: string): string => String(value || "").trim();

const normalizeSearchEntryType = (
  value?: string,
): SearchRouteEntryType | undefined => {
  const cleaned = cleanQueryParam(value);
  return SEARCH_ROUTE_ENTRY_TYPES.has(cleaned as SearchRouteEntryType)
    ? (cleaned as SearchRouteEntryType)
    : undefined;
};

const normalizeSearchSort = (value?: string): SearchRouteSort | undefined => {
  const cleaned = cleanQueryParam(value);
  return SEARCH_ROUTE_SORTS.has(cleaned as SearchRouteSort)
    ? (cleaned as SearchRouteSort)
    : undefined;
};

const normalizeSearchView = (value?: string): SearchRouteView | undefined => {
  const cleaned = cleanQueryParam(value);
  return SEARCH_ROUTE_VIEWS.has(cleaned as SearchRouteView)
    ? (cleaned as SearchRouteView)
    : undefined;
};

const normalizeSearchCount = (value?: string): string | undefined => {
  const cleaned = cleanQueryParam(value);
  return SEARCH_COUNT_PATTERN.test(cleaned) ? cleaned : undefined;
};

export const buildSearchRouteQueryFromState = (
  state: SearchRouteState,
): Record<string, string> => {
  const result: Record<string, string> = {};
  const query = cleanQueryParam(state.query);
  const dict = cleanQueryParam(state.dict);
  const dialect = cleanQueryParam(state.dialect);
  const type = normalizeSearchEntryType(state.type);
  const sort = normalizeSearchSort(state.sort);
  const view = normalizeSearchView(state.view);

  if (query) result.q = query;
  if (state.reverse) result.reverse = "1";
  if (state.showResults) {
    result[SEARCH_RESULTS_VIEW_QUERY_KEY] = SEARCH_RESULTS_VIEW_QUERY_VALUE;
  }
  if (dict) result.dict = dict;
  if (dialect) result.dialect = dialect;
  if (type) result.type = type;
  if (sort && sort !== "relevance") result.sort = sort;
  if (view && view !== "card") result.view = view;

  return result;
};

export const buildSearchRouteQuery = (
  query?: string,
  reverse = false,
  options: Omit<SearchRouteState, "query" | "reverse"> = {},
): Record<string, string> =>
  buildSearchRouteQueryFromState({
    ...options,
    query: query || "",
    reverse,
  });

export const parseSearchRouteQuery = (query: RouteQueryLike): SearchRouteState => {
  return {
    query: cleanQueryParam(getFirstQueryValue(query.q)),
    reverse: getFirstQueryValue(query.reverse) === "1",
    showResults: isSearchResultsViewQuery(query),
    dict: cleanQueryParam(getFirstQueryValue(query.dict)) || undefined,
    dialect: cleanQueryParam(getFirstQueryValue(query.dialect)) || undefined,
    type: normalizeSearchEntryType(getFirstQueryValue(query.type)),
    sort: normalizeSearchSort(getFirstQueryValue(query.sort)),
    view: normalizeSearchView(getFirstQueryValue(query.view)),
  };
};

export const buildSearchOriginRouteQuery = (
  state: SearchRouteState,
): Record<string, string> => {
  const query = cleanQueryParam(state.query);
  if (!query) return {};

  const result: Record<string, string> = {
    from: SEARCH_ORIGIN_QUERY_VALUE,
    search_q: query,
  };
  const dict = cleanQueryParam(state.dict);
  const dialect = cleanQueryParam(state.dialect);
  const type = normalizeSearchEntryType(state.type);
  const sort = normalizeSearchSort(state.sort);
  const view = normalizeSearchView(state.view);
  const resultCount = normalizeSearchCount(state.resultCount);

  if (state.reverse) result.search_reverse = "1";
  if (dict) result.search_dict = dict;
  if (dialect) result.search_dialect = dialect;
  if (type) result.search_type = type;
  if (sort && sort !== "relevance") result.search_sort = sort;
  if (view && view !== "card") result.search_view = view;
  if (resultCount) result.search_count = resultCount;

  return result;
};

export const parseSearchOriginRouteQuery = (
  query: RouteQueryLike,
): SearchRouteState | null => {
  if (getFirstQueryValue(query.from) !== SEARCH_ORIGIN_QUERY_VALUE) return null;

  const searchQuery = cleanQueryParam(getFirstQueryValue(query.search_q));
  if (!searchQuery) return null;

  return {
    query: searchQuery,
    reverse: getFirstQueryValue(query.search_reverse) === "1",
    showResults: true,
    dict: cleanQueryParam(getFirstQueryValue(query.search_dict)) || undefined,
    dialect: cleanQueryParam(getFirstQueryValue(query.search_dialect)) || undefined,
    type: normalizeSearchEntryType(getFirstQueryValue(query.search_type)),
    sort: normalizeSearchSort(getFirstQueryValue(query.search_sort)),
    view: normalizeSearchView(getFirstQueryValue(query.search_view)),
    resultCount: normalizeSearchCount(getFirstQueryValue(query.search_count)),
  };
};

export const buildSearchRouteQueryFromOrigin = (
  origin: SearchRouteState,
): Record<string, string> =>
  buildSearchRouteQueryFromState({
    ...origin,
    showResults: true,
  });

export const buildWordRouteQueryWithSearchOrigin = (
  origin?: SearchRouteState | null,
): Record<string, string> => (origin ? buildSearchOriginRouteQuery(origin) : {});

export const preserveWordRouteQuery = (
  query: RouteQueryLike,
): Record<string, string> => {
  const result: Record<string, string> = {};

  WORD_ROUTE_PRESERVED_QUERY_KEYS.forEach((key) => {
    const value = getFirstQueryValue(query[key]);
    if (!value) return;

    if (key === "search_count") {
      const count = normalizeSearchCount(value);
      if (count) result[key] = count;
      return;
    }

    if (key === "from" && value !== SEARCH_ORIGIN_QUERY_VALUE) return;
    if (key === "search_type" && !normalizeSearchEntryType(value)) return;
    if (key === "search_sort" && !normalizeSearchSort(value)) return;
    if (key === "search_view" && !normalizeSearchView(value)) return;
    if (key === "search_reverse" && value !== "1") return;

    result[key] = value;
  });

  if (!parseSearchOriginRouteQuery(result)) {
    delete result.from;
    Object.keys(result).forEach((key) => {
      if (key.startsWith("search_")) delete result[key];
    });
  }

  return result;
};

export const isSearchResultsViewQuery = (query: RouteQueryLike): boolean => {
  const value = query?.[SEARCH_RESULTS_VIEW_QUERY_KEY];

  if (Array.isArray(value)) {
    return value.includes(SEARCH_RESULTS_VIEW_QUERY_VALUE);
  }

  return value === SEARCH_RESULTS_VIEW_QUERY_VALUE;
};

export const isSearchRoutePath = (path: string): boolean => {
  const strippedPath = stripLocalePrefix(path).replace(/\/+$/, "") || "/";
  return strippedPath === "/search";
};

export const applyLocalePrefix = (path: string, prefix: string): string => {
  const normalizedPath = path || "";

  if (!prefix) {
    return normalizedPath || "/";
  }

  if (!normalizedPath || normalizedPath === "/") {
    return prefix;
  }

  return `${prefix}${normalizedPath}`;
};

export const stripLocalePrefix = (path: string): string => {
  const normalizedPath = path || "/";

  if (normalizedPath === "/") {
    return "/";
  }

  const matchingPrefix = NON_DEFAULT_LOCALE_PREFIXES.find((prefix) => {
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
  });

  if (!matchingPrefix) {
    return normalizedPath;
  }

  return normalizedPath.slice(matchingPrefix.length) || "/";
};

const appendQueryValue = (
  params: URLSearchParams,
  key: string,
  value: RouteQueryValue,
) => {
  if (Array.isArray(value)) {
    value
      .filter((item): item is string => typeof item === "string")
      .forEach((item) => params.append(key, item));
    return;
  }

  if (typeof value === "string") {
    params.append(key, value);
  }
};

export const buildSeoQueryParams = (
  path: string,
  query: RouteQueryLike = {},
): URLSearchParams => {
  const normalizedPath = stripLocalePrefix(path);
  const params = new URLSearchParams();

  if (normalizedPath === "/browse" || normalizedPath.startsWith("/browse/")) {
    BROWSE_SEO_QUERY_KEYS.forEach((key) => {
      appendQueryValue(params, key, query[key]);
    });
  }

  return params;
};

export const buildSeoRoutePath = (
  path: string,
  query: RouteQueryLike = {},
  localeCode = DEFAULT_LOCALE_CODE,
): string => {
  const normalizedPath = stripLocalePrefix(path);
  const locale = LOCALE_ROUTE_DEFINITIONS.find(
    (item) => item.code === localeCode,
  );
  const localizedPath = applyLocalePrefix(normalizedPath, locale?.prefix || "");
  const queryString = buildSeoQueryParams(normalizedPath, query).toString();

  return queryString ? `${localizedPath}?${queryString}` : localizedPath;
};

export const withSiteUrl = (siteUrl: string, path: string): string => {
  const normalizedSiteUrl = String(siteUrl || "").replace(/\/+$/, "");
  if (!normalizedSiteUrl) return "";
  return new URL(path || "/", `${normalizedSiteUrl}/`).toString();
};

export const buildSeoAlternateLinkDefinitions = (
  path: string,
  siteUrl: string,
  query: RouteQueryLike = {},
): SeoAlternateLinkDefinition[] => {
  const links: SeoAlternateLinkDefinition[] = [];
  const addedGenericLanguages = new Set<string>();

  LOCALE_ROUTE_DEFINITIONS.forEach((locale) => {
    const [genericLanguage] = locale.language.split("-");
    const localizedHref = withSiteUrl(
      siteUrl,
      buildSeoRoutePath(path, query, locale.code),
    );

    if (genericLanguage && !addedGenericLanguages.has(genericLanguage)) {
      addedGenericLanguages.add(genericLanguage);
      links.push({
        id: `i18n-alt-${genericLanguage}`,
        hreflang: genericLanguage,
        href: localizedHref,
      });
    }

    if (locale.language !== genericLanguage) {
      links.push({
        id: `i18n-alt-${locale.language}`,
        hreflang: locale.language,
        href: localizedHref,
      });
    }
  });

  links.push({
    id: "i18n-xd",
    hreflang: "x-default",
    href: withSiteUrl(
      siteUrl,
      buildSeoRoutePath(path, query, DEFAULT_LOCALE_CODE),
    ),
  });

  return links;
};

export const buildSitemapUrlEntryXml = (
  path: string,
  siteUrl: string,
  lastmod: string,
): string => {
  const normalizedPath = stripLocalePrefix(path);
  const defaultLocaleHref = withSiteUrl(
    siteUrl,
    applyLocalePrefix(normalizedPath, ""),
  );
  const alternates = LOCALE_ROUTE_DEFINITIONS.map((locale) => {
    const href = withSiteUrl(
      siteUrl,
      applyLocalePrefix(normalizedPath, locale.prefix),
    );
    return `    <xhtml:link rel="alternate" hreflang="${locale.language}" href="${href}" />`;
  }).join("\n");

  if (normalizedPath.startsWith("/word/")) {
    return [
      "  <url>",
      `    <loc>${defaultLocaleHref}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      alternates,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${defaultLocaleHref}" />`,
      "  </url>",
    ].join("\n");
  }

  return LOCALE_ROUTE_DEFINITIONS.map((locale) => {
    const href = withSiteUrl(
      siteUrl,
      applyLocalePrefix(normalizedPath, locale.prefix),
    );
    return [
      "  <url>",
      `    <loc>${href}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      alternates,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${defaultLocaleHref}" />`,
      "  </url>",
    ].join("\n");
  }).join("\n");
};

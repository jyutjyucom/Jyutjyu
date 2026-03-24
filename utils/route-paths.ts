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

export const buildSearchRouteQuery = (
  query?: string,
  reverse = false,
): Record<string, string> => {
  const trimmed = String(query || "").trim();
  const result: Record<string, string> = {};

  if (trimmed) {
    result.q = trimmed;
  }

  if (reverse) {
    result.reverse = "1";
  }

  return result;
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
  const defaultLocaleHref = withSiteUrl(siteUrl, applyLocalePrefix(path, ""));
  const alternates = LOCALE_ROUTE_DEFINITIONS.map((locale) => {
    const href = withSiteUrl(siteUrl, applyLocalePrefix(path, locale.prefix));
    return `    <xhtml:link rel="alternate" hreflang="${locale.language}" href="${href}" />`;
  }).join("\n");

  return LOCALE_ROUTE_DEFINITIONS.map((locale) => {
    const href = withSiteUrl(siteUrl, applyLocalePrefix(path, locale.prefix));
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

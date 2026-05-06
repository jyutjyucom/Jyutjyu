import assert from "node:assert/strict";
import test from "node:test";

import {
  applyLocalePrefix,
  buildSearchOriginRouteQuery,
  buildSearchRouteQuery,
  buildSearchRouteQueryFromOrigin,
  buildSeoAlternateLinkDefinitions,
  buildSeoRoutePath,
  buildBrowseRoutePath,
  buildSitemapUrlEntryXml,
  buildWordRoutePath,
  isSearchResultsViewQuery,
  isSearchRoutePath,
  parseSearchOriginRouteQuery,
  parseSearchRouteQuery,
  preserveWordRouteQuery,
  withSiteUrl,
  stripLocalePrefix,
} from "../utils/route-paths.ts";

test("locale-prefixed route helpers build localized word and browse paths", () => {
  assert.equal(buildWordRoutePath("係"), "/word/%E4%BF%82");
  assert.equal(
    applyLocalePrefix(buildWordRoutePath("係"), "/zh-Hans"),
    "/zh-Hans/word/%E4%BF%82",
  );

  assert.equal(buildBrowseRoutePath("hk-cantowords"), "/browse/hk-cantowords");
  assert.equal(
    applyLocalePrefix(buildBrowseRoutePath("hk-cantowords"), "/yue-Hans"),
    "/yue-Hans/browse/hk-cantowords",
  );
  assert.equal(stripLocalePrefix("/zh-Hant/word/%E4%BF%82"), "/word/%E4%BF%82");
  assert.equal(
    buildSeoRoutePath(
      "/yue-Hans/browse",
      { page: "2", size: "100", sort: "headword" },
      "yue-Hans",
    ),
    "/yue-Hans/browse?page=2&size=100&sort=headword",
  );
  assert.equal(
    buildSeoRoutePath(
      "/word/%E4%BF%82",
      { jp: "hai6", source: "gz-dict" },
      "zh-Hans",
    ),
    "/zh-Hans/word/%E4%BF%82",
  );
  assert.equal(
    buildSeoRoutePath("/word/%E4%BF%82", { jp: "hai6" }, "en"),
    "/en/word/%E4%BF%82",
  );
});

test("search route query can explicitly stay on the search results page", () => {
  assert.deepEqual(buildSearchRouteQuery("揾老襯", false), {
    q: "揾老襯",
  });
  assert.deepEqual(
    buildSearchRouteQuery("揾老襯", false, { showResults: true }),
    {
      q: "揾老襯",
      show: "results",
    },
  );
  assert.equal(isSearchResultsViewQuery({ show: "results" }), true);
  assert.equal(isSearchResultsViewQuery({ show: ["results"] }), true);
  assert.equal(isSearchResultsViewQuery({ q: "揾老襯" }), false);
});

test("search route state serializes and parses filters, sort, view, and results view", () => {
  const query = buildSearchRouteQuery("女", true, {
    showResults: true,
    dict: "粵典",
    dialect: "HK",
    type: "word",
    sort: "dictionary",
    view: "list",
  });

  assert.deepEqual(query, {
    q: "女",
    reverse: "1",
    show: "results",
    dict: "粵典",
    dialect: "HK",
    type: "word",
    sort: "dictionary",
    view: "list",
  });
  assert.deepEqual(parseSearchRouteQuery(query), {
    query: "女",
    reverse: true,
    showResults: true,
    dict: "粵典",
    dialect: "HK",
    type: "word",
    sort: "dictionary",
    view: "list",
  });
  assert.deepEqual(
    buildSearchRouteQuery("女", false, {
      sort: "relevance",
      view: "card",
      type: "invalid",
    }),
    { q: "女" },
  );
});

test("search origin state round-trips with safe count and restores search URL", () => {
  const originQuery = buildSearchOriginRouteQuery({
    query: "阿SIR",
    reverse: true,
    dict: "粵典",
    dialect: "HK",
    type: "word",
    sort: "headword",
    view: "list",
    resultCount: "277+",
  });

  assert.deepEqual(originQuery, {
    from: "search",
    search_q: "阿SIR",
    search_reverse: "1",
    search_dict: "粵典",
    search_dialect: "HK",
    search_type: "word",
    search_sort: "headword",
    search_view: "list",
    search_count: "277+",
  });
  const parsed = parseSearchOriginRouteQuery(originQuery);
  assert.deepEqual(parsed, {
    query: "阿SIR",
    reverse: true,
    showResults: true,
    dict: "粵典",
    dialect: "HK",
    type: "word",
    sort: "headword",
    view: "list",
    resultCount: "277+",
  });
  assert.deepEqual(buildSearchRouteQueryFromOrigin(parsed), {
    q: "阿SIR",
    reverse: "1",
    show: "results",
    dict: "粵典",
    dialect: "HK",
    type: "word",
    sort: "headword",
    view: "list",
  });
});

test("search origin parsing ignores invalid counts and canonical redirect preserves allowlisted query", () => {
  assert.deepEqual(
    parseSearchOriginRouteQuery({
      from: "search",
      search_q: "係",
      search_count: "javascript:alert(1)",
      search_type: "invalid",
      search_sort: "bad",
      search_view: "bad",
    }),
    {
      query: "係",
      reverse: false,
      showResults: true,
      dict: undefined,
      dialect: undefined,
      type: undefined,
      sort: undefined,
      view: undefined,
      resultCount: undefined,
    },
  );
  assert.deepEqual(
    preserveWordRouteQuery({
      from: "search",
      search_q: "係",
      search_count: "3",
      search_sort: "dictionary",
      jp: "hai6",
      returnUrl: "https://evil.example/",
    }),
    {
      jp: "hai6",
      from: "search",
      search_q: "係",
      search_sort: "dictionary",
      search_count: "3",
    },
  );
  assert.equal(parseSearchOriginRouteQuery({ from: "search" }), null);
});

test("search exact redirect path matching accepts trailing slash and locale prefixes", () => {
  assert.equal(isSearchRoutePath("/search"), true);
  assert.equal(isSearchRoutePath("/search/"), true);
  assert.equal(isSearchRoutePath("/zh-Hant/search"), true);
  assert.equal(isSearchRoutePath("/zh-Hant/search/"), true);
  assert.equal(isSearchRoutePath("/search/results"), false);
  assert.equal(isSearchRoutePath("/word/search"), false);
});

test("word sitemap XML emits one canonical entry with alternates and x-default", () => {
  const xml = buildSitemapUrlEntryXml(
    "/word/%E4%BF%82",
    "https://jyutjyu.com",
    "2026-03-23T00:00:00.000Z",
  );

  assert.equal((xml.match(/<loc>/g) || []).length, 1);
  assert.match(xml, /<loc>https:\/\/jyutjyu\.com\/word\/%E4%BF%82<\/loc>/);
  assert.match(xml, /hreflang="yue-Hant"/);
  assert.match(xml, /hreflang="yue-Hans"/);
  assert.match(xml, /hreflang="zh-Hant"/);
  assert.match(xml, /hreflang="zh-Hans"/);
  assert.match(xml, /hreflang="en"/);
  assert.match(
    xml,
    /hreflang="x-default" href="https:\/\/jyutjyu\.com\/word\/%E4%BF%82"/,
  );

  const localizedXml = buildSitemapUrlEntryXml(
    "/zh-Hans/word/%E4%BF%82",
    "https://jyutjyu.com",
    "2026-03-23T00:00:00.000Z",
  );
  assert.match(
    localizedXml,
    /<loc>https:\/\/jyutjyu\.com\/word\/%E4%BF%82<\/loc>/,
  );
  assert.doesNotMatch(localizedXml, /\/zh-Hans\/zh-Hans\/word/);
});

test("SEO alternate links keep browse pagination but drop word-page source params", () => {
  const browseLinks = buildSeoAlternateLinkDefinitions(
    "/browse",
    "https://jyutjyu.com",
    {
      page: "2",
      size: "100",
      sort: "headword",
      source: "ignored",
    },
  );
  const wordLinks = buildSeoAlternateLinkDefinitions(
    "/word/%E4%BF%82",
    "https://jyutjyu.com",
    {
      jp: "hai6",
      source: "gz-dict",
    },
  );

  assert.equal(
    browseLinks.find((entry) => entry.hreflang === "yue-Hans")?.href,
    "https://jyutjyu.com/yue-Hans/browse?page=2&size=100&sort=headword",
  );
  assert.equal(
    wordLinks.find((entry) => entry.hreflang === "zh-Hans")?.href,
    "https://jyutjyu.com/zh-Hans/word/%E4%BF%82",
  );
  assert.equal(
    wordLinks.find((entry) => entry.hreflang === "x-default")?.href,
    "https://jyutjyu.com/word/%E4%BF%82",
  );
  assert.equal(
    wordLinks.find((entry) => entry.hreflang === "en")?.href,
    "https://jyutjyu.com/en/word/%E4%BF%82",
  );
});

test("SEO alternate links include generic languages and strip search-only queries", () => {
  const searchLinks = buildSeoAlternateLinkDefinitions(
    "/search",
    "https://jyutjyu.com",
    { q: "茶仔", reverse: "1" },
  );

  assert.equal(searchLinks.length, 8);
  assert.deepEqual(
    searchLinks.map((entry) => entry.hreflang),
    [
      "yue",
      "yue-Hant",
      "yue-Hans",
      "zh",
      "zh-Hant",
      "zh-Hans",
      "en",
      "x-default",
    ],
  );
  assert.deepEqual(
    searchLinks.map((entry) => entry.href),
    [
      "https://jyutjyu.com/search",
      "https://jyutjyu.com/search",
      "https://jyutjyu.com/yue-Hans/search",
      "https://jyutjyu.com/zh-Hant/search",
      "https://jyutjyu.com/zh-Hant/search",
      "https://jyutjyu.com/zh-Hans/search",
      "https://jyutjyu.com/en/search",
      "https://jyutjyu.com/search",
    ],
  );
});

test("SEO route paths preserve browse scope pagination across locale rewrites", () => {
  assert.equal(stripLocalePrefix("/yue-Hans"), "/");
  assert.equal(
    stripLocalePrefix("/zh-Hans/browse/hk-cantowords"),
    "/browse/hk-cantowords",
  );
  assert.equal(
    buildSeoRoutePath(
      "/zh-Hans/browse/hk-cantowords",
      { page: "3", size: "50", sort: "headword", source: "ignored" },
      "zh-Hant",
    ),
    "/zh-Hant/browse/hk-cantowords?page=3&size=50&sort=headword",
  );
  assert.equal(
    buildSeoRoutePath("/search", { q: "茶仔", reverse: "1" }, "zh-Hans"),
    "/zh-Hans/search",
  );
});

test("site URLs normalize trailing slashes and sitemap entries emit full alternate sets", () => {
  const xml = buildSitemapUrlEntryXml(
    "/browse/hk-cantowords?page=3",
    "https://jyutjyu.com/",
    "2026-03-23T00:00:00.000Z",
  );

  assert.equal(
    withSiteUrl("https://jyutjyu.com/", "/zh-Hans"),
    "https://jyutjyu.com/zh-Hans",
  );
  assert.equal((xml.match(/<loc>/g) || []).length, 5);
  assert.equal((xml.match(/<xhtml:link /g) || []).length, 30);
  assert.match(
    xml,
    /hreflang="x-default" href="https:\/\/jyutjyu\.com\/browse\/hk-cantowords\?page=3"/,
  );
});

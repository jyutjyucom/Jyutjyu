import assert from "node:assert/strict";
import test from "node:test";

import {
  applyLocalePrefix,
  buildSearchRouteQuery,
  buildSeoAlternateLinkDefinitions,
  buildSeoRoutePath,
  buildBrowseRoutePath,
  buildSitemapUrlEntryXml,
  buildWordRoutePath,
  isSearchResultsViewQuery,
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
  assert.deepEqual(buildSearchRouteQuery("揾老襯", false, { showResults: true }), {
    q: "揾老襯",
    show: "results",
  });
  assert.equal(isSearchResultsViewQuery({ show: "results" }), true);
  assert.equal(isSearchResultsViewQuery({ show: ["results"] }), true);
  assert.equal(isSearchResultsViewQuery({ q: "揾老襯" }), false);
});

test("sitemap XML emits per-locale entries with alternates and x-default", () => {
  const xml = buildSitemapUrlEntryXml(
    "/word/%E4%BF%82",
    "https://jyutjyu.com",
    "2026-03-23T00:00:00.000Z",
  );

  assert.equal((xml.match(/<loc>/g) || []).length, 5);
  assert.match(xml, /hreflang="yue-Hant"/);
  assert.match(xml, /hreflang="yue-Hans"/);
  assert.match(xml, /hreflang="zh-Hant"/);
  assert.match(xml, /hreflang="zh-Hans"/);
  assert.match(xml, /hreflang="en"/);
  assert.match(
    xml,
    /hreflang="x-default" href="https:\/\/jyutjyu\.com\/word\/%E4%BF%82"/,
  );
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

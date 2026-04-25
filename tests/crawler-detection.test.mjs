import assert from "node:assert/strict";
import test from "node:test";

import { isLikelyCrawlerUserAgent } from "../utils/crawler-detection.ts";

test("detects major search crawler user agents", () => {
  assert.equal(
    isLikelyCrawlerUserAgent(
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    ),
    true,
  );
  assert.equal(
    isLikelyCrawlerUserAgent("Google-InspectionTool/1.0"),
    true,
  );
  assert.equal(
    isLikelyCrawlerUserAgent(
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    ),
    true,
  );
});

test("does not classify broad crawler or social-preview user agents as search crawlers", () => {
  assert.equal(isLikelyCrawlerUserAgent("ExampleCrawler/1.0"), false);
  assert.equal(
    isLikelyCrawlerUserAgent(
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    ),
    false,
  );
  assert.equal(isLikelyCrawlerUserAgent("Slackbot-LinkExpanding 1.0"), false);
  assert.equal(isLikelyCrawlerUserAgent("GPTBot/1.0"), false);
});

test("does not classify ordinary browser user agents as crawlers", () => {
  assert.equal(
    isLikelyCrawlerUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    ),
    false,
  );
  assert.equal(isLikelyCrawlerUserAgent(""), false);
  assert.equal(isLikelyCrawlerUserAgent(null), false);
});

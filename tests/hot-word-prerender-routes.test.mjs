import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHotWordRoutes,
  normalizeWordPathToHeadword,
  scoreHotHeadwordsFromEntries,
} from "../scripts/build-hot-word-prerender-routes.js";

const CANONICAL_HEADWORDS = [
  "火水",
  "爆炸",
  "一言以蔽之",
  "人話",
  "消毒",
  "茶",
  "馬死落地行",
  "𧨾",
];

test("word paths normalize localized HTML and payload requests", () => {
  assert.equal(
    normalizeWordPathToHeadword("/zh-Hans/word/%E7%81%AB%E6%B0%B4"),
    "火水",
  );
  assert.equal(
    normalizeWordPathToHeadword(
      "https://jyutjyu.com/en/word/%F0%A7%A8%BE/_payload.json?x=1",
    ),
    "𧨾",
  );
  assert.equal(normalizeWordPathToHeadword("/search?q=火水"), "");
});

test("hot entries are scored and canonicalized before route selection", () => {
  const scores = scoreHotHeadwordsFromEntries(
    [
      { path: "/word/%E7%81%AB%E6%B0%B4", count: 2 },
      {
        path: "/en/word/%E7%81%AB%E6%B0%B4/_payload.json",
        count: 1,
        failures: 1,
      },
      { path: "/word/%E4%B8%8D%E5%9C%A8%E8%A1%A8", count: 100 },
    ],
    CANONICAL_HEADWORDS,
  );

  assert.equal(scores.get("火水"), 13);
  assert.equal(scores.has("不在表"), false);
});

test("hot word prerender routes are capped, encoded, and deterministic", () => {
  const routes = buildHotWordRoutes({
    canonicalHeadwords: CANONICAL_HEADWORDS,
    hotEntries: [
      { path: "/word/%E9%A6%AC%E6%AD%BB%E8%90%BD%E5%9C%B0%E8%A1%8C", count: 2 },
      { path: "/word/%E7%81%AB%E6%B0%B4", count: 10 },
    ],
    limit: 4,
  });

  assert.deepEqual(routes, [
    "/word/%E7%81%AB%E6%B0%B4",
    "/word/%E9%A6%AC%E6%AD%BB%E8%90%BD%E5%9C%B0%E8%A1%8C",
    "/word/%E7%88%86%E7%82%B8",
    "/word/%E4%BA%BA%E8%A9%B1",
  ]);
});

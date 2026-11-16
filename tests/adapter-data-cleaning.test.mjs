import assert from "node:assert/strict";
import test from "node:test";

import {
  findSenseMarkerPositions,
  parseExamples,
  splitOutsideQuotes,
} from "../scripts/utils/text-processor.js";
import { transformRow as transformGzModernRow } from "../scripts/adapters/gz-modern.js";
import { transformRow as transformGzPracticalRow } from "../scripts/adapters/gz-practical-classified.js";
import { transformRow as transformKpRow } from "../scripts/adapters/kp-dialect.js";
import { transformRow as transformTsRow } from "../scripts/adapters/ts-english-dict.js";

test("交叉引用里的圈号不会被当成义项编号", () => {
  const senses = parseExamples(
    "①说数字时用来代表“1”：呼～喝六丨九～～。②兄弟姐妹中排行最末的。见“㩄①”（481 页）。",
  );

  assert.equal(senses.length, 2);
  assert.match(senses[0].definition, /说数字时用来代表“1”/);
  assert.match(senses[1].definition, /兄弟姐妹中排行最末的/);

  const joined = senses
    .map((sense) => {
      const examples = (sense.examples || [])
        .map((example) => example.text || "")
        .join(" ");
      return sense.definition + " " + examples;
    })
    .join(" ");
  assert.match(joined, /㩄①/);
});

test("只有引文一个义项时不会切出空义项", () => {
  const senses = parseExamples("參見“飲茶②”。");

  assert.equal(senses.length, 1);
  assert.equal(senses[0].definition, "參見“飲茶②”");
});

test("引号内的例句分隔符不会被切开", () => {
  const senses = parseExamples(
    "馬櫻丹。北方別稱“│五色梅”、“五色繡球”、”七變花”。馬鞭草科。",
  );

  assert.equal(senses.length, 1);
  assert.match(senses[0].definition, /五色梅/);
  assert.match(senses[0].definition, /七變花/);
});

test("未闭合引号后面的义项编号仍能识别", () => {
  const senses = parseExamples("懸雍垂，俗稱“小舌。②咽喉部位。");

  assert.equal(senses.length, 2);
  assert.equal(senses[0].definition, "懸雍垂，俗稱“小舌");
  assert.equal(senses[1].definition, "咽喉部位");
});

test("第一个编号前的标签归入第一个义项", () => {
  const senses = parseExamples("【喻】【謔】①病態委靡的人②垂頭喪氣的人");

  assert.equal(senses.length, 2);
  assert.equal(senses[0].definition, "【喻】【謔】病態委靡的人");
  assert.equal(senses[1].definition, "垂頭喪氣的人");
});

test("findSenseMarkerPositions 跳过引号内的编号", () => {
  const text = "同“白鼻②”。另见①";
  const positions = findSenseMarkerPositions(text, /[①②]/g);

  assert.deepEqual(positions, [text.length - 1]);
});

test("splitOutsideQuotes 保留引号内的分隔符", () => {
  assert.deepEqual(splitOutsideQuotes("甲“乙│丙”丁│戊", /│/), [
    "甲“乙│丙”丁",
    "戊",
  ]);
});

test("gz-modern：幺的交叉引用义项保持完整", () => {
  const entry = transformGzModernRow({
    index: 22357,
    entry_type: "字头",
    headword: "幺",
    pronunciation: "yiu1",
    jyutping: "jiu1",
    verification_status: "✓ 匹配",
    definition:
      "①说数字时用来代表“1”：呼～喝六丨九～～。②兄弟姐妹中排行最末的。见“㩄①”（481 页）。",
  });

  assert.equal(entry.senses.length, 2);
  assert.match(entry.senses[1].definition, /㩄①/);
});

test("gz-practical：飲早茶的释义不会被切成单独的引号", () => {
  const entry = transformGzPracticalRow({
    index: 4478,
    words: "飲早茶",
    jyutping: "jam2 zou2 caa4",
    meanings: "參見“飲茶②”。",
  });

  assert.equal(entry.senses.length, 1);
  assert.equal(entry.senses[0].definition, "參見“飲茶②”");
});

test("gz-practical：趷统一读 gat6", () => {
  const entry = transformGzPracticalRow({
    index: 4027,
    words: "*趷",
    jyutping: "gat6",
    meanings:
      "①跛行。佢尋日屈親衹腳，而家行路都要～下～下。②踮（起腳尖）。～高腳睇真啲。",
  });

  assert.deepEqual(entry.phonetic.jyutping, ["gat6"]);
  assert.equal(entry.senses.length, 2);
});

test("kp：词头不再显示 ] } 等读音标记", () => {
  const entry = transformKpRow(
    {
      index: 3098,
      kp_text: "裤裆）",
      ipa: "fu21 nɔŋ32",
      jyutping: "fu5 nong6",
      mandarin: "裤裆",
    },
    0,
  );

  assert.equal(entry.headword.display, "裤裆");
  assert.equal(entry.headword.normalized, "裤裆");
});

test("kp：词:~例句 只保留冒号前的词头", () => {
  const entry = transformKpRow(
    {
      index: 1380,
      kp_text: "诶:~,你来",
      ipa: "e55",
      jyutping: "e2",
      mandarin: ": e55 nei33 lɔi11 诶:~你来",
    },
    0,
  );

  assert.equal(entry.headword.display, "诶");
  assert.equal(entry.headword.normalized, "诶");
});

test("ts：跨行残片的词头取回真正的字", () => {
  const entry = transformTsRow(
    {
      RecordType: "HEAD",
      繁: "(cf 樔",
      简: "",
      Jyutping: "caau1",
      英译与词句: "a small net used for fishing.⁸)",
    },
    2,
  );

  assert.equal(entry.headword.display, "樔");
});

test("ts：去掉字形注记与落单的尖括号", () => {
  const withIds = transformTsRow(
    {
      RecordType: "HEAD",
      繁: "磍𥓁 ❄{⿰石刹}",
      简: "",
      Jyutping: "aa1 ciek2",
      英译与词句: "rugged, uneven ground.",
    },
    2,
  );
  assert.equal(withIds.headword.display, "磍𥓁");

  const withBracket = transformTsRow(
    {
      RecordType: "HEAD",
      繁: "又>",
      简: "",
      Jyutping: "bi.1",
      英译与词句: "(See 嘑 fü).",
    },
    3,
  );
  assert.equal(withBracket.headword.display, "又");
});

test("ts：成对的括号不会被误删", () => {
  const entry = transformTsRow(
    {
      RecordType: "HEAD",
      繁: "扁豆 (稨豆,萹豆,藊豆)",
      简: "",
      Jyutping: "ben2 ieu6",
      英译与词句: "hyacinth bean",
    },
    4,
  );

  assert.equal(entry.headword.display, "扁豆 (稨豆,萹豆,藊豆)");
});

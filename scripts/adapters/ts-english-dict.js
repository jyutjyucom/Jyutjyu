/**
 * 台山話英文字典 (Taishan English Dictionary) 数据适配器
 *
 * 原始 CSV 格式:
 * RecordType,DialectTag,号,部,画,繁,简,GPS,Jyutping,汉拼,英译与词句,gps#,Nos.
 *
 * 特点:
 * - 网络词典，台山话→英语，公开于 https://www.chinfamilytree.com/hed/index.htm
 * - RecordType: HEAD（字头/词头）或 PHRASE（词组/例句）
 * - 繁/简: 繁体/简体词头，至少其一有值
 * - GPS: 台山话罗马字（原书注音）
 * - Jyutping: 粤拼，部分带 * 为转换好的变调符号，须保留
 * - 英译与词句: 英文释义或例句翻译
 * - DialectTag: 如「台」表示台山特有
 *
 * 数据来源: 2024. 台山話英文字典. https://www.chinfamilytree.com/hed/index.htm
 * Copyright © 2005-2024 Gene M. Chin. 网络词典，直接公开在网上，协议不明。
 */

import { createHash } from "node:crypto";

import { generateKeywords, cleanHeadword } from "../utils/text-processor.js";

/**
 * 词典元数据
 */
export const DICTIONARY_INFO = {
  id: "ts-english-dict",
  enable_chunking: true,
  chunk_output_dir: "ts-english-dict",
  name: {
    "zh-Hans": "台山话英文字典",
    "zh-Hant": "台山話英文字典",
    "yue-Hans": "台山话英文字典",
    "yue-Hant": "台山話英文字典",
  },
  dialect: {
    name: "台山",
    region_code: "TS",
  },
  source_book: "台山話英文字典",
  author: {
    "zh-Hans": "Gene M. Chin",
    "zh-Hant": "Gene M. Chin",
    "yue-Hans": "Gene M. Chin",
    "yue-Hant": "Gene M. Chin",
  },
  publisher: {
    "zh-Hans": "网络词典",
    "zh-Hant": "網絡詞典",
    "yue-Hans": "网络词典",
    "yue-Hant": "網絡詞典",
  },
  year: 2024,
  version: new Date().toISOString().slice(0, 10),
  description: {
    "zh-Hans":
      "台山话—英语网络词典，收录字头、词组及例句，提供台山话罗马字与汉语拼音，英文释义。",
    "zh-Hant":
      "台山話—英語網絡詞典，收錄字頭、詞組及例句，提供台山話羅馬字與漢語拼音，英文釋義。",
    "yue-Hans":
      "台山话—英语网络词典，收录字头、词组同例句，提供台山话罗马字同汉语拼音，英文释义。",
    "yue-Hant":
      "台山話—英語網絡詞典，收錄字頭、詞組同例句，提供台山話羅馬字同漢語拼音，英文釋義。",
  },
  source: "https://www.chinfamilytree.com/hed/index.htm",
  license: {
    "zh-Hans": "网络公开，协议不明",
    "zh-Hant": "網絡公開，協議不明",
    "yue-Hans": "网络公开，协议不明",
    "yue-Hant": "網絡公開，協議不明",
  },
  usage_restriction: {
    "zh-Hans":
      "数据来源于网络公开词典，版权 © 2005-2024 Gene M. Chin。协议不明，使用与再分发时请尊重原作者并注明出处。",
    "zh-Hant":
      "數據來源於網絡公開詞典，版權 © 2005-2024 Gene M. Chin。協議不明，使用與再分發時請尊重原作者並註明出處。",
    "yue-Hans":
      "数据来源于网络公开词典，版权 © 2005-2024 Gene M. Chin。协议不明，使用同再分发时请尊重原作者并注明出处。",
    "yue-Hant":
      "數據來源於網絡公開詞典，版權 © 2005-2024 Gene M. Chin。協議不明，使用同再分發時請尊重原作者並註明出處。",
  },
  attribution: {
    "zh-Hans":
      "台山話英文字典 (2024)，Gene M. Chin，https://www.chinfamilytree.com/hed/index.htm",
    "zh-Hant":
      "台山話英文字典 (2024)，Gene M. Chin，https://www.chinfamilytree.com/hed/index.htm",
    "yue-Hans":
      "台山話英文字典 (2024)，Gene M. Chin，https://www.chinfamilytree.com/hed/index.htm",
    "yue-Hant":
      "台山話英文字典 (2024)，Gene M. Chin，https://www.chinfamilytree.com/hed/index.htm",
  },
  cover: "ts-english-dict.png",
};

/**
 * 必填字段：词头在 transformRow 中校验（繁或简至少其一）；释义可为空
 */
export const REQUIRED_FIELDS = [];

/**
 * 判断字符串是否像粤拼（含拉丁字母与声调数字 1–6，可有 *），而非中文等
 * 若整段为 CJK 或主要为 CJK，则视为非粤拼
 */
function looksLikeJyutping(str) {
  if (!str || !str.trim()) return false;
  const t = str.trim();
  const cjkCount = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
  const hasLatinOrDigit = /[a-zA-Z1-6*]/.test(t);
  return hasLatinOrDigit && cjkCount === 0;
}

/**
 * 解析 Jyutping 列：支持 "aa2 baa1"、"aa2 len4 or aa2 lieng5"、"aa2 gaau5*"（* 为变调符号，保留）
 * 若该列误填为中文（如部分 CSV 行），则忽略，不加入 jyutping 数组
 * @param {string} jyutpingStr
 * @returns {string[]}
 */
function parseJyutping(jyutpingStr) {
  if (!jyutpingStr || !jyutpingStr.trim()) return [];
  const s = jyutpingStr.trim();
  if (!looksLikeJyutping(s)) return [];
  const parts = s
    .split(/\s+or\s+|\s*[,;]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out = [];
  for (const p of parts) {
    if (p && looksLikeJyutping(p)) out.push(p);
  }
  return [...new Set(out)];
}

/**
 * 判断词条类型
 * @param {string} recordType - HEAD | PHRASE
 * @param {string} headword - 词头
 * @returns {string} 'character' | 'word' | 'phrase'
 */
function guessEntryType(recordType, headword) {
  if (!headword) return "word";
  const chineseChars = headword.match(/[\u4e00-\u9fa5]/g) || [];
  const length = chineseChars.length;
  if (length === 0) return "word";
  if (recordType === "PHRASE" || length > 4) return "phrase";
  if (length === 1) return "character";
  return "word";
}

/**
 * 清理词头
 *
 * 原书是网页版，导出成 CSV 后词头列混入了几类排版痕迹：
 * - 字形注记：`磍𥓑 ❄{⿰石刹}`、`𨁶❄`
 * - 标签：`<粵> 頕天望地`、`<文读>`
 * - 跨行残片：`(cf 樔`、`(variants: 螣,𧎢,𧎬`、`(same as 爸 bā`
 * - 落单的收尾括号：`[頂呱呱])`、`扁鱼[扁魚)`
 *
 * @param {string} raw - CSV 中的繁体/简体词头
 * @returns {string} 清理后的词头
 */
function isBalancedPair(text, open, close) {
  let depth = 0;
  for (const char of text) {
    if (char === open) depth++;
    else if (char === close) {
      if (depth === 0) return false;
      depth--;
    }
  }
  return depth === 0;
}

const TS_OPEN_TO_CLOSE = { "(": ")", "（": "）", "[": "]", "［": "］", "{": "}", "<": ">" };
const TS_CLOSE_TO_OPEN = { ")": "(", "）": "（", "]": "[", "］": "］", "}": "{", ">": "<" };

/**
 * 判断一行是不是原书排版残片（不是真词条）：
 * - 又音注记：词头被误读成「又」/「又>」
 * - 跨行残片：以左括号开头，如 "(cf 樔"、"(variants: …"
 * - 纯标签行：<文读>、<old> 等
 *
 * 这些在 pipeline 侧已修复；adapter 保留同样的过滤，避免旧 CSV 再混进来。
 */
function isFragmentRow(raw) {
  const text = (raw || "").trim();
  if (!text) return true;
  if (/^[（(]/.test(text)) return true;
  if (/^又>?$/.test(text)) return true;
  if (!text.replace(/<[^<>]{1,12}>/g, "").trim()) return true;
  return false;
}

function cleanTsHeadword(raw) {
  if (!raw) return "";

  let text = raw.trim();

  // 字形注记 ❄{⿰石刹} 或单个 ❄
  text = text.replace(/\s*❄\s*\{[^}]*\}/g, "").replace(/❄/g, "");
  // <粵>、<old>、<文读> 等标签
  text = text.replace(/<[^<>]{0,12}>/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  // 跨行残片：取残片里的第一个汉字串（如 "(cf 樔" → "樔"）
  if (/^[（(]/.test(text)) {
    const fragment = text.replace(/^[（(]\s*/, "");
    if (
      /^(?:cf\b|variants?:|old variant|same as\b|see\b|also\b|[a-z]\))/i.test(
        fragment,
      )
    ) {
      const cjk = fragment.match(/[\u3400-\u9fff\u{20000}-\u{2ffff}]+/u);
      if (cjk) {
        text = cjk[0];
      }
    } else {
      text = fragment;
    }
  }

  // 只去掉「不成对」的收尾/开头括号，避免误伤 "扁豆 (稨豆,萹豆,藊豆)" 这类正常写法
  for (let guard = 0; guard < 4; guard++) {
    const last = text[text.length - 1];
    const lastOpen = TS_CLOSE_TO_OPEN[last];
    if (lastOpen && !isBalancedPair(text, lastOpen, last)) {
      text = text.slice(0, -1).trim();
      continue;
    }
    break;
  }
  for (let guard = 0; guard < 4; guard++) {
    const first = text[0];
    const firstClose = TS_OPEN_TO_CLOSE[first];
    if (firstClose && !isBalancedPair(text, first, firstClose)) {
      text = text.slice(1).trim();
      continue;
    }
    break;
  }

  return text.trim();
}

const shortHash = (value, length = 12) =>
  createHash("sha1").update(String(value), "utf8").digest("hex").slice(0, length);

/**
 * 用原书字段拼出稳定键（与行序无关）。
 * 行号会随插入/删除漂移，不能作为 entry_id。
 */
function sourceKeyOf(row) {
  return [
    row["RecordType"],
    row["号"],
    row["部"],
    row["画"],
    row["繁"],
    row["简"],
    row["GPS"],
    row["汉拼"],
    row["Nos."],
  ]
    .map((value) => String(value ?? "").trim())
    .join("|");
}

/**
 * 转换单行 CSV 为标准 DictionaryEntry
 * @param {Object} row - CSV 行
 * @param {number} rowIndex - 行号（仅作 source_id 参考）
 * @returns {Object|null} DictionaryEntry 或 null（跳过）
 */
export function transformRow(row, rowIndex) {
  const recordType = (row["RecordType"] || "").trim() || "PHRASE";
  const trad = (row["繁"] ?? "").trim();
  const simp = (row["简"] ?? "").trim();
  const definition = (row["英译与词句"] ?? "").trim();

  // 词头：优先繁体，否则简体
  const headwordRaw = trad || simp;
  if (!headwordRaw) return null;

  // 原书里的又音注记、变体残片、纯标签行不是词条
  if (isFragmentRow(headwordRaw)) return null;

  // 去掉排版痕迹后再生成词头；清理结果为空时退回原文，避免丢条目
  const headwordDisplay = cleanTsHeadword(headwordRaw) || headwordRaw;
  const headwordInfo = cleanHeadword(headwordDisplay);
  const jyutpingArray = parseJyutping(row["Jyutping"] || "");
  let gps = (row["GPS"] || "").trim();
  if (gps && (gps.match(/[\u4e00-\u9fa5]/) || !/[a-zA-Z]/.test(gps))) {
    gps = "";
  }

  const entry = {
    // entry_id 由原书字段派生，重导/重分片都不会变
    id: `${DICTIONARY_INFO.id}_${shortHash(sourceKeyOf(row))}`,
    source_book: DICTIONARY_INFO.source_book,
    source_id: String(rowIndex),

    dialect: DICTIONARY_INFO.dialect,

    headword: {
      display: headwordDisplay,
      search: headwordInfo.normalized,
      normalized: headwordInfo.normalized,
      is_placeholder: headwordInfo.isPlaceholder || false,
    },

    phonetic: {
      original: gps || jyutpingArray[0] || "",
      jyutping: jyutpingArray,
    },

    entry_type: guessEntryType(recordType, headwordInfo.normalized),

    senses: [
      {
        definition: definition || "",
        examples: [],
      },
    ],

    meta: {
      record_type: recordType,
      dialect_tag: (row["DialectTag"] || "").trim() || null,
      radical_no: (row["号"] ?? "").toString().trim() || null,
      radical_bu: (row["部"] ?? "").toString().trim() || null,
      stroke_count: (row["画"] ?? "").toString().trim() || null,
      mandarin_pinyin: (row["汉拼"] || "").trim() || null,
      gps_ref: (row["gps#"] || "").trim() || null,
      nos: (row["Nos."] ?? "").toString().trim() || null,
    },

    created_at: new Date().toISOString(),
  };

  entry.keywords = generateKeywords(entry);
  return entry;
}

/**
 * 批量转换
 * @param {Array<Object>} rows - CSV 行数组
 * @returns {{ entries: Object[], errors: Object[] }}
 */
export function transformAll(rows) {
  const entries = [];
  const errors = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    try {
      // 行号从 2 起（表头为第 1 行）
      const entry = transformRow(row, index + 2);
      if (entry) {
        entries.push(entry);
      } else {
        skipped++;
      }
    } catch (err) {
      errors.push({
        row: index + 2,
        error: err.message,
        data: row,
      });
    }
  });

  if (skipped > 0) {
    console.log(`ℹ️  跳过 ${skipped} 行（无词头：繁/简均为空）`);
  }

  // 同词多义（如 再說 两个义项）会落到同一个源键上；
  // 用释义哈希补后缀，避免 entry_id 冲突。
  const groups = new Map();
  for (const entry of entries) {
    if (!groups.has(entry.id)) groups.set(entry.id, []);
    groups.get(entry.id).push(entry);
  }
  for (const [id, group] of groups) {
    if (group.length < 2) continue;
    const used = new Set();
    for (const entry of group) {
      const gloss = entry.senses?.[0]?.definition || "";
      let candidate = `${id}-${shortHash(gloss, 6)}`;
      let suffix = 2;
      while (used.has(candidate)) {
        candidate = `${id}-${shortHash(gloss, 6)}-${suffix}`;
        suffix += 1;
      }
      used.add(candidate);
      entry.id = candidate;
    }
  }

  return { entries, errors };
}

/**
 * 不聚合，每行独立词条
 */
export function aggregateEntries(entries) {
  return entries;
}

/**
 * 后处理：分片大型词典并删除完整文件，避免静态部署资源超限
 * @param {Array<Object>} entries
 * @param {string} outputPath
 */
export async function postProcess(entries, outputPath) {
  const CHUNK_THRESHOLD = 10000;

  if (entries.length < CHUNK_THRESHOLD) {
    console.log(
      `ℹ️  词条数量 (${entries.length}) 未超过阈值 (${CHUNK_THRESHOLD})，跳过分片`,
    );
    return;
  }

  const fs = await import("fs");
  const path = await import("path");
  const { splitDictionary } = await import("../split-dictionary.cjs");

  const outputDir = path.default.join(
    "public",
    "dictionaries",
    DICTIONARY_INFO.chunk_output_dir,
  );
  const fileSize = (fs.default.statSync(outputPath).size / 1024 / 1024).toFixed(
    2,
  );

  console.log(`\n🔧 检测到大型词典，启用自动分片...`);
  console.log(`📊 词条总数: ${entries.length}`);
  console.log(`📄 完整文件大小: ${fileSize} MB`);
  console.log(`📁 分片输出目录: ${outputDir}`);

  await splitDictionary(outputPath, outputDir);

  console.log(`✅ 台山话英文字典数据分片完成！`);

  console.log(`\n🗑️  清理完整文件...`);
  fs.default.unlinkSync(outputPath);
  console.log(`✅ 已删除完整文件 (节省 ${fileSize} MB 磁盘空间)`);
}

export const FIELD_NOTES = {
  RecordType: "HEAD=字头/词头，PHRASE=词组/例句",
  DialectTag: "如「台」表示台山特有",
  繁: "繁体词头",
  简: "简体词头",
  GPS: "台山话罗马字（原书注音）",
  Jyutping: "粤拼，尾随 * 为变调符号，保留",
  汉拼: "普通话拼音",
  英译与词句: "英文释义或例句翻译",
  "gps#": "内部编号",
  "Nos.": "内部序号",
};

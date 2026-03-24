#!/usr/bin/env node
/**
 * 预处理脚本：将 HamZau_JyutPing Rime 词典转换为 CSV 格式
 *
 * 数据来源: https://github.com/LaiJoengzit/hamzau_jyutping
 * 许可证: GPL-3.0
 *
 * 输入格式：Rime 词典 YAML 格式
 *   - 前14行为元数据（YAML 头部）
 *   - 从第16行开始为实际数据：词头\t拼音\t权重（可选）
 *
 * 输出格式：CSV
 *   - index: 行号索引（从1开始）
 *   - entry_type: 词条类型（character/word/phrase）
 *   - headword: 词头
 *   - jyutping: 粤拼（空格分隔音节）
 *   - definition: 释义（默认为"未有內容 NO DATA"）
 *
 * 使用方法：
 *   node scripts/preprocess/hamzau-jyutping.js
 *   或
 *   node scripts/preprocess/hamzau-jyutping.js [input.yaml] [output.csv]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 默认路径
const DEFAULT_INPUT = path.join(
  __dirname,
  "../../data/raw/hamzau_jyutping.dict.yaml",
);
const DEFAULT_OUTPUT = path.join(
  __dirname,
  "../../data/processed/qz-jyutping.csv",
);

/**
 * 判断词条类型
 * @param {string} headword - 词头
 * @returns {string} 'character' | 'word' | 'phrase'
 */
function guessEntryType(headword) {
  if (!headword) return "character";

  // 使用 Array.from() 正确处理 Unicode 扩展字符（如 CJK 扩展字符）
  // 去除空格后计算字符数
  const cleaned = headword.replace(/\s+/g, "");
  const charArray = Array.from(cleaned);
  const charCount = charArray.length;

  if (charCount === 1) {
    return "character";
  } else if (charCount <= 4) {
    return "word";
  } else {
    return "phrase";
  }
}

/**
 * 清理词头（去除多余空格）
 * @param {string} headword - 原始词头
 * @returns {string} 清理后的词头
 */
function cleanHeadword(headword) {
  if (!headword) return "";
  return headword.trim();
}

/**
 * 验证和规范化粤拼
 * @param {string} jyutping - 原始粤拼
 * @returns {string} 规范化后的粤拼
 */
function normalizeJyutping(jyutping) {
  if (!jyutping) return "";

  // 去除多余空格，确保音节之间只有一个空格
  return jyutping.trim().replace(/\s+/g, " ");
}

/**
 * 解析 Rime 词典文件
 * @param {string} filePath - 输入文件路径
 * @returns {Array<Object>} 解析后的词条数组
 */
function parseRimeDict(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const entries = [];
  let dataStarted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 跳过空行
    if (!line) continue;

    // 检测数据开始（跳过 YAML 头部，以 `...` 结束）
    if (line === "...") {
      dataStarted = true;
      continue;
    }

    // 如果还没开始数据部分，跳过
    if (!dataStarted) continue;

    // 解析数据行：词头\t拼音\t权重（可选）
    const parts = line.split("\t");

    if (parts.length < 2) {
      // 跳过格式不正确的行
      console.warn(`⚠️  跳过格式不正确的行 ${i + 1}: ${line}`);
      continue;
    }

    const headword = cleanHeadword(parts[0]);
    const jyutping = normalizeJyutping(parts[1]);
    const weight = parts[2] ? parts[2].trim() : "";

    // 跳过空的词头或拼音
    if (!headword || !jyutping) {
      continue;
    }

    // 判断词条类型
    const entryType = guessEntryType(headword);

    entries.push({
      index: entries.length + 1, // 从1开始的索引
      entry_type: entryType,
      headword: headword,
      jyutping: jyutping,
      definition: "未有內容 NO DATA", // 默认释义
      weight: weight, // 保留权重信息（可选字段，不写入CSV）
    });
  }

  return entries;
}

/**
 * 转义 CSV 字段值
 * @param {string} value - 原始值
 * @returns {string} 转义后的值
 */
function escapeCSV(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  // 如果包含逗号、引号或换行符，需要用引号包裹
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    // 转义引号：将 " 替换为 ""
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * 将词条数组写入 CSV 文件
 * @param {Array<Object>} entries - 词条数组
 * @param {string} outputPath - 输出文件路径
 */
function writeCSV(entries, outputPath) {
  // CSV 表头
  const headers = ["index", "entry_type", "headword", "jyutping", "definition"];

  // 创建输出目录（如果不存在）
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 写入 CSV
  const lines = [];

  // 写入表头
  lines.push(headers.map(escapeCSV).join(","));

  // 写入数据行
  for (const entry of entries) {
    const row = headers.map((header) => escapeCSV(entry[header] || ""));
    lines.push(row.join(","));
  }

  // 写入文件
  fs.writeFileSync(outputPath, lines.join("\n"), "utf-8");

  console.log(`✅ CSV 文件已生成: ${outputPath}`);
  console.log(`   总词条数: ${entries.length}`);
}

/**
 * 主函数
 */
function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);
  const inputPath = args[0] || DEFAULT_INPUT;
  const outputPath = args[1] || DEFAULT_OUTPUT;

  console.log("📖 HamZau_JyutPing 词典预处理脚本");
  console.log(`   输入文件: ${inputPath}`);
  console.log(`   输出文件: ${outputPath}`);
  console.log("");

  // 检查输入文件是否存在
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ 错误: 输入文件不存在: ${inputPath}`);
    process.exit(1);
  }

  try {
    // 1. 解析 Rime 词典
    console.log("⏳ 解析 Rime 词典文件...");
    const entries = parseRimeDict(inputPath);
    console.log(`✅ 解析完成: ${entries.length} 个词条`);

    // 2. 统计信息
    const stats = {
      character: 0,
      word: 0,
      phrase: 0,
    };

    for (const entry of entries) {
      stats[entry.entry_type] = (stats[entry.entry_type] || 0) + 1;
    }

    console.log("");
    console.log("📊 词条类型统计:");
    console.log(`   单字 (character): ${stats.character}`);
    console.log(`   词语 (word): ${stats.word}`);
    console.log(`   短语 (phrase): ${stats.phrase}`);
    console.log("");

    // 3. 写入 CSV
    console.log("⏳ 生成 CSV 文件...");
    writeCSV(entries, outputPath);

    console.log("");
    console.log("✅ 预处理完成！");
  } catch (error) {
    console.error("❌ 错误:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行主函数
main();

export {
  parseRimeDict,
  writeCSV,
  guessEntryType,
  normalizeJyutping,
  cleanHeadword,
};

#!/usr/bin/env node

/**
 * 词典分片工具
 *
 * 将大型词典文件按拼音首字母分片，便于按需加载
 *
 * 用法:
 *   node scripts/split-dictionary.js <input-file> <output-dir>
 *
 * 示例:
 *   node scripts/split-dictionary.js public/dictionaries/wiktionary-cantonese.json public/dictionaries/wiktionary
 */

const fs = require("fs");
const path = require("path");

// 拼音首字母映射（粤拼）
const JYUTPING_INITIALS = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "other", // 其他字符（数字、符号等）
];

/**
 * 获取拼音首字母
 */
function getJyutpingInitial(entry) {
  // 1. 优先使用粤拼
  if (
    entry.phonetic &&
    entry.phonetic.jyutping &&
    entry.phonetic.jyutping.length > 0
  ) {
    const jyutping = entry.phonetic.jyutping[0].toLowerCase().trim();
    if (jyutping && jyutping.length > 0) {
      const initial = jyutping[0];
      if (JYUTPING_INITIALS.includes(initial)) {
        return initial;
      }
    }
  }

  // 2. 使用词头首字符
  if (entry.headword && entry.headword.search) {
    const headword = entry.headword.search.toLowerCase().trim();
    if (headword && headword.length > 0) {
      const initial = headword[0];
      if (JYUTPING_INITIALS.includes(initial)) {
        return initial;
      }
    }
  }

  return "other";
}

/**
 * 优化词条数据，移除冗余字段
 */
function optimizeEntry(entry) {
  const optimized = {
    id: entry.id,
    source_book: entry.source_book,
    headword: entry.headword,
    phonetic: entry.phonetic,
    entry_type: entry.entry_type,
    senses: entry.senses,
    keywords: entry.keywords,
  };

  // 只保留有用的 meta 字段
  if (entry.meta) {
    const meta = {};
    if (entry.meta.pos) meta.pos = entry.meta.pos;
    if (entry.meta.register) meta.register = entry.meta.register;
    if (entry.meta.variants && entry.meta.variants.length > 0)
      meta.variants = entry.meta.variants;
    if (Object.keys(meta).length > 0) {
      optimized.meta = meta;
    }
  }

  // 只保留有用的 dialect 字段
  if (entry.dialect) {
    optimized.dialect = {
      name: entry.dialect.name,
      region_code: entry.dialect.region_code,
    };
  }

  return optimized;
}

/**
 * 获取词头首字符（用于建立汉字索引）
 */
function getHeadwordInitial(entry) {
  // 优先使用 normalized，其次 display，最后 search
  const headword =
    entry.headword?.normalized ||
    entry.headword?.display ||
    entry.headword?.search ||
    "";
  if (headword && headword.length > 0) {
    return headword[0];
  }
  return null;
}

/**
 * 检查是否为汉字
 */
function isChinese(char) {
  return /[\u4e00-\u9fa5]/.test(char);
}

/**
 * 分片词典
 */
async function splitDictionary(inputFile, outputDir) {
  console.log("📖 开始分片词典...");
  console.log(`输入文件: ${inputFile}`);
  console.log(`输出目录: ${outputDir}`);

  // 读取输入文件
  console.log("\n⏳ 正在读取文件...");
  const startTime = Date.now();
  const data = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
  console.log(
    `✅ 已读取 ${data.length} 条词条 (耗时 ${Date.now() - startTime}ms)`,
  );

  // 创建输出目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ 已创建输出目录: ${outputDir}`);
  }

  // 分片数据
  console.log("\n⏳ 正在分片数据...");
  const chunks = {};
  const stats = {};

  // 汉字首字符到分片的映射索引
  // 格式: { "明": ["m"], "白": ["b"], ... }
  const headwordIndex = {};

  // 初始化分片
  JYUTPING_INITIALS.forEach((initial) => {
    chunks[initial] = [];
    stats[initial] = { count: 0, originalSize: 0, optimizedSize: 0 };
  });

  // 分配词条到对应分片
  let optimizedCount = 0;
  data.forEach((entry, index) => {
    if (index % 10000 === 0) {
      process.stdout.write(
        `\r处理进度: ${index}/${data.length} (${Math.round((index / data.length) * 100)}%)`,
      );
    }

    const initial = getJyutpingInitial(entry);
    const originalSize = JSON.stringify(entry).length;
    const optimizedEntry = optimizeEntry(entry);
    const optimizedSize = JSON.stringify(optimizedEntry).length;

    chunks[initial].push(optimizedEntry);
    stats[initial].count++;
    stats[initial].originalSize += originalSize;
    stats[initial].optimizedSize += optimizedSize;
    optimizedCount++;

    // 建立汉字首字符索引
    const headwordInitial = getHeadwordInitial(entry);
    if (headwordInitial && isChinese(headwordInitial)) {
      if (!headwordIndex[headwordInitial]) {
        headwordIndex[headwordInitial] = new Set();
      }
      headwordIndex[headwordInitial].add(initial);
    }
  });

  console.log(`\n✅ 数据分片完成`);

  // 将 Set 转换为数组
  const headwordIndexArray = {};
  for (const [char, chunks] of Object.entries(headwordIndex)) {
    headwordIndexArray[char] = Array.from(chunks).sort();
  }

  console.log(
    `✅ 汉字首字符索引: ${Object.keys(headwordIndexArray).length} 个字符`,
  );

  // 写入分片文件
  console.log("\n⏳ 正在写入分片文件...");
  const manifest = {
    chunks: {},
    // 汉字首字符到分片的映射索引
    headwordIndex: headwordIndexArray,
    total_entries: data.length,
    created_at: new Date().toISOString(),
    version: "1.1.0",
  };

  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;

  JYUTPING_INITIALS.forEach((initial) => {
    if (chunks[initial].length > 0) {
      const chunkFile = path.join(outputDir, `${initial}.json`);
      fs.writeFileSync(chunkFile, JSON.stringify(chunks[initial], null, 0));

      const fileSize = fs.statSync(chunkFile).size;

      manifest.chunks[initial] = {
        file: `${initial}.json`,
        entries: chunks[initial].length,
        size: fileSize,
      };

      totalOriginalSize += stats[initial].originalSize;
      totalOptimizedSize += stats[initial].optimizedSize;

      console.log(
        `✅ ${initial}.json - ${chunks[initial].length} 条词条 (${(fileSize / 1024 / 1024).toFixed(2)} MB)`,
      );
    }
  });

  // 写入索引文件
  const manifestFile = path.join(outputDir, "manifest.json");
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  console.log(`\n✅ 已生成索引文件: ${manifestFile}`);

  // 统计信息
  console.log("\n📊 统计信息:");
  console.log(`总词条数: ${data.length}`);
  console.log(`分片数量: ${Object.keys(manifest.chunks).length}`);
  console.log(`汉字索引字符数: ${Object.keys(headwordIndexArray).length}`);
  console.log(`原始大小: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(
    `优化后大小: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`,
  );
  console.log(
    `压缩率: ${((1 - totalOptimizedSize / totalOriginalSize) * 100).toFixed(1)}%`,
  );

  const avgChunkSize = totalOptimizedSize / Object.keys(manifest.chunks).length;
  console.log(`平均分片大小: ${(avgChunkSize / 1024 / 1024).toFixed(2)} MB`);

  console.log("\n✅ 分片完成！");
}

// 主程序
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "用法: node scripts/split-dictionary.js <input-file> <output-dir>",
    );
    console.error(
      "示例: node scripts/split-dictionary.js public/dictionaries/wiktionary-cantonese.json public/dictionaries/wiktionary",
    );
    process.exit(1);
  }

  const [inputFile, outputDir] = args;

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ 输入文件不存在: ${inputFile}`);
    process.exit(1);
  }

  splitDictionary(inputFile, outputDir)
    .then(() => {
      console.log("\n✨ 全部完成！");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ 错误:", error);
      process.exit(1);
    });
}

module.exports = { splitDictionary, optimizeEntry, getJyutpingInitial };

#!/usr/bin/env node

/**
 * JSONL 转 JSON 脚本
 * 专门用于处理 Wiktionary 等 JSONL 格式的词典数据
 *
 * 用法:
 *   node scripts/jsonl-to-json.js --dict wiktionary-cantonese --input data/processed/wiktionary_cantonese_entries.jsonl
 *
 * 或使用 npm 脚本:
 *   pnpm build:wiktionary
 */

import fs from "fs";
import path from "path";
import { parseArgs } from "node:util";
import readline from "readline";

// 动态导入适配器
const ADAPTERS = {
  "wiktionary-cantonese": () => import("./adapters/wiktionary-cantonese.js"),
  // 未来可以添加更多JSONL格式的词典
};

/**
 * 读取 JSONL 文件
 * @param {string} filePath - 文件路径
 * @param {number} maxLines - 最大读取行数（用于测试）
 * @returns {Promise<Array>} 解析后的对象数组
 */
async function parseJSONL(filePath, maxLines = null) {
  const entries = [];
  let lineCount = 0;

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  console.log(`⏳ 开始读取 JSONL 文件: ${filePath}`);

  for await (const line of rl) {
    lineCount++;

    // 显示进度
    if (lineCount % 10000 === 0) {
      process.stdout.write(`\r   已读取 ${lineCount} 行...`);
    }

    // 跳过空行
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line);
      entries.push(entry);

      // 如果设置了最大行数限制（用于测试）
      if (maxLines && entries.length >= maxLines) {
        console.log(`\n   已达到最大行数限制: ${maxLines}`);
        break;
      }
    } catch (error) {
      console.warn(`\n⚠️  第 ${lineCount} 行解析失败: ${error.message}`);
    }
  }

  process.stdout.write("\r                                    \r");
  console.log(
    `✅ 读取完成: ${lineCount} 行，成功解析 ${entries.length} 个词条`,
  );

  return entries;
}

/**
 * 主函数
 */
async function main() {
  // 解析命令行参数
  const { values } = parseArgs({
    options: {
      dict: {
        type: "string",
        short: "d",
      },
      input: {
        type: "string",
        short: "i",
      },
      output: {
        type: "string",
        short: "o",
      },
      aggregate: {
        type: "boolean",
        default: true,
      },
      limit: {
        type: "string", // 测试用：限制读取行数
        short: "l",
      },
      help: {
        type: "boolean",
        short: "h",
      },
    },
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  // 验证参数
  if (!values.dict || !values.input) {
    console.error("❌ 错误: 缺少必需参数");
    printHelp();
    process.exit(1);
  }

  // 检查适配器是否存在
  if (!ADAPTERS[values.dict]) {
    console.error(`❌ 错误: 未找到词典适配器 "${values.dict}"`);
    console.log("\n可用的适配器:");
    Object.keys(ADAPTERS).forEach((key) => {
      console.log(`  - ${key}`);
    });
    process.exit(1);
  }

  // 检查输入文件是否存在
  if (!fs.existsSync(values.input)) {
    console.error(`❌ 错误: 输入文件不存在: ${values.input}`);
    process.exit(1);
  }

  console.log("🚀 开始转换...\n");
  console.log(`📖 词典: ${values.dict}`);
  console.log(`📄 输入: ${values.input}`);

  if (values.limit) {
    console.log(`⚠️  测试模式: 限制读取 ${values.limit} 条`);
  }

  try {
    // 1. 加载适配器
    console.log("\n⏳ 加载适配器...");
    const adapter = await ADAPTERS[values.dict]();
    console.log(`✅ 适配器加载成功: ${adapter.DICTIONARY_INFO.name}`);

    // 2. 读取 JSONL
    console.log("\n⏳ 读取 JSONL 文件...");
    const maxLines = values.limit ? parseInt(values.limit) : null;
    const rawData = await parseJSONL(values.input, maxLines);

    if (rawData.length === 0) {
      console.error("❌ 错误: 没有读取到任何有效数据");
      process.exit(1);
    }

    // 3. 转换数据
    console.log("\n⏳ 转换数据格式...");
    const startTime = Date.now();
    const { entries, errors, skipped } = adapter.transformAll(rawData);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (errors.length > 0) {
      console.warn(`\n⚠️  转换过程中发现 ${errors.length} 个错误:`);
      errors.slice(0, 5).forEach((err) => {
        console.warn(`   词条 ${err.index} (${err.word}): ${err.error}`);
      });
      if (errors.length > 5) {
        console.warn(`   ... 还有 ${errors.length - 5} 个错误`);
      }
    }

    console.log(
      `✅ 成功转换 ${entries.length} 个粤语词条 (耗时 ${duration}秒)`,
    );
    console.log(`ℹ️  跳过 ${skipped} 个非粤语词条`);

    if (entries.length === 0) {
      console.error("❌ 错误: 没有成功转换任何词条");
      process.exit(1);
    }

    // 4. 聚合重复词条（可选）
    let finalEntries = entries;
    if (values.aggregate && adapter.aggregateEntries) {
      console.log("\n⏳ 聚合重复词条...");
      const before = entries.length;
      finalEntries = adapter.aggregateEntries(entries);
      console.log(`✅ 聚合完成: ${before} → ${finalEntries.length} 个词条`);
    }

    // 5. 生成输出路径
    const outputPath =
      values.output ||
      path.join("public", "dictionaries", `${values.dict}.json`);

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 6. 写入 JSON
    console.log(`\n⏳ 写入 JSON 文件: ${outputPath}`);
    fs.writeFileSync(
      outputPath,
      JSON.stringify(finalEntries, null, 2),
      "utf-8",
    );
    const fileSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
    console.log(`✅ 写入成功 (${fileSize} MB)`);

    // 7. 更新词典索引
    console.log("\n⏳ 更新词典索引...");
    updateDictionaryIndex(adapter.DICTIONARY_INFO, finalEntries.length);
    console.log("✅ 索引更新成功");

    // 7.5. 执行后处理（如自动分片）
    if (adapter.postProcess && typeof adapter.postProcess === "function") {
      console.log("\n⏳ 执行后处理...");
      try {
        await adapter.postProcess(finalEntries, outputPath);
      } catch (error) {
        console.error("⚠️  后处理出错:", error.message);
        console.log("⚠️  将继续完成数据生成流程");
      }
    }

    // 8. 输出统计
    console.log("\n" + "=".repeat(50));
    console.log("📊 转换统计:");
    console.log("=".repeat(50));
    console.log(`总词条数:      ${rawData.length}`);
    console.log(`跳过词条:      ${skipped}`);
    console.log(`转换错误:      ${errors.length}`);
    console.log(`成功词条:      ${finalEntries.length}`);
    console.log(`输出文件:      ${outputPath}`);
    console.log(`文件大小:      ${fileSize} MB`);
    console.log(`转换耗时:      ${duration}秒`);
    console.log("=".repeat(50));

    console.log("\n✅ 转换完成！\n");
  } catch (error) {
    console.error("\n❌ 转换失败:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 更新词典索引文件
 */
function updateDictionaryIndex(dictInfo, entryCount) {
  const indexPath = path.join("content", "dictionaries", "index.json");
  const publicIndexPath = path.join("public", "dictionaries", "index.json");

  let index = { dictionaries: [], last_updated: "", schema_version: "1.0.0" };

  // 读取现有索引
  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  }

  // 查找或创建词典条目
  let dictEntry = index.dictionaries.find((d) => d.id === dictInfo.id);

  if (!dictEntry) {
    dictEntry = {
      id: dictInfo.id,
      name: dictInfo.name,
      dialect: dictInfo.dialect.name,
      file: `${dictInfo.id}.json`,
    };
    index.dictionaries.push(dictEntry);
  }

  // 更新词条数和元信息
  dictEntry.entries_count = entryCount;
  dictEntry.author = dictInfo.author;
  dictEntry.publisher = dictInfo.publisher;
  dictEntry.year = dictInfo.year;
  dictEntry.source = dictInfo.source;
  dictEntry.license = dictInfo.license;
  dictEntry.license_url = dictInfo.license_url;
  dictEntry.attribution = dictInfo.attribution;
  dictEntry.usage_restriction = dictInfo.usage_restriction;

  // 分片配置（如果启用）
  if (dictInfo.enable_chunking) {
    dictEntry.chunked = true;
    dictEntry.chunk_dir =
      dictInfo.chunk_output_dir || dictInfo.id.replace(/-cantonese$/, "");
  }

  // 更新时间戳
  index.last_updated = new Date().toISOString();

  // 写入文件到两个位置
  const indexContent = JSON.stringify(index, null, 2);

  // 确保目录存在
  const contentDir = path.dirname(indexPath);
  const publicDir = path.dirname(publicIndexPath);
  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
  }
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(indexPath, indexContent, "utf-8");
  fs.writeFileSync(publicIndexPath, indexContent, "utf-8");

  console.log(`✅ 索引文件已同步到 content/ 和 public/ 目录`);
}

/**
 * 打印帮助信息
 */
function printHelp() {
  console.log(`
JSONL 转 JSON 工具

用法:
  node scripts/jsonl-to-json.js [选项]

选项:
  -d, --dict <name>      词典适配器名称 (必需)
  -i, --input <path>     输入 JSONL 文件路径 (必需)
  -o, --output <path>    输出 JSON 文件路径 (可选)
  --aggregate            是否聚合重复词条 (默认: true)
  -l, --limit <number>   限制处理的词条数（用于测试）
  -h, --help             显示帮助信息

可用的词典适配器:
  - wiktionary-cantonese   維基辭典

示例:
  # 转换 維基辭典
  node scripts/jsonl-to-json.js \\
    --dict wiktionary-cantonese \\
    --input data/processed/wiktionary_cantonese_entries.jsonl

  # 测试模式：只处理前1000条
  node scripts/jsonl-to-json.js \\
    --dict wiktionary-cantonese \\
    --input data/processed/wiktionary_cantonese_entries.jsonl \\
    --limit 1000

  # 指定输出路径
  node scripts/jsonl-to-json.js \\
    --dict wiktionary-cantonese \\
    --input data/processed/wiktionary_cantonese_entries.jsonl \\
    --output public/dictionaries/my-dict.json
  `);
}

// 运行主函数
main();

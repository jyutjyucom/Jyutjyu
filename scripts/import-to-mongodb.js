#!/usr/bin/env node
/**
 * MongoDB 数据导入/更新脚本
 * 将本地 JSON 词典数据导入到 MongoDB Atlas
 *
 * 使用方法:
 *   # 全量覆盖（清空后重新导入）
 *   node scripts/import-to-mongodb.js
 *   node scripts/import-to-mongodb.js --mode replace
 *
 *   # 增量更新（upsert，保留现有数据，更新已有词条）
 *   node scripts/import-to-mongodb.js --mode upsert
 *
 *   # 只更新指定词典
 *   node scripts/import-to-mongodb.js --dict gz-colloquialisms
 *   node scripts/import-to-mongodb.js --dict hk-cantowords --mode upsert
 *
 *   # 显示帮助
 *   node scripts/import-to-mongodb.js --help
 *
 * 环境变量:
 *   MONGODB_URI - MongoDB 连接字符串
 *   MONGODB_DB_NAME - 数据库名称（默认 jyutjyu）
 */

import { MongoClient } from "mongodb";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const DICTIONARIES_DIR = join(ROOT_DIR, "public", "dictionaries");
const MODERATION_REPORT_PATH = join(
  ROOT_DIR,
  "data",
  "moderation",
  "reports",
  "cn-matches.json",
);
const MODERATION_RESTRICTED_IDS_PATH = join(
  ROOT_DIR,
  "server",
  "assets",
  "moderation",
  "cn-restricted-entry-ids.json",
);

// 解析命令行参数
const args = process.argv.slice(2);
const options = {
  mode: "replace", // replace | upsert
  dict: null, // 指定词典 ID
  help: false,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--mode" && args[i + 1]) {
    options.mode = args[i + 1];
    i++;
  } else if (args[i] === "--dict" && args[i + 1]) {
    options.dict = args[i + 1];
    i++;
  } else if (args[i] === "--help" || args[i] === "-h") {
    options.help = true;
  }
}

if (options.help) {
  console.log(`
📚 MongoDB 数据导入/更新脚本

使用方法:
  node scripts/import-to-mongodb.js [选项]

选项:
  --mode <mode>    更新模式（默认: replace）
                   replace - 清空后全量重新导入
                   upsert  - 增量更新（保留现有数据，更新已有词条）
  
  --dict <id>      只处理指定词典（如: gz-colloquialisms, hk-cantowords）
  
  --help, -h       显示帮助

示例:
  # 全量覆盖所有词典
  node scripts/import-to-mongodb.js

  # 增量更新所有词典
  node scripts/import-to-mongodb.js --mode upsert

  # 只更新广州话俗语词典（增量）
  node scripts/import-to-mongodb.js --dict gz-colloquialisms --mode upsert

  # 只重新导入粵典
  node scripts/import-to-mongodb.js --dict hk-cantowords --mode replace
`);
  process.exit(0);
}

// 从 .env 文件读取环境变量（如果存在）
const envPath = join(ROOT_DIR, ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      const trimmedKey = key.trim();
      if (!trimmedKey.startsWith("#")) {
        process.env[trimmedKey] = valueParts
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "");
      }
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || "jyutjyu";
const COLLECTION_NAME = "entries";

if (!MONGODB_URI) {
  console.error("❌ 错误: 请设置 MONGODB_URI 环境变量");
  console.error(
    '   示例: export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net"',
  );
  process.exit(1);
}

/**
 * 读取词典索引
 */
function loadDictionaryIndex() {
  const indexPath = join(DICTIONARIES_DIR, "index.json");
  const content = readFileSync(indexPath, "utf-8");
  return JSON.parse(content);
}

/**
 * 加载单个词典文件
 */
function loadDictionaryFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

/**
 * 加载分片词典
 */
function loadChunkedDictionary(chunkDir) {
  const manifestPath = join(DICTIONARIES_DIR, chunkDir, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  const allEntries = [];

  for (const [initial, chunkInfo] of Object.entries(manifest.chunks)) {
    const chunkPath = join(DICTIONARIES_DIR, chunkDir, chunkInfo.file);
    if (existsSync(chunkPath)) {
      const entries = loadDictionaryFile(chunkPath);
      allEntries.push(...entries);
      console.log(`   📦 ${chunkDir}/${chunkInfo.file}: ${entries.length} 条`);
    }
  }

  return allEntries;
}

/**
 * 加载中国大陆展示限制索引
 */
function loadModerationIndex() {
  const byEntryId = new Map();

  if (existsSync(MODERATION_REPORT_PATH)) {
    try {
      const report = JSON.parse(readFileSync(MODERATION_REPORT_PATH, "utf-8"));
      const policy = report.policy || "cn-sensitive-lexicon-v1";
      for (const entry of report.entries || []) {
        if (!entry?.id) continue;
        byEntryId.set(entry.id, {
          restricted_regions: ["CN"],
          policy,
          matched_terms: Array.isArray(entry.matched_terms)
            ? entry.matched_terms
            : [],
        });
      }
      return byEntryId;
    } catch (error) {
      console.warn("⚠️  读取 moderation report 失败，尝试 runtime artifact:", error);
    }
  }

  if (existsSync(MODERATION_RESTRICTED_IDS_PATH)) {
    try {
      const artifact = JSON.parse(
        readFileSync(MODERATION_RESTRICTED_IDS_PATH, "utf-8"),
      );
      const policy = artifact.policy || "cn-sensitive-lexicon-v1";
      for (const entryId of artifact.entry_ids || []) {
        byEntryId.set(entryId, {
          restricted_regions: ["CN"],
          policy,
          matched_terms: [],
        });
      }
    } catch (error) {
      console.warn("⚠️  读取 moderation runtime artifact 失败:", error);
    }
  }

  return byEntryId;
}

function applyModerationMetadata(entries, moderationIndex) {
  return entries.map((entry) => {
    const moderation = moderationIndex.get(entry.id);
    if (!moderation) {
      const { moderation: _moderation, ...cleanEntry } = entry;
      return cleanEntry;
    }

    return {
      ...entry,
      moderation,
    };
  });
}

/**
 * 批量 upsert（增量更新）
 */
async function batchUpsert(collection, entries, batchSize = 500) {
  let updated = 0;
  let inserted = 0;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);

    const bulkOps = batch.map((entry) => {
      const update = { $set: entry };
      if (!entry.moderation) {
        update.$unset = { moderation: "" };
      }

      return {
        updateOne: {
          filter: { id: entry.id },
          update,
          upsert: true,
        },
      };
    });

    const result = await collection.bulkWrite(bulkOps, { ordered: false });
    updated += result.modifiedCount;
    inserted += result.upsertedCount;

    process.stdout.write(
      `\r   ⏳ 已处理 ${Math.min(i + batchSize, entries.length)}/${entries.length}`,
    );
  }

  return { updated, inserted };
}

/**
 * 批量插入
 */
async function batchInsert(collection, entries, batchSize = 1000) {
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    await collection.insertMany(batch, { ordered: false });
    process.stdout.write(
      `\r   ⏳ 已导入 ${Math.min(i + batchSize, entries.length)}/${entries.length}`,
    );
  }
  return entries.length;
}

/**
 * 主函数
 */
async function main() {
  console.log("🚀 MongoDB 数据导入/更新脚本\n");
  console.log(
    `   模式: ${options.mode === "upsert" ? "增量更新 (upsert)" : "全量覆盖 (replace)"}`,
  );
  if (options.dict) {
    console.log(`   词典: ${options.dict}`);
  }
  console.log("");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ 已连接到 MongoDB\n");

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const moderationIndex = loadModerationIndex();
    if (moderationIndex.size > 0) {
      console.log(`🛡️  已加载大陆展示限制: ${moderationIndex.size} 条\n`);
    } else {
      console.log("ℹ️  未找到大陆展示限制索引，导入时不会写入 moderation 标记\n");
    }

    // 读取词典索引
    const index = loadDictionaryIndex();

    // 筛选要处理的词典
    let dictionaries = index.dictionaries;
    if (options.dict) {
      dictionaries = dictionaries.filter((d) => d.id === options.dict);
      if (dictionaries.length === 0) {
        console.error(`❌ 未找到词典: ${options.dict}`);
        console.log(
          "   可用词典:",
          index.dictionaries.map((d) => d.id).join(", "),
        );
        process.exit(1);
      }
    }

    console.log(`📚 将处理 ${dictionaries.length} 本词典\n`);

    // 全量覆盖模式：先清空数据
    if (options.mode === "replace") {
      if (options.dict) {
        // 只删除指定词典的数据
        // 使用ID前缀模式匹配（更可靠，因为每个词典的ID前缀都是唯一的）
        const dictId = dictionaries[0].id;
        const dictName = dictionaries[0].name;
        const deleteResult = await collection.deleteMany({
          id: { $regex: `^${dictId}_` },
        });
        console.log(
          `🗑️  已删除 ${dictName} 的 ${deleteResult.deletedCount} 条数据\n`,
        );
      } else {
        // 清空所有数据
        const existingCount = await collection.countDocuments();
        if (existingCount > 0) {
          console.log(`⚠️  集合中已有 ${existingCount} 条数据`);
          console.log("   将清空现有数据并重新导入...\n");
          await collection.deleteMany({});
        }
      }
    }

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalInserted = 0;

    for (const dict of dictionaries) {
      console.log(`📖 处理: ${dict.name} (${dict.id})`);

      let entries = [];

      if (dict.chunked && dict.chunk_dir) {
        // 分片词典
        entries = loadChunkedDictionary(dict.chunk_dir);
      } else {
        // 普通词典
        const filePath = join(DICTIONARIES_DIR, dict.file);
        if (existsSync(filePath)) {
          entries = loadDictionaryFile(filePath);
          console.log(`   📦 ${dict.file}: ${entries.length} 条`);
        } else {
          console.log(`   ⚠️  文件不存在: ${dict.file}`);
          continue;
        }
      }

      if (entries.length > 0) {
        entries = applyModerationMetadata(entries, moderationIndex);

        if (options.mode === "upsert") {
          // 增量更新模式
          const { updated, inserted } = await batchUpsert(collection, entries);
          console.log(
            `\n   ✅ 完成: 更新 ${updated} 条, 新增 ${inserted} 条\n`,
          );
          totalUpdated += updated;
          totalInserted += inserted;
        } else {
          // 全量覆盖模式
          const count = await batchInsert(collection, entries);
          console.log(`\n   ✅ 完成: ${count} 条\n`);
          totalInserted += count;
        }
        totalProcessed += entries.length;
      }
    }

    console.log("━".repeat(50));
    console.log(`\n🎉 处理完成!`);
    console.log(`   总计: ${totalProcessed} 条`);
    if (options.mode === "upsert") {
      console.log(`   更新: ${totalUpdated} 条`);
      console.log(`   新增: ${totalInserted} 条`);
    }
    console.log("");

    // 创建/更新索引
    console.log("📇 确保数据库索引存在...");

    await collection.createIndex({ id: 1 }, { unique: true });
    await collection.createIndex({ "headword.normalized": 1 });
    await collection.createIndex({ "headword.display": 1 });
    await collection.createIndex({ "phonetic.jyutping": 1 });
    await collection.createIndex({ source_book: 1 });
    await collection.createIndex({ "dialect.name": 1 });
    await collection.createIndex({ entry_type: 1 });
    await collection.createIndex({ "moderation.restricted_regions": 1 });
    await collection.createIndex({
      "headword.normalized": 1,
      source_book: 1,
    });

    console.log("✅ 索引已就绪\n");

    // 输出统计
    const stats = await collection
      .aggregate([
        { $group: { _id: "$source_book", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const totalInDb = stats.reduce((sum, s) => sum + s.count, 0);

    console.log(`📊 数据库统计 (共 ${totalInDb} 条):`);
    for (const stat of stats) {
      console.log(`   ${stat._id}: ${stat.count} 条`);
    }

    console.log("\n" + "━".repeat(50));
    console.log("\n✅ 完成!");
  } catch (error) {
    console.error("❌ 操作失败:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();

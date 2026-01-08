#!/usr/bin/env node
/**
 * MongoDB 数据导入脚本
 * 将本地 JSON 词典数据导入到 MongoDB Atlas
 * 
 * 使用方法:
 *   node scripts/import-to-mongodb.js
 * 
 * 环境变量:
 *   MONGODB_URI - MongoDB 连接字符串
 */

import { MongoClient } from 'mongodb'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const DICTIONARIES_DIR = join(ROOT_DIR, 'public', 'dictionaries')

// 从 .env 文件读取环境变量（如果存在）
const envPath = join(ROOT_DIR, '.env')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
    }
  })
}

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_NAME || 'jyutjyu'
const COLLECTION_NAME = 'entries'

if (!MONGODB_URI) {
  console.error('❌ 错误: 请设置 MONGODB_URI 环境变量')
  console.error('   示例: export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net"')
  process.exit(1)
}

/**
 * 读取词典索引
 */
function loadDictionaryIndex() {
  const indexPath = join(DICTIONARIES_DIR, 'index.json')
  const content = readFileSync(indexPath, 'utf-8')
  return JSON.parse(content)
}

/**
 * 加载单个词典文件
 */
function loadDictionaryFile(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  return JSON.parse(content)
}

/**
 * 加载分片词典
 */
function loadChunkedDictionary(chunkDir) {
  const manifestPath = join(DICTIONARIES_DIR, chunkDir, 'manifest.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  
  const allEntries = []
  
  for (const [initial, chunkInfo] of Object.entries(manifest.chunks)) {
    const chunkPath = join(DICTIONARIES_DIR, chunkDir, chunkInfo.file)
    if (existsSync(chunkPath)) {
      const entries = loadDictionaryFile(chunkPath)
      allEntries.push(...entries)
      console.log(`   📦 ${chunkDir}/${chunkInfo.file}: ${entries.length} 条`)
    }
  }
  
  return allEntries
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始导入词典数据到 MongoDB...\n')
  
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    console.log('✅ 已连接到 MongoDB\n')
    
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION_NAME)
    
    // 询问是否清空现有数据
    const existingCount = await collection.countDocuments()
    if (existingCount > 0) {
      console.log(`⚠️  集合中已有 ${existingCount} 条数据`)
      console.log('   将清空现有数据并重新导入...\n')
      await collection.deleteMany({})
    }
    
    // 读取词典索引
    const index = loadDictionaryIndex()
    console.log(`📚 找到 ${index.dictionaries.length} 本词典\n`)
    
    let totalImported = 0
    
    for (const dict of index.dictionaries) {
      console.log(`📖 处理: ${dict.name} (${dict.id})`)
      
      let entries = []
      
      if (dict.chunked && dict.chunk_dir) {
        // 分片词典
        entries = loadChunkedDictionary(dict.chunk_dir)
      } else {
        // 普通词典
        const filePath = join(DICTIONARIES_DIR, dict.file)
        if (existsSync(filePath)) {
          entries = loadDictionaryFile(filePath)
          console.log(`   📦 ${dict.file}: ${entries.length} 条`)
        } else {
          console.log(`   ⚠️  文件不存在: ${dict.file}`)
          continue
        }
      }
      
      if (entries.length > 0) {
        // 批量插入（每批 1000 条）
        const BATCH_SIZE = 1000
        for (let i = 0; i < entries.length; i += BATCH_SIZE) {
          const batch = entries.slice(i, i + BATCH_SIZE)
          await collection.insertMany(batch, { ordered: false })
          process.stdout.write(`\r   ⏳ 已导入 ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length}`)
        }
        console.log(`\n   ✅ 完成: ${entries.length} 条\n`)
        totalImported += entries.length
      }
    }
    
    console.log('━'.repeat(50))
    console.log(`\n🎉 导入完成! 共 ${totalImported} 条词条\n`)
    
    // 创建索引
    console.log('📇 创建数据库索引...')
    
    await collection.createIndex({ 'headword.normalized': 1 })
    await collection.createIndex({ 'headword.display': 1 })
    await collection.createIndex({ 'phonetic.jyutping': 1 })
    await collection.createIndex({ 'source_book': 1 })
    await collection.createIndex({ 'dialect.name': 1 })
    await collection.createIndex({ 'entry_type': 1 })
    
    // 复合索引（常用查询）
    await collection.createIndex({ 
      'headword.normalized': 1, 
      'source_book': 1 
    })
    
    console.log('✅ 索引创建完成\n')
    
    // 输出统计
    const stats = await collection.aggregate([
      { $group: { _id: '$source_book', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray()
    
    console.log('📊 词典统计:')
    for (const stat of stats) {
      console.log(`   ${stat._id}: ${stat.count} 条`)
    }
    
    console.log('\n' + '━'.repeat(50))
    console.log('\n⚡ 下一步: 在 MongoDB Atlas 中创建 Atlas Search 索引')
    console.log('   请参考 docs/MONGODB_SETUP.md\n')
    
  } catch (error) {
    console.error('❌ 导入失败:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

main()

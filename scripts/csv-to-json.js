#!/usr/bin/env node

/**
 * CSV 转 JSON 主脚本
 * 
 * 用法:
 *   node scripts/csv-to-json.js --dict gz-practical-classified --input data/processed/gz-practical.csv
 *   
 * 或使用 npm 脚本:
 *   pnpm build:data -- --dict gz-practical-classified --input data/processed/gz-practical.csv
 */

import fs from 'fs'
import path from 'path'
import { parseArgs } from 'node:util'
import { parseCSV, validateRequiredFields, cleanRow } from './utils/csv-parser.js'

// 动态导入适配器
const ADAPTERS = {
  'gz-practical-classified': () => import('./adapters/gz-practical-classified.js'),
  'gz-colloquialisms': () => import('./adapters/gz-colloquialisms.js'),
  // 未来可以添加更多词典
}

/**
 * 主函数
 */
async function main() {
  // 解析命令行参数
  const { values } = parseArgs({
    options: {
      dict: {
        type: 'string',
        short: 'd'
      },
      input: {
        type: 'string',
        short: 'i'
      },
      output: {
        type: 'string',
        short: 'o'
      },
      aggregate: {
        type: 'boolean',
        default: true
      },
      help: {
        type: 'boolean',
        short: 'h'
      }
    }
  })

  if (values.help) {
    printHelp()
    process.exit(0)
  }

  // 验证参数
  if (!values.dict || !values.input) {
    console.error('❌ 错误: 缺少必需参数')
    printHelp()
    process.exit(1)
  }

  // 检查适配器是否存在
  if (!ADAPTERS[values.dict]) {
    console.error(`❌ 错误: 未找到词典适配器 "${values.dict}"`)
    console.log('\n可用的适配器:')
    Object.keys(ADAPTERS).forEach(key => {
      console.log(`  - ${key}`)
    })
    process.exit(1)
  }

  console.log('🚀 开始转换...\n')
  console.log(`📖 词典: ${values.dict}`)
  console.log(`📄 输入: ${values.input}`)

  try {
    // 1. 加载适配器
    console.log('\n⏳ 加载适配器...')
    const adapter = await ADAPTERS[values.dict]()
    console.log(`✅ 适配器加载成功: ${adapter.DICTIONARY_INFO.name}`)

    // 2. 读取 CSV
    console.log('\n⏳ 读取 CSV 文件...')
    const rawData = await parseCSV(values.input)
    console.log(`✅ 读取成功: ${rawData.length} 行`)

    // 3. 清理数据
    const cleanedData = rawData.map(cleanRow)

    // 4. 验证必填字段
    console.log('\n⏳ 验证数据...')
    const validationErrors = validateRequiredFields(cleanedData, adapter.REQUIRED_FIELDS)
    
    if (validationErrors.length > 0) {
      console.warn(`⚠️  发现 ${validationErrors.length} 个验证错误:`)
      validationErrors.slice(0, 5).forEach(err => {
        console.warn(`   行 ${err.row}: ${err.message}`)
      })
      if (validationErrors.length > 5) {
        console.warn(`   ... 还有 ${validationErrors.length - 5} 个错误`)
      }
      console.log('\n⚠️  将跳过有错误的行继续处理\n')
    }

    // 过滤掉有错误的行
    const validRows = cleanedData.filter((_, index) => {
      return !validationErrors.some(err => err.row === index + 2)
    })

    // 5. 转换数据
    console.log('⏳ 转换数据格式...')
    const { entries, errors } = adapter.transformAll(validRows)
    
    if (errors.length > 0) {
      console.warn(`⚠️  转换过程中发现 ${errors.length} 个错误:`)
      errors.slice(0, 3).forEach(err => {
        console.warn(`   行 ${err.row}: ${err.error}`)
      })
    }

    console.log(`✅ 成功转换 ${entries.length} 个词条`)

    // 6. 聚合多义项（可选）
    let finalEntries = entries
    if (values.aggregate && adapter.aggregateEntries) {
      console.log('\n⏳ 聚合多义项...')
      const before = entries.length
      finalEntries = adapter.aggregateEntries(entries)
      console.log(`✅ 聚合完成: ${before} → ${finalEntries.length} 个词条`)
    }

    // 7. 生成输出路径
    const outputPath = values.output || 
      path.join('public', 'dictionaries', `${values.dict}.json`)
    
    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // 8. 写入 JSON
    console.log(`\n⏳ 写入 JSON 文件: ${outputPath}`)
    fs.writeFileSync(
      outputPath,
      JSON.stringify(finalEntries, null, 2),
      'utf-8'
    )
    console.log(`✅ 写入成功`)

    // 9. 更新词典索引
    console.log('\n⏳ 更新词典索引...')
    updateDictionaryIndex(adapter.DICTIONARY_INFO, finalEntries.length)
    console.log('✅ 索引更新成功')

    // 10. 输出统计
    console.log('\n' + '='.repeat(50))
    console.log('📊 转换统计:')
    console.log('='.repeat(50))
    console.log(`总行数:        ${rawData.length}`)
    console.log(`验证错误:      ${validationErrors.length}`)
    console.log(`转换错误:      ${errors.length}`)
    console.log(`成功词条:      ${finalEntries.length}`)
    console.log(`输出文件:      ${outputPath}`)
    console.log(`文件大小:      ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`)
    console.log('='.repeat(50))

    console.log('\n✅ 转换完成！\n')

  } catch (error) {
    console.error('\n❌ 转换失败:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

/**
 * 更新词典索引文件
 */
function updateDictionaryIndex(dictInfo, entryCount) {
  const indexPath = path.join('content', 'dictionaries', 'index.json')
  const publicIndexPath = path.join('public', 'dictionaries', 'index.json')
  
  let index = { dictionaries: [], last_updated: '', schema_version: '1.0.0' }
  
  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
  }

  // 查找或创建词典条目
  let dictEntry = index.dictionaries.find(d => d.id === dictInfo.id)
  
  if (!dictEntry) {
    dictEntry = {
      id: dictInfo.id,
      name: dictInfo.name,
      dialect: dictInfo.dialect.name,
      file: `${dictInfo.id}.json`
    }
    index.dictionaries.push(dictEntry)
  }

  // 更新词条数
  dictEntry.entries_count = entryCount
  dictEntry.author = dictInfo.author
  dictEntry.publisher = dictInfo.publisher
  dictEntry.year = dictInfo.year

  // 更新时间戳
  index.last_updated = new Date().toISOString()

  // 写入文件到两个位置
  const indexContent = JSON.stringify(index, null, 2)
  fs.writeFileSync(indexPath, indexContent, 'utf-8')
  fs.writeFileSync(publicIndexPath, indexContent, 'utf-8')
  
  console.log(`✅ 索引文件已同步到 content/ 和 public/ 目录`)
}

/**
 * 打印帮助信息
 */
function printHelp() {
  console.log(`
CSV 转 JSON 工具

用法:
  node scripts/csv-to-json.js [选项]

选项:
  -d, --dict <name>      词典适配器名称 (必需)
  -i, --input <path>     输入 CSV 文件路径 (必需)
  -o, --output <path>    输出 JSON 文件路径 (可选)
  --aggregate            是否聚合多义项 (默认: true)
  -h, --help             显示帮助信息

可用的词典适配器:
  - gz-practical-classified    实用广州话分类词典
  - gz-colloquialisms          广州话俗语词典

示例:
  # 转换实用广州话分类词典
  node scripts/csv-to-json.js \\
    --dict gz-practical-classified \\
    --input data/processed/gz-practical.csv

  # 指定输出路径
  node scripts/csv-to-json.js \\
    --dict gz-practical-classified \\
    --input data/processed/gz-practical.csv \\
    --output public/dictionaries/my-dict.json
  `)
}

// 运行主函数
main()


/**
 * 粵典 (words.hk) 数据适配器
 * 
 * 原始 CSV 格式:
 * - 第1-2行: 版权声明和空行
 * - 从第3行开始: id, headwords_with_jyutping, content, empty, review_status, publish_status
 * 
 * 特点:
 * - headwords 格式: "词头1:jyutping1,词头2:jyutping2"
 * - content 包含结构化标记: (pos:xxx), <explanation>, <eg>, yue:, eng:
 * - 多义项用 ---- 分隔
 * - 同一词条可能有多个变体写法
 */

import {
  generateKeywords,
  cleanHeadword,
  parseNote
} from '../utils/text-processor.js'

/**
 * 词典元数据
 */
export const DICTIONARY_INFO = {
  id: 'hk-cantowords',
  name: '粵典',
  dialect: {
    name: '香港话',
    region_code: 'HK'
  },
  source_book: '粵典 (words.hk)',
  author: 'words.hk contributors',
  publisher: 'Hong Kong Lexicography Limited',
  year: 2024,
  source: 'community_contributed',
  license: 'Non-Commercial Open Data License 1.0',
  license_url: 'https://words.hk/base/hoifong/',
  attribution: 'words.hk / Hong Kong Lexicography Limited',
  usage_restriction: '非商业使用（详见授权协议）'
}

/**
 * 必填字段验证
 * 注意：words.hk CSV 没有标准表头，使用自定义列名
 */
export const REQUIRED_FIELDS = [] // 不使用标准验证，在 transformRow 中手动验证

/**
 * 预处理 CSV 数据
 * words.hk CSV 格式特殊：第1行是版权声明被当作表头，导致列名错误
 * Papa Parse 会产生: '', '_1', '--- Generated...', '__parsed_extra'
 * 实际数据结构:
 * - row[''] = id
 * - row['_1'] = headwords_jyutping
 * - row['--- Generated...'] = content
 * - row['__parsed_extra'] = [empty, review_status, publish_status]
 * 
 * @param {Array<Object>} rows - 原始 CSV 行数组
 * @returns {Array<Object>} 处理后的行数组
 */
export function preprocessRows(rows) {
  return rows.map(row => {
    const keys = Object.keys(row)
    
    // 找到最长的键（通常是版权声明文本）
    const longKey = keys.find(k => k.length > 100) || keys[2]
    
    const newRow = {
      seq: '',
      id: row[''] || '',
      headwords_jyutping: row['_1'] || '',
      content: row[longKey] || '',
      empty: '',
      review_status: '',
      publish_status: ''
    }
    
    // 处理 __parsed_extra 中的额外列
    if (row['__parsed_extra'] && Array.isArray(row['__parsed_extra'])) {
      const extra = row['__parsed_extra']
      newRow.empty = extra[0] || ''
      newRow.review_status = extra[1] || ''
      newRow.publish_status = extra[2] || ''
    }
    
    return newRow
  })
}

/**
 * 解析词头和拼音字符串
 * 格式: "小意思:siu2 ji3 si1,小小意思:siu2 siu2 ji3 si1"
 * 或: "哽:ang2:ngang2,𬒔:ang2:ngang2" (多个读音用冒号分隔)
 * @param {string} headwordsStr - 词头和拼音字符串
 * @returns {Array} [{headword, jyutping: [...]}, ...]
 */
function parseHeadwordsWithJyutping(headwordsStr) {
  if (!headwordsStr || !headwordsStr.trim()) {
    return []
  }

  const variants = []
  const parts = headwordsStr.split(',').map(p => p.trim()).filter(p => p)

  parts.forEach(part => {
    // 分离词头和拼音: "小意思:siu2 ji3 si1" 或 "哽:ang2:ngang2"
    const colonIndex = part.indexOf(':')
    if (colonIndex > 0) {
      const headword = part.substring(0, colonIndex).trim()
      const jyutpingStr = part.substring(colonIndex + 1).trim()
      
      if (headword && jyutpingStr) {
        // 检查是否有多个读音（用冒号分隔，且每个部分都是单个音节）
        // 例如: "ang2:ngang2" → ["ang2", "ngang2"]
        // 但: "siu2 ji3 si1" → ["siu2 ji3 si1"] (包含空格的是完整读音)
        const jyutpingParts = jyutpingStr.split(':').map(p => p.trim()).filter(p => p)
        
        // 如果有多个部分，且每个部分都不包含空格（单音节），则分开处理
        if (jyutpingParts.length > 1 && jyutpingParts.every(p => !p.includes(' '))) {
          variants.push({ 
            headword, 
            jyutping: jyutpingParts 
          })
        } else {
          // 否则作为单个完整的读音
          variants.push({ 
            headword, 
            jyutping: [jyutpingStr] 
          })
        }
      }
    }
  })

  return variants
}

/**
 * 解析内容字段
 * 格式包含:
 * - (pos:xxx) 词性
 * - <explanation> 释义部分开始
 * - <eg> 例句部分开始
 * - yue: 粤语内容
 * - eng: 英语翻译
 * - ---- 义项分隔符
 * 
 * @param {string} content - 内容字符串
 * @returns {Array<Object>} 义项数组
 */
function parseContent(content) {
  if (!content || !content.trim()) {
    return []
  }

  // 按 ---- 分割多个义项
  const senseParts = content.split(/\n?----\n?/).filter(p => p.trim())
  
  const senses = []

  senseParts.forEach(sensePart => {
    const sense = {
      definition: '',
      label: '',
      examples: []
    }

    // 提取词性标签 (pos:xxx)
    const posMatch = sensePart.match(/\(pos:([^)]+)\)/)
    if (posMatch) {
      sense.label = posMatch[1].trim()
    }

    // 分割为 explanation 和 eg 部分
    const parts = sensePart.split(/<eg>/i)
    const explanationPart = parts[0] || ''
    const examplePart = parts[1] || ''

    // 解析 explanation 部分
    if (explanationPart) {
      // 移除 <explanation> 标记和 pos 标记
      let explanationText = explanationPart
        .replace(/<explanation>/gi, '')
        .replace(/\(pos:[^)]+\)/g, '')
        .trim()

      // 提取 yue: 和 eng: 行
      const yueMatch = explanationText.match(/yue:(.+?)(?=\neng:|$)/s)
      const engMatch = explanationText.match(/eng:(.+?)$/s)

      if (yueMatch) {
        sense.definition = yueMatch[1].trim()
        
        // 如果有英语翻译，添加到定义中
        if (engMatch) {
          const engText = engMatch[1].trim()
          sense.definition += ` (${engText})`
        }
      } else {
        // 如果没有明确的 yue: 标记，尝试提取所有文本
        sense.definition = explanationText
          .split('\n')
          .filter(line => line.trim() && !line.match(/^(yue|eng):/))
          .join(' ')
          .trim()
      }
    }

    // 解析例句部分
    if (examplePart) {
      // 提取所有 yue: 行作为例句
      const yueLines = examplePart.match(/yue:([^\n]+)/g)
      const engLines = examplePart.match(/eng:([^\n]+)/g)

      if (yueLines) {
        yueLines.forEach((yueLine, index) => {
          // 提取粤语例句
          const yueText = yueLine.replace(/^yue:/, '').trim()
          
          // 尝试匹配对应的英语翻译
          let translation = null
          if (engLines && engLines[index]) {
            translation = engLines[index].replace(/^eng:/, '').trim()
            // 移除首尾的引号
            translation = translation.replace(/^[""]|[""]$/g, '')
          }

          // 从粤语例句中分离出例句文本和拼音
          // 格式可能是: 呢份禮物仔，小小意思，當係我報答返你。 (nei1 fan6 lai5 mat6 zai2, ...)
          const exampleMatch = yueText.match(/^(.+?)\s*\(([^)]+)\)/)
          
          if (exampleMatch) {
            const exampleText = exampleMatch[1].trim()
            const exampleJyutping = exampleMatch[2].trim()
            
            sense.examples.push({
              text: exampleText,
              jyutping: exampleJyutping,
              translation: translation
            })
          } else {
            // 没有拼音，只有例句文本
            sense.examples.push({
              text: yueText,
              translation: translation
            })
          }
        })
      }
    }

    // 只添加有定义的义项
    if (sense.definition) {
      senses.push(sense)
    }
  })

  return senses
}

/**
 * 转换单个 CSV 行为标准 DictionaryEntry
 * @param {Object} row - CSV 行数据
 * @returns {Object} DictionaryEntry 对象
 */
export function transformRow(row) {
  // 使用预处理后的标准列名
  const id = row.id || ''
  const headwordsJyutping = row.headwords_jyutping || ''
  const content = row.content || ''
  const reviewStatus = row.review_status || ''
  const publishStatus = row.publish_status || ''

  // 跳过版权声明行、空行和无效行
  if (!id || 
      typeof id !== 'string' || 
      id.trim() === '' ||
      id.includes('Generated') || 
      id.includes('ALL RIGHTS RESERVED') ||
      id.includes('---')) {
    throw new Error('Invalid row: copyright, empty or invalid line')
  }
  
  // 验证 id 是否为数字
  if (isNaN(parseInt(id))) {
    throw new Error('Invalid row: id is not a number')
  }

  // 1. 解析词头和拼音
  const headwordVariants = parseHeadwordsWithJyutping(headwordsJyutping)
  
  if (headwordVariants.length === 0) {
    throw new Error('No valid headword found')
  }

  // 使用第一个变体作为主词头
  const primaryVariant = headwordVariants[0]
  const headwordInfo = cleanHeadword(primaryVariant.headword)

  // 2. 解析内容获取义项
  const senses = parseContent(content)
  
  if (senses.length === 0) {
    throw new Error('No valid senses found')
  }

  // 3. 收集所有粤拼读音（展开所有变体的所有读音）
  const allJyutping = []
  headwordVariants.forEach(variant => {
    if (Array.isArray(variant.jyutping)) {
      allJyutping.push(...variant.jyutping)
    } else {
      allJyutping.push(variant.jyutping)
    }
  })
  // 去重
  const uniqueJyutping = [...new Set(allJyutping)]

  // 4. 检测词条类型
  const entryType = guessEntryType(headwordInfo.normalized)

  // 5. 构建标准词条
  const entry = {
    id: `${DICTIONARY_INFO.id}_${String(id).padStart(6, '0')}`,
    source_book: DICTIONARY_INFO.source_book,
    source_id: String(id),
    
    dialect: DICTIONARY_INFO.dialect,
    
    headword: {
      display: primaryVariant.headword,
      search: headwordInfo.normalized,
      normalized: headwordInfo.normalized,
      is_placeholder: headwordInfo.isPlaceholder || false
    },
    
    phonetic: {
      original: Array.isArray(primaryVariant.jyutping) 
        ? primaryVariant.jyutping[0] 
        : primaryVariant.jyutping,
      jyutping: uniqueJyutping
    },
    
    entry_type: entryType,
    
    senses: senses,
    
    meta: {
      // 词头变体
      headword_variants: headwordVariants.length > 1 
        ? headwordVariants.slice(1).map(v => v.headword)
        : null,
      
      // 审核状态
      review_status: reviewStatus && reviewStatus.trim() ? reviewStatus.trim() : null,
      is_reviewed: reviewStatus && !reviewStatus.includes('UNREVIEWED'),
      
      // 公开状态
      publish_status: publishStatus && publishStatus.trim() ? publishStatus.trim() : null,
      is_public: publishStatus && !publishStatus.includes('未公開'),
      
      // 数据来源信息
      source: 'words.hk',
      contributors: 'words.hk community'
    },
    
    created_at: new Date().toISOString()
  }

  // 6. 生成搜索关键词
  entry.keywords = generateKeywords(entry)
  
  // 7. 添加所有词头变体和读音到关键词
  headwordVariants.forEach(variant => {
    entry.keywords.push(variant.headword)
    
    // 添加读音（可能是数组）
    if (Array.isArray(variant.jyutping)) {
      variant.jyutping.forEach(jp => {
        entry.keywords.push(jp)
        entry.keywords.push(jp.replace(/\s+/g, ''))
      })
    } else {
      entry.keywords.push(variant.jyutping)
      entry.keywords.push(variant.jyutping.replace(/\s+/g, ''))
    }
  })
  
  // 去重
  entry.keywords = [...new Set(entry.keywords)]

  return entry
}

/**
 * 判断词条类型
 * @param {string} word - 词头
 * @returns {string} 'character' | 'word' | 'phrase'
 */
function guessEntryType(word) {
  // 去除所有非汉字字符
  const chineseChars = word.match(/[\u4e00-\u9fa5]/g) || []
  const length = chineseChars.length
  
  if (length === 0) return 'word' // 外来词
  if (length === 1) return 'character'
  if (length <= 4) return 'word'
  return 'phrase'
}

/**
 * 批量转换
 * @param {Array<Object>} rows - CSV 行数组
 * @returns {Object} { entries, errors }
 */
export function transformAll(rows) {
  const entries = []
  const errors = []
  let skippedRows = 0
  
  // 预处理：修正列名
  const processedRows = preprocessRows(rows)
  
  processedRows.forEach((row, index) => {
    try {
      const entry = transformRow(row)
      entries.push(entry)
    } catch (error) {
      // 跳过版权声明、空行等无效行，不计入错误
      if (error.message.includes('Invalid row') || 
          error.message.includes('copyright') ||
          error.message.includes('No valid headword') ||
          error.message.includes('No valid senses')) {
        skippedRows++
      } else {
        // 其他错误需要记录
        errors.push({
          row: index + 2, // +2 因为有表头
          error: error.message,
          data: row
        })
      }
    }
  })
  
  console.log(`ℹ️  跳过了 ${skippedRows} 个无效行（版权声明、空行等）`)
  
  return { entries, errors }
}

/**
 * 后处理：可选的聚合逻辑
 * words.hk 数据已经按词条组织，通常不需要聚合
 * @param {Array<Object>} entries - 词条数组
 * @returns {Array<Object>} 处理后的词条数组
 */
export function aggregateEntries(entries) {
  // words.hk 的数据已经是按完整词条组织的，
  // 每个 ID 对应一个完整的词条，包含所有义项
  // 因此不需要特殊的聚合逻辑
  return entries
}

/**
 * 特殊字段处理说明
 */
export const FIELD_NOTES = {
  headwords_jyutping: '词头和拼音，格式: "词头1:拼音1,词头2:拼音2"，支持多个变体',
  content: '结构化内容，包含 (pos:), <explanation>, <eg>, yue:, eng: 等标记',
  review_status: '审核状态，标记词条是否已经过审核',
  publish_status: '公开状态，标记词条是否公开',
  multiple_senses: '多个义项用 ---- 分隔'
}


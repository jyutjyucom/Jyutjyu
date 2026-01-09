/**
 * 《廣州方言詞典》数据适配器
 * 
 * 原始 CSV 格式:
 * index, headword, verified_headword, jyutping, verified_jyutping, definition, page, source_file, verification_status, verification_notes
 * 
 * 特点:
 * - 综合性方言词典，收录广州话词汇及释义
 * - 包含已校对和未校对的数据（有 verified_headword 或 verified_jyutping 的行表示未校对完成）
 * - 每行代表一个独立词条
 * 
 * 数据处理规则:
 * - 过滤掉 verified_headword 或 verified_jyutping 有内容的行（未校对完成）
 * - 忽略 source_file, verification_status, verification_notes 字段
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
  id: 'gz-dialect',
  name: '廣州方言詞典',
  dialect: {
    name: '广州话',
    region_code: 'GZ'
  },
  source_book: '廣州方言詞典',
  author: '白宛如',
  publisher: '江苏教育出版社',
  year: 1998,
  version: new Date().toISOString().slice(0, 10),
  description: '收录广州话词汇，包含释义、读音、用例等，是研究粤语方言的重要工具书',
  source: 'scanned_from_internet',
  license: 'Copyrighted. For technical demonstration only.',
  usage_restriction: '此词表内容受版权保护，来源于互联网公开扫描资源，仅用于本项目原型验证和技术演示，不得用于商业用途或二次分发。',
  attribution: '《廣州方言詞典》，白宛如编，江苏教育出版社，1998年版'
}

/**
 * 必填字段验证
 */
export const REQUIRED_FIELDS = ['index', 'headword', 'jyutping', 'definition']

/**
 * 检查行是否应该被过滤（未校对完成）
 * @param {Object} row - CSV 行数据
 * @returns {boolean} true 表示应该过滤掉，false 表示应该保留
 */
function shouldFilterRow(row) {
  // 如果 verified_headword 或 verified_jyutping 有内容，说明还没校对好
  return (row.verified_headword && row.verified_headword.trim() !== '') ||
         (row.verified_jyutping && row.verified_jyutping.trim() !== '')
}

/**
 * 解析释义中的多义项（①②③格式）和例句
 * @param {string} definition - 释义文本
 * @returns {Array<Object>} 义项数组
 */
function parseSenses(definition) {
  if (!definition || !definition.trim()) {
    return [{
      definition: '',
      examples: []
    }]
  }
  
  const text = definition.trim()
  
  // 检查是否包含 ① ② ③ 等标记
  const sensePattern = /[①②③④⑤⑥⑦⑧⑨⑩]/g
  const matches = [...text.matchAll(sensePattern)]
  
  if (matches.length === 0) {
    // 没有多义项标记，整个作为一个义项
    return parseExamplesInDefinition(text)
  }
  
  // 有多义项标记，分割
  const senses = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + 1 // 跳过标记符号
    const end = i < matches.length - 1 ? matches[i + 1].index : text.length
    const senseText = text.substring(start, end).trim()
    
    if (senseText) {
      const parsedSenses = parseExamplesInDefinition(senseText)
      senses.push(...parsedSenses)
    }
  }
  
  return senses.length > 0 ? senses : [{
    definition: text,
    examples: []
  }]
}

/**
 * 从释义文本中提取例句
 * @param {string} text - 释义文本
 * @returns {Array<Object>} 包含单个义项的数组
 */
function parseExamplesInDefinition(text) {
  if (!text || !text.trim()) {
    return [{
      definition: '',
      examples: []
    }]
  }
  
  const sense = {
    definition: '',
    examples: []
  }
  
  // 尝试分离释义和例句
  // 例句通常用冒号、竖线或尖括号分隔
  // 格式1: 释义：例句1丨例句2
  // 格式2: 释义<翻译>
  // 格式3: 释义 ‖ 备注
  
  // 先提取备注（‖ 后面的内容）
  let mainText = text
  let note = null
  const noteMatch = text.match(/\s*‖\s*(.+)$/)
  if (noteMatch) {
    note = noteMatch[1].trim()
    mainText = text.substring(0, noteMatch.index).trim()
  }
  
  // 检查是否有例句（用冒号或丨分隔）
  const exampleSplit = mainText.split(/[:：]/)
  
  if (exampleSplit.length > 1) {
    // 有冒号分隔，第一部分是释义，后面是例句
    sense.definition = exampleSplit[0].trim()
    
    // 解析例句（可能用丨分隔多个例句）
    const exampleText = exampleSplit.slice(1).join('：').trim()
    const exampleParts = exampleText.split(/[丨｜|]/).map(part => part.trim()).filter(part => part)
    
    exampleParts.forEach(part => {
      // 检查是否有尖括号包裹的翻译
      const translationMatch = part.match(/<([^>]+)>/)
      
      if (translationMatch) {
        const translation = translationMatch[1].trim()
        const exampleText = part.replace(/<[^>]+>/, '').trim()
        sense.examples.push({
          text: exampleText,
          translation: translation
        })
      } else {
        sense.examples.push({
          text: part
        })
      }
    })
  } else {
    // 没有冒号分隔，整个作为释义
    sense.definition = mainText
  }
  
  // 如果有备注，添加到释义末尾
  if (note) {
    if (sense.definition) {
      sense.definition += ` ‖ ${note}`
    } else {
      sense.definition = `‖ ${note}`
    }
  }
  
  return [sense]
}

/**
 * 转换粤拼声调标记
 * 规则：1' → 1`53，1 → 1`55
 * @param {string} jyutping - 原始粤拼
 * @returns {string} 转换后的粤拼
 */
function convertJyutpingTones(jyutping) {
  if (!jyutping) return jyutping
  
  // 先处理 1'（带撇号），避免与单独的 1 冲突
  let converted = jyutping.replace(/1'/g, '1`53')
  
  // 再处理单独的 1（不在反引号后面的）
  // 使用负向后查找，确保不匹配已经转换的 1`53 中的 1
  converted = converted.replace(/1(?!`)/g, '1`55')
  
  return converted
}

/**
 * 转换单个 CSV 行为标准 DictionaryEntry
 * @param {Object} row - CSV 行数据
 * @returns {Object|null} DictionaryEntry 对象，如果应该过滤则返回 null
 */
export function transformRow(row) {
  // 1. 检查是否应该过滤
  if (shouldFilterRow(row)) {
    return null
  }
  
  // 2. 清理词头
  const headwordInfo = cleanHeadword(row.headword)
  
  // 3. 处理粤拼并转换声调
  const jyutpingArray = row.jyutping
    ? row.jyutping.split(/[,;]/)
        .map(j => j.trim())
        .filter(j => j)
        .map(j => convertJyutpingTones(j))
    : []
  
  // 4. 解析释义和例句
  const senses = parseSenses(row.definition)
  
  // 5. 检测词条类型
  const entryType = guessEntryType(headwordInfo.normalized)
  
  // 6. 构建标准词条
  const entry = {
    id: `${DICTIONARY_INFO.id}_${String(row.index).padStart(6, '0')}`,
    source_book: DICTIONARY_INFO.source_book,
    source_id: String(row.index),
    
    dialect: DICTIONARY_INFO.dialect,
    
    headword: {
      display: row.headword,
      search: headwordInfo.normalized,
      normalized: headwordInfo.normalized,
      is_placeholder: headwordInfo.isPlaceholder || false
    },
    
    phonetic: {
      original: row.jyutping, // 使用粤拼作为原始注音
      jyutping: jyutpingArray
    },
    
    entry_type: entryType,
    
    senses: senses,
    
    meta: {
      // 页码
      page: row.page || null,
      
      // 注：source_file, verification_status, verification_notes 字段已省略
    },
    
    created_at: new Date().toISOString()
  }
  
  // 7. 生成搜索关键词
  entry.keywords = generateKeywords(entry)
  
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
 * @returns {Object} { entries, errors, filtered }
 */
export function transformAll(rows) {
  const entries = []
  const errors = []
  let filteredCount = 0
  
  rows.forEach((row, index) => {
    try {
      const entry = transformRow(row)
      
      if (entry === null) {
        // 被过滤的行（未校对完成）
        filteredCount++
      } else {
        entries.push(entry)
      }
    } catch (error) {
      errors.push({
        row: index + 2, // +2 因为有表头且从1开始计数
        error: error.message,
        data: row
      })
    }
  })
  
  return { entries, errors, filteredCount }
}

/**
 * 特殊字段处理说明
 */
export const FIELD_NOTES = {
  headword: '词头，主词条',
  verified_headword: '校对后的词头（如有内容说明未校对完成，会被过滤）',
  jyutping: '粤拼',
  verified_jyutping: '校对后的粤拼（如有内容说明未校对完成，会被过滤）',
  definition: '释义，可能包含多义项（①②③）、例句、备注（‖）',
  page: '词典页码',
  source_file: '已省略，不处理',
  verification_status: '已省略，不处理',
  verification_notes: '已省略，不处理'
}

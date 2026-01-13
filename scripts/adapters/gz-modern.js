/**
 * 《现代粤语词典》数据适配器
 * 
 * 原始 CSV 格式:
 * index, entry_type, headword, pronunciation, jyutping, api_suggestion, verification_status, definition, page, source_file
 * 
 * 特点:
 * - 现代权威粤语词典，收录广州话词汇及释义
 * - pronunciation 为原书拼音标注
 * - jyutping 为转换后的粤拼（用于词典展示和搜索优化）
 * - 包含校对状态（verification_status）
 * 
 * 数据处理规则:
 * - 只保留 verification_status 为 "✓ 匹配" 的词条
 * - entry_type 直接使用原书标注（字头/词头）
 * - 忽略 api_suggestion, verification_status, source_file 字段
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
  id: 'gz-modern',
  name: '现代粤语词典',
  dialect: {
    name: '广州话',
    region_code: 'GZ'
  },
  source_book: '现代粤语词典',
  author: '范俊军、范兰德等',
  publisher: '广东人民出版社',
  year: 2021,
  version: new Date().toISOString().slice(0, 10),
  description: '现代权威粤语词典，系统收录广州话词汇，包含详细释义、读音、用例等',
  source: 'scanned_from_internet',
  license: 'Copyrighted. For technical demonstration only.',
  usage_restriction: '此词表内容受版权保护，来源于互联网公开扫描资源，仅用于本项目原型验证和技术演示，不得用于商业用途或二次分发。',
  attribution: '《现代粤语词典》，范俊军、范兰德等编，广东人民出版社，2021年版'
}

/**
 * 必填字段验证
 */
export const REQUIRED_FIELDS = ['index', 'headword', 'jyutping', 'definition']

/**
 * 检查行是否应该被过滤（未校对完成或非"✓ 匹配"状态）
 * @param {Object} row - CSV 行数据
 * @returns {boolean} true 表示应该过滤掉，false 表示应该保留
 */
function shouldFilterRow(row) {
  // 只保留 verification_status 为 "✓ 匹配" 的词条
  return row.verification_status !== '✓ 匹配'
}

/**
 * 解析释义中的多义项（①②③格式）和例句
 * @param {string} definition - 释义文本
 * @returns {Object} { senses: 义项数组, notes: 作者备注 }
 */
function parseSenses(definition) {
  if (!definition || !definition.trim()) {
    return {
      senses: [{
        definition: '',
        examples: []
      }],
      notes: null
    }
  }
  
  const text = definition.trim()
  
  // 先提取备注（‖ 或 || 后面的内容，兼容OCR识别差异）
  let mainText = text
  let notes = null
  const noteMatch = text.match(/\s*(?:‖|\|\|)\s*(.+)$/)
  if (noteMatch) {
    notes = noteMatch[1].trim()
    mainText = text.substring(0, noteMatch.index).trim()
  }
  
  // 检查是否包含 ① ② ③ 等标记
  const sensePattern = /[①②③④⑤⑥⑦⑧⑨⑩]/g
  const matches = [...mainText.matchAll(sensePattern)]
  
  if (matches.length === 0) {
    // 没有多义项标记，整个作为一个义项
    return {
      senses: parseExamplesInDefinition(mainText),
      notes
    }
  }
  
  // 有多义项标记，分割
  const senses = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + 1 // 跳过标记符号
    const end = i < matches.length - 1 ? matches[i + 1].index : mainText.length
    const senseText = mainText.substring(start, end).trim()
    
    if (senseText) {
      const parsedSenses = parseExamplesInDefinition(senseText)
      senses.push(...parsedSenses)
    }
  }
  
  return {
    senses: senses.length > 0 ? senses : [{
      definition: mainText,
      examples: []
    }],
    notes
  }
}

/**
 * 从释义文本中提取例句
 * @param {string} text - 释义文本（不含备注）
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
  // 例句通常用冒号、竖线或方括号分隔
  // 格式1: 释义：例句1丨例句2
  // 格式2: 释义［翻译］
  
  // 检查是否有例句（用冒号或丨分隔）
  const exampleSplit = text.split(/[:：]/)
  
  if (exampleSplit.length > 1) {
    // 有冒号分隔，第一部分是释义，后面是例句
    sense.definition = exampleSplit[0].trim()
    
    // 解析例句（可能用丨分隔多个例句）
    const exampleText = exampleSplit.slice(1).join('：').trim()
    const exampleParts = exampleText.split(/[丨｜|]/).map(part => part.trim()).filter(part => part)
    
    exampleParts.forEach(part => {
      // 检查是否有方括号包裹的翻译（［］）
      const translationMatch = part.match(/［([^］]+)］/)
      
      if (translationMatch) {
        const translation = translationMatch[1].trim()
        const exampleText = part.replace(/［[^］]+］/, '').trim()
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
    // 没有冒号分隔，可能整个定义中就包含［］翻译
    // 检查是否有方括号包裹的翻译
    const translationMatch = text.match(/［([^］]+)］/)
    
    if (translationMatch) {
      // 有翻译，提取出来
      const translation = translationMatch[1].trim()
      const defText = text.replace(/［[^］]+］/, '').trim()
      sense.definition = defText
      // 这种情况翻译可能作为整体释义的补充说明
      if (translation) {
        sense.examples.push({
          text: '',
          translation: translation
        })
      }
    } else {
      // 没有分隔，整个作为释义
      sense.definition = text
    }
  }
  
  return [sense]
}

/**
 * 将原书的词条类型映射到标准格式
 * @param {string} originalType - 原书分类（字头/词头）
 * @param {string} headword - 词头文本
 * @returns {string} 'character' | 'word' | 'phrase'
 */
function mapEntryType(originalType, headword) {
  // 如果原书标记为"字头"，直接返回 character
  if (originalType === '字头') {
    return 'character'
  }
  
  // 如果原书标记为"词头"，根据长度判断
  if (originalType === '词头') {
    const chineseChars = headword.match(/[\u4e00-\u9fa5]/g) || []
    const length = chineseChars.length
    
    if (length === 0) return 'word' // 外来词
    if (length === 1) return 'character' // 单字（以防万一）
    if (length <= 4) return 'word' // 2-4字为词语
    return 'phrase' // 5字以上为短语
  }
  
  // 默认根据长度判断
  const chineseChars = headword.match(/[\u4e00-\u9fa5]/g) || []
  const length = chineseChars.length
  
  if (length === 0) return 'word'
  if (length === 1) return 'character'
  if (length <= 4) return 'word'
  return 'phrase'
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
  
  // 3. 处理粤拼（已经是转换后的格式）
  const jyutpingArray = row.jyutping
    ? row.jyutping.split(/[,;/]/)
        .map(j => j.trim())
        .filter(j => j)
    : []
  
  // 4. 解析释义和例句（包括提取作者备注）
  const parseResult = parseSenses(row.definition)
  
  // 5. 映射词条类型：原书分类 → 标准格式
  const entryType = mapEntryType(row.entry_type, headwordInfo.normalized)
  
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
      original: row.pronunciation || '', // 原书拼音标注
      jyutping: jyutpingArray // 转换后的粤拼
    },
    
    entry_type: entryType,
    
    senses: parseResult.senses,
    
    meta: {
      // 页码
      page: row.page || null,
      
      // 原书词条分类（字头/词头）
      original_entry_type: row.entry_type || null,
      
      // 作者备注（从释义中提取的 || 后的内容）
      notes: parseResult.notes || undefined
      
      // 注：api_suggestion, verification_status, source_file 字段已省略
    },
    
    created_at: new Date().toISOString()
  }
  
  // 7. 生成搜索关键词
  entry.keywords = generateKeywords(entry)
  
  return entry
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
        // 被过滤的行（非"✓ 匹配"状态）
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
  pronunciation: '原书拼音标注',
  jyutping: '转换后的粤拼，用于词典展示和搜索优化',
  definition: '释义，可能包含多义项（①②③）、例句。双竖线后的内容会被提取为作者备注，存入 meta.notes',
  page: '词典页码',
  entry_type: '原书词条类型（字头/词头），映射为标准格式（character/word/phrase），原值保存到 meta.original_entry_type',
  api_suggestion: '已省略，不处理',
  verification_status: '用于过滤，只保留"✓ 匹配"的词条，不存入metadata',
  source_file: '已省略，不处理'
}

/**
 * 《实用广州话分类词典》数据适配器
 * 
 * 原始 CSV 格式:
 * index, words, jyutping, meanings, note, category_1, category_2, category_3
 */

import {
  generateKeywords,
  cleanHeadword,
  parseExamples,
  parseNote
} from '../utils/text-processor.js'

/**
 * 词典元数据
 */
export const DICTIONARY_INFO = {
  id: 'gz-practical-classified',
  name: '实用广州话分类词典',
  dialect: {
    name: '广州话',
    region_code: 'GZ'
  },
  source_book: '实用广州话分类词典',
  author: '麦耘、谭步云',
  publisher: '广东人民出版社',
  year: 1997
}

/**
 * 必填字段验证
 */
export const REQUIRED_FIELDS = ['index', 'words', 'jyutping', 'meanings']

/**
 * 解析词头的特殊标记并生成异形词组合
 * @param {string} words - 原始词头字符串
 * @returns {Object} { 
 *   mainWord: 主词头,
 *   variants: 异形词完整组合数组,
 *   hasCrossReference: 是否为重见词条,
 *   variantNumber: 同形异义标记数字
 * }
 */
function parseHeadwordMarkers(words) {
  if (!words) return { mainWord: '', variants: [], hasCrossReference: false, variantNumber: null }
  
  let text = words.trim()
  const result = {
    mainWord: '',
    variants: [],
    hasCrossReference: false,
    variantNumber: null
  }
  
  // 1. 检查是否有星号（重见标记）
  if (text.startsWith('*')) {
    result.hasCrossReference = true
    text = text.substring(1).trim()
  }
  
  // 2. 解析括号内的异形词并生成所有组合
  // 例如: "阿（亞）崩阿（亞）狗" → ["亞崩阿狗", "阿崩亞狗", "亞崩亞狗"]
  const variants = generateHeadwordVariants(text)
  
  // 3. 主词头是移除所有括号内容后的结果
  result.mainWord = text.replace(/[（(][^）)]+[）)]/g, '').trim()
  
  // 4. 异形词是除了主词头之外的所有组合
  result.variants = variants.filter(v => v !== result.mainWord)
  
  // 5. 检查是否有数字后缀标记（同形异义）
  const numberMatch = result.mainWord.match(/^(.+?)(\d+)$/)
  if (numberMatch) {
    result.mainWord = numberMatch[1]
    result.variantNumber = parseInt(numberMatch[2])
  }
  
  return result
}

/**
 * 生成词头的所有异形词组合
 * @param {string} text - 包含括号标记的词头
 * @returns {Array<string>} 所有可能的组合（包括原始词头）
 * 
 * 例如:
 * - "牛百頁（葉）" → ["牛百頁", "牛百葉"]
 * - "阿（亞）崩阿（亞）狗" → ["阿崩阿狗", "亞崩阿狗", "阿崩亞狗", "亞崩亞狗"]
 */
function generateHeadwordVariants(text) {
  if (!text) return []
  
  // 查找所有括号及其位置
  const parts = []
  let currentPos = 0
  const regex = /([^（(]*)[（(]([^）)]+)[）)]/g
  let match
  
  while ((match = regex.exec(text)) !== null) {
    const beforeBracket = match[1]
    const insideBracket = match[2]
    
    parts.push({
      before: beforeBracket,
      options: [
        beforeBracket.slice(-1), // 括号前的最后一个字（外部字）
        insideBracket             // 括号内的字（异形词）
      ],
      position: match.index
    })
  }
  
  // 如果没有括号，直接返回原文
  if (parts.length === 0) {
    return [text]
  }
  
  // 重新解析，按字符分段
  const segments = []
  let lastIndex = 0
  
  const bracketRegex = /[（(]([^）)]+)[）)]/g
  let bracketMatch
  
  while ((bracketMatch = bracketRegex.exec(text)) !== null) {
    // 添加括号前的文本
    const beforeText = text.substring(lastIndex, bracketMatch.index)
    if (beforeText) {
      // 括号前的内容，最后一个字是可替换的
      if (beforeText.length > 1) {
        segments.push({ type: 'fixed', text: beforeText.slice(0, -1) })
      }
      segments.push({ 
        type: 'variant', 
        options: [
          beforeText.slice(-1),      // 外部字
          bracketMatch[1]             // 括号内的字
        ]
      })
    }
    
    lastIndex = bracketRegex.lastIndex
  }
  
  // 添加最后剩余的文本
  if (lastIndex < text.length) {
    segments.push({ type: 'fixed', text: text.substring(lastIndex) })
  }
  
  // 生成所有组合
  const combinations = []
  
  function generateCombinations(index, current) {
    if (index >= segments.length) {
      combinations.push(current)
      return
    }
    
    const segment = segments[index]
    if (segment.type === 'fixed') {
      generateCombinations(index + 1, current + segment.text)
    } else {
      // variant
      segment.options.forEach(option => {
        generateCombinations(index + 1, current + option)
      })
    }
  }
  
  generateCombinations(0, '')
  
  // 去重并返回
  return [...new Set(combinations)]
}

/**
 * 解析备注中的重见信息
 * @param {string} note - 备注字符串
 * @returns {Object} { crossReferences: 重见类项数组, cleanedNote: 清理后的备注 }
 */
function parseCrossReferences(note) {
  if (!note) return { crossReferences: [], cleanedNote: null }
  
  const crossReferences = []
  let cleanedNote = note
  
  // 匹配 [重見XXX] 或 [重见XXX] 格式
  const matches = note.match(/\[重[見见]([^\]]+)\]/g)
  if (matches) {
    matches.forEach(match => {
      // 提取重见的类项
      const ref = match.replace(/\[重[見见]([^\]]+)\]/, '$1').trim()
      if (ref) {
        crossReferences.push(ref)
      }
    })
    // 移除重见标记，得到清理后的备注
    cleanedNote = note.replace(/\[重[見见][^\]]+\]/g, '').trim()
    if (!cleanedNote) cleanedNote = null
  }
  
  return { crossReferences, cleanedNote }
}

/**
 * 转换单个 CSV 行为标准 DictionaryEntry
 * @param {Object} row - CSV 行数据
 * @returns {Object} DictionaryEntry 对象
 */
export function transformRow(row) {
  // 1. 解析词头的特殊标记（必须在 cleanHeadword 之前）
  const headwordMarkers = parseHeadwordMarkers(row.words)
  
  // 2. 清理词头（cleanHeadword 会移除数字，但我们已经在 parseHeadwordMarkers 中提取了）
  // 注意：不要传入原始 row.words，而是传入处理后的 mainWord
  const headwordInfo = {
    normalized: headwordMarkers.mainWord,
    isPlaceholder: headwordMarkers.mainWord.includes('□')
  }
  
  // 3. 解析释义和例句（现在返回数组）
  const sensesArray = parseExamples(row.meanings)
  
  // 4. 处理粤拼
  const jyutpingArray = row.jyutping
    ? row.jyutping.split(/[,;]/).map(j => j.trim()).filter(j => j)
    : []
  
  // 5. 构建分类路径
  const categories = [row.category_1, row.category_2, row.category_3]
    .filter(c => c && c.trim())
  const categoryPath = categories.join(' > ')
  
  // 6. 解析备注中的重见信息
  const { crossReferences, cleanedNote } = parseCrossReferences(row.note)
  
  // 7. 构建标准词条
  const entry = {
    id: `${DICTIONARY_INFO.id}_${String(row.index).padStart(6, '0')}`,
    source_book: DICTIONARY_INFO.source_book,
    source_id: row.index,
    
    dialect: DICTIONARY_INFO.dialect,
    
    headword: {
      display: headwordMarkers.mainWord,
      search: headwordInfo.normalized,
      normalized: headwordInfo.normalized,
      is_placeholder: headwordInfo.isPlaceholder || false
    },
    
    phonetic: {
      original: row.jyutping,
      jyutping: jyutpingArray
    },
    
    entry_type: guessEntryType(headwordInfo.normalized),
    
    senses: sensesArray.map(sense => ({
      definition: sense.definition,
      examples: sense.examples.map(ex => ({
        text: ex.text,
        translation: ex.translation
      }))
    })),
    
    meta: {
      category: categoryPath,
      subcategories: categories,
      notes: cleanedNote || parseNote(row.note),
      
      // 异形词
      headword_variants: headwordMarkers.variants.length > 0 
        ? headwordMarkers.variants 
        : null,
      
      // 重见标记
      has_cross_reference: headwordMarkers.hasCrossReference || crossReferences.length > 0,
      cross_references: crossReferences.length > 0 ? crossReferences : null,
      
      // 同形异义标记
      variant_number: headwordMarkers.variantNumber
    },
    
    created_at: new Date().toISOString()
  }
  
  // 8. 生成搜索关键词
  entry.keywords = generateKeywords(entry)
  
  // 9. 添加异形词到关键词
  if (headwordMarkers.variants.length > 0) {
    headwordMarkers.variants.forEach(variant => {
      entry.keywords.push(variant)
    })
    entry.keywords = [...new Set(entry.keywords)]
  }
  
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
  
  if (length === 0) return 'word' // 外来词如 "Sir"
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
  
  rows.forEach((row, index) => {
    try {
      const entry = transformRow(row)
      entries.push(entry)
    } catch (error) {
      errors.push({
        row: index + 2, // +2 因为有表头
        error: error.message,
        data: row
      })
    }
  })
  
  return { entries, errors }
}

/**
 * 后处理：聚合多义项
 * 如果连续多行的 words 和 jyutping 相同，则聚合为一个词条的多个 senses
 * @param {Array<Object>} entries - 词条数组
 * @returns {Array<Object>} 聚合后的词条数组
 */
export function aggregateEntries(entries) {
  if (entries.length === 0) return []
  
  const aggregated = []
  let currentEntry = { ...entries[0] }
  
  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i]
    
    // 检查是否应该聚合
    const shouldAggregate = 
      entry.headword.normalized === currentEntry.headword.normalized &&
      entry.phonetic.jyutping[0] === currentEntry.phonetic.jyutping[0]
    
    if (shouldAggregate) {
      // 合并 senses
      currentEntry.senses.push(...entry.senses)
      
      // 合并关键词
      currentEntry.keywords = [
        ...new Set([...currentEntry.keywords, ...entry.keywords])
      ]
    } else {
      // 保存当前词条，开始新词条
      aggregated.push(currentEntry)
      currentEntry = { ...entry }
    }
  }
  
  // 添加最后一个词条
  aggregated.push(currentEntry)
  
  return aggregated
}

/**
 * 特殊字段处理说明
 */
export const FIELD_NOTES = {
  words: '可能包含特殊标记: * 表示特殊注意，数字表示同音异义',
  meanings: '释义和例句混合，用句号和括号分隔',
  note: '方括号包裹的备注信息，通常是与普通话的对比',
  category: '三级分类结构，构建时合并为路径字符串'
}


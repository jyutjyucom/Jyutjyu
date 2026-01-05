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
 * 转换单个 CSV 行为标准 DictionaryEntry
 * @param {Object} row - CSV 行数据
 * @returns {Object} DictionaryEntry 对象
 */
export function transformRow(row) {
  // 1. 清理词头
  const headwordInfo = cleanHeadword(row.words)
  
  // 2. 解析释义和例句（现在返回数组）
  const sensesArray = parseExamples(row.meanings)
  
  // 3. 处理粤拼
  const jyutpingArray = row.jyutping
    ? row.jyutping.split(/[,;]/).map(j => j.trim()).filter(j => j)
    : []
  
  // 4. 构建分类路径
  const categories = [row.category_1, row.category_2, row.category_3]
    .filter(c => c && c.trim())
  const categoryPath = categories.join(' > ')
  
  // 5. 构建标准词条
  const entry = {
    id: `${DICTIONARY_INFO.id}_${String(row.index).padStart(6, '0')}`,
    source_book: DICTIONARY_INFO.source_book,
    source_id: row.index,
    
    dialect: DICTIONARY_INFO.dialect,
    
    headword: {
      display: row.words,
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
      notes: parseNote(row.note)
    },
    
    created_at: new Date().toISOString()
  }
  
  // 6. 生成搜索关键词
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


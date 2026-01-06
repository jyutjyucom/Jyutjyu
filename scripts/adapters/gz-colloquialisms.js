/**
 * 《广州话俗语词典》数据适配器
 * 
 * 原始 CSV 格式:
 * index, sense_number, phrases, gwongping, jyutping, meanings, examples, proofreaders_note
 * 
 * 特点:
 * - 歇后语为主，格式通常为 "前半句，后半句"
 * - 同一 index 可能有多个 sense_number（多义项）
 * - gwongping 是广州话拼音方案
 * - jyutping 是标准粤拼
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
  id: 'gz-colloquialisms',
  name: '广州话俗语词典',
  dialect: {
    name: '广州话',
    region_code: 'GZ'
  },
  source_book: '广州话俗语词典',
  author: '欧阳觉亚、周无忌、饶秉才',
  publisher: '广东人民出版社',
  year: 2010
}

/**
 * 必填字段验证
 */
export const REQUIRED_FIELDS = ['index', 'phrases', 'jyutping', 'meanings']

/**
 * 转换单个 CSV 行为标准 DictionaryEntry
 * @param {Object} row - CSV 行数据
 * @returns {Object} DictionaryEntry 对象
 */
export function transformRow(row) {
  // 1. 清理词头
  const headwordInfo = cleanHeadword(row.phrases)
  
  // 2. 处理释义和例句
  // 这个词典的格式比较清晰：meanings 是释义，examples 是例句
  const sense = {
    definition: row.meanings ? row.meanings.trim() : '',
    examples: []
  }
  
  // 解析例句（可能包含翻译）
  // 支持多个例句用 | 分隔，每个例句可能包含括号内的翻译
  if (row.examples && row.examples.trim()) {
    const exampleText = row.examples.trim()
    // 用 | 分割多个例句
    const exampleParts = exampleText.split('|').map(part => part.trim()).filter(part => part)
    
    exampleParts.forEach(part => {
      // 检查是否有括号包裹的翻译
      // 匹配最后一个括号（通常是普通话翻译）
      const translationMatch = part.match(/[（(]([^）)]+)[）)][。！？\s]*$/)
      
      if (translationMatch) {
        // 提取翻译
        const translation = translationMatch[1]
          .replace(/[。！？]+$/, '')
          .trim()
        
        // 提取例句正文（只移除最后的翻译括号，保留其他括号如注音）
        const text = part
          .replace(/[（(][^）)]+[）)][。！？\s]*$/, '')
          .replace(/[。！？]+$/, '')
          .trim()
        
        sense.examples.push({
          text: text || part,
          translation: translation || null
        })
      } else {
        // 没有翻译，直接作为例句
        sense.examples.push({
          text: part.replace(/[。！？]+$/, '').trim()
        })
      }
    })
  }
  
  // 3. 处理粤拼
  const jyutpingArray = row.jyutping
    ? row.jyutping.split(/[,;]/).map(j => j.trim()).filter(j => j)
    : []
  
  // 4. 检测词条类型
  // 俗语和歇后语都归类为 phrase
  const entryType = guessEntryType(headwordInfo.normalized)
  
  // 5. 构建标准词条
  const entry = {
    id: `${DICTIONARY_INFO.id}_${String(row.index).padStart(6, '0')}_${row.sense_number || '0'}`,
    source_book: DICTIONARY_INFO.source_book,
    source_id: `${row.index}-${row.sense_number || '0'}`,
    
    dialect: DICTIONARY_INFO.dialect,
    
    headword: {
      display: row.phrases,
      search: headwordInfo.normalized,
      normalized: headwordInfo.normalized,
      is_placeholder: headwordInfo.isPlaceholder || false
    },
    
    phonetic: {
      original: row.gwongping || row.jyutping, // 优先使用老拼音作为原始注音
      jyutping: jyutpingArray
    },
    
    entry_type: entryType,
    
    senses: [sense],
    
    meta: {
      // 词典特有字段
      colloquialism_type: detectColloquialismType(row.phrases),
      gwongping: row.gwongping || null, // 保留广州话拼音方案
      notes: row.proofreaders_note ? parseNote(row.proofreaders_note) : null, // 校对备注
      note_type: row.proofreaders_note ? 'proofreader' : null, // 备注类型：校对者备注
      // 原始行号，用于聚合
      _originalIndex: row.index,
      _senseNumber: row.sense_number || '0'
    },
    
    created_at: new Date().toISOString()
  }
  
  // 6. 生成搜索关键词
  entry.keywords = generateKeywords(entry)
  
  // 7. 添加俗语特殊关键词（如果是歇后语，添加前后半句）
  if (entry.meta.colloquialism_type === 'xiehouyu') {
    const parts = row.phrases.split(/[，,]/)
    if (parts.length === 2) {
      entry.keywords.push(parts[0].trim())
      entry.keywords.push(parts[1].trim())
    }
  }
  
  return entry
}

/**
 * 判断词条类型
 * @param {string} phrase - 词条内容
 * @returns {string} 'character' | 'word' | 'phrase'
 */
function guessEntryType(phrase) {
  // 去除所有非汉字字符
  const chineseChars = phrase.match(/[\u4e00-\u9fa5]/g) || []
  const length = chineseChars.length
  
  if (length === 0) return 'word' // 外来词
  if (length === 1) return 'character'
  if (length <= 4) return 'word'
  return 'phrase' // 俗语、歇后语通常较长
}

/**
 * 检测俗语类型
 * @param {string} phrase - 词条内容
 * @returns {string} 'xiehouyu' | 'proverb' | 'idiom'
 */
function detectColloquialismType(phrase) {
  // 歇后语通常有逗号分隔前后半句
  if (phrase.includes('，') || phrase.includes(',')) {
    const parts = phrase.split(/[，,]/)
    if (parts.length === 2 && parts[0].length > 2 && parts[1].length > 2) {
      return 'xiehouyu' // 歇后语
    }
  }
  
  // 判断是否为谚语（通常较长且没有明显的前后结构）
  const chineseChars = phrase.match(/[\u4e00-\u9fa5]/g) || []
  if (chineseChars.length > 8) {
    return 'proverb' // 谚语
  }
  
  // 较短的成语或惯用语
  return 'idiom'
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
 * 如果同一个 index 有多个 sense_number，聚合为一个词条的多个 senses
 * @param {Array<Object>} entries - 词条数组
 * @returns {Array<Object>} 聚合后的词条数组
 */
export function aggregateEntries(entries) {
  if (entries.length === 0) return []
  
  // 按 index 分组（提取主 index，忽略 sense_number）
  const grouped = new Map()
  
  entries.forEach(entry => {
    // 从 index 中提取基础索引（如 "5-1" -> "5"）
    let baseIndex = entry.meta._originalIndex
    if (typeof baseIndex === 'string') {
      const match = baseIndex.match(/^(\d+)/)
      if (match) {
        baseIndex = match[1]
      }
    }
    
    if (!grouped.has(baseIndex)) {
      grouped.set(baseIndex, [])
    }
    grouped.get(baseIndex).push(entry)
  })
  
  // 聚合每组
  const aggregated = []
  
  grouped.forEach((group) => {
    if (group.length === 1) {
      // 只有一个义项，直接使用
      const entry = { ...group[0] }
      // 提取基础索引作为 source_id
      let baseIndex = entry.meta._originalIndex
      if (typeof baseIndex === 'string') {
        const match = baseIndex.match(/^(\d+)/)
        if (match) {
          baseIndex = match[1]
        }
      }
      entry.id = `${DICTIONARY_INFO.id}_${String(baseIndex).padStart(6, '0')}`
      entry.source_id = String(baseIndex)
      // 清理临时字段
      delete entry.meta._originalIndex
      delete entry.meta._senseNumber
      aggregated.push(entry)
    } else {
      // 多个义项，需要聚合
      // 按 sense_number 排序
      group.sort((a, b) => {
        const aNum = parseInt(a.meta._senseNumber) || 0
        const bNum = parseInt(b.meta._senseNumber) || 0
        return aNum - bNum
      })
      
      // 以第一个词条为基础
      const baseEntry = { ...group[0] }
      
      // 收集所有义项
      baseEntry.senses = []
      group.forEach(entry => {
        baseEntry.senses.push(...entry.senses)
      })
      
      // 合并关键词
      const allKeywords = new Set()
      group.forEach(entry => {
        entry.keywords.forEach(kw => allKeywords.add(kw))
      })
      baseEntry.keywords = Array.from(allKeywords)
      
      // 提取基础索引
      let baseIndex = group[0].meta._originalIndex
      if (typeof baseIndex === 'string') {
        const match = baseIndex.match(/^(\d+)/)
        if (match) {
          baseIndex = match[1]
        }
      }
      
      // 使用基础索引作为 ID
      baseEntry.id = `${DICTIONARY_INFO.id}_${String(baseIndex).padStart(6, '0')}`
      baseEntry.source_id = String(baseIndex)
      
      // 清理临时字段
      delete baseEntry.meta._originalIndex
      delete baseEntry.meta._senseNumber
      
      aggregated.push(baseEntry)
    }
  })
  
  return aggregated
}

/**
 * 特殊字段处理说明
 */
export const FIELD_NOTES = {
  phrases: '俗语或歇后语的完整表述，歇后语通常用逗号分隔前后半句',
  gwongping: '广州话拼音方案，保留用于研究对比',
  jyutping: '标准粤拼',
  meanings: '释义，通常会说明俗语的含义和用法',
  examples: '例句，通常包含括号内的普通话翻译',
  sense_number: '义项编号，同一 index 可能有多个义项（0, 1, 2...）'
}


/**
 * 《粵語辭源》数据适配器
 * 
 * 原始 CSV 格式:
 * page, index, verified, entry, gwongping, jyutping, content, proofreaders_note
 * 
 * 特点:
 * - 词源词典，重点在于追溯粤语词汇的来源
 * - 同一 page+index 的多行数据属于同一个词条
 * - content 字段包含释义、【源】标记的文献引用、【案】标记的按语
 * - 文献引用解析为结构化数据（作者、作品、引文、出处）
 * - 词条名称可能包含数字后缀（如"一味1"、"一味2"）表示同形异义
 * - gwongping 是广州话拼音方案
 * - jyutping 是粤拼
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
  id: 'gz-word-origins',
  name: '粵語辭源',
  dialect: {
    name: '广州话',
    region_code: 'GZ'
  },
  source_book: '粵語辭源',
  author: '谭步云',
  publisher: '广东人民出版社',
  year: 2025,
  version: new Date().toISOString().slice(0, 10),
  description: '追溯粤语词汇的来源和演变，引用大量古籍文献，展示粤语词汇的历史渊源',
  source: 'scanned_from_internet',
  license: 'Copyrighted. For technical demonstration only.',
  usage_restriction: '此词表内容受版权保护，来源于互联网公开扫描资源，仅用于本项目原型验证和技术演示，不得用于商业用途或二次分发。',
  attribution: '《粵語辭源》，谭步云编，广东人民出版社，2025年版',
  cover: '/gz-word-origins.png'
}

/**
 * 必填字段验证
 * 注意：entry 和 jyutping 只在每个词条的第一行必填
 * 后续行（词源引用、按语等）可以为空
 */
export const REQUIRED_FIELDS = ['page', 'index', 'content']

/**
 * 解析词条名称，提取基础词头和义项编号
 * @param {string} entry - 词条名称，如 "一味1", "一味2"
 * @returns {Object} { baseEntry, variantNumber }
 */
function parseEntryName(entry) {
  if (!entry) return { baseEntry: '', variantNumber: null }
  
  // 检查是否有数字后缀（同形异义标记）
  const match = entry.match(/^(.+?)(\d+)$/)
  if (match) {
    return {
      baseEntry: match[1].trim(),
      variantNumber: parseInt(match[2])
    }
  }
  
  return {
    baseEntry: entry.trim(),
    variantNumber: null
  }
}

/**
 * 解析单条文献引用，提取结构化信息
 * @param {string} refText - 单条引用文本
 * @returns {Object} { author, work, quote, source }
 * 
 * 注意：source（出处）永远是括号内的完整内容，不应拆分。
 * 出处可能引用更早的材料（如《半蕪園集》引用《驚蟄》），这是正常的。
 */
function parseReference(refText) {
  if (!refText || !refText.trim()) return null
  
  const text = refText.trim()
  
  // 尝试提取结构化信息
  // 格式1: 朝代·作者《作品名》：引文。（出处）
  // 格式2: 作者《作品名》：引文。（出处）
  // 格式3: 引文。（出处）- 出处可能包含作者/作品信息
  
  // 提取末尾的出处（括号内的完整内容，保持原样）
  let source = null
  let mainText = text
  
  // 匹配末尾的（...）或(...)
  const sourceMatch = text.match(/[（(]([^）)]+)[）)]$/)
  if (sourceMatch) {
    source = sourceMatch[1].trim()
    mainText = text.substring(0, sourceMatch.index).trim()
  }
  
  // 尝试从主文本提取作者和作品
  // 格式: 朝代·作者《作品》 或 作者《作品》
  const authorWorkMatch = mainText.match(/^((?:[^·《]+·)?[^《]+)《([^》]+)》[：:]?\s*(.*)$/)
  
  if (authorWorkMatch) {
    return {
      author: authorWorkMatch[1].trim(),
      work: authorWorkMatch[2].trim(),
      quote: authorWorkMatch[3].trim() || null,
      source: source
    }
  }
  
  // 无法解析主文本中的作者/作品，返回引文和出处
  return {
    author: null,
    work: null,
    quote: mainText,
    source: source
  }
}

/**
 * 解析 content 字段，分离释义、文献引用和按语
 * @param {string} content - content 内容
 * @returns {Object} { definition, references, commentary }
 */
function parseContent(content) {
  if (!content || !content.trim()) {
    return { definition: '', references: [], commentary: null }
  }
  
  const text = content.trim()
  
  // 检查是否包含【源】或【案】标记
  if (text.startsWith('【源】')) {
    // 这是文献引用行
    const refText = text.replace(/^【源】/, '').trim()
    // 按 ｜ 或 | 分割多条引用
    const refItems = refText.split(/\s*[｜|]\s*/).filter(r => r.trim())
    const references = refItems.map(r => parseReference(r)).filter(r => r)
    return {
      definition: '',
      references: references,
      commentary: null
    }
  } else if (text.startsWith('案：') || text.startsWith('【案】')) {
    // 这是按语/说明行
    const commentary = text.replace(/^(案：|【案】)/, '').trim()
    return {
      definition: '',
      references: [],
      commentary: commentary
    }
  } else {
    // 这是释义行
    return {
      definition: text,
      references: [],
      commentary: null
    }
  }
}

/**
 * 解析释义中的多义项（①②③格式）
 * @param {string} definition - 释义文本
 * @returns {Array<Object>} 义项数组
 */
function parseSenses(definition) {
  if (!definition || !definition.trim()) {
    return []
  }
  
  // 检查是否包含 ① ② ③ 等标记
  const sensePattern = /[①②③④⑤⑥⑦⑧⑨⑩]/g
  const matches = [...definition.matchAll(sensePattern)]
  
  if (matches.length === 0) {
    // 没有多义项标记，整个作为一个义项
    return [{
      definition: definition.trim(),
      examples: []
    }]
  }
  
  // 有多义项标记，分割
  const senses = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + 1 // 跳过标记符号
    const end = i < matches.length - 1 ? matches[i + 1].index : definition.length
    const senseText = definition.substring(start, end).trim()
    
    if (senseText) {
      senses.push({
        definition: senseText,
        examples: []
      })
    }
  }
  
  return senses
}

/**
 * 转换单个词条的所有行（已按 page+index 分组）
 * @param {Array<Object>} rows - 同一词条的所有行
 * @returns {Object} DictionaryEntry 对象
 */
export function transformEntry(rows) {
  if (!rows || rows.length === 0) {
    throw new Error('Empty rows')
  }
  
  // 第一行包含词条的基本信息
  const firstRow = rows[0]
  
  // 解析词条名称
  const { baseEntry, variantNumber } = parseEntryName(firstRow.entry)
  
  // 清理词头
  const headwordInfo = cleanHeadword(baseEntry)
  
  // 处理粤拼
  const jyutpingArray = firstRow.jyutping
    ? firstRow.jyutping.split(/[,;]/).map(j => j.trim()).filter(j => j)
    : []
  
  // 解析所有行的 content
  let definition = ''
  const references = []
  let commentary = null
  
  rows.forEach(row => {
    const parsed = parseContent(row.content)
    if (parsed.definition) {
      definition = parsed.definition
    }
    if (parsed.references.length > 0) {
      references.push(...parsed.references)
    }
    if (parsed.commentary) {
      commentary = parsed.commentary
    }
  })
  
  // 解析义项
  const senses = parseSenses(definition)
  
  // 如果没有解析出义项，创建一个空义项
  if (senses.length === 0) {
    senses.push({
      definition: definition || '',
      examples: []
    })
  }
  
  // 检测词条类型
  const entryType = guessEntryType(headwordInfo.normalized)
  
  // 构建标准词条
  const entry = {
    id: `${DICTIONARY_INFO.id}_${firstRow.page.replace(/[_\/]/g, '-')}_${String(firstRow.index).padStart(2, '0')}`,
    source_book: DICTIONARY_INFO.source_book,
    source_id: `${firstRow.page}_${firstRow.index}`,
    
    dialect: DICTIONARY_INFO.dialect,
    
    headword: {
      display: baseEntry,
      search: headwordInfo.normalized,
      normalized: headwordInfo.normalized,
      is_placeholder: headwordInfo.isPlaceholder || false
    },
    
    phonetic: {
      original: firstRow.gwongping || firstRow.jyutping, // 优先使用广州话拼音作为原始注音
      jyutping: jyutpingArray
    },
    
    entry_type: entryType,
    
    senses: senses,
    
    meta: {
      // 页码
      page: firstRow.page,
      
      // 是否已验证
      verified: firstRow.verified === '1' || firstRow.verified === 1,
      
      // 同形异义标记
      variant_number: variantNumber,
      
      // 文献引用（结构化数组）
      references: references.length > 0 ? references : null,
      
      // 按语/说明
      commentary: commentary,
      
      // 广州话拼音方案（保留用于研究对比）
      gwongping: firstRow.gwongping || null,
      
      // 校对备注
      notes: firstRow.proofreaders_note ? parseNote(firstRow.proofreaders_note) : null,
      note_type: firstRow.proofreaders_note ? 'proofreader' : null
    },
    
    created_at: new Date().toISOString()
  }
  
  // 生成搜索关键词
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
 * 预处理：按 page+index 分组
 * @param {Array<Object>} rows - CSV 行数组
 * @returns {Map} 分组后的 Map，key 为 "page_index"
 */
function groupByEntry(rows) {
  const grouped = new Map()
  
  rows.forEach((row, idx) => {
    // 跳过无效行
    if (!row.page || row.index === undefined || row.index === null) {
      return
    }
    
    const key = `${row.page}_${row.index}`
    
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    
    grouped.get(key).push(row)
  })
  
  return grouped
}

/**
 * 批量转换
 * @param {Array<Object>} rows - CSV 行数组
 * @returns {Object} { entries, errors }
 */
export function transformAll(rows) {
  const entries = []
  const errors = []
  
  // 按 page+index 分组
  const grouped = groupByEntry(rows)
  
  // 转换每个分组
  grouped.forEach((entryRows, key) => {
    try {
      // 只处理有词条名称的分组（entry 字段非空）
      const hasEntry = entryRows.some(row => row.entry && row.entry.trim())
      
      if (!hasEntry) {
        // 跳过没有词条名称的分组（可能是数据错误）
        return
      }
      
      const entry = transformEntry(entryRows)
      entries.push(entry)
    } catch (error) {
      errors.push({
        key: key,
        error: error.message,
        data: entryRows[0] // 记录第一行数据用于调试
      })
    }
  })
  
  return { entries, errors }
}

/**
 * 后处理：聚合同形异义词（可选）
 * 如果存在 "一味1"、"一味2" 这样的词条，可以选择聚合为一个词条的多个义项
 * @param {Array<Object>} entries - 词条数组
 * @returns {Array<Object>} 聚合后的词条数组
 */
export function aggregateEntries(entries) {
  if (entries.length === 0) return []
  
  // 按词头和读音分组
  const grouped = new Map()
  
  entries.forEach(entry => {
    // 如果有 variant_number，说明是同形异义词，需要聚合
    const key = `${entry.headword.normalized}_${entry.phonetic.jyutping[0] || ''}`
    
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    
    grouped.get(key).push(entry)
  })
  
  // 聚合每组
  const aggregated = []
  
  grouped.forEach((group) => {
    if (group.length === 1) {
      // 只有一个词条，直接使用
      aggregated.push(group[0])
    } else {
      // 检查是否都有 variant_number（同形异义标记）
      const allHaveVariantNumber = group.every(e => e.meta.variant_number !== null)
      
      if (allHaveVariantNumber) {
        // 是同形异义词，聚合
        // 按 variant_number 排序
        group.sort((a, b) => (a.meta.variant_number || 0) - (b.meta.variant_number || 0))
        
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
        
        // 合并文献引用
        const allReferences = []
        group.forEach(entry => {
          if (entry.meta.references) {
            allReferences.push(...entry.meta.references)
          }
        })
        if (allReferences.length > 0) {
          baseEntry.meta.references = allReferences
        }
        
        // 合并按语
        const allCommentaries = []
        group.forEach(entry => {
          if (entry.meta.commentary) {
            allCommentaries.push(entry.meta.commentary)
          }
        })
        if (allCommentaries.length > 0) {
          baseEntry.meta.commentary = allCommentaries.join(' ')
        }
        
        // 移除 variant_number（已经聚合）
        delete baseEntry.meta.variant_number
        
        // 使用第一个词条的 ID 和 source_id
        baseEntry.id = group[0].id
        baseEntry.source_id = group[0].source_id
        
        aggregated.push(baseEntry)
      } else {
        // 不是同形异义词，分别保留
        group.forEach(entry => aggregated.push(entry))
      }
    }
  })
  
  return aggregated
}

/**
 * 特殊字段处理说明
 */
export const FIELD_NOTES = {
  page: '词典页码，格式如 55_1, 55_2',
  index: '同一页中的词条索引，从 0 开始',
  entry: '词条名称，可能包含数字后缀（如"一味1"、"一味2"）表示同形异义',
  gwongping: '广州话拼音方案，保留用于研究对比',
  jyutping: '粤拼',
  content: '内容字段，包含释义、【源】标记的文献引用、【案】标记的按语',
  proofreaders_note: '校对者备注，通常包含补充说明或考证'
}

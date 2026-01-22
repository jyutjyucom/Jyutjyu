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
    name: '广州',
    region_code: 'GZ'
  },
  source_book: '实用广州话分类词典',
  author: '麦耘、谭步云',
  publisher: '广东人民出版社',
  year: 1997,
  version: new Date().toISOString().slice(0, 10),
  description: '按主题分类的实用广州话词典，收录日常生活各领域词汇',
  source: 'scanned_from_internet',
  license: 'Copyrighted. For technical demonstration only.',
  usage_restriction: '此词表内容受版权保护，来源于互联网公开扫描资源，仅用于本项目原型验证和技术演示，不得用于商业用途或二次分发。',
  attribution: '《实用广州话分类词典》，麦耘、谭步云编，广东人民出版社，1997年版',
  cover: '/gz-practical-classified.png'
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
  
  // 2. 检查并提取数字后缀标记（同形异义）- 在生成异形词之前处理
  const numberMatch = text.match(/^(.+?)(\d+)(.*)$/)
  if (numberMatch) {
    // 暂存数字标记，然后从文本中移除
    result.variantNumber = parseInt(numberMatch[2])
    text = numberMatch[1] + numberMatch[3]  // 重组为：数字前的部分 + 数字后的部分
  }
  
  // 3. 解析括号内的异形词并生成所有组合
  // 例如: "阿（亞）崩阿（亞）狗" → ["亞崩阿狗", "阿崩亞狗", "亞崩亞狗"]
  const variants = generateHeadwordVariants(text)
  
  // 4. 主词头是移除所有括号内容后的结果
  // 同时移除括号前后的多余空格
  result.mainWord = text
    .replace(/\s*[（(][^）)]+[）)]\s*/g, '')  // 移除括号及其前后的空格
    .replace(/\s+/g, '')  // 移除所有剩余空格
    .trim()
  
  // 5. 异形词是除了主词头之外的所有组合
  result.variants = variants.filter(v => v !== result.mainWord)
  
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
 * - "制（掣）" → ["制", "掣"]
 * - "圓轆轆（碌碌）" → ["圓轆轆", "圓碌碌"]  (2字符替换)
 * - "腑胵（扶翅）" → ["腑胵", "扶翅"]  (2字符替换)
 * 
 * 逻辑：
 * 1. 括号表示异形写法：括号内的N个字可以替换括号前的最后N个非空白字符
 * 2. 如果括号前没有足够的非空白字符，则括号内容被忽略
 */
function generateHeadwordVariants(text) {
  if (!text) return []
  
  // 重新解析，按字符分段
  const segments = []
  let lastIndex = 0
  
  const bracketRegex = /[（(]([^）)]+)[）)]/g
  let bracketMatch
  
  while ((bracketMatch = bracketRegex.exec(text)) !== null) {
    // 添加括号前的文本
    const beforeText = text.substring(lastIndex, bracketMatch.index)
    const variantContent = bracketMatch[1]
    // 获取括号内字符数量（用于确定替换多少个前置字符）
    const variantLength = variantContent.length
    
    if (beforeText) {
      // 找到括号前最后一个非空白字符的位置
      const trimmedBefore = beforeText.trimEnd()
      
      if (trimmedBefore.length > 0) {
        // 有实际内容
        // 根据括号内字符数确定要替换的前置字符数
        const replaceLength = Math.min(variantLength, trimmedBefore.length)
        
        if (trimmedBefore.length > replaceLength) {
          // 前面有固定部分
          segments.push({ type: 'fixed', text: trimmedBefore.slice(0, -replaceLength) })
        }
        
        // 最后 replaceLength 个字符是可替换的
        segments.push({ 
          type: 'variant', 
          options: [
            trimmedBefore.slice(-replaceLength),   // 外部字（N个）
            variantContent                          // 括号内的字
          ]
        })
      } else {
        // 括号前只有空格，忽略括号内容
        // 不添加任何 segment，括号内容被丢弃
      }
    } else {
      // 括号在开头，忽略括号内容
      // 不添加任何 segment
    }
    
    lastIndex = bracketRegex.lastIndex
  }
  
  // 添加最后剩余的文本
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex)
    if (remainingText.trim()) {
      segments.push({ type: 'fixed', text: remainingText })
    }
  }
  
  // 如果没有任何有效的 segment，返回原文（去除括号后的内容）
  if (segments.length === 0) {
    // 移除所有括号及其内容，返回剩余部分
    const cleaned = text.replace(/[（(][^）)]*[）)]/g, '').trim()
    return cleaned ? [cleaned] : []
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
 * 解析粤拼字符串中的变体标记，生成所有可能的发音组合
 * @param {string} jyutping - 原始粤拼字符串
 * @returns {Array<string>} 所有可能的发音组合
 * 
 * 例如:
 * - "baau6 (biu6, beu6)" → ["baau6", "biu6", "beu6"]  (单音节多音)
 * - "dit1 (dik1) gam3 doe1 (do1)" → ["dit1 gam3 doe1", "dik1 gam3 doe1", "dit1 gam3 do1", "dik1 gam3 do1"]
 * - "tam4 tam2 (dam4 dam2) zyun3" → ["tam4 tam2 zyun3", "dam4 dam2 zyun3"]
 * 
 * 逻辑：
 * 1. 括号内如有逗号分隔的多个读音，表示前一音节的多种读法
 * 2. 括号内如有空格分隔的多音节，则替换前面相同数量的音节
 */
function parseJyutpingVariants(jyutping) {
  if (!jyutping) return []
  
  const text = jyutping.trim()
  if (!text) return []
  
  // 检查是否包含括号变体标记
  if (!text.includes('(') && !text.includes('（')) {
    // 没有变体标记，直接返回原文
    return [text]
  }
  
  // 分段解析：将文本分成音节组和括号变体
  const segments = []
  let lastIndex = 0
  
  // 匹配括号及其内容
  const bracketRegex = /[（(]([^）)]+)[）)]/g
  let match
  
  while ((match = bracketRegex.exec(text)) !== null) {
    // 获取括号前的文本
    const beforeText = text.substring(lastIndex, match.index).trim()
    const variantContent = match[1].trim()
    
    if (beforeText) {
      // 分析括号内容
      // 如果括号内有逗号，表示单音节的多个变体
      // 如果括号内有空格但无逗号，表示多音节组的变体
      const hasComma = variantContent.includes(',') || variantContent.includes('，')
      const variantSyllables = hasComma 
        ? variantContent.split(/[,，]/).map(s => s.trim()).filter(s => s)
        : [variantContent]
      
      // 统计变体中的音节数量（按空格分割）
      const firstVariantSyllableCount = variantSyllables[0].split(/\s+/).length
      
      // 分割前置文本为音节
      const beforeSyllables = beforeText.split(/\s+/).filter(s => s)
      
      if (beforeSyllables.length > 0) {
        // 确定要替换的音节数量
        const replaceCount = Math.min(firstVariantSyllableCount, beforeSyllables.length)
        
        // 添加固定部分（不被替换的前置音节）
        if (beforeSyllables.length > replaceCount) {
          const fixedPart = beforeSyllables.slice(0, -replaceCount).join(' ')
          segments.push({ type: 'fixed', value: fixedPart })
        }
        
        // 添加变体部分
        const originalPart = beforeSyllables.slice(-replaceCount).join(' ')
        const allVariants = [originalPart, ...variantSyllables]
        // 去重
        const uniqueVariants = [...new Set(allVariants)]
        segments.push({ type: 'variant', options: uniqueVariants })
      }
    }
    
    lastIndex = bracketRegex.lastIndex
  }
  
  // 添加最后剩余的文本
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex).trim()
    if (remainingText) {
      segments.push({ type: 'fixed', value: remainingText })
    }
  }
  
  // 如果没有解析出任何有效的 segment，返回原文
  if (segments.length === 0) {
    return [text.replace(/[（(][^）)]*[）)]/g, '').trim()]
  }
  
  // 生成所有组合
  const combinations = []
  
  function generateCombinations(index, current) {
    if (index >= segments.length) {
      // 清理多余空格并添加
      const cleaned = current.trim().replace(/\s+/g, ' ')
      if (cleaned) combinations.push(cleaned)
      return
    }
    
    const segment = segments[index]
    const separator = current ? ' ' : ''
    
    if (segment.type === 'fixed') {
      generateCombinations(index + 1, current + separator + segment.value)
    } else {
      // variant
      segment.options.forEach(option => {
        generateCombinations(index + 1, current + separator + option)
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
  
  // 4. 处理粤拼（支持括号变体语法）
  const jyutpingArray = row.jyutping
    ? parseJyutpingVariants(row.jyutping)
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


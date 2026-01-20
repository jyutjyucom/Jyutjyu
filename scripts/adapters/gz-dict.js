/**
 * 《广州话词典（第2版）》数据适配器
 *
 * 原始 CSV 格式:
 * index, entry_type, headword, pronunciation, jyutping, definition, page, source_file
 *
 * 特点:
 * - pronunciation 为原书拼音标注
 * - jyutping 为转换后的粤拼（用于词典展示和搜索优化）
 * - definition 常见结构：词性/说明 + ❶❷ 多义项 + 冒号后的例句（用 | 分隔），例句翻译用 〔〕
 *
 * 数据处理规则:
 * - 忽略 entry_type、source_file 字段（不写入 metadata）
 * - 字头前的星号 "*" 表示外来语（不是本身是广州话的，可能来自香港话或其他语言）
 * - 字头前的数字标记（如 "1 飞"、"² 爆"、"⁴飞"）表示同形异义的不同义项
 */

import { generateKeywords, cleanHeadword } from '../utils/text-processor.js'

/**
 * 提取释义中的作者备注（〖...〗），并从正文中移除
 * @param {string} definition
 * @returns {{ mainText: string, notes: string|null }}
 */
function extractAuthorNotesFromDefinition(definition) {
  if (!definition || !definition.trim()) {
    return { mainText: '', notes: null }
  }

  const text = definition.trim()
  const notes = []

  // 备注通常以 〖...〗 出现；可能出现多段
  const noteRegex = /〖([^〗]+)〗/g
  let match
  while ((match = noteRegex.exec(text)) !== null) {
    const note = (match[1] || '').trim()
    if (note) notes.push(note)
  }

  // 移除备注片段，并清理多余空白
  const mainText = text
    .replace(noteRegex, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return {
    mainText,
    notes: notes.length > 0 ? notes.join('\n') : null
  }
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
 * 词典元数据
 */
export const DICTIONARY_INFO = {
  id: 'gz-dict',
  name: '广州话词典（第2版）',
  dialect: {
    name: '广州话',
    region_code: 'GZ'
  },
  source_book: '广州话词典（第2版）',
  author: '饶秉才、欧阳觉亚、周无忌',
  publisher: '广东人民出版社',
  year: 2020,
  version: new Date().toISOString().slice(0, 10),
  description: '系统收录广州话词汇，包含释义、读音与用例。',
  source: 'scanned_from_internet',
  license: 'Copyrighted. For technical demonstration only.',
  usage_restriction:
    '此词表内容受版权保护，来源于互联网公开扫描资源，仅用于本项目原型验证和技术演示，不得用于商业用途或二次分发。',
  attribution: '《广州话词典（第2版）》，饶秉才、欧阳觉亚、周无忌编，广东人民出版社，2020年版'
}

/**
 * 必填字段验证
 */
export const REQUIRED_FIELDS = ['index', 'headword', 'jyutping', 'definition']

/**
 * 解析字头中的圆括号和方括号，提取异形词
 * @param {string} headword - 原始字头字符串
 * @returns {Object} { 
 *   mainWord: 主词头（去除所有括号）,
 *   variants: 异形词数组,
 *   normalized: 规范化词头（去除所有括号）
 * }
 * 
 * 例如:
 * - "鳌（鼇）［鼇］" → { mainWord: "鳌", variants: ["鼇"], normalized: "鳌" }
 * - "暗［唵、闇］" → { mainWord: "暗", variants: ["唵", "闇"], normalized: "暗" }
 * - "肮（骯）" → { mainWord: "肮", variants: ["骯"], normalized: "肮" }
 * - "奔［奔、犇］" → { mainWord: "奔", variants: ["奔", "犇"], normalized: "奔" }
 */
function parseHeadwordVariants(headword) {
  if (!headword) {
    return { mainWord: '', variants: [], normalized: '' }
  }
  
  const variants = []
  let text = headword.trim()
  
  // 提取所有括号中的内容（圆括号和方括号）
  // 圆括号: （）
  const roundBracketRegex = /[（(]([^）)]+)[）)]/g
  let match
  
  while ((match = roundBracketRegex.exec(text)) !== null) {
    const content = match[1].trim()
    // 如果内容包含顿号，分别提取
    if (content.includes('、') || content.includes(',')) {
      const parts = content.split(/[、,]/).map(p => p.trim()).filter(p => p)
      variants.push(...parts)
    } else {
      variants.push(content)
    }
  }
  
  // 方括号: ［］
  const squareBracketRegex = /［([^］]+)］/g
  while ((match = squareBracketRegex.exec(text)) !== null) {
    const content = match[1].trim()
    // 如果内容包含顿号，分别提取
    if (content.includes('、') || content.includes(',')) {
      const parts = content.split(/[、,]/).map(p => p.trim()).filter(p => p)
      variants.push(...parts)
    } else {
      variants.push(content)
    }
  }
  
  // 主词头：去除所有括号及其内容
  const mainWord = text
    .replace(/\s*[（(][^）)]+[）)]\s*/g, '')  // 移除圆括号及其内容
    .replace(/\s*［[^］]+］\s*/g, '')        // 移除方括号及其内容
    .replace(/\s+/g, '')                      // 移除多余空格
    .trim()
  
  // 去重异形词
  const uniqueVariants = [...new Set(variants)].filter(v => v && v !== mainWord)
  
  return {
    mainWord,
    variants: uniqueVariants,
    normalized: mainWord
  }
}

/**
 * 解析词头的特殊标记（星号和数字前缀）
 * @param {string} headword - 原始词头字符串
 * @returns {Object} { 
 *   cleanedHeadword: 清理后的词头,
 *   isLoanword: 是否为外来语（星号标记）,
 *   variantNumber: 同形异义标记数字（如有）
 * }
 */
function parseHeadwordMarkers(headword) {
  if (!headword) {
    return { cleanedHeadword: '', isLoanword: false, variantNumber: null }
  }
  
  let text = headword.trim()
  const result = {
    cleanedHeadword: text,
    isLoanword: false,
    variantNumber: null
  }
  
  // 1. 检查是否有星号（外来语标记）
  if (text.startsWith('*')) {
    result.isLoanword = true
    text = text.substring(1).trim()
  }
  
  // 2. 检查并提取数字前缀标记（同形异义）
  // 支持普通数字（1 飞）和上标数字（¹ 爆、² 爆、⁴飞）
  // 上标数字映射：⁰¹²³⁴⁵⁶⁷⁸⁹ → 0-9
  const superscriptMap = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
  }
  
  // 匹配开头的数字（普通数字或上标数字）+ 空格 + 词头
  // 例如: "1 飞"、"¹ 爆"、"⁴飞"
  const numberPrefixMatch = text.match(/^([0-9⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*(.+)$/)
  if (numberPrefixMatch) {
    const numberStr = numberPrefixMatch[1]
    const restText = numberPrefixMatch[2]
    
    // 转换上标数字为普通数字
    let normalizedNumber = ''
    for (const char of numberStr) {
      if (superscriptMap[char]) {
        normalizedNumber += superscriptMap[char]
      } else if (/[0-9]/.test(char)) {
        normalizedNumber += char
      }
    }
    
    if (normalizedNumber) {
      result.variantNumber = parseInt(normalizedNumber, 10)
      text = restText.trim()
    }
  }
  
  result.cleanedHeadword = text
  return result
}

/**
 * 猜测词条类型（character/word/phrase）
 * @param {string} word - 词头（normalized）
 */
function guessEntryType(word) {
  const chineseChars = word?.match(/[\u4e00-\u9fa5]/g) || []
  const length = chineseChars.length

  if (length === 0) return 'word' // 外来词或符号
  if (length === 1) return 'character'
  if (length <= 4) return 'word'
  return 'phrase'
}

/**
 * 解析释义中的多义项（❶❷❸… 或 ①②③…）和例句
 * @param {string} definition - 释义文本
 * @returns {Array<Object>} senses
 */
function parseSenses(definition) {
  if (!definition || !definition.trim()) {
    return [{ definition: '', examples: [] }]
  }

  const text = definition.trim()

  // 支持两种编号：❶❷❸… 以及 ①②③…
  const markerPattern = /[❶❷❸❹❺❻❼❽❾❿①②③④⑤⑥⑦⑧⑨⑩]/g
  const matches = [...text.matchAll(markerPattern)]

  if (matches.length === 0) {
    return parseExamplesInSenseText(text)
  }

  const senses = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + 1
    const end = i < matches.length - 1 ? matches[i + 1].index : text.length
    const senseText = text.substring(start, end).trim()
    if (!senseText) continue
    senses.push(...parseExamplesInSenseText(senseText))
  }

  return senses.length > 0 ? senses : [{ definition: text, examples: [] }]
}

/**
 * 从单个义项文本中提取释义与例句
 * - 例句通常以冒号分隔：释义: 例句1〔翻译〕 | 例句2〔翻译〕
 * - 例句分隔符兼容：| ｜ 丨
 * - 翻译括号兼容：〔〕 或 ［］
 * @param {string} text
 */
function parseExamplesInSenseText(text) {
  if (!text || !text.trim()) return [{ definition: '', examples: [] }]

  const sense = { definition: '', examples: [] }

  const exampleSplit = text.split(/[:：]/)
  if (exampleSplit.length > 1) {
    sense.definition = exampleSplit[0].trim()

    const exampleText = exampleSplit.slice(1).join('：').trim()
    const exampleParts = exampleText
      .split(/[丨｜|]/)
      .map(part => part.trim())
      .filter(Boolean)

    exampleParts.forEach(part => {
      const parsed = parseExampleWithTranslation(part)
      if (parsed.text || parsed.translation) {
        sense.examples.push(parsed)
      }
    })
  } else {
    sense.definition = text.trim()
  }

  return [sense]
}

function parseExampleWithTranslation(part) {
  if (!part) return { text: '' }

  // 〔译文〕 或 ［译文］
  const bracketMatch = part.match(/(?:〔([^〕]+)〕|［([^］]+)］)/)
  if (bracketMatch) {
    const translation = (bracketMatch[1] || bracketMatch[2] || '').trim()
    const text = part.replace(/〔[^〕]+〕|［[^］]+］/, '').trim()
    return translation
      ? { text, translation }
      : { text }
  }

  return { text: part.trim() }
}

/**
 * 转换单个 CSV 行为标准 DictionaryEntry
 * @param {Object} row - CSV 行数据
 * @returns {Object} DictionaryEntry
 */
export function transformRow(row) {
  // 1. 解析词头标记（星号和数字前缀）
  const headwordMarkers = parseHeadwordMarkers(row.headword)
  
  // 2. 解析字头中的异形词（圆括号和方括号）
  const variantInfo = parseHeadwordVariants(headwordMarkers.cleanedHeadword)
  
  // 3. 清理词头（去除其他标记，如末尾数字等）
  const headwordInfo = cleanHeadword(variantInfo.normalized)

  // 3. 处理粤拼（已是转换后的格式，支持变体标记）
  let jyutpingArray = []
  if (row.jyutping) {
    // 先按逗号分号分割多个不同的发音
    const jyutpingParts = row.jyutping
      .split(/[,;/]/)
      .map(j => j.trim())
      .filter(Boolean)

    // 对每个部分使用变体解析
    jyutpingParts.forEach(part => {
      const variants = parseJyutpingVariants(part)
      jyutpingArray = jyutpingArray.concat(variants)
    })

    // 去重
    jyutpingArray = [...new Set(jyutpingArray)]
  }

  // 4. 提取作者备注（〖...〗），并解析释义（多义项+例句）
  const { mainText: mainDefinitionText, notes: authorNotes } =
    extractAuthorNotesFromDefinition(row.definition)
  const senses = parseSenses(mainDefinitionText)

  // 5. 构建标准词条
  const entry = {
    id: `${DICTIONARY_INFO.id}_${String(row.index).padStart(6, '0')}`,
    source_book: DICTIONARY_INFO.source_book,
    source_id: String(row.index),

    dialect: DICTIONARY_INFO.dialect,

    headword: {
      display: headwordInfo.normalized, // 使用清理后的词头（移除星号和数字标记）
      search: headwordInfo.normalized,
      normalized: headwordInfo.normalized,
      is_placeholder: headwordInfo.isPlaceholder || false
    },

    phonetic: {
      original: row.pronunciation || '', // 原书拼音
      jyutping: jyutpingArray // 转换后的粤拼
    },

    entry_type: guessEntryType(headwordInfo.normalized),

    senses,

    meta: {
      page: row.page || null,
      // 外来语标记（星号表示）
      is_loanword: headwordMarkers.isLoanword || false,
      // 同形异义标记（数字前缀）
      variant_number: headwordMarkers.variantNumber || null,
      // 作者备注（从释义中提取的 〖...〗 内容）
      notes: authorNotes || undefined,
      // 异形词（从圆括号和方括号中提取）
      headword_variants: variantInfo.variants.length > 0 
        ? variantInfo.variants 
        : undefined
      // 注：entry_type, source_file 字段按要求忽略，不写入 metadata
    },

    created_at: new Date().toISOString()
  }

  // 6. 生成搜索关键词
  entry.keywords = generateKeywords(entry)

  // 7. 添加异形词到关键词
  if (variantInfo.variants.length > 0) {
    variantInfo.variants.forEach(variant => {
      entry.keywords.push(variant)
    })
    entry.keywords = [...new Set(entry.keywords)]
  }

  return entry
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
        row: index + 2, // +2 因为有表头且从1开始计数
        error: error.message,
        data: row
      })
    }
  })

  return { entries, errors }
}

/**
 * 特殊字段处理说明
 */
export const FIELD_NOTES = {
  headword: '词头，主词条。圆括号（ ）和方括号［ ］中的内容会被提取为异形词，存入 meta.headword_variants',
  pronunciation: '原书拼音标注（保存到 phonetic.original）',
  jyutping: '转换后的粤拼（保存到 phonetic.jyutping，用于词典展示和搜索优化）',
  definition: '释义，可能包含多义项（❶❷❸ 或 ①②③）与例句；例句翻译常用〔〕表示。释义中的 〖...〗 会被提取为作者备注，存入 meta.notes',
  page: '词典页码',
  entry_type: '已忽略（不写入 metadata）',
  source_file: '已忽略（不写入 metadata）',
  headword_variants: '异形词数组，从字头的圆括号和方括号中提取。例如："鳌（鼇）［鼇］" → ["鼇"]，"暗［唵、闇］" → ["唵", "闇"]'
}


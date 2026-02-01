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
  name: {
    'zh-Hans': '廣州方言詞典',
    'zh-Hant': '廣州方言詞典',
    'yue-Hans': '廣州方言詞典',
    'yue-Hant': '廣州方言詞典'
  },
  dialect: {
    name: {
      'zh-Hans': '广州',
      'zh-Hant': '廣州',
      'yue-Hans': '广州',
      'yue-Hant': '廣州'
    },
    region_code: 'GZ'
  },
  source_book: '廣州方言詞典',
  author: {
    'zh-Hans': '白宛如',
    'zh-Hant': '白宛如',
    'yue-Hans': '白宛如',
    'yue-Hant': '白宛如'
  },
  publisher: {
    'zh-Hans': '江苏教育出版社',
    'zh-Hant': '江蘇教育出版社',
    'yue-Hans': '江苏教育出版社',
    'yue-Hant': '江蘇教育出版社'
  },
  year: 1998,
  version: new Date().toISOString().slice(0, 10),
  description: {
    'zh-Hans': '收录广州话词汇，包含释义、读音、用例等，是研究粤语（广州话）的重要工具书',
    'zh-Hant': '收錄廣州話詞彙，包含釋義、讀音、用例等，是研究粵語（廣州話）的重要工具書',
    'yue-Hans': '收录广州话词汇，包含释义、读音、用例等，系研究粤语（广州话）嘅重要工具书',
    'yue-Hant': '收錄廣州話詞彙，包含釋義、讀音、用例等，係研究粵語（廣州話）嘅重要工具書'
  },
  source: 'scanned_from_internet',
  license: {
    'zh-Hans': '版权所有，仅供技术演示',
    'zh-Hant': '版權所有，僅供技術演示',
    'yue-Hans': '版权所有，只供技术演示',
    'yue-Hant': '版權所有，只供技术演示'
  },
  usage_restriction: {
    'zh-Hans': '此词表内容受版权保护，来源于互联网公开扫描资源，仅用于本项目原型验证和技术演示，不得用于商业用途或二次分发。',
    'zh-Hant': '此詞表內容受版權保護，來源於互聯網公開掃描資源，僅用於本項目原型驗證和技術演示，不得用於商業用途或二次分發。',
    'yue-Hans': '此词表内容受版权保护，来源於互联网公开扫描资源，只供本项目原型验证同技术演示，唔可以用于商业用途或二次分发。',
    'yue-Hant': '此詞表內容受版權保護，來源於互聯網公開掃描資源，只供本項目原型驗證同技術演示，唔可以用於商業用途或二次分發。'
  },
  attribution: {
    'zh-Hans': '《广州方言词典》，白宛如编，江苏教育出版社，1998年版',
    'zh-Hant': '《廣州方言詞典》，白宛如編，江蘇教育出版社，1998年版',
    'yue-Hans': '《广州方言词典》，白宛如编，江苏教育出版社，1998年版',
    'yue-Hant': '《廣州方言詞典》，白宛如編，江蘇教育出版社，1998年版'
  },
  cover: '/gz-dialect.png'
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
  
  // 检查是否包含 ❶❷❸❹❺❻❼❽❾❿ 或 ①②③④⑤⑥⑦⑧⑨⑩ 等标记
  const sensePattern = /[❶❷❸❹❺❻❼❽❾❿⓫⓬⓭⓮⓯⓰⓱⓲⓳⓴①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/g
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
  
  // 检查是否包含 A) B) C) 等子分类标记
  const subSensePattern = /\b([A-Z])\)\s*/g
  const subSenseMatches = [...text.matchAll(subSensePattern)]
  
  if (subSenseMatches.length > 0) {
    // 有子分类，需要特殊处理
    return parseWithSubSenses(text, subSenseMatches)
  }
  
  // 没有子分类，按原有逻辑处理
  const sense = {
    definition: '',
    examples: []
  }
  
  // 尝试分离释义和例句
  // 例句通常用冒号、竖线或尖括号分隔
  // 格式1: 释义：例句1丨例句2
  // 格式2: 释义<翻译>
  
  // 检查是否有例句（用冒号或丨分隔）
  const exampleSplit = text.split(/[:：]/)
  
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
    sense.definition = text
  }
  
  return [sense]
}

/**
 * 处理包含 A) B) C) 子分类的义项
 * @param {string} text - 义项文本
 * @param {Array} subSenseMatches - 子分类匹配结果
 * @returns {Array<Object>} 包含单个义项的数组
 */
function parseWithSubSenses(text, subSenseMatches) {
  const sense = {
    definition: '',
    examples: [],
    sub_senses: []
  }
  
  // 提取主释义（A) 之前的部分）
  const firstSubSenseIndex = subSenseMatches[0].index
  const mainDefinition = text.substring(0, firstSubSenseIndex).trim()
  
  // 去除主释义末尾的句号或冒号
  sense.definition = mainDefinition.replace(/[。：:]$/, '').trim()
  
  // 解析每个子义项
  for (let i = 0; i < subSenseMatches.length; i++) {
    const match = subSenseMatches[i]
    const label = match[1] // A, B, C, etc.
    const start = match.index + match[0].length
    const end = i < subSenseMatches.length - 1 ? subSenseMatches[i + 1].index : text.length
    const subSenseText = text.substring(start, end).trim()
    
    if (subSenseText) {
      const subSense = parseSubSenseText(subSenseText, label)
      sense.sub_senses.push(subSense)
    }
  }
  
  return [sense]
}

/**
 * 解析单个子义项的文本
 * @param {string} text - 子义项文本
 * @param {string} label - 标签（A, B, C等）
 * @returns {Object} 子义项对象
 */
function parseSubSenseText(text, label) {
  const subSense = {
    label: label,
    definition: '',
    examples: []
  }
  
  // 检查是否有例句（用冒号分隔）
  const exampleSplit = text.split(/[:：]/)
  
  if (exampleSplit.length > 1) {
    // 有冒号分隔，第一部分是释义，后面是例句
    subSense.definition = exampleSplit[0].trim()
    
    // 解析例句（可能用丨分隔多个例句）
    const exampleText = exampleSplit.slice(1).join('：').trim()
    const exampleParts = exampleText.split(/[丨｜|]/).map(part => part.trim()).filter(part => part)
    
    exampleParts.forEach(part => {
      // 检查是否有尖括号包裹的翻译
      const translationMatch = part.match(/<([^>]+)>/)
      
      if (translationMatch) {
        const translation = translationMatch[1].trim()
        const exampleText = part.replace(/<[^>]+>/, '').trim()
        subSense.examples.push({
          text: exampleText,
          translation: translation
        })
      } else {
        subSense.examples.push({
          text: part
        })
      }
    })
  } else {
    // 没有冒号分隔，整个作为释义
    subSense.definition = text
  }
  
  return subSense
}

/**
 * 转换粤拼声调标记
 * 规则：
 * - 非入声韵的 1' → 1`53
 * - 非入声韵的 1 → 1`55
 * - 入声韵（韵母以 p/t/k 结尾）的 1 和 1' 保持不变
 * 
 * @param {string} jyutping - 原始粤拼
 * @returns {string} 转换后的粤拼
 * 
 * 例子：
 * - baa1 → baa1`55  (非入声)
 * - bat1 → bat1     (入声，t结尾)
 * - baa1' → baa1`53 (非入声)
 * - bat1' → bat1'   (入声，t结尾)
 */
function convertJyutpingTones(jyutping) {
  if (!jyutping) return jyutping
  
  // 使用负向后查找（lookbehind），检查前面不是 p/t/k
  // 注意：Node.js v9+ 和现代浏览器都支持 lookbehind
  
  // 先处理非入声韵的 1'
  // (?<![ptk]) 表示前面不是 p、t、k
  let converted = jyutping.replace(/(?<![ptk])1'/g, '1`53')
  
  // 再处理非入声韵的 1
  // (?<![ptk]) 前面不是 p/t/k
  // (?![`']) 后面不是反引号或撇号（避免重复转换或误匹配1'）
  converted = converted.replace(/(?<![ptk])1(?![`'])/g, '1`55')
  
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
  
  // 4. 解析释义和例句（包括提取作者备注）
  const parseResult = parseSenses(row.definition)
  
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
    
    senses: parseResult.senses,
    
    meta: {
      // 页码
      page: row.page || null,
      
      // 作者备注（从释义中提取的 || 后的内容）
      notes: parseResult.notes || undefined,
      
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
  definition: '释义，可能包含多义项（①②③）、例句。双竖线后的内容会被提取为作者备注，存入 meta.notes',
  page: '词典页码',
  source_file: '已省略，不处理',
  verification_status: '已省略，不处理',
  verification_notes: '已省略，不处理'
}

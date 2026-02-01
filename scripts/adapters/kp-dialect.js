/**
 * 《开平方言》数据适配器
 *
 * 原始 CSV 格式:
 * image_page,book_page,section,kp_text,ipa,jyutping,mandarin
 *
 * 特点:
 * - 开平方言词典，收录开平话词汇及释义
 * - kp_text: 开平方言文本（词头）
 * - ipa: 国际音标（原始注音）
 * - jyutping: 粤拼
 * - mandarin: 普通话释义
 * - 包含页码信息（image_page, book_page）
 *
 * 数据来源:
 * - 作者: 邓钧
 * - 名称: 开平方言
 * - 出版社: 湖南电子音像出版社
 * - 年份: 2000
 */

import {
  generateKeywords,
  cleanHeadword
} from '../utils/text-processor.js'

/**
 * 词典元数据
 */
export const DICTIONARY_INFO = {
  id: 'kp-dialect',
  name: {
    'zh-Hans': '开平方言',
    'zh-Hant': '開平方言',
    'yue-Hans': '开平方言',
    'yue-Hant': '開平方言'
  },
  dialect: {
    name: {
      'zh-Hans': '开平',
      'zh-Hant': '開平',
      'yue-Hans': '开平',
      'yue-Hant': '開平'
    },
    region_code: 'KP'
  },
  source_book: '开平方言',
  author: {
    'zh-Hans': '邓钧',
    'zh-Hant': '鄧鈞',
    'yue-Hans': '邓钧',
    'yue-Hant': '鄧鈞'
  },
  publisher: {
    'zh-Hans': '湖南电子音像出版社',
    'zh-Hant': '湖南電子音像出版社',
    'yue-Hans': '湖南电子音像出版社',
    'yue-Hant': '湖南電子音像出版社'
  },
  year: 2000,
  version: new Date().toISOString().slice(0, 10),
  description: {
    'zh-Hans': '收录开平话词汇，包含国际音标、粤拼及普通话释义，是研究开平方言的重要工具书',
    'zh-Hant': '收錄開平話詞彙，包含國際音標、粵拼及普通話釋義，是研究開平方言的重要工具書',
    'yue-Hans': '收录开平话词汇，包含国际音标、粤拼同普通话释义，系研究开平方言嘅重要工具书',
    'yue-Hant': '收錄開平話詞彙，包含國際音標、粵拼同普通話釋義，係研究開平方言嘅重要工具書'
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
    'zh-Hans': '《开平方言》，邓钧编，湖南电子音像出版社，2000年版',
    'zh-Hant': '《開平方言》，鄧鈞編，湖南電子音像出版社，2000年版',
    'yue-Hans': '《开平方言》，邓钧编，湖南电子音像出版社，2000年版',
    'yue-Hant': '《開平方言》，鄧鈞編，湖南電子音像出版社，2000年版'
  },
  cover: '/kp-dialect.jpg'
}

/**
 * 必填字段验证
 */
export const REQUIRED_FIELDS = ['index', 'kp_text', 'ipa', 'jyutping', 'mandarin']

/**
 * 判断词条类型
 * @param {string} headword - 词头
 * @returns {string} 'character' | 'word' | 'phrase'
 */
function mapEntryType(headword) {
  if (!headword) {
    return 'word'
  }
  
  const cleaned = headword.replace(/\s+/g, '').replace(/[.,:;!?~。，、：；！？～]/g, '')
  const charArray = Array.from(cleaned)
  const charCount = charArray.length
  
  if (charCount === 1) {
    return 'character'
  } else if (charCount <= 4) {
    return 'word'
  } else {
    return 'phrase'
  }
}

/**
 * 清理词头中的特殊标记
 * 开平方言词典使用了一些特殊标记：
 * - ] 或 ］: 白读
 * - ) 或 ）或 〉: 训读
 * - } 或 ｝: 同音代替
 * - ・: 中平调(33)
 * - - 或 － 或 ⁻: 高平调(55)
 * - * 或 ＊: 低平调(11)
 * - ›: 低降调(21)
 * - ' 或 ' 或 ' 或 ': 中降调(32)
 * @param {string} text - 原始词头
 * @returns {string} 清理后的词头
 */
function cleanKpText(text) {
  if (!text) {
    return ''
  }
  
  // 移除所有特殊标记符号（考虑全半角及各种变体）
  let cleaned = text
    // 白读标记：] (半角) 和 ］ (全角)
    .replace(/[\]］]/g, '')
    // 训读标记：) (半角)、）(全角)、〉(角括号)
    .replace(/[\)）〉]/g, '')
    // 同音代替标记：} (半角) 和 ｝ (全角)
    .replace(/[\}｝]/g, '')
    // 中平调标记：・ (中点)
    .replace(/・/g, '')
    // 高平调标记：- (半角连字符)、－(全角连字符)、⁻(上标减号)
    .replace(/[-－⁻]/g, '')
    // 低平调标记：* (半角星号) 和 ＊ (全角星号)
    .replace(/[*＊]/g, '')
    // 低降调标记：› (单右角引号)
    .replace(/›/g, '')
    // 中降调标记：各种单引号变体
    // U+0027 (APOSTROPHE), U+2018 (LEFT SINGLE QUOTATION MARK),
    // U+2019 (RIGHT SINGLE QUOTATION MARK), U+02BC (MODIFIER LETTER APOSTROPHE)
    .replace(/['''']/g, '')
    .trim()
  
  return cleaned
}

/**
 * 处理粤拼字符串
 * 开平方言的粤拼可能包含多个音节，用空格分隔
 * 也可能包含 * 标记（表示变调等）
 * @param {string} jyutping - 粤拼字符串
 * @returns {Array<string>} 粤拼数组
 */
function parseJyutping(jyutping) {
  if (!jyutping || !jyutping.trim()) {
    return []
  }
  
  // 分割多个读音（如果有逗号或分号分隔）
  const parts = jyutping.split(/[,;]/).map(p => p.trim()).filter(p => p)
  
  if (parts.length === 0) {
    return []
  }
  
  // 对于每个部分，按空格分割音节
  const result = []
  parts.forEach(part => {
    // 移除 * 标记（变调标记，保留在 original 中）
    const cleaned = part.trim()
    if (cleaned) {
      result.push(cleaned)
    }
  })
  
  return result.length > 0 ? result : [jyutping.trim()]
}

/**
 * 转换单个 CSV 行为标准 DictionaryEntry
 * @param {Object} row - CSV 行数据
 * @param {number} rowIndex - 行索引（从0开始，用于生成唯一ID）
 * @returns {Object|null} DictionaryEntry 对象
 */
export function transformRow(row, rowIndex = 0) {
  // 1. 清理词头
  const rawKpText = row.kp_text || ''
  const cleanedKpText = cleanKpText(rawKpText)
  
  if (!cleanedKpText) {
    return null
  }
  
  const headwordInfo = cleanHeadword(cleanedKpText)
  
  if (!headwordInfo.normalized) {
    return null
  }
  
  // 2. 处理粤拼
  const jyutpingArray = parseJyutping(row.jyutping)
  
  if (jyutpingArray.length === 0) {
    return null
  }
  
  // 3. 处理国际音标（原始注音）
  const ipa = (row.ipa || '').trim()
  
  // 4. 处理释义
  const mandarin = (row.mandarin || '').trim()
  
  // 5. 映射词条类型
  const entryType = mapEntryType(headwordInfo.normalized)
  
  // 6. 生成 source_id（使用 index 列）
  const sourceId = row.index ? String(row.index) : String(rowIndex + 1)
  
  // 生成唯一 ID（使用 index 和词头组合，确保唯一性）
  const safeHeadword = headwordInfo.normalized.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
  const uniqueId = `${DICTIONARY_INFO.id}_${String(sourceId).padStart(6, '0')}`.replace(/[^a-zA-Z0-9_-]/g, '_')
  
  // 7. 构建标准词条
  const entry = {
    id: uniqueId,
    source_book: DICTIONARY_INFO.source_book,
    source_id: sourceId,
    
    dialect: DICTIONARY_INFO.dialect,
    
    headword: {
      display: rawKpText,  // 使用原始词头（保留所有符号用于显示）
      search: headwordInfo.normalized,  // 使用清理后的词头（用于搜索）
      normalized: headwordInfo.normalized,
      is_placeholder: headwordInfo.isPlaceholder || false
    },
    
    phonetic: {
      original: ipa || undefined,  // 使用国际音标作为原始注音
      jyutping: jyutpingArray
    },
    
    entry_type: entryType,
    
    senses: [{
      definition: mandarin || '',
      examples: []
    }],
    
    meta: {
      image_page: row.image_page || undefined,
      book_page: row.book_page || undefined,
      section: row.section || undefined
    },
    
    created_at: new Date().toISOString()
  }
  
  // 8. 生成搜索关键词
  entry.keywords = generateKeywords(entry)
  
  return entry
}

/**
 * 聚合相同词头的多个读音
 * 将同一个词头的多个读音合并到一个条目中
 * @param {Array<Object>} entries - 词条数组
 * @returns {Array<Object>} 聚合后的词条数组
 */
export function aggregateEntries(entries) {
  // 按词头分组
  const grouped = new Map()
  
  entries.forEach(entry => {
    const key = entry.headword.normalized
    
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key).push(entry)
  })
  
  const aggregated = []
  
  grouped.forEach((group, key) => {
    if (group.length === 1) {
      // 单个词条，直接使用
      aggregated.push(group[0])
    } else {
      // 多个词条，需要合并读音
      // 按 source_id 排序，使用第一个作为基础词条
      group.sort((a, b) => {
        const idA = a.source_id || ''
        const idB = b.source_id || ''
        return idA.localeCompare(idB)
      })
      
      // 以第一个词条为基础
      const baseEntry = { ...group[0] }
      
      // 收集所有粤拼读音（去重）
      const allJyutping = new Set()
      const allIpa = new Set()
      
      group.forEach(entry => {
        // 收集所有 jyutping
        if (Array.isArray(entry.phonetic.jyutping)) {
          entry.phonetic.jyutping.forEach(jp => {
            if (jp && jp.trim()) {
              allJyutping.add(jp.trim())
            }
          })
        } else if (entry.phonetic.jyutping) {
          allJyutping.add(entry.phonetic.jyutping.trim())
        }
        
        // 收集所有 IPA（原始注音）
        if (entry.phonetic.original) {
          if (typeof entry.phonetic.original === 'string') {
            allIpa.add(entry.phonetic.original.trim())
          } else if (Array.isArray(entry.phonetic.original)) {
            entry.phonetic.original.forEach(ipa => {
              if (ipa && ipa.trim()) {
                allIpa.add(ipa.trim())
              }
            })
          }
        }
      })
      
      // 转换为数组并排序（保持一致性）
      const mergedJyutping = Array.from(allJyutping).sort()
      const mergedIpa = Array.from(allIpa).sort()
      
      // 更新 phonetic 字段
      baseEntry.phonetic.jyutping = mergedJyutping
      // 如果有多个 IPA，使用数组；如果只有一个，使用字符串
      if (mergedIpa.length > 1) {
        baseEntry.phonetic.original = mergedIpa
      } else if (mergedIpa.length === 1) {
        baseEntry.phonetic.original = mergedIpa[0]
      }
      
      // 合并 source_id（保留所有原始索引，用逗号分隔）
      const sourceIds = group.map(e => e.source_id).filter(Boolean)
      if (sourceIds.length > 1) {
        baseEntry.source_id = sourceIds.join(',')
      }
      
      // 合并释义（如果有多个不同的释义）
      const definitions = new Set()
      group.forEach(entry => {
        if (entry.senses && entry.senses.length > 0) {
          entry.senses.forEach(sense => {
            if (sense.definition && sense.definition.trim()) {
              definitions.add(sense.definition.trim())
            }
          })
        }
      })
      
      if (definitions.size > 1) {
        // 多个不同释义，合并为多个义项
        baseEntry.senses = Array.from(definitions).map(def => ({
          definition: def,
          examples: []
        }))
      } else if (definitions.size === 1) {
        // 单个释义，保持原样
        baseEntry.senses = [{
          definition: Array.from(definitions)[0],
          examples: []
        }]
      }
      
      // 合并关键词（去重）
      const allKeywords = new Set()
      group.forEach(entry => {
        if (Array.isArray(entry.keywords)) {
          entry.keywords.forEach(kw => allKeywords.add(kw))
        }
      })
      baseEntry.keywords = Array.from(allKeywords)
      
      aggregated.push(baseEntry)
    }
  })
  
  return aggregated
}

/**
 * 批量转换
 * @param {Array<Object>} rows - CSV 行数组
 * @returns {Object} { entries, errors, filteredCount }
 */
export function transformAll(rows) {
  const entries = []
  const errors = []
  let filteredCount = 0
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    
    try {
      const entry = transformRow(row, i)
      
      if (entry === null) {
        filteredCount++
        continue
      }
      
      entries.push(entry)
    } catch (error) {
      errors.push({
        row: i + 2, // +2 因为 CSV 有表头，且行号从1开始
        word: row.kp_text || '未知',
        error: error.message
      })
    }
  }
  
  // 聚合相同词头的多个读音
  const aggregatedEntries = aggregateEntries(entries)
  
  return {
    entries: aggregatedEntries,
    errors: errors.length > 0 ? errors : undefined,
    filteredCount
  }
}

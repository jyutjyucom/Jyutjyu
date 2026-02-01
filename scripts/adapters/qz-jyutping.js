/**
 * 欽州粵拼 (HamZau_JyutPing) 数据适配器
 *
 * 原始 CSV 格式:
 * index, entry_type, headword, jyutping, definition
 *
 * 特点:
 * - 拼音词典，不包含释义内容
 * - definition 字段统一为 "未有內容 NO DATA"
 * - entry_type 为 character/word/phrase
 * - 收录钦州粤语拼音
 *
 * 数据来源:
 * - 作者: Lai Joengzit
 * - 名称: 欽州粵拼
 * - 年份: 2020
 * - 来源: https://github.com/LaiJoengzit/hamzau_jyutping
 * - 许可: GPL-3.0
 * - 性质: 爱好者原创
 */

import { publicDecrypt } from 'crypto'
import {
  generateKeywords,
  cleanHeadword
} from '../utils/text-processor.js'

/**
 * 词典元数据
 */
export const DICTIONARY_INFO = {
  id: 'qz-jyutping',
  name: {
    'zh-Hans': '欽州粵拼',
    'zh-Hant': '欽州粵拼',
    'yue-Hans': '欽州粵拼',
    'yue-Hant': '欽州粵拼'
  },
  dialect: {
    name: {
      'zh-Hans': '钦州',
      'zh-Hant': '欽州',
      'yue-Hans': '钦州',
      'yue-Hant': '欽州'
    },
    region_code: 'QZ'
  },
  source_book: '欽州粵拼',
  author: {
    'zh-Hans': 'Lai Joengzit等',
    'zh-Hant': 'Lai Joengzit等',
    'yue-Hans': 'Lai Joengzit等',
    'yue-Hant': 'Lai Joengzit等'
  },
  publisher: {
    'zh-Hans': 'Lai Joengzit',
    'zh-Hant': 'Lai Joengzit',
    'yue-Hans': 'Lai Joengzit',
    'yue-Hant': 'Lai Joengzit'
  },
  year: 2020,
  version: '201026',
  description: {
    'zh-Hans': '《钦州白话》的词头及注音部分，收录钦州话词汇及粤拼。',
    'zh-Hant': '《欽州白話》的詞頭及注音部分，收錄欽州話詞彙及粵拼。',
    'yue-Hans': '《欽州白話》的詞頭同注音部分，收錄欽州話詞彙同粵拼。',
    'yue-Hant': '《欽州白話》的詞頭同注音部分，收錄欽州話詞彙同粵拼。'
  },
  source: 'https://github.com/LaiJoengzit/hamzau_jyutping',
  license: {
    'zh-Hans': 'GPL-3.0',
    'zh-Hant': 'GPL-3.0',
    'yue-Hans': 'GPL-3.0',
    'yue-Hant': 'GPL-3.0'
  },
  usage_restriction: {
    'zh-Hans': '此词典数据遵循 GPL-3.0 许可证，使用本数据时请遵守相应的许可证要求。',
    'zh-Hant': '此詞典數據遵循 GPL-3.0 許可證，使用本數據時請遵守相應的許可證要求。',
    'yue-Hans': '此詞典數據遵循 GPL-3.0 許可證，使用本數據時請遵守相應的許可證要求。',
    'yue-Hant': '此詞典數據遵循 GPL-3.0 許可證，使用本數據時請遵守相應的許可證要求。'
  },
  attribution: {
    'zh-Hans': '欽州粵拼，Lai Joengzit等，2020年。爱好者原创作品。',
    'zh-Hant': '欽州粵拼，Lai Joengzit等，2020年。爱好者原创作品。',
    'yue-Hans': '欽州粵拼，Lai Joengzit等，2020年。爱好者原创作品。',
    'yue-Hant': '欽州粵拼，Lai Joengzit等，2020年。爱好者原创作品。'
  },
  cover: '/qz-jyutping.jpg'
}

/**
 * 必填字段验证
 */
export const REQUIRED_FIELDS = ['index', 'entry_type', 'headword', 'jyutping']

/**
 * 判断词条类型
 * @param {string} entryType - CSV 中的 entry_type 字段
 * @param {string} headword - 词头
 * @returns {string} 'character' | 'word' | 'phrase'
 */
function mapEntryType(entryType, headword) {
  // 如果 CSV 中已经有正确的类型，直接使用
  if (entryType === 'character' || entryType === 'word' || entryType === 'phrase') {
    return entryType
  }
  
  // 否则根据词头长度判断
  const cleaned = headword.replace(/\s+/g, '')
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
 * 转换单个 CSV 行为标准 DictionaryEntry
 * @param {Object} row - CSV 行数据
 * @returns {Object|null} DictionaryEntry 对象
 */
export function transformRow(row) {
  // 1. 清理词头
  const headwordInfo = cleanHeadword(row.headword)
  
  if (!headwordInfo.normalized || !row.jyutping) {
    return null
  }
  
  // 2. 处理粤拼（保持完整字符串，不拆分音节）
  // jyutping 数组中的每个元素应该是完整的拼音字符串（支持多音字）
  const jyutpingArray = row.jyutping
    ? [row.jyutping.trim()].filter(j => j)
    : []
  
  if (jyutpingArray.length === 0) {
    return null
  }
  
  // 3. 映射词条类型
  const entryType = mapEntryType(row.entry_type, headwordInfo.normalized)
  
  // 4. 构建标准词条
  const entry = {
    id: `${DICTIONARY_INFO.id}_${String(row.index).padStart(6, '0')}`,
    source_book: DICTIONARY_INFO.source_book,
    source_id: String(row.index),
    
    dialect: DICTIONARY_INFO.dialect,
    
    headword: {
      display: headwordInfo.normalized,
      search: headwordInfo.normalized,
      normalized: headwordInfo.normalized,
      is_placeholder: headwordInfo.isPlaceholder || false
    },
    
    phonetic: {
      original: row.jyutping, // 使用粤拼作为原始注音
      jyutping: jyutpingArray
    },
    
    entry_type: entryType,
    
    senses: [{definition: row.definition, examples: []}],

    meta: {
      // 原始词条类型
      original_entry_type: row.entry_type || null,
    },
    
    created_at: new Date().toISOString()
  }
  
  // 5. 生成搜索关键词
  entry.keywords = generateKeywords(entry)
  
  return entry
}

/**
 * 聚合相同词头的多个读音
 * 将同一个词头的多个读音合并到一个条目中，分行展示
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
      // 按 source_id 排序，使用最小的索引作为基础词条
      group.sort((a, b) => {
        const idA = parseInt(a.source_id) || 0
        const idB = parseInt(b.source_id) || 0
        return idA - idB
      })
      
      // 以第一个（最小索引）词条为基础
      const baseEntry = { ...group[0] }
      
      // 收集所有粤拼读音（去重）
      const allJyutping = new Set()
      
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
      })
      
      // 转换为数组并排序（保持一致性）
      const mergedJyutping = Array.from(allJyutping).sort()
      
      // 更新 phonetic 字段
      baseEntry.phonetic.jyutping = mergedJyutping
      // 对 qz-jyutping 来说，“原文注音”就是粤拼本身。
      // 聚合后把 original 设为与 jyutping 一一对应的数组，避免前端把“另一个读音”
      // 误显示成“原文注音”（仅仅因为字符串不相等）。
      baseEntry.phonetic.original = mergedJyutping
      
      // 合并 source_id（保留所有原始索引，用逗号分隔）
      const sourceIds = group.map(e => e.source_id).filter(Boolean)
      if (sourceIds.length > 1) {
        baseEntry.source_id = sourceIds.join(',')
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
      const entry = transformRow(row)
      
      if (entry === null) {
        filteredCount++
        continue
      }
      
      entries.push(entry)
    } catch (error) {
      errors.push({
        row: i + 2, // +2 因为 CSV 有表头，且行号从1开始
        word: row.headword || '未知',
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

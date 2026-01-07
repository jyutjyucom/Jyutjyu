/**
 * Wiktionary Cantonese数据适配器
 * 
 * 原始数据格式: JSONL (每行一个JSON对象)
 * 数据源: Wiktionary Chinese entries with Cantonese content
 * 
 * 特点:
 * - 包含详细的发音信息（Jyutping, Yale, IPA等）
 * - 多种词性标记
 * - 丰富的词源信息
 * - 包含标签系统（Hong-Kong, colloquial等）
 * - 可能包含异体字信息
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
  id: 'wiktionary-cantonese',
  name: 'Wiktionary粤语词条',
  dialect: {
    name: '粤语',
    region_code: 'YUE'
  },
  source_book: 'Wiktionary',
  author: 'Wiktionary contributors',
  publisher: 'Wikimedia Foundation',
  year: 2026,
  source: 'community_contributed',
  license: 'CC BY-SA 4.0',
  license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  attribution: 'Wiktionary contributors',
  usage_restriction: '需遵循CC BY-SA 4.0协议',
  
  // 启用自动分片（大型词典优化）
  enable_chunking: true,
  chunk_output_dir: 'wiktionary'
}

/**
 * 词性映射表（英文 -> 中文）
 */
const POS_MAP = {
  'noun': '名词',
  'verb': '动词',
  'adj': '形容词',
  'adjective': '形容词',
  'adv': '副词',
  'adverb': '副词',
  'pronoun': '代词',
  'prep': '介词',
  'preposition': '介词',
  'conj': '连词',
  'conjunction': '连词',
  'intj': '叹词',
  'interjection': '叹词',
  'particle': '助词',
  'classifier': '量词',
  'measure word': '量词',
  'phrase': '短语',
  'proverb': '谚语',
  'idiom': '成语',
  'character': '字',
  'name': '名称',
  'proper noun': '专有名词'
}

/**
 * 提取粤语Jyutping发音
 * @param {Array} sounds - 发音数组
 * @returns {Array<string>} 粤拼数组
 */
function extractJyutping(sounds) {
  if (!sounds || !Array.isArray(sounds)) return []
  
  const jyutpingSet = new Set()
  
  sounds.forEach(sound => {
    // 筛选包含 Cantonese 和 Jyutping 标签的发音
    if (sound.tags && Array.isArray(sound.tags)) {
      const hasCantonese = sound.tags.some(tag => 
        tag && typeof tag === 'string' && tag.toLowerCase().includes('cantonese')
      )
      const hasJyutping = sound.tags.some(tag => 
        tag && typeof tag === 'string' && tag.toLowerCase().includes('jyutping')
      )
      
      if (hasCantonese && hasJyutping && sound.zh_pron) {
        // zh_pron 可能是 "gaa1 fei1" 或 "gaa¹ fei¹" 格式
        // 标准化为数字声调格式
        let normalized = sound.zh_pron
          .replace(/¹/g, '1')
          .replace(/²/g, '2')
          .replace(/³/g, '3')
          .replace(/⁴/g, '4')
          .replace(/⁵/g, '5')
          .replace(/⁶/g, '6')
          .replace(/⁷/g, '7')
          .replace(/⁸/g, '8')
          .replace(/⁹/g, '9')
          .trim()
        
        if (normalized) {
          jyutpingSet.add(normalized)
        }
      }
    }
  })
  
  return Array.from(jyutpingSet)
}

/**
 * 提取粤语IPA发音
 * @param {Array} sounds - 发音数组
 * @returns {string|null} IPA字符串
 */
function extractIPA(sounds) {
  if (!sounds || !Array.isArray(sounds)) return null
  
  // 查找包含 Cantonese 标签且有 IPA 的发音
  for (const sound of sounds) {
    if (sound.tags && Array.isArray(sound.tags)) {
      const hasCantonese = sound.tags.some(tag => 
        tag && typeof tag === 'string' && tag.toLowerCase().includes('cantonese')
      )
      
      if (hasCantonese && sound.ipa) {
        return sound.ipa
      }
    }
  }
  
  return null
}

/**
 * 提取异体字/变体形式
 * @param {Array} forms - 形式数组
 * @returns {Array<string>} 变体数组
 */
function extractVariants(forms) {
  if (!forms || !Array.isArray(forms)) return []
  
  const variants = []
  
  forms.forEach(form => {
    if (form.form && form.tags && Array.isArray(form.tags)) {
      // 查找标记为 alternative 的形式
      if (form.tags.includes('alternative')) {
        variants.push(form.form)
      }
    }
  })
  
  return variants
}

/**
 * 检查是否为粤语相关词条
 * @param {Object} entry - Wiktionary词条对象
 * @returns {boolean} 是否为粤语词条
 */
function isCantoneseEntry(entry) {
  // 检查是否有粤语发音信息
  if (entry.sounds && Array.isArray(entry.sounds)) {
    const hasCantoneseSound = entry.sounds.some(sound => 
      sound.tags && Array.isArray(sound.tags) &&
      sound.tags.some(tag => 
        tag && typeof tag === 'string' && 
        tag.toLowerCase().includes('cantonese')
      )
    )
    if (hasCantoneseSound) return true
  }
  
  // 检查释义中是否有粤语标签
  if (entry.senses && Array.isArray(entry.senses)) {
    const hasCantoneseSense = entry.senses.some(sense => 
      sense.tags && Array.isArray(sense.tags) &&
      sense.tags.some(tag => 
        tag && typeof tag === 'string' && 
        (tag.toLowerCase().includes('cantonese') || 
         tag.toLowerCase().includes('hong-kong'))
      )
    )
    if (hasCantoneseSense) return true
  }
  
  return false
}

/**
 * 提取地区标签
 * @param {Array} tags - 标签数组
 * @returns {string|null} 地区信息
 */
function extractRegion(tags) {
  if (!tags || !Array.isArray(tags)) return null
  
  for (const tag of tags) {
    if (typeof tag === 'string') {
      const lower = tag.toLowerCase()
      if (lower.includes('hong-kong') || lower === 'hong kong') {
        return '香港'
      }
      if (lower.includes('guangzhou') || lower === 'guangzhou') {
        return '广州'
      }
      if (lower.includes('macau') || lower === 'macau') {
        return '澳门'
      }
    }
  }
  
  return null
}

/**
 * 提取语域标签
 * @param {Array} tags - 标签数组
 * @returns {string|null} 语域信息
 */
function extractRegister(tags) {
  if (!tags || !Array.isArray(tags)) return null
  
  for (const tag of tags) {
    if (typeof tag === 'string') {
      const lower = tag.toLowerCase()
      if (lower.includes('colloquial')) return '口语'
      if (lower.includes('formal')) return '书面'
      if (lower.includes('vulgar')) return '粗俗'
      if (lower.includes('literary')) return '文雅'
      if (lower.includes('slang')) return '俚语'
    }
  }
  
  return null
}

/**
 * 处理释义数组
 * @param {Array} senses - Wiktionary释义数组
 * @returns {Array<Object>} 标准化的释义数组
 * 注意：地区信息不在这里处理，会在 transformEntry 中提取到 dialect 字段
 */
function processSenses(senses) {
  if (!senses || !Array.isArray(senses)) return []
  
  const processedSenses = []
  
  senses.forEach(sense => {
    // 提取释义文本（glosses 是数组）
    let definition = ''
    if (sense.glosses && Array.isArray(sense.glosses)) {
      definition = sense.glosses.join('；')
    } else if (sense.raw_glosses && Array.isArray(sense.raw_glosses)) {
      definition = sense.raw_glosses.join('；')
    }
    
    if (!definition) return // 跳过无释义的条目
    
    // label 不再包含地区和语域信息（这些会在顶层处理）
    // 如果有其他标签信息可以在这里添加
    const label = null
    
    // 提取例句（如果有）
    // 注意：Wiktionary 的例句经常有简繁体两个版本，我们只保留繁体版本以节省约50%空间
    // 策略：
    // 1. 明确标记为简体的直接跳过：tags 包含 "Simplified-Chinese"
    // 2. 对于其他情况，通过 translation 去重（保留第一个，通常是繁体）
    const examples = []
    const seenTranslations = new Map() // 用于追踪已见过的翻译
    
    if (sense.examples && Array.isArray(sense.examples)) {
      sense.examples.forEach((example, idx) => {
        // 跳过明确标记为简体的例句
        if (example.tags && Array.isArray(example.tags)) {
          const isSimplifiedChinese = example.tags.some(tag => {
            if (!tag || typeof tag !== 'string') return false
            return tag.toLowerCase() === 'simplified-chinese'
          })
          
          if (isSimplifiedChinese) {
            return // 跳过简体版本
          }
        }
        
        // 处理例句
        if (typeof example === 'string') {
          examples.push({ text: example })
        } else if (example.text) {
          // 使用 translation 作为去重键（同一翻译通常对应繁简体对）
          const translationKey = example.english || example.translation || example.text
          
          if (seenTranslations.has(translationKey)) {
            // 已经有相同翻译的例句了，检查是否为简繁体对
            const prevExample = seenTranslations.get(translationKey)
            const prevText = prevExample.text
            const currText = example.text
            
            // 如果两个例句长度相同且翻译相同，很可能是繁简体对
            // 保留第一个（通常是繁体），跳过第二个（通常是简体）
            if (prevText && currText && prevText.length === currText.length && prevText !== currText) {
              return // 跳过可能的简体版本
            }
          } else {
            // 首次见到这个翻译，记录并添加
            const exampleObj = {
              text: example.text,
              translation: example.english || null
            }
            examples.push(exampleObj)
            seenTranslations.set(translationKey, exampleObj)
          }
        }
      })
    }
    
    processedSenses.push({
      definition,
      label,
      examples: examples.length > 0 ? examples : undefined
    })
  })
  
  return processedSenses
}

/**
 * 判断词条类型
 * @param {string} word - 词条
 * @param {string} pos - 词性
 * @returns {string} 'character' | 'word' | 'phrase'
 */
function guessEntryType(word, pos) {
  // 根据词性判断
  if (pos === 'character' || pos === '字') return 'character'
  if (pos === 'phrase' || pos === 'proverb' || pos === '短语' || pos === '谚语') {
    return 'phrase'
  }
  
  // 根据长度判断
  const chineseChars = word.match(/[\u4e00-\u9fa5]/g) || []
  const length = chineseChars.length
  
  if (length === 0) return 'word' // 外来词
  if (length === 1) return 'character'
  if (length <= 4) return 'word'
  return 'phrase'
}

/**
 * 转换单个 Wiktionary 词条为标准 DictionaryEntry
 * @param {Object} entry - Wiktionary词条对象
 * @param {number} index - 词条索引（用于生成ID）
 * @returns {Object|null} DictionaryEntry 对象，如果不是粤语词条则返回null
 */
export function transformEntry(entry, index) {
  // 验证基本字段
  if (!entry.word || !entry.lang || entry.lang !== 'Chinese') {
    throw new Error('Invalid entry: missing word or not Chinese')
  }
  
  // 检查是否为粤语相关词条
  if (!isCantoneseEntry(entry)) {
    throw new Error('Not a Cantonese entry')
  }
  
  // 1. 提取粤拼和IPA
  const jyutpingArray = extractJyutping(entry.sounds)
  const ipa = extractIPA(entry.sounds)
  
  if (jyutpingArray.length === 0) {
    // 没有粤拼，跳过此词条
    throw new Error('No Jyutping found')
  }
  
  // 2. 处理词头
  const headwordInfo = cleanHeadword(entry.word)
  
  // 3. 提取异体字
  const variants = extractVariants(entry.forms)
  
  // 4. 处理释义
  const senses = processSenses(entry.senses)
  
  if (senses.length === 0) {
    throw new Error('No valid senses found')
  }
  
  // 5. 词性映射
  const posEnglish = entry.pos || 'word'
  const posChinese = POS_MAP[posEnglish.toLowerCase()] || posEnglish
  
  // 6. 检测词条类型
  const entryType = guessEntryType(entry.word, posEnglish)
  
  // 7. 从第一个sense的tags中提取地区和语域信息
  let dialectInfo = { ...DICTIONARY_INFO.dialect } // 默认使用粤语
  let registerInfo = null
  
  if (entry.senses && entry.senses.length > 0 && entry.senses[0].tags) {
    const firstTags = entry.senses[0].tags
    const region = extractRegion(firstTags)
    const register = extractRegister(firstTags)
    
    // 如果有更具体的地区信息，更新dialect
    if (region === '香港') {
      dialectInfo = { name: '香港话', region_code: 'HK' }
    } else if (region === '广州') {
      dialectInfo = { name: '广州话', region_code: 'GZ' }
    } else if (region === '澳门') {
      dialectInfo = { name: '澳门话', region_code: 'MO' }
    }
    
    registerInfo = register
  }
  
  // 8. 构建标准词条
  const dictEntry = {
    id: `${DICTIONARY_INFO.id}_${String(index).padStart(8, '0')}`,
    source_book: DICTIONARY_INFO.source_book,
    source_id: entry.id || String(index),
    
    dialect: dialectInfo,
    
    headword: {
      display: entry.word,
      search: headwordInfo.normalized,
      normalized: headwordInfo.normalized,
      is_placeholder: headwordInfo.isPlaceholder || false
    },
    
    phonetic: {
      original: ipa || jyutpingArray[0], // 优先使用IPA作为原始注音
      jyutping: jyutpingArray
    },
    
    entry_type: entryType,
    
    senses: senses,
    
    meta: {
      pos: posChinese,
      pos_original: posEnglish,
      
      // 语域信息
      register: registerInfo,
      
      // 异体字
      variants: variants.length > 0 ? variants : null,
      
      // 词源信息
      etymology: entry.etymology_text || null,
      
      // IPA（作为额外信息）
      ipa: ipa || null,
      
      // 派生词、相关词等
      derived: entry.senses?.[0]?.derived?.map(d => d.word).filter(Boolean) || null,
      related: entry.senses?.[0]?.related?.map(r => r.word).filter(Boolean) || null,
      
      // 原始分类信息（用于调试和研究）
      categories: entry.senses?.[0]?.categories
        ?.filter(cat => cat.name && (
          cat.name.includes('Cantonese') || 
          cat.name.includes('Hong Kong')
        ))
        ?.map(cat => cat.name)
        ?.slice(0, 5) || null, // 最多保留5个相关分类
      
      // Wiktionary特有ID
      wiktionary_id: entry.id || null
    },
    
    created_at: new Date().toISOString()
  }
  
  // 9. 生成搜索关键词
  dictEntry.keywords = generateKeywords(dictEntry)
  
  // 10. 添加异体字到关键词
  if (variants.length > 0) {
    variants.forEach(variant => {
      dictEntry.keywords.push(variant)
    })
  }
  
  // 11. 添加无声调粤拼到关键词（已在generateKeywords中处理）
  
  // 去重
  dictEntry.keywords = [...new Set(dictEntry.keywords)]
  
  return dictEntry
}

/**
 * 批量转换
 * @param {Array<Object>} entries - Wiktionary词条数组
 * @returns {Object} { entries, errors, skipped }
 */
export function transformAll(entries) {
  const transformedEntries = []
  const errors = []
  let skippedCount = 0
  
  entries.forEach((entry, index) => {
    try {
      const transformed = transformEntry(entry, index)
      transformedEntries.push(transformed)
    } catch (error) {
      // 区分跳过的词条和真正的错误
      if (error.message.includes('Not a Cantonese entry') ||
          error.message.includes('No Jyutping found') ||
          error.message.includes('No valid senses found')) {
        skippedCount++
      } else {
        errors.push({
          index: index,
          word: entry.word || 'unknown',
          error: error.message,
          data: entry
        })
      }
    }
  })
  
  console.log(`ℹ️  跳过了 ${skippedCount} 个非粤语词条或无效词条`)
  
  return { entries: transformedEntries, errors, skipped: skippedCount }
}

/**
 * 后处理：去重和合并
 * Wiktionary可能有重复词条或需要合并的条目
 * @param {Array<Object>} entries - 词条数组
 * @returns {Array<Object>} 处理后的词条数组
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
      // 多个词条，需要合并
      // 以第一个词条为基础
      const baseEntry = { ...group[0] }
      
      // 收集所有释义
      const allSenses = []
      const seenDefinitions = new Set()
      
      group.forEach(entry => {
        entry.senses.forEach(sense => {
          // 去重释义
          if (!seenDefinitions.has(sense.definition)) {
            seenDefinitions.add(sense.definition)
            allSenses.push(sense)
          }
        })
      })
      
      baseEntry.senses = allSenses
      
      // 合并粤拼
      const allJyutping = new Set()
      group.forEach(entry => {
        entry.phonetic.jyutping.forEach(jp => allJyutping.add(jp))
      })
      baseEntry.phonetic.jyutping = Array.from(allJyutping)
      
      // 合并关键词
      const allKeywords = new Set()
      group.forEach(entry => {
        entry.keywords.forEach(kw => allKeywords.add(kw))
      })
      baseEntry.keywords = Array.from(allKeywords)
      
      // 合并异体字
      const allVariants = new Set()
      group.forEach(entry => {
        if (entry.meta.variants) {
          entry.meta.variants.forEach(v => allVariants.add(v))
        }
      })
      if (allVariants.size > 0) {
        baseEntry.meta.variants = Array.from(allVariants)
      }
      
      aggregated.push(baseEntry)
    }
  })
  
  return aggregated
}

/**
 * 字段说明
 */
export const FIELD_NOTES = {
  word: '词条本身',
  pos: '词性（需要映射为中文）',
  sounds: '发音数组，需要筛选Cantonese+Jyutping标签的发音',
  senses: '释义数组，包含glosses、tags、examples等',
  forms: '词形变化，主要关注alternative标记的异体字',
  etymology_text: '词源说明',
  tags: '标签系统，用于识别地区（Hong-Kong）和语域（colloquial）',
  ipa: 'IPA音标，作为original字段展示'
}

/**
 * 后处理：自动分片大型词典
 * 
 * 在数据生成完成后，自动将大文件分片以优化加载性能，
 * 并删除完整文件以节省磁盘空间
 * 
 * @param {Array<Object>} entries - 处理后的词条数组
 * @param {string} outputPath - 输出文件路径
 * @returns {Promise<Array<Object>>} 返回原始词条数组
 */
export async function postProcess(entries, outputPath) {
  if (!DICTIONARY_INFO.enable_chunking) {
    console.log('ℹ️  分片功能未启用，跳过')
    return entries
  }
  
  console.log('\n🔧 检测到大型词典，启用自动分片...')
  console.log(`📊 词条总数: ${entries.length}`)
  
  try {
    // 动态导入模块
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    
    // 记录完整文件大小（用于统计）
    const fileStats = fs.statSync(outputPath)
    const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2)
    console.log(`📄 完整文件大小: ${fileSizeMB} MB`)
    
    // 确定分片输出目录
    const outputDir = path.dirname(outputPath)
    const chunkDir = path.join(
      outputDir,
      DICTIONARY_INFO.chunk_output_dir || 'wiktionary'
    )
    
    console.log(`📁 分片输出目录: ${chunkDir}`)
    
    // 动态导入分片模块（CommonJS）
    const { createRequire } = await import('module')
    const require = createRequire(import.meta.url)
    const splitModule = require('../split-dictionary.cjs')
    
    // 执行分片
    await splitModule.splitDictionary(outputPath, chunkDir)
    
    console.log('✅ Wiktionary 数据分片完成！')
    console.log('💡 前端将自动按需加载分片，大幅提升性能')
    
    // 分片成功后删除完整文件
    console.log('\n🗑️  清理完整文件...')
    fs.unlinkSync(outputPath)
    console.log(`✅ 已删除完整文件 (节省 ${fileSizeMB} MB 磁盘空间)`)
    console.log('ℹ️  前端仅使用分片文件，完整文件已不再需要')
    
  } catch (error) {
    console.error('❌ 分片过程出错:', error)
    console.log('⚠️  将继续使用完整文件（分片失败不影响数据生成）')
  }
  
  return entries
}

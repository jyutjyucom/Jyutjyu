/**
 * 文本处理工具
 * 关键词生成、文本清理等
 * 
 * 注意：简繁体转换已移至运行时处理（composables/useChineseConverter.ts）
 * 这样可以确保所有词典适配器的行为一致，无需在预处理时考虑简繁转换
 */

/**
 * 去除粤拼声调（用于模糊搜索）
 * @param {string} jyutping - 带声调的粤拼
 * @returns {string} 无声调粤拼
 */
export function removeTones(jyutping) {
  return jyutping.replace(/[1-6]/g, '')
}

/**
 * 生成搜索关键词
 * @param {Object} entry - 词条对象
 * @returns {Array<string>} 关键词数组
 * 
 * 注意：不再预生成简繁体变体，由运行时搜索处理
 */
export function generateKeywords(entry) {
  const keywords = new Set()
  
  // 1. 词头相关
  if (entry.headword) {
    keywords.add(entry.headword.display)
    keywords.add(entry.headword.normalized)
    if (entry.headword.search) {
      keywords.add(entry.headword.search)
    }
  }
  
  // 2. 粤拼相关
  if (entry.phonetic && entry.phonetic.jyutping) {
    entry.phonetic.jyutping.forEach(jp => {
      keywords.add(jp)                        // aa3 soe4
      keywords.add(jp.replace(/\s/g, ''))    // aa3soe4
      keywords.add(removeTones(jp))           // aa sir
      keywords.add(removeTones(jp).replace(/\s/g, '')) // aasir
    })
  }
  
  // 3. 拆字（单字）
  const chars = entry.headword?.normalized?.match(/[\u4e00-\u9fa5]/g)
  if (chars) {
    chars.forEach(c => keywords.add(c))
  }
  
  // 4. 原书注音
  if (entry.phonetic?.original) {
    keywords.add(entry.phonetic.original)
  }
  
  return Array.from(keywords).filter(k => k && k.length > 0)
}

/**
 * 提取括号内的异体字变体
 * 例如: "阿（亚）SIR" → ["阿SIR", "亚SIR"]
 * @param {string} text - 原文
 * @returns {Array<string>} 变体数组
 */
export function extractVariants(text) {
  const variants = new Set()
  
  // 添加原文（去除括号）
  const cleaned = text.replace(/[（()）]/g, '')
  variants.add(cleaned)
  
  // 提取括号内容
  const regex = /([^（(]*)[（(]([^）)]+)[）)]([^（(]*)/g
  let match
  
  while ((match = regex.exec(text)) !== null) {
    const [, before, inside, after] = match
    // 外部版本
    variants.add(before + after)
    // 内部版本
    variants.add(before + inside + after)
  }
  
  return Array.from(variants)
}

/**
 * 清理词头（去除特殊标记）
 * @param {string} word - 词头
 * @returns {Object} { display, normalized, hasMarker, marker }
 */
export function cleanHeadword(word) {
  const result = {
    display: word,
    normalized: word,
    hasMarker: false,
    marker: null
  }
  
  // 检测星号标记 (如 *哋1)
  if (word.startsWith('*')) {
    result.hasMarker = true
    result.marker = '*'
    result.normalized = word.substring(1)
  }
  
  // 去除末尾数字标记 (如 哋1 → 哋)
  result.normalized = result.normalized.replace(/\d+$/, '')
  
  // 检测开天窗字 □
  result.isPlaceholder = result.normalized.includes('□')
  
  return result
}

/**
 * 解析例句（从释义中提取），支持多义项
 * 格式: "释义。例句1。（翻译1。）│例句2。（翻译2。）"
 * 或: "①释义1。例句1。（翻译1。）②释义2。例句2。（翻译2。）"
 * @param {string} meanings - 释义字段
 * @returns {Array<Object>} [{ definition, examples }, ...] 义项数组
 */
export function parseExamples(meanings) {
  if (!meanings) return [{ definition: '', examples: [] }]
  
  // 清理开头的句号
  let cleanedMeanings = meanings.replace(/^[。\s]+/, '')
  
  // 检测是否有编号义项（①②③④⑤⑥⑦⑧⑨⑩ 或 ⑴⑵⑶⑷⑸等）
  const senseMarkerRegex = /[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽]/g
  const markers = cleanedMeanings.match(senseMarkerRegex)
  
  if (markers && markers.length > 0) {
    // 有编号义项，需要分割处理
    return parseMultipleSenses(cleanedMeanings, markers)
  } else {
    // 单一义项，使用原有逻辑
    return [parseSingleSense(cleanedMeanings)]
  }
}

/**
 * 判断文本是否具有例句的特征
 * @param {string} text - 待判断的文本
 * @returns {boolean} 是否具有例句特征
 */
function hasExampleCharacteristics(text) {
  // 特征1: 包含波浪号（～）代指词头
  if (text.includes('～') || text.includes('~')) {
    return true
  }
  
  // 特征2: 包含括号译文（表示这是一个用例）
  // 但要排除纯粹的括号注释（整段都被括号包裹）
  const hasParentheses = /[（(][^）)]+[）)]/.test(text)
  const isOnlyParenthetical = /^[（(][^）)]+[）)]$/.test(text)
  if (hasParentheses && !isOnlyParenthetical) {
    return true
  }
  
  // 特征3: 包含引号，表示引用的话语或用例
  if (text.includes('「') || text.includes('」') || text.includes('"') || text.includes('"')) {
    return true
  }
  
  // 如果没有以上特征，可能只是释义的补充说明
  return false
}

/**
 * 解析单个义项
 * @param {string} text - 包含释义和例句的文本
 * @returns {Object} { definition, examples }
 */
function parseSingleSense(text) {
  const result = {
    definition: '',
    examples: []
  }
  
  // 先按 │ 分割各个例句组
  const segments = text.split('│')
  
  if (segments.length === 0) return result
  
  // 处理第一段（包含释义和可能的第一个例句）
  const firstSegment = segments[0]
  
  // 寻找第一个 。 作为释义结束（但要排除括号内的句号）
  let definitionEnd = -1
  let inParentheses = 0
  
  for (let i = 0; i < firstSegment.length; i++) {
    const char = firstSegment[i]
    if (char === '（' || char === '(') {
      inParentheses++
    } else if (char === '）' || char === ')') {
      inParentheses--
    } else if (char === '。' && inParentheses === 0 && definitionEnd === -1) {
      definitionEnd = i
      break
    }
  }
  
  if (definitionEnd === -1) {
    // 没有找到释义分隔符，整段都是释义
    result.definition = firstSegment.trim()
  } else {
    // 提取释义
    result.definition = firstSegment.substring(0, definitionEnd).trim()
    
    // 第一段剩余部分可能包含例句
    const firstExample = firstSegment.substring(definitionEnd + 1).trim()
    if (firstExample) {
      // 判断剩余部分是释义的补充说明还是真正的例句
      const isOnlyParenthetical = /^[（(][^）)]+[）)]$/.test(firstExample)
      const hasExampleFeatures = hasExampleCharacteristics(firstExample)
      
      if (isOnlyParenthetical || !hasExampleFeatures) {
        // 这是释义的补充说明，应该包含在definition中
        result.definition = firstSegment.substring(0, definitionEnd + 1).trim() + firstExample
      } else {
        // 这是真正的例句
        const example = parseExamplePair(firstExample)
        if (example.text) {
          result.examples.push(example)
        }
      }
    }
  }
  
  // 处理后续段落（每段是一个完整的例句+翻译对）
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i].trim()
    if (segment) {
      const example = parseExamplePair(segment)
      if (example.text) {
        result.examples.push(example)
      }
    }
  }
  
  return result
}

/**
 * 解析多个编号义项
 * @param {string} text - 包含多个编号义项的文本
 * @param {Array<string>} markers - 义项编号标记数组
 * @returns {Array<Object>} 义项数组
 */
function parseMultipleSenses(text, markers) {
  const senses = []
  
  // 为每个标记找到其在文本中的位置
  const markerPositions = []
  let searchStart = 0
  
  markers.forEach(marker => {
    const pos = text.indexOf(marker, searchStart)
    if (pos !== -1) {
      markerPositions.push({ marker, pos })
      searchStart = pos + 1
    }
  })
  
  // 按位置分割文本
  for (let i = 0; i < markerPositions.length; i++) {
    const start = markerPositions[i].pos
    const end = i < markerPositions.length - 1 
      ? markerPositions[i + 1].pos 
      : text.length
    
    // 提取该义项的文本（去掉编号标记）
    let senseText = text.substring(start, end)
    senseText = senseText.replace(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽]/, '').trim()
    
    // 解析这个义项
    const sense = parseSingleSense(senseText)
    if (sense.definition || sense.examples.length > 0) {
      senses.push(sense)
    }
  }
  
  return senses.length > 0 ? senses : [{ definition: text.trim(), examples: [] }]
}

/**
 * 解析单个例句对（例句+翻译）
 * 格式: "例句。（翻译。）"
 * @param {string} text - 包含例句和翻译的文本
 * @returns {Object} { text, translation }
 */
function parseExamplePair(text) {
  if (!text) return { text: '', translation: null }
  
  // 提取括号内容作为翻译
  const translationMatch = text.match(/[（(]([^）)]+)[）)]/g)
  let translation = null
  
  if (translationMatch) {
    // 提取所有括号内容并合并
    translation = translationMatch
      .map(m => m.replace(/[（()）]/g, ''))
      .join('')
      .replace(/[。！？]+$/, '') // 去除末尾标点
      .trim()
  }
  
  // 移除括号部分，得到纯例句
  const exampleText = text
    .replace(/[（(][^）)]+[）)]/g, '')
    .replace(/[。！？]+$/, '') // 去除末尾标点
    .trim()
  
  return {
    text: exampleText || text.trim(),
    translation: translation || null
  }
}

/**
 * 解析备注（去除方括号）
 * @param {string} note - 备注字段
 * @returns {string} 清理后的备注
 */
export function parseNote(note) {
  if (!note) return ''
  return note.replace(/^\[/, '').replace(/\]$/, '').trim()
}


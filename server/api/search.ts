/**
 * 词典搜索 API
 * 
 * GET /api/search?q=查询词&limit=50&dict=词典ID&mode=normal|reverse
 * 
 * 参数:
 *   q     - 搜索查询词（必填）
 *   limit - 返回结果数量限制（默认 50，最大 200）
 *   dict  - 词典 ID 筛选（可选）
 *   mode  - 搜索模式: normal(正常) | reverse(反查释义)
 * 
 * 搜索逻辑（与前端保持一致）:
 *   正常模式优先级:
 *     1. 词头精确匹配 (priority 100)
 *     2. 词头前缀匹配 (priority 90)
 *     3. 词头包含匹配 (priority 80)
 *     4. 粤拼精确匹配 (priority 70)
 *     5. 粤拼包含匹配 (priority 60)
 *     6. 关键词匹配 (priority 50)
 *   反查模式:
 *     - 释义精确匹配 (priority 100)
 *     - 释义包含匹配 (priority 80)
 */

import { getEntriesCollection } from '../utils/mongodb'
import { 
  getQueryVariants, 
  toSimplifiedSync, 
  toTraditionalSync,
  ensureInitialized 
} from '../utils/opencc'

interface SearchQuery {
  q?: string
  limit?: string
  dict?: string
  mode?: 'normal' | 'reverse'
}

export default defineEventHandler(async (event) => {
  const query = getQuery<SearchQuery>(event)
  const { q, limit = '50', dict, mode = 'normal' } = query
  
  // 验证查询参数
  if (!q || typeof q !== 'string' || q.trim() === '') {
    return {
      success: false,
      error: '请提供搜索关键词',
      results: [],
      total: 0
    }
  }
  
  const searchQuery = q.trim()
  const resultLimit = Math.min(Math.max(1, parseInt(limit) || 50), 200)
  
  try {
    // 初始化 OpenCC（首次调用时）
    await ensureInitialized()
    
    const collection = await getEntriesCollection()
    
    // 检查是否有 Atlas Search 索引
    const hasAtlasSearch = await checkAtlasSearchIndex(collection)
    
    let results
    
    if (hasAtlasSearch) {
      // 使用 Atlas Search（全文搜索）
      results = await atlasSearch(collection, searchQuery, resultLimit, dict, mode)
    } else {
      // 回退到普通 MongoDB 查询（更精确的匹配逻辑）
      results = await fallbackSearch(collection, searchQuery, resultLimit, dict, mode)
    }
    
    return {
      success: true,
      query: searchQuery,
      mode,
      total: results.length,
      results
    }
    
  } catch (error: any) {
    console.error('搜索失败:', error)
    
    return {
      success: false,
      error: error.message || '搜索服务暂时不可用',
      results: [],
      total: 0
    }
  }
})

/**
 * 检查是否存在 Atlas Search 索引
 */
async function checkAtlasSearchIndex(collection: any): Promise<boolean> {
  try {
    await collection.aggregate([
      { $search: { index: 'default', text: { query: 'test', path: 'headword.normalized' } } },
      { $limit: 1 }
    ]).toArray()
    return true
  } catch {
    return false
  }
}

/**
 * Atlas Search 全文搜索
 * 注意：Atlas Search 使用 lucene.cjk 分词器，自动支持简繁体
 */
async function atlasSearch(
  collection: any, 
  query: string, 
  limit: number, 
  dict?: string,
  mode?: string
) {
  const queryVariants = await getQueryVariants(query)
  
  const searchStage: any = {
    index: 'default',
    compound: {
      should: []
    }
  }
  
  if (mode === 'reverse') {
    // 反查模式：只搜索释义
    // 搜索所有变体
    for (const variant of queryVariants) {
      searchStage.compound.should.push({
        text: {
          query: variant,
          path: 'senses.definition',
          score: { boost: { value: 5 } }
        }
      })
    }
  } else {
    // 正常模式：搜索词头、粤拼
    // 注意：Atlas Search 的权重顺序与前端优先级对应
    for (const variant of queryVariants) {
      // 词头匹配（最高权重）
      searchStage.compound.should.push(
        {
          text: {
            query: variant,
            path: 'headword.normalized',
            score: { boost: { value: 10 } }
          }
        },
        {
          text: {
            query: variant,
            path: 'headword.display',
            score: { boost: { value: 8 } }
          }
        }
      )
    }
    
    // 粤拼匹配（原始查询，不做简繁转换）
    searchStage.compound.should.push({
      text: {
        query: query.toLowerCase(),
        path: 'phonetic.jyutping',
        score: { boost: { value: 6 } }
      }
    })
    
    // 关键词匹配
    for (const variant of queryVariants) {
      searchStage.compound.should.push({
        text: {
          query: variant,
          path: 'keywords',
          score: { boost: { value: 4 } }
        }
      })
    }
  }
  
  const pipeline: any[] = [
    { $search: searchStage }
  ]
  
  // 词典筛选
  if (dict) {
    pipeline.push({ $match: { source_book: dict } })
  }
  
  // 限制数量并添加分数
  pipeline.push(
    { $limit: limit },
    {
      $addFields: {
        _score: { $meta: 'searchScore' }
      }
    },
    {
      $project: {
        _id: 0
      }
    }
  )
  
  return await collection.aggregate(pipeline).toArray()
}

/**
 * 回退搜索（无 Atlas Search 时使用）
 * 实现与前端相同的优先级逻辑
 */
async function fallbackSearch(
  collection: any, 
  query: string, 
  limit: number, 
  dict?: string,
  mode?: string
) {
  const queryVariants = await getQueryVariants(query)
  const queryLower = query.toLowerCase()
  
  // 基础筛选条件
  const baseFilter: any = {}
  if (dict) {
    baseFilter.source_book = dict
  }
  
  interface ScoredEntry {
    entry: any
    priority: number
    secondaryScore: number
  }
  
  const results: ScoredEntry[] = []
  const seenIds = new Set<string>()
  
  /**
   * 计算二级排序分数（与前端一致）
   */
  const calculateSecondaryScore = (entry: any): number => {
    let score = 0
    
    // 词条长度匹配度
    const headwordLength = entry.headword?.display?.length || 0
    if (headwordLength === queryLower.length) {
      score += 30
    } else {
      const lengthDiff = Math.abs(headwordLength - queryLower.length)
      score += Math.max(0, 30 - lengthDiff * 3)
    }
    
    // 释义详细程度
    if (entry.senses && entry.senses.length > 0) {
      const firstSense = entry.senses[0]
      const definitionLength = firstSense.definition?.length || 0
      
      if (definitionLength > 50) score += 20
      else if (definitionLength > 20) score += 15
      else if (definitionLength > 0) score += 10
      
      if (firstSense.examples && firstSense.examples.length > 0) {
        score += 5
      }
    }
    
    // 词典来源权重
    if (entry.source_book === '广州话俗语词典') score += 8
    else if (entry.source_book === '实用广州话分类词典') score += 10
    else if (entry.source_book?.includes('粵典')) score += 4
    
    return score
  }
  
  /**
   * 处理单个词条，计算优先级
   */
  const processEntry = (entry: any): ScoredEntry | null => {
    if (seenIds.has(entry.id)) return null
    
    let priority = 0
    
    if (mode === 'reverse') {
      // 反查模式：只搜索释义
      if (entry.senses) {
        for (const sense of entry.senses) {
          if (!sense.definition) continue
          const defLower = sense.definition.toLowerCase()
          const defSimplified = toSimplifiedSync(defLower)
          const defTraditional = toTraditionalSync(defLower)
          
          // 完全匹配释义
          if (queryVariants.some(qv => defLower === qv || defSimplified === qv || defTraditional === qv)) {
            priority = 100
            break
          }
          // 释义包含搜索词
          if (queryVariants.some(qv => defLower.includes(qv) || defSimplified.includes(qv) || defTraditional.includes(qv))) {
            priority = Math.max(priority, 80)
          }
        }
      }
    } else {
      // 正常模式：搜索词头、粤拼、关键词
      const normalizedHeadword = entry.headword?.normalized?.toLowerCase() || ''
      const displayHeadword = entry.headword?.display?.toLowerCase() || ''
      
      // 生成词头变体（使用 OpenCC 完整转换）
      const headwordVariants = new Set([
        normalizedHeadword,
        displayHeadword,
        toSimplifiedSync(normalizedHeadword),
        toSimplifiedSync(displayHeadword),
        toTraditionalSync(normalizedHeadword),
        toTraditionalSync(displayHeadword)
      ])
      
      // 1. 完全匹配词头
      if (queryVariants.some(qv => headwordVariants.has(qv))) {
        priority = 100
      }
      // 2. 词头前缀匹配
      else if (queryVariants.some(qv => 
        Array.from(headwordVariants).some(hv => hv.startsWith(qv))
      )) {
        priority = 90
      }
      // 3. 词头包含匹配
      else if (queryVariants.some(qv => 
        Array.from(headwordVariants).some(hv => hv.includes(qv))
      )) {
        priority = 80
      }
      
      // 4. 粤拼匹配
      if (priority === 0 && entry.phonetic?.jyutping) {
        const jyutpings = entry.phonetic.jyutping.map((jp: string) => jp.toLowerCase())
        
        // 粤拼精确匹配
        if (jyutpings.includes(queryLower)) {
          priority = 70
        }
        // 粤拼包含匹配
        else if (jyutpings.some((jp: string) => jp.includes(queryLower))) {
          priority = 60
        }
      }
      
      // 5. 关键词匹配
      if (priority === 0 && entry.keywords) {
        const keywordMatch = entry.keywords.some((kw: string) => {
          const kwLower = kw.toLowerCase()
          return queryVariants.some(qv => kwLower.includes(qv))
        })
        if (keywordMatch) {
          priority = 50
        }
      }
    }
    
    if (priority > 0) {
      seenIds.add(entry.id)
      return {
        entry,
        priority,
        secondaryScore: calculateSecondaryScore(entry)
      }
    }
    
    return null
  }
  
  // 构建查询条件（获取候选词条）
  const buildQueryConditions = () => {
    const orConditions: any[] = []
    
    if (mode === 'reverse') {
      // 反查：搜索释义
      for (const variant of queryVariants) {
        orConditions.push({
          'senses.definition': { $regex: variant, $options: 'i' }
        })
      }
    } else {
      // 正常模式
      for (const variant of queryVariants) {
        orConditions.push(
          { 'headword.normalized': { $regex: variant, $options: 'i' } },
          { 'headword.display': { $regex: variant, $options: 'i' } }
        )
      }
      // 粤拼（不做简繁转换）
      orConditions.push(
        { 'phonetic.jyutping': { $regex: queryLower, $options: 'i' } }
      )
      // 关键词
      for (const variant of queryVariants) {
        orConditions.push(
          { 'keywords': { $regex: variant, $options: 'i' } }
        )
      }
    }
    
    return { ...baseFilter, $or: orConditions }
  }
  
  // 执行查询
  const queryCondition = buildQueryConditions()
  const candidates = await collection.find(queryCondition).limit(limit * 3).toArray()
  
  // 处理每个候选词条
  for (const doc of candidates) {
    const result = processEntry(doc)
    if (result) {
      results.push(result)
    }
  }
  
  // 排序（与前端一致）
  results.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority
    if (a.secondaryScore !== b.secondaryScore) return b.secondaryScore - a.secondaryScore
    return a.entry.id.localeCompare(b.entry.id)
  })
  
  // 返回结果（去除 _id）
  return results.slice(0, limit).map(r => {
    const { _id, ...rest } = r.entry
    return rest
  })
}

/**
 * 词典数据查询 Composable
 * 封装 Nuxt Content API，提供统一的数据访问接口
 */

import type { DictionaryEntry, SearchOptions, SearchResult } from '~/types/dictionary'

/**
 * 词典数据管理
 */
export const useDictionary = () => {
  /**
   * 获取所有词条
   * 注意：搜索功能只在客户端运行，不需要 SSR
   */
  const getAllEntries = async (): Promise<DictionaryEntry[]> => {
    // 只在客户端运行
    if (!process.client) {
      return []
    }
    
    try {
      // 1. 先获取词典索引
      const indexResponse = await fetch('/dictionaries/index.json')
      if (!indexResponse.ok) {
        console.error('获取词典索引失败')
        return []
      }
      
      const indexData = await indexResponse.json()
      const dictionaries = indexData.dictionaries || []
      
      if (dictionaries.length === 0) {
        console.warn('词典索引为空')
        return []
      }
      
      // 2. 并行加载所有词典的数据
      const allEntries: DictionaryEntry[] = []
      
      await Promise.all(
        dictionaries.map(async (dict: any) => {
          try {
            const response = await fetch(`/dictionaries/${dict.file}`)
            if (response.ok) {
              const data = await response.json()
              if (Array.isArray(data)) {
                allEntries.push(...data)
              }
            } else {
              console.warn(`加载词典失败: ${dict.file}`)
            }
          } catch (error) {
            console.error(`加载词典 ${dict.file} 时出错:`, error)
          }
        })
      )
      
      return allEntries
    } catch (error) {
      console.error('获取词条失败:', error)
      return []
    }
  }

  /**
   * 根据 ID 获取词条
   */
  const getEntryById = async (id: string): Promise<DictionaryEntry | null> => {
    try {
      const entries = await getAllEntries()
      return entries.find(e => e.id === id) || null
    } catch (error) {
      console.error('获取词条失败:', error)
      return null
    }
  }

  /**
   * 基础搜索（精确匹配，支持简繁体）
   * @param query 搜索关键词
   * @returns 匹配的词条数组，按相关度排序
   */
  const searchBasic = async (query: string): Promise<DictionaryEntry[]> => {
    if (!query || query.trim() === '') {
      return []
    }

    const normalizedQuery = query.trim().toLowerCase()
    
    // 获取简繁体转换器并确保已初始化
    const { toSimplified, toTraditional, ensureInitialized } = useChineseConverter()
    await ensureInitialized()
    
    // 生成搜索词的所有变体（原文、简体、繁体）
    const queryVariants = [
      normalizedQuery,
      toSimplified(normalizedQuery).toLowerCase(),
      toTraditional(normalizedQuery).toLowerCase()
    ].filter((v, i, arr) => arr.indexOf(v) === i) // 去重

    try {
      const entries = await getAllEntries()
      
      // 带优先级的过滤和评分
      const resultsWithPriority = entries
        .map(entry => {
          let priority = 0
          
          const normalizedHeadword = entry.headword.normalized?.toLowerCase() || ''
          const displayHeadword = entry.headword.display?.toLowerCase() || ''
          
          // 生成词条的所有变体（用于词头匹配）
          const headwordVariants = [
            normalizedHeadword,
            displayHeadword,
            toSimplified(normalizedHeadword).toLowerCase(),
            toSimplified(displayHeadword).toLowerCase(),
            toTraditional(normalizedHeadword).toLowerCase(),
            toTraditional(displayHeadword).toLowerCase()
          ].filter((v, i, arr) => arr.indexOf(v) === i) // 去重
          
          // 1. 完全匹配词头 - 最高优先级
          const exactMatch = queryVariants.some(qv => 
            headwordVariants.some(hv => hv === qv)
          )
          if (exactMatch) {
            priority = 100
          }
          // 2. 词头以搜索词开头
          else {
            const startsWithMatch = queryVariants.some(qv =>
              headwordVariants.some(hv => hv.startsWith(qv))
            )
            if (startsWithMatch) {
              priority = 90
            }
            // 3. 词头包含搜索词
            else {
              const includesMatch = queryVariants.some(qv =>
                headwordVariants.some(hv => hv.includes(qv))
              )
              if (includesMatch) {
                priority = 80
              }
            }
          }
          
          // 4. 粤拼完全匹配
          if (priority === 0 && entry.phonetic?.jyutping) {
            const exactJyutpingMatch = entry.phonetic.jyutping.some(jp =>
              queryVariants.includes(jp.toLowerCase())
            )
            if (exactJyutpingMatch) {
              priority = 70
            }
            // 5. 粤拼包含搜索词
            else {
              const partialJyutpingMatch = entry.phonetic.jyutping.some(jp =>
                queryVariants.some(qv => jp.toLowerCase().includes(qv))
              )
              if (partialJyutpingMatch) {
                priority = 60
              }
            }
          }
          
          // 6. 关键词匹配（支持简繁体）
          if (priority === 0 && entry.keywords) {
            const keywordMatch = entry.keywords.some(kw => {
              const kwLower = kw.toLowerCase()
              return queryVariants.some(qv => kwLower.includes(qv))
            })
            if (keywordMatch) {
              priority = 50
            }
          }
          
          // 7. 释义匹配（支持简繁体） - 最低优先级
          if (priority === 0 && entry.senses) {
            const definitionMatch = entry.senses.some(sense => {
              if (!sense.definition) return false
              const defVariants = [
                sense.definition.toLowerCase(),
                toSimplified(sense.definition).toLowerCase(),
                toTraditional(sense.definition).toLowerCase()
              ]
              return queryVariants.some(qv =>
                defVariants.some(dv => dv.includes(qv))
              )
            })
            if (definitionMatch) {
              priority = 40
            }
          }
          
          return { entry, priority }
        })
        .filter(item => item.priority > 0)
        .sort((a, b) => {
          // 先按优先级降序排序
          if (a.priority !== b.priority) {
            return b.priority - a.priority
          }
          // 优先级相同时，按ID排序（保持原始顺序）
          return a.entry.id.localeCompare(b.entry.id)
        })
        .map(item => item.entry)
      
      return resultsWithPriority
    } catch (error) {
      console.error('搜索失败:', error)
      return []
    }
  }

  /**
   * 高级搜索（支持多种选项）
   * TODO: Phase 3 实现模糊搜索、权重排序
   */
  const searchAdvanced = async (options: SearchOptions): Promise<SearchResult[]> => {
    // 目前使用基础搜索
    const entries = await searchBasic(options.query)
    
    // 筛选方言
    let filteredEntries = entries
    if (options.dialect) {
      filteredEntries = entries.filter(e => 
        e.dialect.name === options.dialect
      )
    }
    
    // 筛选词典
    if (options.source_book) {
      filteredEntries = filteredEntries.filter(e => 
        e.source_book === options.source_book
      )
    }
    
    // 筛选词条类型
    if (options.entry_type) {
      filteredEntries = filteredEntries.filter(e => 
        e.entry_type === options.entry_type
      )
    }
    
    // 分页
    const page = options.page || 1
    const limit = options.limit || 20
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedEntries = filteredEntries.slice(startIndex, endIndex)
    
    // 转换为 SearchResult
    const results: SearchResult[] = paginatedEntries.map(entry => ({
      entry,
      score: 1.0, // TODO: Phase 3 实现相关度评分
      match_fields: ['headword'] // TODO: Phase 3 记录匹配字段
    }))
    
    return results
  }

  /**
   * 获取词典列表
   */
  const getDictionaries = async () => {
    try {
      const index = await queryContent('dictionaries/index')
        .findOne()
      
      return index?.dictionaries || []
    } catch (error) {
      console.error('获取词典列表失败:', error)
      return []
    }
  }

  /**
   * 获取搜索建议（自动补全）
   * TODO: Phase 3 实现
   */
  const getSuggestions = async (query: string): Promise<string[]> => {
    if (!query || query.length < 2) {
      return []
    }

    const entries = await searchBasic(query)
    
    // 提取词头作为建议
    const suggestions = entries
      .slice(0, 10) // 最多 10 个建议
      .map(e => e.headword.normalized)
      .filter((v, i, a) => a.indexOf(v) === i) // 去重
    
    return suggestions
  }

  /**
   * 获取热门词条
   * TODO: 未来可以基于访问统计
   */
  const getPopularEntries = async (limit: number = 10): Promise<DictionaryEntry[]> => {
    try {
      const entries = await getAllEntries()
      // 目前随机返回
      return entries.slice(0, limit)
    } catch (error) {
      console.error('获取热门词条失败:', error)
      return []
    }
  }

  return {
    getAllEntries,
    getEntryById,
    searchBasic,
    searchAdvanced,
    getDictionaries,
    getSuggestions,
    getPopularEntries
  }
}


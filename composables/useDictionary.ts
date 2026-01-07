/**
 * 词典数据查询 Composable
 * 封装 Nuxt Content API，提供统一的数据访问接口
 */

import type { DictionaryEntry, SearchOptions, SearchResult } from '~/types/dictionary'

// 全局缓存，在客户端持久化词典数据
let cachedEntries: DictionaryEntry[] | null = null
let cachePromise: Promise<DictionaryEntry[]> | null = null

// 分片缓存（用于大型词典）
interface ChunkCache {
  [initial: string]: DictionaryEntry[]
}
const chunkCache: ChunkCache = {}

// 分片 manifest 缓存（支持多个分片词典）
interface ManifestCache {
  [dictId: string]: any
}
const chunkManifests: ManifestCache = {}

// 分片词典列表缓存
let chunkedDictionaries: Array<{id: string, chunk_dir: string}> | null = null

// 搜索索引结构
interface SearchIndex {
  // 词头索引: key -> entry IDs
  headwordIndex: Map<string, Set<string>>
  // 粤拼索引: jyutping -> entry IDs  
  jyutpingIndex: Map<string, Set<string>>
  // ID -> entry 映射
  entryMap: Map<string, DictionaryEntry>
  // 是否已初始化
  initialized: boolean
}

// 全局搜索索引
const searchIndex: SearchIndex = {
  headwordIndex: new Map(),
  jyutpingIndex: new Map(),
  entryMap: new Map(),
  initialized: false
}

/**
 * 基础搜索选项
 */
export interface BasicSearchOptions {
  /** 是否搜索释义（反查），默认 false */
  searchDefinition?: boolean
  /** 返回结果数量限制 */
  limit?: number
  /** 流式结果回调，每批结果调用一次 */
  onResults?: (entries: DictionaryEntry[], isComplete: boolean) => void
}

/**
 * 词典数据管理
 */
export const useDictionary = () => {
  /**
   * 加载分片 manifest
   */
  const loadChunkManifest = async (chunkDir: string): Promise<any> => {
    // 只在客户端运行
    if (!process.client) {
      return null
    }
    
    // 检查缓存
    if (chunkManifests[chunkDir]) {
      return chunkManifests[chunkDir]
    }
    
    try {
      const response = await fetch(`/dictionaries/${chunkDir}/manifest.json`)
      if (response.ok) {
        const manifest = await response.json()
        chunkManifests[chunkDir] = manifest
        return manifest
      }
    } catch (error) {
      console.error(`加载 ${chunkDir} manifest 失败:`, error)
    }
    return null
  }

  /**
   * 获取所有分片词典的配置
   */
  const getChunkedDictionaries = async (): Promise<Array<{id: string, chunk_dir: string}>> => {
    if (chunkedDictionaries) {
      return chunkedDictionaries
    }
    
    try {
      const response = await fetch('/dictionaries/index.json')
      if (response.ok) {
        const indexData = await response.json()
        const result = (indexData.dictionaries || [])
          .filter((d: any) => d.chunked && d.chunk_dir)
          .map((d: any) => ({ id: d.id, chunk_dir: d.chunk_dir }))
        chunkedDictionaries = result
        return result
      }
    } catch (error) {
      console.error('获取分片词典列表失败:', error)
    }
    return []
  }

  /**
   * 根据查询词确定需要加载的分片
   * 
   * 策略说明：
   * - 分片按粤拼首字母存储（如"明"的粤拼 ming4，存在 m.json）
   * - 汉字查询使用 manifest.headwordIndex 映射到对应分片
   * - 支持简繁体自动匹配：同时查找简体和繁体对应的分片
   * - 拼音/英文查询按首字母精确匹配分片
   */
  const getRequiredChunks = (query: string, manifest: any): string[] => {
    if (!manifest || !manifest.chunks) return []
    
    const chunks = new Set<string>()
    const normalizedQuery = query.toLowerCase().trim()
    
    if (!normalizedQuery) return []
    
    const firstChar = normalizedQuery[0]
    
    // 检查首字符是否为汉字
    const isChineseFirstChar = /[\u4e00-\u9fa5]/.test(firstChar)
    
    if (isChineseFirstChar) {
      // 汉字查询：使用 headwordIndex 查找对应的分片
      // 同时考虑简繁体变体以支持跨简繁体搜索
      const { toSimplified, toTraditional } = useChineseConverter()
      
      const firstCharVariants = [
        firstChar,
        toSimplified(firstChar),
        toTraditional(firstChar)
      ].filter((v, i, arr) => arr.indexOf(v) === i) // 去重
      
      if (manifest.headwordIndex) {
        firstCharVariants.forEach(variant => {
          if (manifest.headwordIndex[variant]) {
            manifest.headwordIndex[variant].forEach((initial: string) => {
              chunks.add(initial)
            })
          }
        })
      }
      
      // 如果找到了分片，返回；否则返回空
      return Array.from(chunks)
    }
    
    // 以下策略适用于非汉字查询（拼音、英文等）
    
    // 非常短的非汉字查询（1-2字符）→ 加载所有分片
    // 原因：短查询可能匹配多个分片的词条
    if (normalizedQuery.length <= 2) {
      Object.keys(manifest.chunks).forEach(initial => {
        chunks.add(initial)
      })
      return Array.from(chunks)
    }
    
    // 中长度的非汉字查询（3+字符）→ 只加载首字母分片
    // 原因：拼音/英文查询的首字母对应分片文件名
    if (manifest.chunks[firstChar]) {
      chunks.add(firstChar)
    }
    
    return Array.from(chunks)
  }

  /**
   * 获取所有词条（带缓存）
   * 注意：搜索功能只在客户端运行，不需要 SSR
   */
  const getAllEntries = async (): Promise<DictionaryEntry[]> => {
    // 只在客户端运行
    if (!process.client) {
      return []
    }
    
    // 如果已有缓存，直接返回
    if (cachedEntries) {
      return cachedEntries
    }
    
    // 如果正在加载中，等待加载完成
    if (cachePromise) {
      return cachePromise
    }
    
    // 开始加载数据
    cachePromise = (async () => {
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
              // 检查是否为分片词典（chunked: true）
              if (dict.chunked) {
                // 分片词典：不在这里加载，而是在搜索时按需加载
                console.log(`⏭️ 跳过分片词典: ${dict.id} (按需加载)`)
                return
              }
              
              // 普通词典：全量加载
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
        
        // 缓存结果
        cachedEntries = allEntries
        console.log(`✅ 词典数据已加载并缓存: ${allEntries.length} 条`)
        return allEntries
      } catch (error) {
        console.error('获取词条失败:', error)
        return []
      } finally {
        cachePromise = null
      }
    })()
    
    return cachePromise
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
   * 构建搜索索引（词头和粤拼）
   */
  const buildSearchIndex = (entries: DictionaryEntry[]): void => {
    const { toSimplified, toTraditional } = useChineseConverter()
    
    for (const entry of entries) {
      // 跳过已索引的
      if (searchIndex.entryMap.has(entry.id)) continue
      
      searchIndex.entryMap.set(entry.id, entry)
      
      // 索引词头（normalized 和 display 的各种变体）
      const headwords = [
        entry.headword.normalized?.toLowerCase(),
        entry.headword.display?.toLowerCase(),
        toSimplified(entry.headword.normalized || '').toLowerCase(),
        toSimplified(entry.headword.display || '').toLowerCase(),
        toTraditional(entry.headword.normalized || '').toLowerCase(),
        toTraditional(entry.headword.display || '').toLowerCase()
      ].filter(h => h)
      
      for (const hw of headwords) {
        if (!searchIndex.headwordIndex.has(hw)) {
          searchIndex.headwordIndex.set(hw, new Set())
        }
        searchIndex.headwordIndex.get(hw)!.add(entry.id)
        
        // 也索引每个字符前缀，支持前缀搜索
        for (let i = 1; i <= hw.length; i++) {
          const prefix = hw.slice(0, i)
          const prefixKey = `prefix:${prefix}`
          if (!searchIndex.headwordIndex.has(prefixKey)) {
            searchIndex.headwordIndex.set(prefixKey, new Set())
          }
          searchIndex.headwordIndex.get(prefixKey)!.add(entry.id)
        }
      }
      
      // 索引粤拼
      if (entry.phonetic?.jyutping) {
        for (const jp of entry.phonetic.jyutping) {
          const jpLower = jp.toLowerCase()
          if (!searchIndex.jyutpingIndex.has(jpLower)) {
            searchIndex.jyutpingIndex.set(jpLower, new Set())
          }
          searchIndex.jyutpingIndex.get(jpLower)!.add(entry.id)
          
          // 索引粤拼前缀
          for (let i = 1; i <= jpLower.length; i++) {
            const prefix = jpLower.slice(0, i)
            const prefixKey = `prefix:${prefix}`
            if (!searchIndex.jyutpingIndex.has(prefixKey)) {
              searchIndex.jyutpingIndex.set(prefixKey, new Set())
            }
            searchIndex.jyutpingIndex.get(prefixKey)!.add(entry.id)
          }
        }
      }
    }
  }

  /**
   * 计算次要排序分数（在相同优先级内使用）
   */
  const calculateSecondaryScore = (entry: DictionaryEntry, queryLength: number): number => {
    let score = 0
    
    // 1. 词条长度匹配度 (0-30分)
    const headwordLength = entry.headword.display.length
    if (headwordLength === queryLength) {
      score += 30
    } else {
      const lengthDiff = Math.abs(headwordLength - queryLength)
      score += Math.max(0, 30 - lengthDiff * 3)
    }
    
    // 2. 释义详细程度 (0-20分)
    if (entry.senses && entry.senses.length > 0) {
      const firstSense = entry.senses[0]
      const definitionLength = firstSense.definition?.length || 0
      
      if (definitionLength > 50) {
        score += 20
      } else if (definitionLength > 20) {
        score += 15
      } else if (definitionLength > 0) {
        score += 10
      }
      
      if (firstSense.examples && firstSense.examples.length > 0) {
        score += 5
      }
    }
    
    // 3. 词典来源权重 (0-10分)
    if (entry.source_book === '广州话俗语词典') {
      score += 8
    } else if (entry.source_book === '实用广州话分类词典') {
      score += 10
    } else if (entry.source_book === '粵典 (words.hk)' || entry.source_book === '粵典') {
      score += 4
    }
    
    return score
  }

  /**
   * 基础搜索（精确匹配，支持简繁体）
   * @param query 搜索关键词
   * @param optionsOrLimit 搜索选项或返回结果数量限制
   * @returns 匹配的词条数组，按相关度排序
   */
  const searchBasic = async (
    query: string, 
    optionsOrLimit: BasicSearchOptions | number = 100
  ): Promise<DictionaryEntry[]> => {
    // 兼容旧的 limit 参数
    const options: BasicSearchOptions = typeof optionsOrLimit === 'number' 
      ? { limit: optionsOrLimit }
      : optionsOrLimit
    
    const { 
      searchDefinition = false, // 默认不搜索释义（反查）
      limit = 100,
      onResults 
    } = options

    // 只在客户端运行
    if (!process.client) {
      console.log('⏭️  服务器端跳过搜索')
      return []
    }
    
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

    // 收集所有结果
    const allResultsWithPriority: Array<{entry: DictionaryEntry, priority: number, secondaryScore: number}> = []
    const seenIds = new Set<string>()

    /**
     * 处理词条，计算优先级
     * 反查模式：只搜索释义
     * 正常模式：搜索词头、粤拼、关键词
     */
    const processEntry = (entry: DictionaryEntry): {priority: number, secondaryScore: number} | null => {
      if (seenIds.has(entry.id)) return null
      
      let priority = 0
      
      // 反查模式：只搜索释义
      if (searchDefinition) {
        if (entry.senses) {
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
            // 反查模式下，完全匹配释义给更高优先级
            const exactDefMatch = entry.senses.some(sense => {
              if (!sense.definition) return false
              const defLower = sense.definition.toLowerCase()
              return queryVariants.some(qv => defLower === qv)
            })
            priority = exactDefMatch ? 100 : 80
          }
        }
      } else {
        // 正常模式：搜索词头、粤拼、关键词
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
        ].filter((v, i, arr) => arr.indexOf(v) === i)
        
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
      }
      
      if (priority > 0) {
        seenIds.add(entry.id)
        return {
          priority,
          secondaryScore: calculateSecondaryScore(entry, normalizedQuery.length)
        }
      }
      
      return null
    }

    /**
     * 排序并推送结果
     */
    const sortAndPush = (results: typeof allResultsWithPriority, isComplete: boolean) => {
      results.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority
        if (a.secondaryScore !== b.secondaryScore) return b.secondaryScore - a.secondaryScore
        return a.entry.id.localeCompare(b.entry.id)
      })
      
      if (onResults) {
        const entries = results.slice(0, limit).map(item => item.entry)
        onResults(entries, isComplete)
      }
    }

    try {
      // 1. 获取基础词典数据（已缓存，不包含 wiktionary）
      const baseEntries = await getAllEntries()
      
      // 构建基础词典索引
      if (!searchIndex.initialized && baseEntries.length > 0) {
        buildSearchIndex(baseEntries)
        searchIndex.initialized = true
      }
      
      // 先快速搜索基础词典
      for (const entry of baseEntries) {
        const result = processEntry(entry)
        if (result) {
          allResultsWithPriority.push({ entry, ...result })
        }
      }
      
      // 第一批结果：基础词典搜索完成，立即推送
      if (onResults && allResultsWithPriority.length > 0) {
        sortAndPush([...allResultsWithPriority], false)
      }
      
      // 2. 加载所有分片词典的数据
      const chunkedDicts = await getChunkedDictionaries()
      
      for (const { chunk_dir } of chunkedDicts) {
        const manifest = await loadChunkManifest(chunk_dir)
        
        if (manifest) {
          // 确定需要加载的分片
          let requiredChunks: string[]
          
          // 反查模式下，对于 cantowords 需要加载所有分片（因为释义可能分布在任何分片）
          // wiktionary 数据量大，仍使用优化的分片策略
          if (searchDefinition && chunk_dir === 'cantowords') {
            requiredChunks = Object.keys(manifest.chunks)
            console.log(`🔍 反查模式：加载 ${chunk_dir} 所有分片 (${requiredChunks.length} 个)`)
          } else {
            requiredChunks = getRequiredChunks(normalizedQuery, manifest)
          }
          
          if (requiredChunks.length > 0) {
            // 逐个分片加载并搜索，流式返回结果
            for (const chunk of requiredChunks) {
              const chunkKey = `${chunk_dir}_${chunk}`
              let chunkEntries: DictionaryEntry[] = []
              
              // 检查缓存
              if (chunkCache[chunkKey]) {
                chunkEntries = chunkCache[chunkKey]
              } else {
                try {
                  const response = await fetch(`/dictionaries/${chunk_dir}/${chunk}.json`)
                  if (response.ok) {
                    const data = await response.json()
                    if (Array.isArray(data)) {
                      chunkCache[chunkKey] = data
                      chunkEntries = data
                      // 构建索引
                      buildSearchIndex(data)
                    }
                  }
                } catch (error) {
                  console.error(`加载分片失败 ${chunk_dir}/${chunk}.json:`, error)
                }
              }
              
              // 处理当前分片
              let hasNewResults = false
              for (const entry of chunkEntries) {
                const result = processEntry(entry)
                if (result) {
                  allResultsWithPriority.push({ entry, ...result })
                  hasNewResults = true
                }
              }
              
              // 如果有新结果，推送更新
              if (onResults && hasNewResults) {
                sortAndPush([...allResultsWithPriority], false)
              }
            }
          }
        }
      }
      
      // 最终排序
      allResultsWithPriority.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority
        if (a.secondaryScore !== b.secondaryScore) return b.secondaryScore - a.secondaryScore
        return a.entry.id.localeCompare(b.entry.id)
      })
      
      const finalResults = allResultsWithPriority.slice(0, limit).map(item => item.entry)
      
      // 最终结果推送
      if (onResults) {
        onResults(finalResults, true)
      }
      
      return finalResults
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
   * 限制返回数量以提高性能
   */
  const getSuggestions = async (query: string): Promise<string[]> => {
    if (!query || query.length < 2) {
      return []
    }

    // 只获取前10个搜索结果用于建议
    const entries = await searchBasic(query, 10)
    
    // 提取词头作为建议
    const suggestions = entries
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

  // 推荐词条缓存
  let recommendedEntriesCache: DictionaryEntry[] | null = null

  /**
   * 快速获取随机推荐词条
   * 只加载小词典，过滤无效词条，提升首页加载速度
   */
  const getRandomRecommendedEntries = async (count: number = 3): Promise<DictionaryEntry[]> => {
    if (!process.client) {
      return []
    }

    // 如果已有缓存，直接从缓存随机选取
    if (recommendedEntriesCache && recommendedEntriesCache.length > 0) {
      const shuffled = [...recommendedEntriesCache].sort(() => Math.random() - 0.5)
      return shuffled.slice(0, count)
    }

    try {
      // 只加载小词典以提升速度（约 10,000 条 vs 69,000 条）
      const smallDictionaries = [
        'gz-colloquialisms.json',      // 2,516 条
        'gz-practical-classified.json'  // 7,530 条
      ]

      const allEntries: DictionaryEntry[] = []

      await Promise.all(
        smallDictionaries.map(async (file) => {
          try {
            const response = await fetch(`/dictionaries/${file}`)
            if (response.ok) {
              const data = await response.json()
              if (Array.isArray(data)) {
                allEntries.push(...data)
              }
            }
          } catch (error) {
            console.error(`加载词典 ${file} 失败:`, error)
          }
        })
      )

      // 过滤掉无效词条：
      // 1. 释义含有"NO DATA"
      // 2. 没有释义
      // 3. 释义太短（少于3个字符）
      const validEntries = allEntries.filter(entry => {
        if (!entry.senses || entry.senses.length === 0) return false
        const firstDef = entry.senses[0]?.definition || ''
        if (firstDef.includes('NO DATA')) return false
        if (firstDef.length < 3) return false
        return true
      })

      // 缓存有效词条
      recommendedEntriesCache = validEntries

      // 随机选取
      const shuffled = [...validEntries].sort(() => Math.random() - 0.5)
      return shuffled.slice(0, count)
    } catch (error) {
      console.error('获取推荐词条失败:', error)
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
    getPopularEntries,
    getRandomRecommendedEntries
  }
}


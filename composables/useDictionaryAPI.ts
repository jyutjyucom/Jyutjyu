/**
 * 词典 API 查询 Composable
 * 使用后端 MongoDB API 进行搜索
 */

import type { DictionaryEntry } from '~/types/dictionary'

export interface APISearchOptions {
  /** 返回结果数量限制 */
  limit?: number
  /** 词典 ID 筛选 */
  dict?: string
  /** 搜索模式: normal(正常) | reverse(反查释义) */
  mode?: 'normal' | 'reverse'
  /** 流式结果回调 */
  onResults?: (entries: DictionaryEntry[], isComplete: boolean) => void
}

interface SearchResponse {
  success: boolean
  query?: string
  mode?: string
  total: number
  results: DictionaryEntry[]
  error?: string
}

interface DictionariesResponse {
  success: boolean
  total_entries?: number
  dictionaries: Array<{
    name: string
    entries_count: number
    dialect: string
  }>
  error?: string
}

interface EntryResponse {
  success: boolean
  entry: DictionaryEntry | null
  error?: string
}

/**
 * 词典 API 查询
 */
export const useDictionaryAPI = () => {
  const config = useRuntimeConfig()
  
  /**
   * 检查是否启用 API 模式
   */
  const isAPIEnabled = () => {
    // 环境变量可能是字符串 'true' 或布尔值 true
    return config.public.useApi === true || config.public.useApi === 'true'
  }

  /**
   * 搜索词条
   */
  const search = async (
    query: string,
    options: APISearchOptions = {}
  ): Promise<DictionaryEntry[]> => {
    const {
      limit = 50,
      dict,
      mode = 'normal',
      onResults
    } = options

    if (!query || query.trim() === '') {
      return []
    }

    try {
      // 构建查询参数
      const params = new URLSearchParams({
        q: query.trim(),
        limit: String(limit),
        mode
      })
      
      if (dict) {
        params.set('dict', dict)
      }

      const response = await $fetch<SearchResponse>(`/api/search?${params}`)
      
      if (!response.success) {
        console.error('搜索失败:', response.error)
        return []
      }

      const results = response.results || []
      
      // 调用结果回调
      if (onResults) {
        onResults(results, true)
      }

      return results
      
    } catch (error) {
      console.error('API 请求失败:', error)
      return []
    }
  }

  /**
   * 根据 ID 获取词条
   */
  const getEntryById = async (id: string): Promise<DictionaryEntry | null> => {
    if (!id) {
      return null
    }

    try {
      const response = await $fetch<EntryResponse>(`/api/entry/${encodeURIComponent(id)}`)
      
      if (!response.success) {
        console.error('获取词条失败:', response.error)
        return null
      }

      return response.entry
      
    } catch (error) {
      console.error('API 请求失败:', error)
      return null
    }
  }

  /**
   * 获取词典列表和统计
   */
  const getDictionaries = async () => {
    try {
      const response = await $fetch<DictionariesResponse>('/api/dictionaries')
      
      if (!response.success) {
        console.error('获取词典列表失败:', response.error)
        return []
      }

      return response.dictionaries
      
    } catch (error) {
      console.error('API 请求失败:', error)
      return []
    }
  }

  /**
   * 基础搜索（兼容旧接口）
   */
  const searchBasic = async (
    query: string,
    optionsOrLimit: APISearchOptions | number = 100
  ): Promise<DictionaryEntry[]> => {
    const options: APISearchOptions = typeof optionsOrLimit === 'number'
      ? { limit: optionsOrLimit }
      : optionsOrLimit
    
    // 转换 searchDefinition 为 mode
    if ((options as any).searchDefinition) {
      options.mode = 'reverse'
    }
    
    return search(query, options)
  }

  /**
   * 获取推荐词条（随机）
   * 与前端策略一致：只从高质量词典中选取，过滤无效词条
   */
  const getRandomRecommendedEntries = async (count: number = 3): Promise<DictionaryEntry[]> => {
    try {
      const response = await $fetch<{
        success: boolean
        count: number
        results: DictionaryEntry[]
        error?: string
      }>(`/api/random?count=${count}`)
      
      if (!response.success) {
        console.error('获取推荐词条失败:', response.error)
        return []
      }
      
      return response.results || []
      
    } catch (error) {
      console.error('API 请求失败:', error)
      return []
    }
  }

  return {
    isAPIEnabled,
    search,
    searchBasic,
    getEntryById,
    getDictionaries,
    getRandomRecommendedEntries
  }
}

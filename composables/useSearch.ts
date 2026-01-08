/**
 * 统一搜索入口
 * 根据配置自动选择使用 MongoDB API 或静态 JSON
 */

import type { DictionaryEntry } from '~/types/dictionary'

export interface SearchOptions {
  /** 返回结果数量限制 */
  limit?: number
  /** 是否搜索释义（反查） */
  searchDefinition?: boolean
  /** 流式结果回调 */
  onResults?: (entries: DictionaryEntry[], isComplete: boolean) => void
}

/**
 * 统一搜索 composable
 * - 当 NUXT_PUBLIC_USE_API=true 时使用 MongoDB API
 * - 否则使用静态 JSON 文件
 */
export const useSearch = () => {
  const config = useRuntimeConfig()
  // 环境变量可能是字符串 'true' 或布尔值 true
  const useApi = config.public.useApi === true || config.public.useApi === 'true'
  
  // 根据配置选择实现
  const apiSearch = useApi ? useDictionaryAPI() : null
  const jsonSearch = !useApi ? useDictionary() : null
  
  /**
   * 搜索词条
   */
  const searchBasic = async (
    query: string,
    options: SearchOptions = {}
  ): Promise<DictionaryEntry[]> => {
    if (useApi && apiSearch) {
      // 使用 MongoDB API
      return apiSearch.searchBasic(query, {
        limit: options.limit,
        mode: options.searchDefinition ? 'reverse' : 'normal',
        onResults: options.onResults
      })
    } else if (jsonSearch) {
      // 使用静态 JSON
      return jsonSearch.searchBasic(query, options)
    }
    return []
  }

  /**
   * 根据 ID 获取词条
   */
  const getEntryById = async (id: string): Promise<DictionaryEntry | null> => {
    if (useApi && apiSearch) {
      return apiSearch.getEntryById(id)
    } else if (jsonSearch) {
      return jsonSearch.getEntryById(id)
    }
    return null
  }

  /**
   * 获取搜索建议
   */
  const getSuggestions = async (query: string): Promise<string[]> => {
    if (useApi && apiSearch) {
      // API 模式：使用搜索结果的词头作为建议
      const results = await apiSearch.search(query, { limit: 10 })
      return results
        .map(e => e.headword.normalized)
        .filter((v, i, a) => a.indexOf(v) === i)
    } else if (jsonSearch) {
      return jsonSearch.getSuggestions(query)
    }
    return []
  }

  /**
   * 获取推荐词条
   */
  const getRandomRecommendedEntries = async (count: number = 3): Promise<DictionaryEntry[]> => {
    if (useApi && apiSearch) {
      return apiSearch.getRandomRecommendedEntries(count)
    } else if (jsonSearch) {
      return jsonSearch.getRandomRecommendedEntries(count)
    }
    return []
  }

  /**
   * 获取当前使用的模式
   */
  const getMode = () => useApi ? 'mongodb' : 'json'

  return {
    searchBasic,
    getEntryById,
    getSuggestions,
    getRandomRecommendedEntries,
    getMode
  }
}

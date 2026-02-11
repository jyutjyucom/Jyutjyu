/**
 * 词典本地化工具 Composable
 * 
 * 用于处理词典数据的多语言字段，自动根据当前 locale 获取对应语言的值
 */
export function useLocalizedDictionary() {
  const { locale } = useI18n()
  
  /**
   * 获取本地化的字段值
   * @param value - 可能是字符串或多语言对象
   * @param fallback - 回退值
   */
  const getLocalizedValue = (value: string | Record<string, string> | undefined, fallback = ''): string => {
    if (!value) return fallback
    if (typeof value === 'string') return value
    
    const currentLocale = locale.value
    
    // 尝试精确匹配当前语言
    if (value[currentLocale]) return value[currentLocale]
    
    // 回退逻辑：yue-Hans -> zh-Hans, yue-Hant -> zh-Hant
    if (currentLocale.startsWith('yue')) {
      const fallbackLocale = currentLocale.endsWith('Hans') ? 'zh-Hans' : 'zh-Hant'
      if (value[fallbackLocale]) return value[fallbackLocale]
    }
    
    // 最终回退到简体中文
    if (value['zh-Hans']) return value['zh-Hans']
    
    // 如果都没有，返回第一个可用值
    const firstValue = Object.values(value)[0]
    return firstValue || fallback
  }
  
  /**
   * 处理单个词典数据，添加本地化字段
   * 本地化字段前缀为 'l'，例如：lName, lDescription
   */
  const localizeDictionary = (dict: any) => {
    if (!dict) return null
    
    return {
      ...dict,
      // 添加本地化后的字段
      lName: getLocalizedValue(dict.name, dict.name),
      lDescription: getLocalizedValue(dict.description, dict.description),
      lDialect: getLocalizedValue(dict.dialect, dict.dialect),
      lAuthor: getLocalizedValue(dict.author, dict.author),
      lPublisher: getLocalizedValue(dict.publisher, dict.publisher),
      lLicense: getLocalizedValue(dict.license, dict.license),
      lUsageRestriction: getLocalizedValue(dict.usage_restriction, dict.usage_restriction),
      lAttribution: getLocalizedValue(dict.attribution, dict.attribution),
    }
  }
  
  /**
   * 批量处理词典列表
   */
  const localizeDictionaries = (dictionaries: any[]): any[] => {
    if (!Array.isArray(dictionaries)) return []
    return dictionaries.map(localizeDictionary).filter(Boolean)
  }

  /**
   * 通过 index.json 中的 name 字段，把 entry.source_book（可能是简体或繁体）
   * 映射到当前界面语言下的显示名称。
   *
   * 使用固定的 key 'dictionaries-index' 复用全局的 Nuxt Content 缓存，
   * 同时集中在一个 composable 中调用，避免在多个组件中用同一个 key
   * 重复调用 useAsyncData 导致 Nuxt 警告。
   *
   * 注意：这里不需要在 composable 内使用 await，直接返回 useAsyncData 结果即可，
   * 由 Nuxt 在调用该 composable 的 setup 中处理异步。
   */
  const { data: dictionariesData } = useAsyncData('dictionaries-index', () =>
    queryContent('/dictionaries').findOne()
  )

  const getLocalizedSourceBookLabel = (
    sourceBook: string | null | undefined
  ): string => {
    if (!sourceBook || !dictionariesData.value) {
      return sourceBook || ''
    }

    const dictionaries = dictionariesData.value.dictionaries || []

    const matchedDict = dictionaries.find((dict: any) => {
      if (!dict.name) return false

      // name 是多语言对象时，检查所有语言版本
      if (typeof dict.name === 'object') {
        return Object.values(dict.name).some(
          (name: any) => name === sourceBook
        )
      }

      // name 是字符串时，直接比较
      return dict.name === sourceBook
    })

    if (matchedDict && matchedDict.name) {
      return getLocalizedValue(matchedDict.name, sourceBook)
    }

    // 找不到就回退到原始值
    return sourceBook
  }

  return {
    getLocalizedValue,
    localizeDictionary,
    localizeDictionaries,
    getLocalizedSourceBookLabel,
    dictionariesData,
  }
}

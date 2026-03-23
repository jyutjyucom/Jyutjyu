/**
 * 简繁体转换工具
 * 基于 OpenCC (Open Chinese Convert)
 */

// 定义转换器函数类型
type ConverterFunction = (text: string) => string

// 创建转换器实例缓存
let toSimplifiedConverter: ConverterFunction | null = null
let toTraditionalConverter: ConverterFunction | null = null
let isInitializing = false
let initPromise: Promise<void> | null = null

/**
 * 初始化转换器
 */
async function initConverters(): Promise<void> {
  // 如果正在初始化，等待完成
  if (isInitializing && initPromise) {
    return initPromise
  }

  // 如果已初始化，直接返回
  if (toSimplifiedConverter && toTraditionalConverter) {
    return
  }

  isInitializing = true

  initPromise = (async () => {
    try {
      // 动态导入 OpenCC（使用命名空间导入）
      const OpenCC = await import('opencc-js')

      // 创建转换器
      toSimplifiedConverter = OpenCC.Converter({ from: 'hk', to: 'cn' })
      toTraditionalConverter = OpenCC.Converter({ from: 'cn', to: 'hk' })
    } catch (error) {
      console.error('OpenCC 初始化失敗:', error)
      // 提供降级方案：直接返回原文
      toSimplifiedConverter = (text: string) => text
      toTraditionalConverter = (text: string) => text
    } finally {
      isInitializing = false
    }
  })()

  return initPromise
}

/**
 * 中文转换工具
 */
export const useChineseConverter = () => {
  /**
   * 转换为简体
   */
  const toSimplified = (text: string): string => {
    if (!text) return text
    if (!toSimplifiedConverter) {
      return text
    }
    try {
      return toSimplifiedConverter(text)
    } catch (error) {
      console.warn('簡繁轉換失敗:', error)
      return text
    }
  }

  /**
   * 转换为繁体（香港标准）
   */
  const toTraditional = (text: string): string => {
    if (!text) return text
    if (!toTraditionalConverter) {
      return text
    }
    try {
      return toTraditionalConverter(text)
    } catch (error) {
      console.warn('簡繁轉換失敗:', error)
      return text
    }
  }

  /**
   * 确保转换器已初始化
   */
  const ensureInitialized = async (): Promise<void> => {
    await initConverters()
  }

  /**
   * 获取所有变体（原文 + 简体 + 繁体）
   * 去重后返回
   */
  const getAllVariants = (text: string): string[] => {
    if (!text) return []

    const variants = new Set<string>()
    variants.add(text) // 原文

    try {
      const simplified = toSimplified(text)
      const traditional = toTraditional(text)

      variants.add(simplified)
      variants.add(traditional)
    } catch (error) {
      console.warn('讀取文字變體失敗:', error)
    }

    return Array.from(variants)
  }

  /**
   * 检查两个字符串是否在简繁体转换后相等
   */
  const isEquivalent = (text1: string, text2: string): boolean => {
    if (!text1 || !text2) return text1 === text2

    // 直接比较
    if (text1 === text2) return true

    // 转换为简体后比较
    const simplified1 = toSimplified(text1)
    const simplified2 = toSimplified(text2)

    return simplified1 === simplified2
  }

  return {
    toSimplified,
    toTraditional,
    getAllVariants,
    isEquivalent,
    ensureInitialized
  }
}

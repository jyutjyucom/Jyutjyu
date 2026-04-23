/**
 * 服务端简繁体转换工具
 * 使用 OpenCC (opencc-js) 实现完整的简繁体转换
 */

import traditionalVariantMapData from "../generated/trad-variant-map.json" with { type: "json" };

// 定义转换器函数类型
type ConverterFunction = (text: string) => string;

// 转换器实例缓存
let toSimplifiedConverter: ConverterFunction | null = null;
let toTraditionalConverter: ConverterFunction | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;
const simplifiedToTraditionalMap = traditionalVariantMapData as Record<
  string,
  string[]
>;

const HAN_SCRIPT_PATTERN = /\p{Script=Han}/u;
const MAX_AMBIGUOUS_VARIANTS = 16;
const MAX_OPTIONS_PER_CHAR = 3;

const trimEdgePunctuation = (value: string): string => {
  return value.replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, "").trim();
};

const stripAllPunctuation = (value: string): string => {
  return value.replace(/[\p{P}\p{S}\s]+/gu, "");
};

const containsCjkCharacters = (value: string): boolean => {
  return HAN_SCRIPT_PATTERN.test(value);
};

const expandTraditionalAmbiguity = (text: string): string[] => {
  if (!text) return [];

  const chars = Array.from(text);
  let combinations: string[] = [""];

  for (const char of chars) {
    const options = (simplifiedToTraditionalMap[char] ?? [char]).slice(
      0,
      MAX_OPTIONS_PER_CHAR,
    );
    const next: string[] = [];

    for (const prefix of combinations) {
      for (const option of options) {
        next.push(`${prefix}${option}`);
        if (next.length >= MAX_AMBIGUOUS_VARIANTS) break;
      }
      if (next.length >= MAX_AMBIGUOUS_VARIANTS) break;
    }

    combinations =
      next.length > 0 ? next : combinations.map((prefix) => `${prefix}${char}`);
  }

  return combinations;
};

/**
 * 初始化 OpenCC 转换器
 */
async function initConverters(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // 动态导入 OpenCC
      const OpenCC = await import("opencc-js");

      // 创建转换器（香港繁体 <-> 简体中文）
      toSimplifiedConverter = OpenCC.Converter({ from: "hk", to: "cn" });
      toTraditionalConverter = OpenCC.Converter({ from: "cn", to: "hk" });

      isInitialized = true;
      console.log("✅ OpenCC 初始化完成");
    } catch (error) {
      console.error("❌ OpenCC 初始化失敗:", error);
      // 降级方案：返回原文
      toSimplifiedConverter = (text: string) => text;
      toTraditionalConverter = (text: string) => text;
      isInitialized = true;
    }
  })();

  return initPromise;
}

/**
 * 转换为简体中文
 */
export async function toSimplified(text: string): Promise<string> {
  if (!text) return text;
  await initConverters();
  try {
    return toSimplifiedConverter!(text);
  } catch {
    return text;
  }
}

/**
 * 转换为繁体中文（香港标准）
 */
export async function toTraditional(text: string): Promise<string> {
  if (!text) return text;
  await initConverters();
  try {
    return toTraditionalConverter!(text);
  } catch {
    return text;
  }
}

/**
 * 获取搜索词的所有变体（原文 + 简体 + 繁体）
 * 返回去重后的数组
 */
export async function getQueryVariants(query: string): Promise<string[]> {
  if (!query) return [];

  const lower = query.toLowerCase();
  const variants = new Set<string>();
  const querySeeds = new Set<string>();

  querySeeds.add(lower);

  const edgeTrimmed = trimEdgePunctuation(lower);
  if (edgeTrimmed) {
    querySeeds.add(edgeTrimmed);
  }

  const stripped = stripAllPunctuation(lower);
  if (stripped) {
    querySeeds.add(stripped);
  }

  querySeeds.forEach((seed) => variants.add(seed));

  if (!containsCjkCharacters(lower)) {
    return Array.from(variants);
  }

  await initConverters();

  try {
    querySeeds.forEach((seed) => {
      const simplified = toSimplifiedConverter!(seed);
      const traditional = toTraditionalConverter!(seed);
      variants.add(simplified.toLowerCase());
      variants.add(traditional.toLowerCase());
    });

    const snapshot = Array.from(variants);
    snapshot.forEach((variant) => {
      const simplified = toSimplifiedConverter!(variant).toLowerCase();
      const expandedTraditionalVariants =
        expandTraditionalAmbiguity(simplified);

      expandedTraditionalVariants.forEach((expandedVariant) => {
        variants.add(expandedVariant.toLowerCase());
      });
    });
  } catch (error) {
    console.warn("讀取查詢變體失敗:", error);
  }

  return Array.from(variants).slice(0, MAX_AMBIGUOUS_VARIANTS);
}

/**
 * 获取文本的所有变体（用于匹配）
 */
export async function getTextVariants(text: string): Promise<Set<string>> {
  if (!text) return new Set();

  await initConverters();

  const lower = text.toLowerCase();
  const variants = new Set<string>();

  variants.add(lower);

  try {
    variants.add(toSimplifiedConverter!(lower).toLowerCase());
    variants.add(toTraditionalConverter!(lower).toLowerCase());
  } catch {
    // 忽略转换错误
  }

  return variants;
}

/**
 * 同步版本（在已初始化后使用）
 */
export function toSimplifiedSync(text: string): string {
  if (!text || !toSimplifiedConverter) return text;
  try {
    return toSimplifiedConverter(text);
  } catch {
    return text;
  }
}

export function toTraditionalSync(text: string): string {
  if (!text || !toTraditionalConverter) return text;
  try {
    return toTraditionalConverter(text);
  } catch {
    return text;
  }
}

/**
 * 确保已初始化（在 API 处理前调用）
 */
export async function ensureInitialized(): Promise<void> {
  await initConverters();
}

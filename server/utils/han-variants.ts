/**
 * 漢字簡繁變體工具
 *
 * 取代執行時的 OpenCC：轉換表在 build 階段由
 * scripts/build-trad-variant-map.js 預先產生，執行時只做 Map 查表（微秒級）。
 * 這樣可以避免 opencc-js 在 Cloudflare Workers 的單次請求內初始化
 * （實測 100 ms+ CPU），同時把整個函式庫從 Worker bundle 裡拿掉。
 */

import traditionalVariantMapData from "../generated/trad-variant-map.json" with { type: "json" };
import tradToSimplifiedMapData from "../generated/trad-to-simplified-map.json" with { type: "json" };
import simplifiedToTraditionalMapData from "../generated/simplified-to-traditional-map.json" with { type: "json" };

// 定義轉換器函式型別（保留給呼叫端）
type ConverterFunction = (text: string) => string;

const MAX_AMBIGUOUS_VARIANTS = 32;
const MAX_OPTIONS_PER_CHAR = 4;
const HAN_SCRIPT_PATTERN = /\p{Script=Han}/u;

// 簡 -> 繁（含異體，陣列第一個是原字本身）
const simplifiedToTraditionalMap = traditionalVariantMapData as Record<
  string,
  string[]
>;
// 繁 -> 簡（只收錄與原字不同的字）
const traditionalToSimplifiedMap = tradToSimplifiedMapData as Record<
  string,
  string
>;
// 簡 -> 繁 的「首選」對應（由 OpenCC 在建置時逐字決定，處理 面/麵 這類同字異體）
const preferredSimplifiedToTraditional = simplifiedToTraditionalMapData as Record<
  string,
  string
>;

const trimEdgePunctuation = (value: string): string => {
  return value.replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, "").trim();
};

const stripAllPunctuation = (value: string): string => {
  return value.replace(/[\p{P}\p{S}\s]+/gu, "");
};

const containsCjkCharacters = (value: string): boolean => {
  return HAN_SCRIPT_PATTERN.test(value);
};

/**
 * 逐字轉成繁體（取第一個與原字不同的變體）
 */
const toTraditionalSync: ConverterFunction = (text) => {
  if (!text) return text;

  let result = "";
  for (const char of text) {
    result += preferredSimplifiedToTraditional[char] || char;
  }
  return result;
};

/**
 * 逐字轉成簡體
 */
const toSimplifiedSync: ConverterFunction = (text) => {
  if (!text) return text;

  let result = "";
  for (const char of text) {
    result += traditionalToSimplifiedMap[char] || char;
  }
  return result;
};

/**
 * 展開繁體異體的所有組合（給搜尋變體用）
 */
const expandTraditionalAmbiguity = (text: string): string[] => {
  if (!text) return [];

  const chars = Array.from(text);
  let combinations: string[] = [""];

  for (const char of chars) {
    // 原字已由 seed 覆蓋，展開時把「異體」排在前面，
    // 避免 32 個組合的預算被原字組合吃掉。
    const options = (simplifiedToTraditionalMap[char] ?? [char])
      .toSorted((left, right) => {
        const leftIdentity = left === char ? 1 : 0;
        const rightIdentity = right === char ? 1 : 0;
        return leftIdentity - rightIdentity;
      })
      .slice(0, MAX_OPTIONS_PER_CHAR);
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

export { toSimplifiedSync, toTraditionalSync };

/**
 * 相容舊 API：已不需要非同步初始化
 */
export async function ensureInitialized(): Promise<void> {
  return;
}

export async function toSimplified(text: string): Promise<string> {
  return toSimplifiedSync(text);
}

export async function toTraditional(text: string): Promise<string> {
  return toTraditionalSync(text);
}

/**
 * 取得搜尋詞的所有變體（原文 + 簡體 + 繁體 + 異體展開）
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

  querySeeds.forEach((seed) => {
    variants.add(toSimplifiedSync(seed).toLowerCase());
    variants.add(toTraditionalSync(seed).toLowerCase());
  });

  const snapshot = Array.from(variants);
  snapshot.forEach((variant) => {
    const simplified = toSimplifiedSync(variant).toLowerCase();
    const expandedTraditionalVariants = expandTraditionalAmbiguity(simplified);

    expandedTraditionalVariants.forEach((expandedVariant) => {
      variants.add(expandedVariant.toLowerCase());
    });
  });

  return Array.from(variants).slice(0, MAX_AMBIGUOUS_VARIANTS);
}

/**
 * 取得文本的所有變體（用於比對）
 */
export async function getTextVariants(text: string): Promise<Set<string>> {
  if (!text) return new Set();

  const lower = text.toLowerCase();
  const variants = new Set<string>();

  variants.add(lower);
  variants.add(toSimplifiedSync(lower).toLowerCase());
  variants.add(toTraditionalSync(lower).toLowerCase());

  return variants;
}

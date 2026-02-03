/**
 * 方言地区代码：与 i18n dictCard.dialect 中的 key 保持一致。
 * 用于判断 region_code 是否有对应翻译，有则用 t(`dictCard.dialect.${code}`)，否则回退到 dialect.name。
 * 新增方言时需同步更新 i18n.config.ts 中 dictCard.dialect。
 */
export const DIALECT_REGION_CODES_WITH_I18N = new Set<string>([
  'GZ',
  'HK',
  'YUE',
  'QZ',
  'KP',
  'TS'
])

export function hasDialectI18n(regionCode: string | undefined): boolean {
  return !!regionCode && DIALECT_REGION_CODES_WITH_I18N.has(regionCode.toUpperCase())
}

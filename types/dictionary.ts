/**
 * 粤语辞丛 - 词典数据类型定义
 * Jyut Collection - Dictionary Data Types
 * 
 * @version 1.0.0
 * @see docs/DATA_SCHEMA.md
 */

/**
 * 词条类型
 * - character: 单字（如《现代汉语词典》中的字头）
 * - word: 词语（双字及以上）
 * - phrase: 短语/俗语
 */
export type EntryType = 'character' | 'word' | 'phrase'

/**
 * 参见类型
 * - word: 参见其他词条（站内跳转）
 * - section: 参见书中章节（显示提示）
 */
export type RefType = 'word' | 'section'

/**
 * 语域类型
 */
export type RegisterType = '口语' | '书面' | '粗俗' | '文雅' | '中性'

/**
 * 词性标签
 */
export type PosLabel = 
  | '名词' | '动词' | '形容词' | '副词' | '代词' 
  | '量词' | '介词' | '连词' | '助词' | '叹词'
  | '象声词' | '语素' | '缩略语'

/**
 * 方言信息
 */
export interface Dialect {
  /** 方言名称 */
  name: string
  /** 地区代码 (可选，用于可视化) */
  region_code?: string
}

/**
 * 词头信息（处理异形词、括号、推荐写法）
 */
export interface Headword {
  /** 原书写法（展示用） */
  display: string
  /** 清洗后（搜索用），可能包含多个变体 */
  search: string
  /** 推荐标准写法 */
  normalized: string
  /** 是否包含开天窗字 □ */
  is_placeholder: boolean
}

/**
 * 标音信息
 */
export interface Phonetic {
  /** 原书注音（如耶鲁拼音、不规范拼音、IPA）
   * - string: 单个注音或多个注音的字符串表示
   * - string[]: 与jyutping一一对应的注音数组（如Wiktionary的IPA）
   */
  original: string | string[]
  /** 粤拼（数组支持多音） */
  jyutping: string[]
  /** 变调信息（可选） */
  tone_sandhi?: string[]
}

/**
 * 例句/组词
 */
export interface Example {
  /** 例句内容 */
  text: string
  /** 例句拼音（可选） */
  jyutping?: string
  /** 翻译（普通话/英文，可选） */
  translation?: string
}

/**
 * 子义项（用于 A) B) C) 等分类）
 */
export interface SubSense {
  /** 标签（A, B, C等） */
  label: string
  /** 释义内容 */
  definition: string
  /** 例句/组词数组 */
  examples?: Example[]
}

/**
 * 释义单元（支持多义项）
 */
export interface Sense {
  /** 释义内容 */
  definition: string
  /** 词性/分类标签 */
  label?: string
  /** 例句/组词数组 */
  examples?: Example[]
  /** 子义项（用于 A) B) C) 等分类） */
  sub_senses?: SubSense[]
}

/**
 * 参见引用
 */
export interface Reference {
  /** 引用类型 */
  type: RefType
  /** 目标文本 */
  target: string
  /** 内部链接（构建时生成） */
  url?: string
}

/**
 * 文献引用（结构化）
 */
export interface LiteraryReference {
  /** 作者（包含朝代，如"清·黃石麟"） */
  author?: string | null
  /** 作品名称 */
  work?: string | null
  /** 引文内容（～ 代表词头） */
  quote?: string | null
  /** 出版/版本信息 */
  source?: string | null
}

/**
 * 词典特有元数据
 */
export interface DictionaryMeta {
  /** 分类（"实用分类词典"特有） */
  category?: string
  /** 子分类 */
  subcategories?: string[]
  /** 词性 */
  pos?: PosLabel
  /** 词源说明（wiktionary 等真正的词源学解释） */
  etymology?: string
  /** 文献引用（粵語辭源等历史文献引用） */
  references?: LiteraryReference[]
  /** 首次记录时间 */
  first_recorded?: string
  /** 用法说明（"俗语词典"特有） */
  usage?: string
  /** 地域变体信息 */
  region?: string
  /** 语域 */
  register?: RegisterType
  /** 备注/典故 */
  notes?: string
  /** 允许任意其他扩展字段 */
  [key: string]: any
}

/**
 * 词典条目（核心数据结构）
 */
export interface DictionaryEntry {
  // --- 唯一标识 ---
  /** 唯一ID */
  id: string
  /** 来源词典 */
  source_book: string
  /** 原书编号（如有） */
  source_id?: string
  
  // --- 方言维度 ---
  /** 方言信息 */
  dialect: Dialect
  
  // --- 词头与标音 ---
  /** 词头信息 */
  headword: Headword
  /** 标音信息 */
  phonetic: Phonetic
  
  // --- 词条类型 ---
  /** 词条类型 */
  entry_type: EntryType
  
  // --- 释义（核心内容，结构化数组）---
  /** 释义数组（支持多义项） */
  senses: Sense[]
  
  // --- 参见系统 ---
  /** 参见引用 */
  refs?: Reference[]
  
  // --- 搜索优化字段（构建时生成）---
  /** 搜索关键词（包含简体、繁体、无声调拼音等） */
  keywords: string[]
  
  // --- 词典特有字段 ---
  /** 元数据 */
  meta: DictionaryMeta
  
  // --- 元数据 ---
  /** 创建时间（ISO 8601） */
  created_at?: string
  /** 更新时间（ISO 8601） */
  updated_at?: string
}

/**
 * 数据来源类型
 */
export type SourceType = 'published_book' | 'community_contributed' | 'public_domain' | 'scanned_from_internet'

/**
 * 词典元数据（索引文件）
 */
export interface DictionaryInfo {
  /** 词典ID */
  id: string
  /** 词典名称 */
  name: string
  /** 方言 */
  dialect: string
  /** 条目数 */
  entries_count: number
  /** 作者 */
  author?: string
  /** 出版社 */
  publisher?: string
  /** 出版年份 */
  year?: number
  /** 数据文件路径 */
  file: string
  /** 版本 */
  version?: string
  /** 描述 */
  description?: string
  /** 数据来源 */
  source?: SourceType
  /** 许可协议 */
  license?: string
  /** 许可协议链接 */
  license_url?: string
  /** 使用限制说明 */
  usage_restriction?: string
  /** 署名方式 */
  attribution?: string
  /** 封面图片路径 */
  cover?: string
}

/**
 * 词典索引
 */
export interface DictionaryIndex {
  /** 词典列表 */
  dictionaries: DictionaryInfo[]
  /** 最后更新时间 */
  last_updated: string
  /** Schema 版本 */
  schema_version: string
}

/**
 * 搜索结果
 */
export interface SearchResult {
  /** 词条 */
  entry: DictionaryEntry
  /** 匹配分数 */
  score: number
  /** 匹配的字段 */
  match_fields?: string[]
  /** 高亮片段 */
  highlights?: Record<string, string[]>
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  /** 搜索查询 */
  query: string
  /** 方言筛选 */
  dialect?: string
  /** 词典筛选 */
  source_book?: string
  /** 词条类型筛选 */
  entry_type?: EntryType
  /** 模糊度 (0-1) */
  fuzzy?: number
  /** 每页结果数 */
  limit?: number
  /** 页码 */
  page?: number
}

/**
 * 搜索响应
 */
export interface SearchResponse {
  /** 结果列表 */
  results: SearchResult[]
  /** 总数 */
  total: number
  /** 查询 */
  query: string
  /** 耗时（毫秒） */
  took: number
}

/**
 * CSV 行数据（用于构建脚本）
 */
export interface CSVRow {
  id?: string
  parent_id?: string
  headword_display: string
  headword_normalized: string
  jyutping: string
  original_romanization?: string
  entry_type: EntryType
  definition: string
  label?: string
  examples?: string
  example_jyutping?: string
  example_translation?: string
  ref_word?: string
  ref_section?: string
  category?: string
  usage?: string
  etymology?: string
  register?: RegisterType
  notes?: string
  [key: string]: any
}

/**
 * 构建配置
 */
export interface BuildConfig {
  /** 输入 CSV 路径 */
  input_csv: string
  /** 输出 JSON 路径 */
  output_json: string
  /** 词典信息 */
  dictionary_info: Omit<DictionaryInfo, 'entries_count' | 'file'>
  /** 是否生成搜索索引 */
  generate_index?: boolean
  /** 是否验证数据 */
  validate?: boolean
}

/**
 * 验证错误
 */
export interface ValidationError {
  /** 行号 */
  row?: number
  /** 字段名 */
  field?: string
  /** 错误类型 */
  type: 'missing_field' | 'invalid_format' | 'invalid_reference' | 'encoding_error'
  /** 错误消息 */
  message: string
  /** 严重程度 */
  severity: 'error' | 'warning'
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否通过 */
  valid: boolean
  /** 错误列表 */
  errors: ValidationError[]
  /** 警告列表 */
  warnings: ValidationError[]
  /** 总行数 */
  total_rows: number
  /** 有效行数 */
  valid_rows: number
}


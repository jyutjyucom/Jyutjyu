# 数据结构设计文档 Data Schema Documentation

## 1. 概述

本文档定义了粤语辞丛项目的核心数据结构，包括：
- TypeScript 类型定义（JSON 格式）
- CSV 输入格式规范
- 数据转换逻辑说明

### 设计原则

1. **核心字段 + 扩展字段**: 所有词典共享核心字段，特有信息放入 `meta` 对象
2. **异构数据兼容**: 支持不同词典的不同数据结构
3. **搜索优化**: 预处理搜索关键词，支持多维度检索
4. **结构化释义**: 支持多义项、例句、组词的结构化存储

---

## 2. TypeScript 类型定义

### 2.1 核心类型

```typescript
/**
 * 词条类型
 * - character: 单字（如《现代汉语词典》中的字头）
 * - word: 词语（双字及以上）
 * - phrase: 短语/俗语
 */
type EntryType = 'character' | 'word' | 'phrase';

/**
 * 参见类型
 * - word: 参见其他词条（站内跳转）
 * - section: 参见书中章节（显示提示）
 */
type RefType = 'word' | 'section';

/**
 * 方言信息
 */
interface Dialect {
  name: string;           // 方言名称: '广州话' | '钦州白话' | '北海白话'
  region_code?: string;   // 地区代码: 'GZ' | 'QZ' | 'BH' (可选，用于可视化)
}

/**
 * 词头信息（处理异形词、括号、推荐写法）
 */
interface Headword {
  display: string;        // 原书写法（展示用）: "阿（亚）SIR"
  search: string;         // 清洗后（搜索用）: "阿Sir" 或 "亚Sir"
  normalized: string;     // 推荐标准写法: "阿Sir"
  is_placeholder: boolean;// 是否包含开天窗字 □
}

/**
 * 标音信息
 */
interface Phonetic {
  original: string;       // 原书注音（如耶鲁拼音、不规范拼音）
  jyutping: string[];     // 粤拼（数组支持多音）: ["aa3", "aa3 soe4"]
  tone_sandhi?: string[]; // 变调信息（可选）
}

/**
 * 释义单元（支持多义项）
 */
interface Sense {
  definition: string;     // 释义内容
  label?: string;         // 词性/分类标签: "[名词]" | "[形容词]" | "旧时"
  examples?: Example[];   // 例句/组词数组
}

/**
 * 例句/组词
 */
interface Example {
  text: string;           // 例句内容: "阿Sir早晨"
  jyutping?: string;      // 例句拼音（可选）
  translation?: string;   // 翻译（普通话/英文，可选）
}

/**
 * 参见引用
 */
interface Reference {
  type: RefType;          // 引用类型
  target: string;         // 目标: "臊虾仔" 或 "二C2"
  url?: string;           // 内部链接（构建时生成）
}

/**
 * 词典条目（核心数据结构）
 */
interface DictionaryEntry {
  // --- 唯一标识 ---
  id: string;             // 唯一ID: "dict_gz_practical_0001"
  source_book: string;    // 来源词典: "实用广州话分类词典"
  source_id?: string;     // 原书编号（如有）: "A-001"
  
  // --- 方言维度 ---
  dialect: Dialect;
  
  // --- 词头与标音 ---
  headword: Headword;
  phonetic: Phonetic;
  
  // --- 词条类型 ---
  entry_type: EntryType;
  
  // --- 释义（核心内容，结构化数组）---
  senses: Sense[];
  
  // --- 参见系统 ---
  refs?: Reference[];
  
  // --- 搜索优化字段（构建时生成）---
  keywords: string[];     // 包含：简体、繁体、无声调拼音、拆字等
  
  // --- 词典特有字段 ---
  meta: {
    category?: string;    // 分类（"实用分类词典"特有）: "职业" | "饮食"
    pos?: string;         // 词性: "名词" | "动词"
    etymology?: string;   // 词源（"词源词典"特有）
    usage?: string;       // 用法说明（"俗语词典"特有）
    region?: string;      // 地域变体信息
    register?: string;    // 语域: "口语" | "书面" | "粗俗"
    notes?: string;       // 备注/典故
    [key: string]: any;   // 允许任意其他扩展字段
  };
  
  // --- 元数据 ---
  created_at?: string;    // 创建时间（ISO 8601）
  updated_at?: string;    // 更新时间（ISO 8601）
}
```

### 2.2 JSON 示例

#### 示例 1: 分类词典条目（简单）

```json
{
  "id": "dict_gz_practical_0042",
  "source_book": "实用广州话分类词典",
  "source_id": "A-042",
  "dialect": {
    "name": "广州话",
    "region_code": "GZ"
  },
  "headword": {
    "display": "阿Sir",
    "search": "阿Sir",
    "normalized": "阿Sir",
    "is_placeholder": false
  },
  "phonetic": {
    "original": "aa3 soe4",
    "jyutping": ["aa3 soe4"]
  },
  "entry_type": "word",
  "senses": [
    {
      "definition": "警察",
      "label": "[名词]",
      "examples": [
        {
          "text": "阿Sir早晨",
          "jyutping": "aa3 soe4 zou2 san4",
          "translation": "警察早上好"
        },
        {
          "text": "差佬阿Sir",
          "jyutping": "caai1 lou2 aa3 soe4"
        }
      ]
    }
  ],
  "keywords": [
    "阿Sir", "阿sir", "aa3soe4", "aa3 soe4", "aasoe4",
    "阿", "sir", "警察", "jing2 caat3"
  ],
  "meta": {
    "category": "职业称谓",
    "register": "口语",
    "notes": "来自英语 sir，对警察的尊称"
  },
  "created_at": "2025-12-31T10:00:00Z"
}
```

#### 示例 2: 俗语词典条目（参见）

```json
{
  "id": "dict_gz_colloquial_0123",
  "source_book": "广州话俗语词典",
  "dialect": {
    "name": "广州话",
    "region_code": "GZ"
  },
  "headword": {
    "display": "阿茂整饼",
    "search": "阿茂整饼",
    "normalized": "阿茂整饼",
    "is_placeholder": false
  },
  "phonetic": {
    "original": "aa3 mau6 zing2 beng2",
    "jyutping": ["aa3 mau6 zing2 beng2"]
  },
  "entry_type": "phrase",
  "senses": [
    {
      "definition": "比喻做事无章法，乱来一通",
      "examples": [
        {
          "text": "佢做嘢真系阿茂整饼，冇计划嘅",
          "jyutping": "keoi5 zou6 je5 zan1 hai6 aa3 mau6 zing2 beng2, mou5 gai3 waak6 ge3"
        }
      ]
    }
  ],
  "refs": [
    {
      "type": "word",
      "target": "冇计划",
      "url": "/search?q=冇计划"
    }
  ],
  "keywords": [
    "阿茂整饼", "阿茂", "整饼", "aa3mau6zing2beng2",
    "亚茂整饼", "无章法", "乱来"
  ],
  "meta": {
    "usage": "贬义，多用于批评",
    "etymology": "茂仔是旧时对学徒的称呼，整饼指做饼，比喻新手做事不得法"
  }
}
```

#### 示例 3: 开天窗字（□）

```json
{
  "id": "dict_gz_practical_0567",
  "source_book": "实用广州话分类词典",
  "dialect": {
    "name": "广州话",
    "region_code": "GZ"
  },
  "headword": {
    "display": "□嘢",
    "search": "□嘢",
    "normalized": "□嘢",
    "is_placeholder": true
  },
  "phonetic": {
    "original": "mat1 je5",
    "jyutping": ["mat1 je5"]
  },
  "entry_type": "word",
  "senses": [
    {
      "definition": "什么东西",
      "label": "[代词]",
      "examples": [
        {
          "text": "你讲□嘢啊？",
          "jyutping": "nei5 gong2 mat1 je5 aa3"
        }
      ]
    }
  ],
  "keywords": [
    "□嘢", "mat1je5", "matje5", "什么", "乜嘢", "咩嘢"
  ],
  "meta": {
    "notes": "有音无字，常见异形词写法：乜嘢、咩嘢"
  }
}
```

#### 示例 4: 多义项 + 字词结构

```json
{
  "id": "dict_modern_0089",
  "source_book": "现代粤语词典（示例）",
  "dialect": {
    "name": "广州话",
    "region_code": "GZ"
  },
  "headword": {
    "display": "飞",
    "search": "飞",
    "normalized": "飞",
    "is_placeholder": false
  },
  "phonetic": {
    "original": "fei1",
    "jyutping": ["fei1"]
  },
  "entry_type": "character",
  "senses": [
    {
      "definition": "鸟虫用翼在空中活动",
      "label": "[动词]",
      "examples": [
        { "text": "雀仔飞咗去" },
        { "text": "飞机" }
      ]
    },
    {
      "definition": "形容快速",
      "label": "[形容词]",
      "examples": [
        { "text": "飞快" },
        { "text": "健步如飞" }
      ]
    },
    {
      "definition": "消失，走掉",
      "label": "[动词]",
      "examples": [
        { "text": "佢飞咗去边" }
      ]
    }
  ],
  "refs": [
    {
      "type": "word",
      "target": "飞发",
      "url": "/search?q=飞发"
    },
    {
      "type": "word",
      "target": "飞机",
      "url": "/search?q=飞机"
    }
  ],
  "keywords": ["飞", "fei1", "fei"],
  "meta": {
    "note": "该字条下收录词条：飞发、飞机、飞快等"
  }
}
```

---

## 3. CSV 输入格式

详细规范请见 [CSV_GUIDE.md](./CSV_GUIDE.md)，此处仅概述核心字段。

### 3.1 基础字段（所有词典必填）

| 列名 | 说明 | 示例 |
|------|------|------|
| `id` | 行ID（可选，用于聚合） | GZ001 |
| `parent_id` | 父ID（字词关系） | - |
| `headword_display` | 原书词头 | 阿（亚）SIR |
| `headword_normalized` | 推荐写法 | 阿Sir |
| `jyutping` | 粤拼（空格分隔） | aa3 soe4 |
| `original_romanization` | 原书注音 | aa3 soe4 |
| `entry_type` | 类型 | word |
| `definition` | 释义 | 警察 |
| `examples` | 例句（`\|` 分隔） | 阿Sir早晨\|差佬阿Sir |
| `label` | 词性/标签 | [名词] |

### 3.2 特有字段（按词典类型）

| 列名 | 说明 | 适用词典 |
|------|------|----------|
| `category` | 分类 | 实用分类词典 |
| `usage` | 用法说明 | 俗语词典 |
| `etymology` | 词源 | 词源词典 |
| `ref_word` | 参见词条 | 所有 |
| `ref_section` | 参见章节 | 所有 |

### 3.3 CSV 多行聚合示例

**多义项聚合**（相同词头+拼音，不同释义）:

```csv
id,headword_display,jyutping,entry_type,definition,examples,label
GZ001,飞,fei1,character,鸟虫用翼在空中活动,雀仔飞咗去|飞机,[动词]
GZ001,飞,fei1,character,形容快速,飞快|健步如飞,[形容词]
```

**字词关系**（parent_id 指向字头）:

```csv
id,parent_id,headword_display,jyutping,entry_type,definition
GZ001,,飞,fei1,character,鸟虫用翼在空中活动
GZ002,GZ001,飞发,fei1 faat3,word,理发
```

---

## 4. 数据转换逻辑

### 4.1 转换脚本流程（`scripts/csv-to-json.js`）

```
1. 读取 CSV 文件
   ↓
2. 按 id 或 (headword + jyutping) 分组
   ↓
3. 聚合多行为 senses[] 数组
   ↓
4. 处理 headword:
   - 生成 search（去括号）
   - 检测 □ 设置 is_placeholder
   ↓
5. 生成 keywords:
   - opencc 简繁转换
   - 去除声调拼音
   - 拆分单字
   ↓
6. 解析参见标记:
   - [see_word:xxx] → refs.type='word'
   - [see_sec:xxx] → refs.type='section'
   ↓
7. 输出 JSON 到 content/dictionaries/
```

### 4.2 关键算法

#### 去括号生成搜索词

```javascript
function extractSearchVariants(display) {
  // "阿（亚）SIR" → ["阿SIR", "亚SIR"]
  const regex = /(\w*)\((\w+)\)(\w*)/g;
  let variants = [display.replace(/[()]/g, '')]; // 基础版本
  
  let match;
  while ((match = regex.exec(display)) !== null) {
    const [, before, inside, after] = match;
    variants.push(before + inside + after);
  }
  
  return [...new Set(variants)];
}
```

#### 生成搜索关键词

```javascript
function generateKeywords(entry) {
  const keywords = new Set();
  
  // 1. 词头变体
  keywords.add(entry.headword.display);
  keywords.add(entry.headword.normalized);
  entry.headword.search.split(',').forEach(v => keywords.add(v));
  
  // 2. 简繁转换
  const simplified = OpenCC.convertSync(entry.headword.normalized, 't2s');
  keywords.add(simplified);
  
  // 3. 粤拼变体
  entry.phonetic.jyutping.forEach(jp => {
    keywords.add(jp);                      // "aa3 soe4"
    keywords.add(jp.replace(/\s/g, ''));  // "aa3soe4"
    keywords.add(removeTones(jp));         // "aa sir"
  });
  
  // 4. 拆字
  const chars = entry.headword.normalized.match(/[\u4e00-\u9fa5]/g);
  if (chars) chars.forEach(c => keywords.add(c));
  
  return Array.from(keywords);
}
```

---

## 5. 数据验证规则

### 5.1 必填字段验证

```javascript
const requiredFields = [
  'headword.display',
  'headword.normalized',
  'phonetic.jyutping',
  'entry_type',
  'senses',
  'dialect.name',
  'source_book'
];
```

### 5.2 粤拼格式验证

```javascript
// 正则：允许 a-z + 1-6 声调 + 空格分隔
const jyutpingRegex = /^[a-z]+[1-6](\s[a-z]+[1-6])*$/;

function validateJyutping(jyutping) {
  return jyutping.every(jp => jyutpingRegex.test(jp));
}
```

### 5.3 参见完整性检查

```javascript
// 检查所有 type='word' 的 refs.target 是否存在对应词条
function validateReferences(entries) {
  const headwords = new Set(entries.map(e => e.headword.normalized));
  
  entries.forEach(entry => {
    entry.refs?.forEach(ref => {
      if (ref.type === 'word' && !headwords.has(ref.target)) {
        console.warn(`Missing ref: ${ref.target} in ${entry.id}`);
      }
    });
  });
}
```

---

## 6. 扩展字段示例

### 6.1 分类词典 (`meta.category`)

```json
{
  "meta": {
    "category": "饮食 > 烹饪方式",
    "subcategories": ["煲", "炒", "蒸"]
  }
}
```

### 6.2 词源词典 (`meta.etymology`)

```json
{
  "meta": {
    "etymology": "源自英语 sir，原指对男性的尊称，在香港警察系统中特指警官",
    "first_recorded": "20世纪60年代"
  }
}
```

### 6.3 变调信息 (`phonetic.tone_sandhi`)

```json
{
  "phonetic": {
    "jyutping": ["nei5 hou2"],
    "tone_sandhi": ["nei5 hou2 → nei4 hou2 (快速发音)"]
  }
}
```

---

## 7. 数据文件组织

```
content/dictionaries/
├── gz-practical-classified.json    # 5000+ 条目
├── gz-colloquialisms.json          # 3000+ 条目
└── index.json                       # 元数据索引

data/processed/
├── gz-practical-classified.csv     # 人工校对版
└── gz-colloquialisms.csv

data/raw/
└── ocr-output/                     # OCR 原始输出（仅存档）
```

### 元数据索引 (`content/dictionaries/index.json`)

```json
{
  "dictionaries": [
    {
      "id": "gz-practical-classified",
      "name": "实用广州话分类词典",
      "dialect": "广州话",
      "entries_count": 5234,
      "author": "麦耘、谭步云",
      "publisher": "广东人民出版社",
      "year": 1997,
      "file": "gz-practical-classified.json"
    },
    {
      "id": "gz-colloquialisms",
      "name": "广州话俗语词典",
      "dialect": "广州话",
      "entries_count": 3100,
      "author": "欧阳觉亚、周无忌、饶秉才",
      "publisher": "广东人民出版社",
      "year": 2010,
      "file": "gz-colloquialisms.json"
    }
  ]
}
```

---

## 8. 版本控制

- **Schema Version**: `v1.0.0`
- **兼容性**: 向后兼容（新增字段不影响旧版）
- **Breaking Changes**: 通过 `schema_version` 字段标识

---

**维护者**: @jyutjyucom  
**最后更新**: 2025-12-31


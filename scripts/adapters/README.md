# 词典适配器开发指南

## 概述

每个粤语词典的数据结构都不相同，因此需要为每个词典开发专门的**适配器（Adapter）**。

适配器的作用是将词典特有的 CSV 格式转换为项目统一的 `DictionaryEntry` 格式。

---

## 适配器结构

一个标准适配器包含以下部分：

```javascript
// 1. 词典元数据
export const DICTIONARY_INFO = {
  id: 'dict-id',
  name: '词典名称',
  dialect: { name: '广州话', region_code: 'GZ' },
  // ...
}

// 2. 必填字段
export const REQUIRED_FIELDS = ['field1', 'field2']

// 3. 单行转换函数
export function transformRow(row) {
  // 将 CSV 行转换为 DictionaryEntry
}

// 4. 批量转换函数
export function transformAll(rows) {
  // 批量处理，返回 { entries, errors }
}

// 5. 后处理函数（可选）
export function aggregateEntries(entries) {
  // 聚合多义项等
}
```

---

## 开发步骤

### Step 1: 分析原始数据

假设你有一个新词典的 CSV 数据：

```csv
id,word,pronunciation,definition,example,dialect_area
1,靚仔,leng3 zai2,帅哥,你個仔好靚仔,广州
```

**需要分析**:
- 哪些字段是必填的？
- 哪些字段包含多个值（需要分割）？
- 释义和例句是否混合？
- 有没有特殊标记或格式？

### Step 2: 创建适配器文件

在 `scripts/adapters/` 目录创建新文件，命名规范：`词典ID.js`

例如：`scripts/adapters/my-new-dict.js`

### Step 3: 定义元数据

```javascript
export const DICTIONARY_INFO = {
  id: 'my-new-dict',
  name: '我的新词典',
  dialect: {
    name: '广州话',
    region_code: 'GZ'
  },
  source_book: '我的新词典',
  author: '作者名',
  publisher: '出版社',
  year: 2000
}

export const REQUIRED_FIELDS = ['id', 'word', 'pronunciation', 'definition']
```

### Step 4: 实现 transformRow

```javascript
import {
  generateKeywords,
  cleanHeadword
} from '../utils/text-processor.js'

// 注意：简繁体转换已移至运行时处理，无需在适配器中处理

export function transformRow(row) {
  // 1. 处理词头
  const headwordInfo = cleanHeadword(row.word)
  
  // 2. 处理粤拼
  const jyutpingArray = row.pronunciation
    .split(/[,;]/)
    .map(j => j.trim())
    .filter(j => j)
  
  // 3. 构建词条
  const entry = {
    id: `${DICTIONARY_INFO.id}_${String(row.id).padStart(6, '0')}`,
    source_book: DICTIONARY_INFO.source_book,
    source_id: row.id,
    
    dialect: DICTIONARY_INFO.dialect,
    
    headword: {
      display: row.word,
      search: headwordInfo.normalized,
      normalized: headwordInfo.normalized,
      is_placeholder: headwordInfo.isPlaceholder || false
    },
    
    phonetic: {
      original: row.pronunciation,
      jyutping: jyutpingArray
    },
    
    entry_type: guessEntryType(headwordInfo.normalized),
    
    senses: [
      {
        definition: row.definition,
        examples: row.example ? [{ text: row.example }] : []
      }
    ],
    
    meta: {
      // 词典特有字段放这里
      dialect_area: row.dialect_area
    },
    
    created_at: new Date().toISOString()
  }
  
  // 4. 生成搜索关键词
  entry.keywords = generateKeywords(entry)
  
  return entry
}
```

### Step 5: 实现 transformAll

```javascript
export function transformAll(rows) {
  const entries = []
  const errors = []
  
  rows.forEach((row, index) => {
    try {
      const entry = transformRow(row)
      entries.push(entry)
    } catch (error) {
      errors.push({
        row: index + 2,
        error: error.message,
        data: row
      })
    }
  })
  
  return { entries, errors }
}
```

### Step 6: 实现聚合（可选）

如果你的词典有多义项需要聚合：

```javascript
export function aggregateEntries(entries) {
  // 实现聚合逻辑
  // 参考 gz-practical-classified.js
}
```

### Step 7: 注册适配器

在 `scripts/csv-to-json.js` 中添加你的适配器：

```javascript
const ADAPTERS = {
  'gz-practical-classified': () => import('./adapters/gz-practical-classified.js'),
  'my-new-dict': () => import('./adapters/my-new-dict.js'), // 添加这行
}
```

### Step 8: 测试

```bash
# 运行验证
node scripts/validate.js data/processed/my-dict.csv

# 运行转换
node scripts/csv-to-json.js \
  --dict my-new-dict \
  --input data/processed/my-dict.csv

# 示例：转换广州话俗语词典
node scripts/csv-to-json.js \
  --dict gz-colloquialisms \
  --input data/processed/gz-colloquialisms.csv \
  --output public/dictionaries/gz-colloquialisms.json
```

---

## 示例 1：实用广州话分类词典

参考 `gz-practical-classified.js`，它展示了如何处理：

1. **特殊标记** (`*哋1`)
   ```javascript
   const headwordInfo = cleanHeadword(row.words)
   ```

2. **混合的释义和例句**
   ```javascript
   const { definition, examples } = parseExamples(row.meanings)
   ```

3. **三级分类**
   ```javascript
   const categories = [row.category_1, row.category_2, row.category_3]
   const categoryPath = categories.filter(c => c).join(' > ')
   ```

4. **方括号备注**
   ```javascript
   meta: {
     notes: parseNote(row.note)
   }
   ```

## 示例 2：粵典 (words.hk)

参考 `hk-cantowords.js`，它展示了如何处理：

### CSV 格式特点

粵典 CSV 格式特殊，第一行是版权声明（被当作表头），需要预处理：

```javascript
export function preprocessRows(rows) {
  return rows.map(row => {
    const keys = Object.keys(row)
    const longKey = keys.find(k => k.length > 100) || keys[2]
    
    return {
      id: row[''] || '',
      headwords_jyutping: row['_1'] || '',
      content: row[longKey] || '',
      review_status: row['__parsed_extra']?.[1] || '',
      publish_status: row['__parsed_extra']?.[2] || ''
    }
  })
}
```

### 核心功能实现

1. **复杂的结构化内容**（包含多种标记）
   
   内容格式：`(pos:xxx)` `<explanation>` `<eg>` `yue:` `eng:` `----`
   
   ```javascript
   function parseContent(content) {
     // 按 ---- 分割多个义项
     const senseParts = content.split(/\n?----\n?/).filter(p => p.trim())
     
     senseParts.forEach(sensePart => {
       // 提取词性：(pos:語句)
       const posMatch = sensePart.match(/\(pos:([^)]+)\)/)
       
       // 分割释义和例句部分
       const parts = sensePart.split(/<eg>/i)
       const explanationPart = parts[0]
       const examplePart = parts[1]
       
       // 提取 yue: 和 eng: 内容
       const yueMatch = explanationPart.match(/yue:(.+?)(?=\neng:|$)/s)
       const engMatch = explanationPart.match(/eng:(.+?)$/s)
     })
   }
   ```

2. **多个词头变体**（用冒号和逗号分隔）
   
   格式：`小意思:siu2 ji3 si1,小小意思:siu2 siu2 ji3 si1`
   
   ```javascript
   function parseHeadwordsWithJyutping(headwordsStr) {
     const variants = []
     const parts = headwordsStr.split(',').map(p => p.trim()).filter(p => p)
     
     parts.forEach(part => {
       const colonIndex = part.indexOf(':')
       if (colonIndex > 0) {
         variants.push({
           headword: part.substring(0, colonIndex).trim(),
           jyutping: part.substring(colonIndex + 1).trim()
         })
       }
     })
     return variants
   }
   ```

3. **审核和公开状态**
   ```javascript
   meta: {
     review_status: reviewStatus,
     is_reviewed: !reviewStatus.includes('UNREVIEWED'),
     publish_status: publishStatus,
     is_public: !publishStatus.includes('未公開')
   }
   ```

4. **多语言释义和例句**（粤语和英语）
   ```javascript
   // 从 yue: 和 eng: 标记中提取
   const yueMatch = text.match(/yue:(.+?)(?=\neng:|$)/s)
   const engMatch = text.match(/eng:(.+?)$/s)
   
   if (yueMatch) {
     sense.definition = yueMatch[1].trim()
     if (engMatch) {
       sense.definition += ` (${engMatch[1].trim()})`
     }
   }
   ```

### 使用说明

```bash
# 转换粵典数据
npm run build:data:hk

# 或完整命令
node scripts/csv-to-json.js \
  --dict hk-cantowords \
  --input data/processed/hk-cantowords.csv

# 测试小数据集
head -n 1000 data/processed/hk-cantowords.csv > /tmp/test.csv
node scripts/csv-to-json.js --dict hk-cantowords --input /tmp/test.csv
```

### 注意事项

⚠️ **重要**：粵典数据采用《非商业开放资料授权协议 1.0》
- 版权持有人：Hong Kong Lexicography Limited
- 允许非商业使用，商业使用需授权
- 详见：https://words.hk/base/hoifong/

## 示例 3：广州话俗语词典

参考 `gz-colloquialisms.js`，它展示了如何处理：

1. **歇后语结构**（前后半句用逗号分隔）
   ```javascript
   function detectColloquialismType(phrase) {
     if (phrase.includes('，') || phrase.includes(',')) {
       const parts = phrase.split(/[，,]/)
       if (parts.length === 2 && parts[0].length > 2 && parts[1].length > 2) {
         return 'xiehouyu' // 歇后语
       }
     }
     return 'idiom'
   }
   ```

2. **多义项聚合**（按 index 和 sense_number）
   ```javascript
   export function aggregateEntries(entries) {
     // 按 index 分组
     const grouped = new Map()
     entries.forEach(entry => {
       const index = entry.meta._originalIndex
       if (!grouped.has(index)) {
         grouped.set(index, [])
       }
       grouped.get(index).push(entry)
     })
     // 聚合每组的 senses
     // ...
   }
   ```

3. **保留广州话拼音方案**（gwongping 作为原始注音）
   ```javascript
   phonetic: {
     original: row.gwongping || row.jyutping,
     jyutping: jyutpingArray
   },
   meta: {
     gwongping: row.gwongping || null
   }
   ```

4. **俗语类型分类**
   ```javascript
   meta: {
     colloquialism_type: detectColloquialismType(row.phrases),
     // 'xiehouyu' | 'proverb' | 'idiom'
   }
   ```

---

## 常见问题

### Q: 如何处理例句中的翻译？

```javascript
import { parseExamples } from '../utils/text-processor.js'

// 自动解析 "例句。（翻译。）" 格式
const { definition, examples } = parseExamples(row.meanings)
```

### Q: 如何处理多音字？

如果一个字有多个读音，分行记录，使用相同的 `id`，在聚合时会自动合并。

### Q: 如何处理参见引用？

在 CSV 中添加 `ref_word` 或 `ref_section` 字段：

```javascript
if (row.ref_word) {
  entry.refs = [{
    type: 'word',
    target: row.ref_word
  }]
}
```

### Q: 如何处理开天窗字 □？

`cleanHeadword()` 会自动检测：

```javascript
const headwordInfo = cleanHeadword('□嘢')
// headwordInfo.isPlaceholder === true
```

---

## 可用的工具函数

位于 `scripts/utils/text-processor.js`:

| 函数 | 用途 |
|------|------|
| `removeTones(jyutping)` | 去除粤拼声调 |
| `generateKeywords(entry)` | 生成搜索关键词（不含简繁体） |
| `extractVariants(text)` | 提取异形词 |
| `cleanHeadword(word)` | 清理词头标记 |
| `parseExamples(meanings)` | 解析例句 |
| `parseNote(note)` | 解析备注 |

**注意**：简繁体转换已移至运行时处理（`composables/useChineseConverter.ts`），无需在适配器中处理。所有词典的数据只需保持原始形式即可，搜索时会自动支持简繁体。

---

## 测试清单

开发完适配器后，检查：

- [ ] 所有必填字段正确映射
- [ ] 粤拼格式正确（空格分隔音节）
- [ ] 搜索关键词完整（无需包含简繁体）
- [ ] 特殊字符处理正确
- [ ] 分类/备注等元数据正确
- [ ] 运行 `validate.js` 无错误
- [ ] 运行 `csv-to-json.js` 成功
- [ ] 生成的 JSON 格式正确

---

## 贡献你的适配器

如果你为新词典开发了适配器，欢迎提交 PR：

1. 将适配器文件放入 `scripts/adapters/`
2. 更新 `scripts/csv-to-json.js` 注册适配器
3. 提供示例 CSV 数据（至少 10 条）
4. 在 PR 中说明词典的特殊之处

---

## 需要帮助？

- 查看现有适配器源码
- 阅读 [DATA_SCHEMA.md](../../docs/DATA_SCHEMA.md)
- 在 [GitHub Discussions](https://github.com/jyutjyucom/jyutjyu/discussions) 提问


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
  id: "dict-id",
  name: "词典名称",
  dialect: { name: "广州话", region_code: "GZ" },
  // ...
};

// 2. 必填字段
export const REQUIRED_FIELDS = ["field1", "field2"];

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
  id: "my-new-dict",
  name: "我的新词典",
  dialect: {
    name: "广州话",
    region_code: "GZ",
  },
  source_book: "我的新词典",
  author: "作者名",
  publisher: "出版社",
  year: 2000,
};

export const REQUIRED_FIELDS = ["id", "word", "pronunciation", "definition"];
```

### Step 4: 实现 transformRow

```javascript
import { generateKeywords, cleanHeadword } from "../utils/text-processor.js";

// 注意：简繁体转换已移至运行时处理，无需在适配器中处理

export function transformRow(row) {
  // 1. 处理词头
  const headwordInfo = cleanHeadword(row.word);

  // 2. 处理粤拼
  const jyutpingArray = row.pronunciation
    .split(/[,;]/)
    .map((j) => j.trim())
    .filter((j) => j);

  // 3. 构建词条
  const entry = {
    id: `${DICTIONARY_INFO.id}_${String(row.id).padStart(6, "0")}`,
    source_book: DICTIONARY_INFO.source_book,
    source_id: row.id,

    dialect: DICTIONARY_INFO.dialect,

    headword: {
      display: row.word,
      search: headwordInfo.normalized,
      normalized: headwordInfo.normalized,
      is_placeholder: headwordInfo.isPlaceholder || false,
    },

    phonetic: {
      original: row.pronunciation,
      jyutping: jyutpingArray,
    },

    entry_type: guessEntryType(headwordInfo.normalized),

    senses: [
      {
        definition: row.definition,
        examples: row.example ? [{ text: row.example }] : [],
      },
    ],

    meta: {
      // 词典特有字段放这里
      dialect_area: row.dialect_area,
    },

    created_at: new Date().toISOString(),
  };

  // 4. 生成搜索关键词
  entry.keywords = generateKeywords(entry);

  return entry;
}
```

### Step 5: 实现 transformAll

```javascript
export function transformAll(rows) {
  const entries = [];
  const errors = [];

  rows.forEach((row, index) => {
    try {
      const entry = transformRow(row);
      entries.push(entry);
    } catch (error) {
      errors.push({
        row: index + 2,
        error: error.message,
        data: row,
      });
    }
  });

  return { entries, errors };
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
  "gz-practical-classified": () =>
    import("./adapters/gz-practical-classified.js"),
  "my-new-dict": () => import("./adapters/my-new-dict.js"), // 添加这行
};
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
   const headwordInfo = cleanHeadword(row.words);
   ```

2. **混合的释义和例句**

   ```javascript
   const { definition, examples } = parseExamples(row.meanings);
   ```

3. **三级分类**

   ```javascript
   const categories = [row.category_1, row.category_2, row.category_3];
   const categoryPath = categories.filter((c) => c).join(" > ");
   ```

4. **方括号备注**
   ```javascript
   meta: {
     notes: parseNote(row.note);
   }
   ```

## 示例 2：粵典 (words.hk)

参考 `hk-cantowords.js`，它展示了如何处理：

### CSV 格式特点

粵典 CSV 格式特殊，第一行是版权声明（被当作表头），需要预处理：

```javascript
export function preprocessRows(rows) {
  return rows.map((row) => {
    const keys = Object.keys(row);
    const longKey = keys.find((k) => k.length > 100) || keys[2];

    return {
      id: row[""] || "",
      headwords_jyutping: row["_1"] || "",
      content: row[longKey] || "",
      review_status: row["__parsed_extra"]?.[1] || "",
      publish_status: row["__parsed_extra"]?.[2] || "",
    };
  });
}
```

### 核心功能实现

1. **复杂的结构化内容**（包含多种标记）

   内容格式：`(pos:xxx)` `<explanation>` `<eg>` `yue:` `eng:` `----`

   ```javascript
   function parseContent(content) {
     // 按 ---- 分割多个义项
     const senseParts = content.split(/\n?----\n?/).filter((p) => p.trim());

     senseParts.forEach((sensePart) => {
       // 提取词性：(pos:語句)
       const posMatch = sensePart.match(/\(pos:([^)]+)\)/);

       // 分割释义和例句部分
       const parts = sensePart.split(/<eg>/i);
       const explanationPart = parts[0];
       const examplePart = parts[1];

       // 提取 yue: 和 eng: 内容
       const yueMatch = explanationPart.match(/yue:(.+?)(?=\neng:|$)/s);
       const engMatch = explanationPart.match(/eng:(.+?)$/s);
     });
   }
   ```

2. **多个词头变体**（用冒号和逗号分隔）

   格式：`小意思:siu2 ji3 si1,小小意思:siu2 siu2 ji3 si1`

   ```javascript
   function parseHeadwordsWithJyutping(headwordsStr) {
     const variants = [];
     const parts = headwordsStr
       .split(",")
       .map((p) => p.trim())
       .filter((p) => p);

     parts.forEach((part) => {
       const colonIndex = part.indexOf(":");
       if (colonIndex > 0) {
         variants.push({
           headword: part.substring(0, colonIndex).trim(),
           jyutping: part.substring(colonIndex + 1).trim(),
         });
       }
     });
     return variants;
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
   const yueMatch = text.match(/yue:(.+?)(?=\neng:|$)/s);
   const engMatch = text.match(/eng:(.+?)$/s);

   if (yueMatch) {
     sense.definition = yueMatch[1].trim();
     if (engMatch) {
       sense.definition += ` (${engMatch[1].trim()})`;
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

## 示例 3: Wiktionary粤语词条

参考 `wiktionary-cantonese.js`，它展示了如何处理 **JSONL 格式** 数据（而非CSV）：

### 数据格式特点

Wiktionary 数据为 JSONL 格式（每行一个JSON对象），需要使用专门的 `jsonl-to-json.js` 脚本。

```javascript
{
  "word": "book",
  "lang": "Chinese",
  "pos": "verb",
  "sounds": [...],
  "senses": [...],
  "forms": [...],
  "etymology_text": "..."
}
```

### 核心功能实现

1. **筛选粤语词条**

   ```javascript
   function isCantoneseEntry(entry) {
     // 检查sounds中是否有Cantonese标签
     if (entry.sounds && Array.isArray(entry.sounds)) {
       const hasCantoneseSound = entry.sounds.some((sound) =>
         sound.tags?.some((tag) => tag?.toLowerCase().includes("cantonese")),
       );
       if (hasCantoneseSound) return true;
     }
     return false;
   }
   ```

2. **提取粤拼（Jyutping）**

   ```javascript
   function extractJyutping(sounds) {
     const jyutpingSet = new Set();

     sounds.forEach((sound) => {
       if (sound.tags) {
         const hasCantonese = sound.tags.some((tag) =>
           tag?.toLowerCase().includes("cantonese"),
         );
         const hasJyutping = sound.tags.some((tag) =>
           tag?.toLowerCase().includes("jyutping"),
         );

         if (hasCantonese && hasJyutping && sound.zh_pron) {
           // 标准化声调标记：¹²³ → 123
           let normalized = sound.zh_pron.replace(/¹/g, "1").replace(/²/g, "2");
           // ...
           jyutpingSet.add(normalized);
         }
       }
     });

     return Array.from(jyutpingSet);
   }
   ```

3. **提取IPA音标**

   ```javascript
   function extractIPA(sounds) {
     for (const sound of sounds) {
       if (
         sound.tags?.some((tag) => tag?.toLowerCase().includes("cantonese")) &&
         sound.ipa
       ) {
         return sound.ipa;
       }
     }
     return null;
   }
   ```

4. **词性映射（英文→中文）**

   ```javascript
   const POS_MAP = {
     noun: "名词",
     verb: "动词",
     adj: "形容词",
     adv: "副词",
     // ...
   };

   const posChinese = POS_MAP[entry.pos?.toLowerCase()] || entry.pos;
   ```

5. **提取异体字**

   ```javascript
   function extractVariants(forms) {
     const variants = [];
     forms?.forEach((form) => {
       if (form.tags?.includes("alternative")) {
         variants.push(form.form);
       }
     });
     return variants;
   }
   ```

6. **处理标签系统**

   ```javascript
   function extractRegion(tags) {
     for (const tag of tags) {
       const lower = tag?.toLowerCase();
       if (lower?.includes("hong-kong")) return "香港";
       if (lower?.includes("guangzhou")) return "广州";
     }
     return null;
   }

   function extractRegister(tags) {
     for (const tag of tags) {
       const lower = tag?.toLowerCase();
       if (lower?.includes("colloquial")) return "口语";
       if (lower?.includes("slang")) return "俚语";
     }
     return null;
   }
   ```

### 使用说明

```bash
# 完整转换（处理所有词条）
npm run build:data:wiktionary

# 测试模式（只处理前1000条）
npm run build:data:wiktionary:test

# 或完整命令
node scripts/jsonl-to-json.js \
  --dict wiktionary-cantonese \
  --input data/processed/wiktionary_cantonese_entries.jsonl

# 限制处理数量（测试用）
node scripts/jsonl-to-json.js \
  --dict wiktionary-cantonese \
  --input data/processed/wiktionary_cantonese_entries.jsonl \
  --limit 1000
```

### 特殊字段说明

| 字段             | 说明         | 处理方式                    |
| ---------------- | ------------ | --------------------------- |
| `sounds`         | 发音数组     | 筛选Cantonese+Jyutping标签  |
| `ipa`            | IPA音标      | 作为`original`字段展示      |
| `pos`            | 词性（英文） | 映射为中文词性              |
| `forms`          | 词形变化     | 提取alternative标记的异体字 |
| `etymology_text` | 词源         | 保存到meta.etymology        |
| `tags`           | 标签         | 识别地区和语域信息          |
| `senses`         | 释义数组     | 包含glosses、examples等     |

### 注意事项

⚠️ **重要**：Wiktionary数据采用 CC BY-SA 4.0 协议

- 允许自由使用和修改
- 需保留署名：Wiktionary contributors
- 详见：https://creativecommons.org/licenses/by-sa/4.0/

### 数据质量说明

- ✅ 发音准确：Jyutping + IPA双重标注
- ✅ 词源丰富：大量词源信息
- ✅ 标签完善：地区、语域等标签清晰
- ⚠️ 覆盖参差：并非所有词条都有粤语发音
- ⚠️ 需筛选：从大量Chinese词条中筛选粤语相关内容

## 示例 4：广州话俗语词典

参考 `gz-colloquialisms.js`，它展示了如何处理：

1. **歇后语结构**（前后半句用逗号分隔）

   ```javascript
   function detectColloquialismType(phrase) {
     if (phrase.includes("，") || phrase.includes(",")) {
       const parts = phrase.split(/[，,]/);
       if (parts.length === 2 && parts[0].length > 2 && parts[1].length > 2) {
         return "xiehouyu"; // 歇后语
       }
     }
     return "idiom";
   }
   ```

2. **多义项聚合**（按 index 和 sense_number）

   ```javascript
   export function aggregateEntries(entries) {
     // 按 index 分组
     const grouped = new Map();
     entries.forEach((entry) => {
       const index = entry.meta._originalIndex;
       if (!grouped.has(index)) {
         grouped.set(index, []);
       }
       grouped.get(index).push(entry);
     });
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

## 示例 5：廣州方言詞典

参考 `gz-dialect.js`，它展示了如何处理：

### CSV 格式特点

廣州方言詞典是一本综合性方言词典，CSV格式包含校对状态字段：

```csv
index,headword,verified_headword,jyutping,verified_jyutping,definition,page,source_file,verification_status,verification_notes
1,巴閉,,baa1' bai3,,①副詞。表程度加深...,48,...
```

**关键特性**：

- `verified_headword` 和 `verified_jyutping`：如果有内容，说明还在校对中
- 数据处理时需要过滤掉未完成校对的行

### 核心功能实现

1. **过滤未校对数据**

   ```javascript
   function shouldFilterRow(row) {
     // 如果 verified_headword 或 verified_jyutping 有内容，说明还没校对好
     return (
       (row.verified_headword && row.verified_headword.trim() !== "") ||
       (row.verified_jyutping && row.verified_jyutping.trim() !== "")
     );
   }

   export function transformRow(row) {
     if (shouldFilterRow(row)) {
       return null; // 过滤掉
     }
     // ... 继续处理
   }
   ```

2. **解析多义项和例句**

   释义格式：`①副詞。表程度：例句1丨例句2<翻译>`

   ```javascript
   function parseSenses(definition) {
     // 检查是否包含 ① ② ③ 等标记
     const sensePattern = /[①②③④⑤⑥⑦⑧⑨⑩]/g;
     const matches = [...text.matchAll(sensePattern)];

     if (matches.length === 0) {
       // 没有多义项标记，整个作为一个义项
       return parseExamplesInDefinition(text);
     }

     // 有多义项标记，分割处理
     // ...
   }
   ```

3. **提取例句和翻译**

   支持多种格式：
   - `释义：例句1丨例句2`
   - `释义<翻译>`
   - `释义 ‖ 备注`

   ```javascript
   function parseExamplesInDefinition(text) {
     // 先提取备注（‖ 后面的内容）
     const noteMatch = text.match(/\s*‖\s*(.+)$/);

     // 检查是否有例句（用冒号或丨分隔）
     const exampleSplit = mainText.split(/[:：]/);

     if (exampleSplit.length > 1) {
       sense.definition = exampleSplit[0].trim();
       // 解析例句（可能用丨分隔多个例句）
       const exampleParts = exampleText.split(/[丨｜|]/);
       // ...
     }
   }
   ```

4. **忽略特定字段**

   按照要求，以下字段不需要处理：

   ```javascript
   // ❌ 不处理的字段：
   // - source_file
   // - verification_status
   // - verification_notes

   meta: {
     page: row.page || null,
     // 注：source_file, verification_status, verification_notes 字段已省略
   }
   ```

### 使用说明

```bash
# 转换廣州方言詞典数据
node scripts/csv-to-json.js \
  --dict gz-dialect \
  --input data/processed/gz-dialect.csv

# 查看统计信息
# - 会显示被过滤的行数（未校对完成的数据）
# - 会显示转换成功的词条数
```

### 数据质量说明

- ✅ 多义项标记清晰（①②③）
- ✅ 例句和翻译格式规范
- ✅ 备注信息完整（‖ 标记）
- ⚠️ 部分数据仍在校对中（会被自动过滤）
- ⚠️ 页码格式为数字

### 返回格式

```javascript
// transformAll 返回包含过滤统计的对象
{
  entries: [...],        // 成功转换的词条
  errors: [...],         // 错误列表
  filteredCount: 123     // 被过滤的行数（未校对完成）
}
```

### 注意事项

⚠️ **重要**：

- 有 `verified_headword` 或 `verified_jyutping` 的行会被自动过滤
- 这些字段有内容说明数据还在校对中，暂不纳入最终词典
- `source_file`、`verification_status`、`verification_notes` 字段不处理
- 转换完成后会显示过滤掉的行数

### 词典信息

```javascript
export const DICTIONARY_INFO = {
  id: "gz-dialect",
  name: "廣州方言詞典",
  author: "白宛如",
  publisher: "江苏教育出版社",
  year: 1998,
  description: "收录广州话词汇，包含释义、读音、用例等",
};
```

## 示例 6：现代粤语词典

参考 `gz-modern.js`，它展示了如何处理：

### CSV 格式特点

现代粤语词典是一本现代权威粤语词典，CSV格式包含校对状态和API建议字段：

```csv
index,entry_type,headword,pronunciation,jyutping,api_suggestion,verification_status,definition,page,source_file
1,字头,吖,aa1 / aa5,aa1 / aa3,aa1 / aa3 / a1,建議,①表示同意或强调...,138,...
2,词头,吖啶,aa1 ding6,aa1 ding6,aa1 ding6,✓ 匹配,有机化合物...,138,...
```

**关键特性**：

- `pronunciation`：原书拼音标注
- `jyutping`：转换后的粤拼（用于词典展示和搜索优化）
- `verification_status`：校对状态（"✓ 匹配"、"建議"、"⚠️ API未找到，請檢查字頭"）
- 数据处理时只保留 verification_status 为 "✓ 匹配" 的词条

### 核心功能实现

1. **过滤未匹配数据**

   ```javascript
   function shouldFilterRow(row) {
     // 只保留 verification_status 为 "✓ 匹配" 的词条
     return row.verification_status !== "✓ 匹配";
   }

   export function transformRow(row) {
     if (shouldFilterRow(row)) {
       return null; // 过滤掉
     }
     // ... 继续处理
   }
   ```

2. **处理原书拼音和粤拼**

   ```javascript
   // pronunciation 作为 phonetic.original（原书标注）
   // jyutping 作为 phonetic.jyutping（标准粤拼）
   phonetic: {
     original: row.pronunciation || '', // 原书拼音
     jyutping: jyutpingArray // 转换后的粤拼
   }
   ```

3. **解析多义项和例句**

   释义格式：`①表示同意：好～［好的］丨系～［是啊］！`

   ```javascript
   function parseSenses(definition) {
     // 检查是否包含 ① ② ③ 等标记
     const sensePattern = /[①②③④⑤⑥⑦⑧⑨⑩]/g;
     const matches = [...text.matchAll(sensePattern)];

     if (matches.length === 0) {
       // 没有多义项标记，整个作为一个义项
       return parseExamplesInDefinition(text);
     }

     // 有多义项标记，分割处理
     // ...
   }
   ```

4. **提取例句和翻译（方括号格式）**

   支持格式：`释义：例句1［翻译1］丨例句2［翻译2］`

   ```javascript
   function parseExamplesInDefinition(text) {
     // 检查是否有例句（用冒号或丨分隔）
     const exampleSplit = text.split(/[:：]/);

     if (exampleSplit.length > 1) {
       sense.definition = exampleSplit[0].trim();
       // 解析例句（可能用丨分隔多个例句）
       const exampleParts = exampleText.split(/[丨｜|]/);

       exampleParts.forEach((part) => {
         // 检查是否有方括号包裹的翻译（［］）
         const translationMatch = part.match(/［([^］]+)］/);
         if (translationMatch) {
           sense.examples.push({
             text: exampleText,
             translation: translation,
           });
         }
       });
     }
   }
   ```

5. **映射词条类型**

   原书分类映射到标准格式：

   ```javascript
   function mapEntryType(originalType, headword) {
     // "字头" → 'character'
     if (originalType === '字头') {
       return 'character'
     }

     // "词头" → 根据长度判断 'word' 或 'phrase'
     if (originalType === '词头') {
       const length = headword.match(/[\u4e00-\u9fa5]/g)?.length || 0
       if (length <= 4) return 'word'
       return 'phrase'
     }

     // 默认根据长度判断
     // ...
   }

   // 原书分类保存到 meta
   meta: {
     original_entry_type: row.entry_type, // "字头"/"词头"
   }
   ```

6. **忽略特定字段**

   按照要求，以下字段不需要处理：

   ```javascript
   // ❌ 不处理的字段：
   // - api_suggestion (API建议)
   // - verification_status (用于过滤，不存入metadata)
   // - source_file (源文件)

   meta: {
     page: row.page || null,
     // 注：api_suggestion, verification_status, source_file 字段已省略
   }
   ```

### 使用说明

```bash
# 转换现代粤语词典数据
node scripts/csv-to-json.js \
  --dict gz-modern \
  --input data/processed/gz-modern.csv

# 查看统计信息
# - 会显示被过滤的行数（非"✓ 匹配"状态的数据）
# - 会显示转换成功的词条数
```

### 数据质量说明

- ✅ 现代权威词典（2021年版）
- ✅ 多义项标记清晰（①②③）
- ✅ 例句和翻译格式规范（方括号格式）
- ✅ 双重拼音标注（原书拼音 + 标准粤拼）
- ⚠️ 部分数据仍待校对（会被自动过滤）
- ⚠️ 只保留"✓ 匹配"状态的词条

### 返回格式

```javascript
// transformAll 返回包含过滤统计的对象
{
  entries: [...],        // 成功转换的词条
  errors: [...],         // 错误列表
  filteredCount: 123     // 被过滤的行数（非"✓ 匹配"状态）
}
```

### 注意事项

⚠️ **重要**：

- 只保留 verification_status 为 "✓ 匹配" 的词条
- 其他状态（"建議"、"⚠️ API未找到"）的词条会被过滤
- `entry_type` 映射关系：
  - "字头" → `'character'`
  - "词头" (2-4字) → `'word'`
  - "词头" (5字+) → `'phrase'`
  - 原书分类保存到 `meta.original_entry_type`
- `api_suggestion`、`verification_status`、`source_file` 字段不存入metadata
- 转换完成后会显示过滤掉的行数
- 翻译使用方括号［］而非尖括号<>

### 词典信息

```javascript
export const DICTIONARY_INFO = {
  id: "gz-modern",
  name: "现代粤语词典",
  author: "范俊军、范兰德等",
  publisher: "广东人民出版社",
  year: 2021,
  description: "现代权威粤语词典，系统收录广州话词汇",
};
```

## 示例 7：粵語辭源

参考 `gz-word-origins.js`，它展示了如何处理：

### CSV 格式特点

粵語辭源词典的特点是记录词语的来源和演变，CSV格式中同一词条包含多行：

```csv
page,index,verified,entry,gwongping,jyutping,content,proofreaders_note
55_1,0,1,一身蟻,yed1 sen1 ngei5,jat1 san1 ngai5,形容招惹了不少麻煩。（饒秉才等：2020：478）,
55_1,0,1,,,,【源】坐處即所卧，卧處即所坐。三日蝸在殼，～於磨。（清·何紹基《東洲草堂詩鈔》卷二十四葉十二，清同治六至八年長沙無園刻本）,
```

- 第一行包含词条名称、拼音和释义
- 后续行（entry和jyutping为空）包含词源引用【源】和按语【案】

### 核心功能实现

1. **按 page+index 分组**

   同一词条的多行数据需要先分组再处理：

   ```javascript
   function groupByEntry(rows) {
     const grouped = new Map();

     rows.forEach((row) => {
       const key = `${row.page}_${row.index}`;
       if (!grouped.has(key)) {
         grouped.set(key, []);
       }
       grouped.get(key).push(row);
     });

     return grouped;
   }
   ```

2. **解析 content 字段**

   content 字段可能包含释义、词源引用或按语：

   ```javascript
   function parseContent(content) {
     if (content.startsWith("【源】")) {
       // 词源引用行
       const etymologyText = content.replace(/^【源】/, "").trim();
       return {
         definition: "",
         etymology: [etymologyText],
         commentary: null,
       };
     } else if (content.startsWith("案：")) {
       // 按语/说明行
       const commentary = content.replace(/^案：/, "").trim();
       return {
         definition: "",
         etymology: [],
         commentary: commentary,
       };
     } else {
       // 释义行
       return {
         definition: content,
         etymology: [],
         commentary: null,
       };
     }
   }
   ```

3. **解析多义项标记**（①②③格式）

   ```javascript
   function parseSenses(definition) {
     const sensePattern = /[①②③④⑤⑥⑦⑧⑨⑩]/g;
     const matches = [...definition.matchAll(sensePattern)];

     if (matches.length === 0) {
       return [{ definition: definition.trim(), examples: [] }];
     }

     const senses = [];
     for (let i = 0; i < matches.length; i++) {
       const start = matches[i].index + 1;
       const end =
         i < matches.length - 1 ? matches[i + 1].index : definition.length;
       const senseText = definition.substring(start, end).trim();

       if (senseText) {
         senses.push({ definition: senseText, examples: [] });
       }
     }

     return senses;
   }
   ```

4. **处理同形异义词**（如"一味1"、"一味2"）

   ```javascript
   function parseEntryName(entry) {
     // 检查是否有数字后缀
     const match = entry.match(/^(.+?)(\d+)$/);
     if (match) {
       return {
         baseEntry: match[1].trim(),
         variantNumber: parseInt(match[2]),
       };
     }

     return {
       baseEntry: entry.trim(),
       variantNumber: null,
     };
   }

   // 在 aggregateEntries 中聚合同形异义词
   export function aggregateEntries(entries) {
     // 按词头和读音分组
     const grouped = new Map();
     entries.forEach((entry) => {
       const key = `${entry.headword.normalized}_${entry.phonetic.jyutping[0]}`;
       // ... 聚合逻辑
     });
   }
   ```

5. **灵活的必填字段验证**

   因为后续行的entry和jyutping为空，所以只验证核心字段：

   ```javascript
   export const REQUIRED_FIELDS = ["page", "index", "content"];
   // entry 和 jyutping 不是必填，允许词源引用行为空
   ```

### 使用说明

```bash
# 转换粵語辭源数据
node scripts/csv-to-json.js \
  --dict gz-word-origins \
  --input data/processed/gz-word-origins.csv

# 生成的词条包含丰富的词源信息
```

### 数据特点

```javascript
// 典型词条结构
{
  "headword": { "display": "一於" },
  "phonetic": {
    "original": "yed1 yü1",
    "jyutping": ["jat1 jyu1"]
  },
  "senses": [
    { "definition": "堅決。" },
    { "definition": "一定要；怎麼也……。" },
    { "definition": "就……。（饒秉才等：2020：479）" }
  ],
  "meta": {
    "page": "55_1",
    "verified": true,
    "etymology": [
      "賢者或出或處，～爲道而已，豈曰徒名哉？（宋·程珌《洺水集》卷九葉十二，清文淵閣四庫全書本）｜..."
    ],
    "commentary": "古漢語的"一於"，表"只在於"的意義，粵語引申爲"堅決"、"務必"等意義。",
    "gwongping": "yed1 yü1"
  }
}
```

### 注意事项

⚠️ **重要**：

- CSV中同一词条包含多行，需要正确分组
- 词源引用（【源】）和按语（案：）在单独的行中
- 同形异义词（如"一味1"、"一味2"）会被自动聚合
- 保留了广州话拼音方案(gwongping)用于研究对比

### 统计数据

- 总词条数：约 3,950 条
- 包含词源的词条：99.9%（几乎所有词条都有词源引用）
- 包含按语的词条：约 487 条（12%）
- 多义项词条：约 619 条（16%）

## 示例 8：台山話英文字典

参考 `ts-english-dict.js`，用于**台山话—英语网络词典**。

### 词典信息与来源

- **名称**：台山話英文字典 (Taishan English Dictionary)
- **年份**：2024
- **网址**：https://www.chinfamilytree.com/hed/index.htm
- **类型**：网络词典，直接公开在网上
- **版权**：Copyright © 2005-2024 Gene M. Chin
- **协议**：未标明具体协议，使用与再分发时请注明出处并尊重原作者

### CSV 格式特点

```csv
RecordType,DialectTag,号,部,画,繁,简,GPS,Jyutping,汉拼,英译与词句,gps#,Nos.
HEAD,,30,口,8,咑,,ā,aa2,dā,(brief utterance to urge draft animals on) giddyap.⁶,a1,1
PHRASE,,,,,啞巴,哑巴,ā-bä,aa2 baa1,yǎba,"a dumb person, mute.⁵",a1,2
```

- `RecordType`：HEAD（字头/词头）或 PHRASE（词组）
- `繁` / `简`：繁体/简体词头，至少其一有值；无词头的行（如纯例句翻译）会被跳过
- `GPS`：台山话罗马字（原书注音）→ `phonetic.original`
- `Jyutping`：粤拼，支持 " or " 与逗号分隔多读，尾随 `*` 为转换好的变调符号，须保留
- `英译与词句`：英文释义
- `DialectTag`：如「台」表示台山特有，存入 `meta.dialect_tag`

### 核心实现要点

1. **词头**：优先取 `繁`，空则取 `简`；两者皆空则跳过该行。
2. **粤拼解析**：支持 `aa2 len4 or aa2 lieng5`、`aa2 gaau5*` 等；尾随 `*` 为变调符号，保留不去除，解析后去重。
3. **词条类型**：按 `RecordType` 与汉字数量：单字→character，2–4 字→word，PHRASE 或更长→phrase。
4. **元数据**：`record_type`、`dialect_tag`、`radical_no`、`部`、`画`、`mandarin_pinyin`、`gps#`、`Nos.` 等保留在 `meta`。

### 使用说明

```bash
# 转换台山話英文字典
node scripts/csv-to-json.js \
  --dict ts-english-dict \
  --input data/processed/ts-english-dict.csv

# 输出默认到 public/dictionaries/ts-english-dict.json
```

### 注意事项

- 数据来源于网络公开词典，协议不明，仅建议在注明出处、非商业或取得授权的前提下使用。
- 无词头行（繁、简均为空）会在转换时自动跳过并统计数量。

---

## 常见问题

### Q: 如何处理例句中的翻译？

```javascript
import { parseExamples } from "../utils/text-processor.js";

// 自动解析 "例句。（翻译。）" 格式
const { definition, examples } = parseExamples(row.meanings);
```

### Q: 如何处理多音字？

如果一个字有多个读音，分行记录，使用相同的 `id`，在聚合时会自动合并。

### Q: 如何处理参见引用？

在 CSV 中添加 `ref_word` 或 `ref_section` 字段：

```javascript
if (row.ref_word) {
  entry.refs = [
    {
      type: "word",
      target: row.ref_word,
    },
  ];
}
```

### Q: 如何处理开天窗字 □？

`cleanHeadword()` 会自动检测：

```javascript
const headwordInfo = cleanHeadword("□嘢");
// headwordInfo.isPlaceholder === true
```

---

## 可用的工具函数

位于 `scripts/utils/text-processor.js`:

| 函数                      | 用途                         |
| ------------------------- | ---------------------------- |
| `removeTones(jyutping)`   | 去除粤拼声调                 |
| `generateKeywords(entry)` | 生成搜索关键词（不含简繁体） |
| `extractVariants(text)`   | 提取异形词                   |
| `cleanHeadword(word)`     | 清理词头标记                 |
| `parseExamples(meanings)` | 解析例句                     |
| `parseNote(note)`         | 解析备注                     |

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

---

## 大型词典优化：分片加载

对于词条数量超过 10 万的大型词典（如 Wiktionary），生成的 JSON 文件可能超过 100MB，导致：

- ❌ 首次加载慢（需要下载整个大文件）
- ❌ 内存占用大（浏览器需要解析所有数据）
- ❌ 搜索性能差（需要遍历大量数据）

**解决方案**：使用分片加载（Chunked Loading）

### 工作原理

1. **数据分片**：按粤拼首字母将词典分成 20-30 个小文件
2. **按需加载**：搜索时只加载相关的 1-2 个分片（2-8MB）
3. **数据优化**：移除冗余字段，减少文件大小 40-50%
4. **客户端缓存**：已加载的分片会被缓存，避免重复请求

### 效果对比

| 指标       | 优化前     | 优化后   | 改善   |
| ---------- | ---------- | -------- | ------ |
| 文件总大小 | 135 MB     | 66 MB    | ↓ 51%  |
| 首次加载   | 下载 135MB | 0 MB     | ↓ 100% |
| 搜索"book" | 已加载全部 | 下载 4MB | ↓ 97%  |
| 内存占用   | ~200 MB    | ~30 MB   | ↓ 85%  |

### 使用方法

#### Step 1: 在适配器中启用分片

在适配器的 `DICTIONARY_INFO` 中添加：

```javascript
export const DICTIONARY_INFO = {
  id: "my-large-dict",
  name: "我的大型词典",
  // ... 其他字段

  // 启用分片（词条数 > 50000 建议启用）
  enable_chunking: true,
  chunk_output_dir: "my-large-dict", // 分片输出目录名
};
```

#### Step 2: 在适配器中添加分片后处理

在适配器文件末尾添加：

```javascript
/**
 * 后处理：自动分片大型词典
 */
export async function postProcess(entries, outputPath) {
  if (!DICTIONARY_INFO.enable_chunking) {
    return entries; // 不分片，直接返回
  }

  console.log("🔧 检测到大型词典，启用自动分片...");

  // 动态导入分片模块
  const { splitDictionary } = await import("../split-dictionary.cjs");

  // 确定输出目录
  const outputDir = outputPath.replace(/\.json$/, "");
  const chunkDir =
    DICTIONARY_INFO.chunk_output_dir ||
    DICTIONARY_INFO.id.replace(/-cantonese$/, "");

  const finalOutputDir = outputDir + "/" + chunkDir;

  // 执行分片
  await splitDictionary(outputPath, finalOutputDir);

  console.log("✅ 分片完成");
  return entries;
}
```

#### Step 3: 更新前端配置

在 `public/dictionaries/index.json` 中标记为分片词典：

```json
{
  "id": "my-large-dict",
  "name": "我的大型词典",
  "file": "my-large-dict.json",
  "entries_count": 100000,
  "chunked": true,
  "chunk_dir": "my-large-dict",
  ...
}
```

前端会自动识别 `chunked: true` 并按需加载分片。

### 分片策略

**按拼音首字母分片**：

- a-z: 26个基础分片
- other: 特殊字符分片

**数据优化**：

```javascript
// 保留字段（搜索必需）
{
  (id, source_book, headword, phonetic, entry_type, senses, keywords);
}

// 精简 meta（只保留核心）
meta: {
  (pos, register, variants);
}

// 移除字段（非搜索必需）
// ❌ meta.etymology
// ❌ meta.ipa
// ❌ meta.derived
// ❌ meta.related
// ❌ created_at
```

### 分片文件结构

```
public/dictionaries/
├── my-large-dict.json          # 原始完整文件（备份）
└── my-large-dict/              # 分片目录
    ├── manifest.json           # 分片索引
    ├── a.json                  # 首字母 a
    ├── b.json                  # 首字母 b
    ├── c.json                  # 首字母 c
    └── ...                     # 其他分片
```

### 示例：Wiktionary 分片配置

参考 `wiktionary-cantonese.js` 的完整实现：

```javascript
export const DICTIONARY_INFO = {
  id: "wiktionary-cantonese",
  name: "Wiktionary粤语词条",
  // ... 其他字段
  enable_chunking: true,
  chunk_output_dir: "wiktionary",
};

// 聚合后自动分片
export async function postProcess(entries, outputPath) {
  if (!DICTIONARY_INFO.enable_chunking) return entries;

  const path = await import("path");
  const outputDir = path.dirname(outputPath);
  const chunkDir = path.join(outputDir, DICTIONARY_INFO.chunk_output_dir);

  // 导入分片模块
  const splitModule = await import("../split-dictionary.cjs");

  // 执行分片
  await splitModule.splitDictionary(outputPath, chunkDir);

  return entries;
}
```

### 注意事项

1. **保留原始文件**：分片后仍保留完整 JSON 文件作为备份
2. **索引同步**：确保 `index.json` 中正确配置 `chunked` 和 `chunk_dir`
3. **缓存策略**：建议设置 HTTP 缓存头（max-age=86400）
4. **静态部署**：分片方案完全兼容静态部署（Netlify/Vercel）

### 何时使用分片

✅ **建议启用分片**：

- 词条数 > 50,000
- JSON 文件 > 30 MB
- 搜索性能有明显延迟

❌ **不建议分片**：

- 词条数 < 20,000
- JSON 文件 < 10 MB
- 文件已经很小且加载快速

### 性能监控

开发时可以在浏览器控制台查看分片加载情况：

```javascript
// 会看到类似日志：
// ✅ 已加载分片: wiktionary/b.json (6154 条)
// ⏭️ 跳过分片词典: wiktionary-cantonese (按需加载)
```

---

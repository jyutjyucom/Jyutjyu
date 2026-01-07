# Wiktionary Cantonese使用指南

## 概述

本项目已集成 Wiktionary Cantonese数据，为用户提供开源、社区维护的粤语词典内容。

## 数据来源

- **来源**: Wiktionary (维基词典)
- **许可**: CC BY-SA 4.0
- **格式**: JSONL (每行一个JSON对象)
- **语言**: Chinese (筛选包含Cantonese发音的词条)

## 引入的字段

根据 Wiktionary 数据结构分析，我们选择了以下字段：

### 核心字段

| 字段 | 说明 | 示例 |
|------|------|------|
| `word` | 词条本身 | "book", "GDP", "A" |
| `pos` | 词性（英文） | "verb", "noun", "adj" |
| `lang` | 语言 | "Chinese" |
| `lang_code` | 语言代码 | "zh" |

### 发音字段 (`sounds` 数组)

我们筛选包含 **Cantonese** 标签的发音信息：

#### Jyutping（粤拼）
- **筛选条件**: `tags` 包含 `["Cantonese", "Jyutping"]`
- **字段**: `zh_pron`
- **用途**: 主要显示的拼音
- **示例**: "buk¹", "zi¹ di¹ pi¹"

#### IPA（国际音标）
- **筛选条件**: `tags` 包含 `"Cantonese"`，且有 `ipa` 字段
- **字段**: `ipa`
- **用途**: 作为 `phonetic.original` 显示
- **示例**: "/pʊk̚⁵/", "/t͡siː⁵⁵ tiː⁵⁵ pʰiː⁵⁵/"

其他发音方案（Yale、Guangdong-Romanization等）**不引入**，只保留Jyutping和IPA。

### 释义字段 (`senses` 数组)

| 字段 | 说明 | 映射到 |
|------|------|-------|
| `glosses` | 释义数组 | `Sense.definition` (用分号连接) |
| `raw_glosses` | 原始释义（含标签） | 备用字段 |
| `tags` | 标签数组 | 用于提取地区和语域信息 |
| `examples` | 例句数组 | `Sense.examples` |
| `links` | 相关链接 | 不引入（内部链接） |

#### 标签处理

从 `tags` 中提取：
- **地区**: `Hong-Kong` → "香港", `Guangzhou` → "广州"
- **语域**: `colloquial` → "口语", `slang` → "俚语", `formal` → "书面"

### 词形字段 (`forms` 数组)

| 字段 | 说明 | 用途 |
|------|------|------|
| `form` | 词形 | 异体字、变体 |
| `tags` | 标签 | 筛选 `"alternative"` 标记的形式 |

**示例**: "book" 的异体字 "卜"

### 词源字段

| 字段 | 说明 | 映射到 |
|------|------|-------|
| `etymology_text` | 词源说明文本 | `meta.etymology` |
| `etymology_templates` | 词源模板 | 不引入 |

**示例**: "From English book.", "Initialism of English available."

### 相关词汇（可选）

从 `senses[0]` 中提取：

| 字段 | 说明 | 映射到 |
|------|------|-------|
| `derived` | 派生词 | `meta.derived` |
| `related` | 相关词 | `meta.related` |
| `synonyms` | 同义词 | 暂不引入 |
| `antonyms` | 反义词 | 暂不引入 |

### 分类字段（用于研究）

| 字段 | 说明 | 映射到 |
|------|------|-------|
| `categories` | 分类数组 | `meta.categories` (筛选粤语相关) |

筛选包含 "Cantonese" 或 "Hong Kong" 的分类，最多保留5个。

## 数据处理流程

### 1. 筛选粤语词条

只保留符合以下条件之一的词条：
- `sounds` 中有包含 `Cantonese` 标签的发音
- `senses` 中有包含 `Cantonese` 或 `Hong-Kong` 标签的释义

### 2. 提取粤拼

- 筛选 `sounds` 中同时包含 `Cantonese` 和 `Jyutping` 标签的发音
- 标准化声调标记：`¹²³⁴⁵⁶` → `123456`
- 去重后保存到 `phonetic.jyutping` 数组

### 3. 提取IPA

- 查找 `sounds` 中包含 `Cantonese` 标签且有 `ipa` 字段的发音
- 保存到 `phonetic.original`（优先）和 `meta.ipa`（备份）

### 4. 词性映射

将英文词性映射为中文：

```
noun → 名词
verb → 动词
adj/adjective → 形容词
adv/adverb → 副词
pronoun → 代词
classifier → 量词
phrase → 短语
proverb → 谚语
...
```

### 5. 释义处理

- 合并 `glosses` 数组为单个定义（用分号分隔）
- 从 `tags` 提取地区和语域标签作为 `label`
- 提取 `examples` 作为例句

### 6. 去重与聚合

- 按词头 (`headword.normalized`) 分组
- 合并相同词头的多个词条
- 去重释义、粤拼、关键词等

## 使用方法

### 构建词典

```bash
# 完整构建（处理所有词条）
npm run build:data:wiktionary

# 测试模式（只处理前1000条）
npm run build:data:wiktionary:test

# 完整命令
node scripts/jsonl-to-json.js \
  --dict wiktionary-cantonese \
  --input data/processed/wiktionary_cantonese_entries.jsonl
```

### 输出文件

- **位置**: `public/dictionaries/wiktionary-cantonese.json`
- **格式**: JSON数组，每个元素为一个标准化的 `DictionaryEntry`

### 索引更新

构建完成后，词典索引会自动更新：
- `content/dictionaries/index.json`
- `public/dictionaries/index.json`

## 数据示例

### 输入（JSONL）

```json
{
  "word": "book",
  "lang": "Chinese",
  "pos": "verb",
  "sounds": [
    {
      "zh_pron": "buk¹",
      "tags": ["Cantonese", "Jyutping"]
    },
    {
      "ipa": "/pʊk̚⁵/",
      "tags": ["Cantonese", "Sinological-IPA"]
    }
  ],
  "forms": [
    {
      "form": "卜",
      "tags": ["alternative"]
    }
  ],
  "senses": [
    {
      "glosses": ["to book; to reserve"],
      "tags": ["Cantonese", "Hong-Kong", "colloquial"]
    }
  ],
  "etymology_text": "From English book."
}
```

### 输出（标准化）

```json
{
  "id": "wiktionary-cantonese_00000001",
  "source_book": "Wiktionary (Chinese - Cantonese)",
  "dialect": {
    "name": "粤语",
    "region_code": "YUE"
  },
  "headword": {
    "display": "book",
    "search": "book",
    "normalized": "book",
    "is_placeholder": false
  },
  "phonetic": {
    "original": "/pʊk̚⁵/",
    "jyutping": ["buk1"]
  },
  "entry_type": "word",
  "senses": [
    {
      "definition": "to book; to reserve",
      "label": "香港，口语"
    }
  ],
  "meta": {
    "pos": "动词",
    "pos_original": "verb",
    "variants": ["卜"],
    "etymology": "From English book.",
    "ipa": "/pʊk̚⁵/"
  },
  "keywords": ["book", "buk1", "buk", "卜", ...]
}
```

## 数据质量

### 优势

- ✅ **发音准确**: Jyutping + IPA 双重标注
- ✅ **开源免费**: CC BY-SA 4.0 许可
- ✅ **社区维护**: 持续更新，质量有保证
- ✅ **词源丰富**: 大量外来词和新词的词源信息
- ✅ **标签清晰**: 地区、语域等标签完善

### 限制

- ⚠️ **覆盖参差**: 并非所有中文词条都有粤语发音
- ⚠️ **需筛选**: 从大量 Chinese 词条中筛选粤语内容
- ⚠️ **格式复杂**: 数据结构复杂，需要仔细处理

## 许可与署名

### 许可协议

本项目使用的 Wiktionary 数据遵循 **CC BY-SA 4.0** 协议：
- ✅ 允许自由使用和修改
- ✅ 允许商业使用
- ⚠️ 需保留署名
- ⚠️ 派生作品需采用相同协议

### 署名方式

在使用 Wiktionary 数据时，需添加以下署名：

```
数据来源: Wiktionary contributors
许可协议: CC BY-SA 4.0
协议链接: https://creativecommons.org/licenses/by-sa/4.0/
```

## 技术细节

### Adapter 实现

详见 `scripts/adapters/wiktionary-cantonese.js`

关键函数：
- `isCantoneseEntry()` - 判断是否为粤语词条
- `extractJyutping()` - 提取粤拼
- `extractIPA()` - 提取IPA
- `extractVariants()` - 提取异体字
- `processSenses()` - 处理释义
- `transformEntry()` - 转换单个词条
- `aggregateEntries()` - 聚合重复词条

### JSONL 处理脚本

详见 `scripts/jsonl-to-json.js`

特点：
- 使用 `readline` 逐行读取，内存友好
- 支持限制处理数量（用于测试）
- 进度显示（每10000行）
- 错误处理和统计

## 常见问题

### Q: 为什么只用 Jyutping，不用 Yale 等其他拼音？

A: Jyutping 是现代标准粤拼方案，最为广泛使用。其他拼音方案保留在原始数据中，但不展示，以保持一致性。

### Q: IPA 显示在哪里？

A: IPA 作为 `phonetic.original` 字段，在词条页面显示为"原书注音"。

### Q: 如何判断词条质量？

A: 可以查看 `meta.categories`，包含 "Hong Kong Cantonese" 等分类的词条通常质量较高。

### Q: 数据多久更新一次？

A: 可以定期从 Wiktionary 导出数据重新构建。具体更新频率由项目维护者决定。

### Q: 可以只导入特定类型的词条吗？

A: 可以在 `transformEntry()` 中添加额外的筛选条件，例如只保留包含 "Hong-Kong" 标签的词条。

## 参考资料

- [Wiktionary 主页](https://en.wiktionary.org/)
- [CC BY-SA 4.0 协议](https://creativecommons.org/licenses/by-sa/4.0/)
- [Jyutping 方案](https://jyutping.org/)
- [项目数据Schema](DATA_SCHEMA.md)
- [Adapter 开发指南](../scripts/adapters/README.md)


# Wiktionary粤语词条结构说明

## 📋 概览

这个JSONL文件中每一行都是一个独立的JSON对象，代表一个词条。提取出的粤语词条共有 **120,223** 个。

## 🏗️ 词条结构树

```
词条对象 (Entry)
├── word (string)                    # 词条本身，如 "book", "你好"
├── lang (string)                    # 语言："Chinese"
├── lang_code (string)               # 语言代码："zh"
├── pos (string)                     # 词性：noun, verb, adj, adv, character, name, phrase等
│
├── sounds (array)                   # 发音信息数组 ⭐ 粤语核心
│   └── [0..n]
│       ├── zh_pron (string)         # 发音转写，如 "buk¹"
│       ├── tags (array)             # 标签：["Cantonese", "Jyutping"] 等
│       ├── raw_tags (array)         # 附加标签：["Standard-Cantonese", "Hong Kong"]
│       ├── ipa (string)             # 国际音标："/pʊk̚⁵/"
│       └── roman (string)           # 罗马化（可选）
│
├── senses (array)                   # 词义数组 ⭐ 核心释义
│   └── [0..n]
│       ├── glosses (array)          # 简洁释义
│       ├── raw_glosses (array)      # 完整释义（含语境标记）
│       ├── tags (array)             # 适用标签：["Cantonese", "Hong-Kong", "colloquial"]
│       ├── links (array)            # 相关链接
│       ├── topics (array)           # 主题领域：["economics", "sciences"]
│       ├── categories (array)       # 分类信息
│       │   └── [0..n]
│       │       ├── name (string)    # 分类名称
│       │       ├── kind (string)    # 分类类型
│       │       └── source (string)  # 来源
│       ├── examples (array)         # 例句（可选）
│       ├── related (array)          # 相关词
│       ├── derived (array)          # 派生词
│       ├── synonyms (array)         # 同义词
│       └── antonyms (array)         # 反义词
│
├── head_templates (array)           # 词条头部模板
│   └── [0..n]
│       ├── name (string)            # 模板名称
│       ├── args (object)            # 模板参数
│       └── expansion (string)       # 展开后的文本
│
├── forms (array)                    # 词形变化/替代形式
│   └── [0..n]
│       ├── form (string)            # 变化形式，如 "卜"
│       └── tags (array)             # 形式标签：["alternative"]
│
├── etymology_text (string)          # 词源说明
├── etymology_templates (array)      # 词源模板
│   └── [0..n]
│       ├── name (string)            # 模板名称
│       ├── args (object)            # 参数
│       └── expansion (string)       # 展开文本
│
├── etymology_number (int)           # 词源编号（同形异源词）
├── categories (array)               # 顶层分类（可选）
└── id (string)                      # 词条唯一标识符
```

## 📊 三个典型示例

### 示例1: book（来自英语的粤语口语词）

- **词条**: book
- **词性**: verb（动词）
- **粤拼**: buk¹
- **IPA**: /pʊk̚⁵/
- **释义**: to book; to reserve（预定）
- **标签**: Hong Kong Cantonese, colloquial
- **词源**: From English book
- **替代写法**: 卜

### 示例2: GDP（国际缩写词）

- **词条**: GDP
- **词性**: noun（名词）
- **粤拼**: zi¹ di¹ pi¹
- **IPA**: /t͡siː⁵⁵ tiː⁵⁵ pʰiː⁵⁵/
- **释义**: GDP ("gross domestic product")
- **领域**: economics
- **词源**: Borrowed from English GDP
- **注**: 同时包含普通话发音

### 示例3: A（网络俚语）

- **词条**: A
- **词性**: adj（形容词）
- **粤拼**: ei¹
- **IPA**: /ei̯⁵⁵/
- **释义**: single, open to a relationship（单身可恋爱）
- **标签**: Hong Kong Cantonese, slang
- **词源**: Initialism of English available
- **派生词**: A0, A380

## 🔍 如何识别粤语内容

脚本通过检查以下字段来识别粤语词条：

1. **sounds数组中的tags**: 包含 "Cantonese" 或 "Jyutping"
2. **sounds数组中的raw_tags**: 包含 "Cantonese" 相关标记
3. **senses数组中的tags**: 包含 "Cantonese" 标签
4. **senses中的raw_glosses**: 提到 "Cantonese"
5. **categories**: 分类名称包含 "Cantonese"

## 📈 统计数据

| 指标                | 数值             |
| ------------------- | ---------------- |
| 总词条数            | 120,223          |
| 包含粤拼 (Jyutping) | 119,780 (99.63%) |
| 包含IPA音标         | 119,998 (99.81%) |
| 最常见词性          | noun (41.21%)    |
| 平均词长            | 2.31字符         |
| 来自英语词源        | 2,517词          |

## 🎯 常用字段速查

### 获取粤语拼音（Jyutping）

```python
for sound in entry['sounds']:
    if 'Jyutping' in sound.get('tags', []):
        jyutping = sound['zh_pron']
        break
```

### 获取粤语IPA

```python
for sound in entry['sounds']:
    if 'Cantonese' in sound.get('tags', []) and 'ipa' in sound:
        ipa = sound['ipa']
        break
```

### 获取词义

```python
for sense in entry.get('senses', []):
    if 'Cantonese' in sense.get('tags', []):
        meaning = sense['glosses'][0]
```

### 判断是否为香港粤语特有词

```python
is_hk_cantonese = any(
    'Hong-Kong' in sense.get('tags', []) or
    'Hong Kong' in sense.get('raw_tags', [])
    for sense in entry.get('senses', [])
)
```

## 🛠️ 相关脚本

1. **extract_cantonese.py** - 提取粤语词条
2. **analyze_cantonese.py** - 统计分析
3. **show_structure.py** - 展示词条结构

## 📝 注意事项

- 同一个词可能有多个sense（词义），每个sense可能属于不同方言
- sounds数组通常同时包含多种罗马化方案（Jyutping、Yale、Pinyin等）
- 有些词条既有普通话发音也有粤语发音
- etymology_number用于区分同形异源的词（如"A"有多个不同来源的义项）

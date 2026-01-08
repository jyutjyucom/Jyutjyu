# Wiktionary Cantonese 使用指南

## 概述

本项目已集成 Wiktionary Cantonese 数据（约12万词条），提供开源、社区维护的粤语词典内容。

**数据来源**: [Kaikki.org](https://kaikki.org/dictionary/Chinese/) | **许可**: CC BY-SA 4.0

## 数据获取流程

### 为什么需要手动获取？

Wiktionary 原始数据约 **1.1GB**（包含所有中文方言），不适合放入 Git 仓库。本项目提供筛选脚本，帮你从中提取粤语词条（约200MB）。

### 操作步骤

**1. 下载原始数据**

访问 https://kaikki.org/dictionary/Chinese/，下载 `kaikki.org-dictionary-Chinese.jsonl`

**2. 提取粤语词条**

```bash
cd scripts/preprocess/wiktionary/
# 将下载的文件放在此目录
python3 extract_cantonese.py
```

输出：`wiktionary_cantonese_entries.jsonl` (约200MB, 12万+词条)

**3. 移动到数据目录**

```bash
mv wiktionary_cantonese_entries.jsonl ../../../data/processed/
```

**4. 转换为项目格式**

```bash
cd ../../..
npm run build:data:wiktionary  # 完整版
# npm run build:data:wiktionary:test  # 测试版（1000条）
```

生成：`public/dictionaries/wiktionary/*.json`

---

## 数据结构与字段映射

### 核心字段

| Wiktionary 字段 | 项目字段 | 说明 |
|----------------|---------|------|
| `word` | `headword` | 词条本身 |
| `pos` | `meta.pos` | 词性（映射为中文） |
| `sounds[].zh_pron` | `phonetic.jyutping` | 粤拼（筛选 Jyutping 标签） |
| `sounds[].ipa` | `phonetic.original` | IPA音标 |
| `senses[].glosses` | `senses[].definition` | 释义 |
| `senses[].tags` | `senses[].label` | 地区/语域标签 |
| `forms[]` | `meta.variants` | 异体字 |
| `etymology_text` | `meta.etymology` | 词源 |

### 筛选条件

保留包含以下任一特征的词条：
- `sounds` 中有 `Cantonese`/`Jyutping` 标签
- `senses` 中有 `Cantonese`/`Hong-Kong` 标签
- 释义或分类中提到 "Cantonese"

### 词性映射

```
noun → 名词 | verb → 动词 | adj → 形容词 | adv → 副词
phrase → 短语 | proverb → 谚语 | classifier → 量词
```

完整映射见 `scripts/adapters/wiktionary-cantonese.js`

---

## 数据示例

### 输入 (JSONL)

```json
{
  "word": "book",
  "pos": "verb",
  "sounds": [
    {"zh_pron": "buk¹", "tags": ["Cantonese", "Jyutping"]},
    {"ipa": "/pʊk̚⁵/", "tags": ["Cantonese"]}
  ],
  "forms": [{"form": "卜", "tags": ["alternative"]}],
  "senses": [{
    "glosses": ["to book; to reserve"],
    "tags": ["Cantonese", "Hong-Kong", "colloquial"]
  }],
  "etymology_text": "From English book."
}
```

### 输出 (标准化)

```json
{
  "id": "wiktionary-cantonese_00000001",
  "headword": {"display": "book", "normalized": "book"},
  "phonetic": {"original": "/pʊk̚⁵/", "jyutping": ["buk1"]},
  "senses": [{
    "definition": "to book; to reserve",
    "label": "香港，口语"
  }],
  "meta": {
    "pos": "动词",
    "variants": ["卜"],
    "etymology": "From English book."
  }
}
```

---

## 技术细节

### 相关脚本

| 脚本 | 功能 |
|------|------|
| `scripts/preprocess/wiktionary/extract_cantonese.py` | 筛选粤语词条 |
| `scripts/adapters/wiktionary-cantonese.js` | 字段转换适配器 |
| `scripts/jsonl-to-json.js` | JSONL → JSON 处理 |
| `scripts/split-dictionary.cjs` | 按首字母分割 |

### 关键函数（adapter）

- `isCantoneseEntry()` - 判断是否为粤语词条
- `extractJyutping()` - 提取粤拼（标准化声调）
- `extractIPA()` - 提取IPA音标
- `processSenses()` - 处理释义和标签
- `aggregateEntries()` - 聚合重复词条

---

## 常见问题

**Q: 可以使用其他版本的数据吗？**  
A: 可以。Kaikki.org 定期更新，数据格式基本稳定。

**Q: 提取需要多长时间？**  
A: 提取约5-15分钟，转换约2-5分钟（取决于机器性能）。

**Q: 只想测试部分数据？**  
A: 使用 `npm run build:data:wiktionary:test` 只处理前1000条。

**Q: 如何更新数据？**  
A: 重新下载最新数据，重新运行筛选和转换脚本即可。

---

## 许可与署名

Wiktionary 数据遵循 **CC BY-SA 4.0** 协议：
- ✅ 允许自由使用和商业使用
- ⚠️ 需保留署名和相同协议

**署名格式**:
```
数据来源: Wiktionary contributors
许可协议: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)
```

---

## 参考资料

- [Kaikki.org 官网](https://kaikki.org/)
- [Wiktextract (数据导出工具)](https://github.com/tatuylonen/wiktextract)
- [词条结构说明](../scripts/preprocess/wiktionary/entry_structure.md)
- [项目数据 Schema](DATA_SCHEMA.md)
- [适配器开发指南](../scripts/adapters/README.md)

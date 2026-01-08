# Wiktionary 数据预处理

从 Wiktionary 中文词条提取粤语内容的脚本。

## 快速开始

```bash
# 1. 下载数据
# 访问 https://kaikki.org/dictionary/Chinese/
# 下载 kaikki.org-dictionary-Chinese.jsonl (1.1GB) 到此目录

# 2. 提取粤语词条
python3 extract_cantonese.py

# 3. 移动到数据目录
mv wiktionary_cantonese_entries.jsonl ../../../data/processed/

# 4. 转换为项目格式
cd ../../..
npm run build:data:wiktionary
```

## 脚本说明

- **extract_cantonese.py** - 筛选粤语词条（必需）
- **analyze_cantonese.py** - 统计分析（可选）
- **show_structure.py** - 查看结构（可选）
- **entry_structure.md** - 字段参考

## 文档

详细说明见 [Wiktionary 使用指南](../../../docs/WIKTIONARY_GUIDE.md)

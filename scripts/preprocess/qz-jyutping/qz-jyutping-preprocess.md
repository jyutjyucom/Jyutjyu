# HamZau_JyutPing 词典预处理脚本

## 概述

此脚本用于将 HamZau_JyutPing（欽拼）Rime 词典格式转换为项目标准的 CSV 格式。

**数据来源**: [HamZau_JyutPing](https://github.com/LaiJoengzit/hamzau_jyutping)  
**许可证**: GPL-3.0  
**输入格式**: Rime 词典 YAML 格式 (`.dict.yaml`)  
**输出格式**: CSV 格式 (`qz-jyutping.csv`)

## 使用方法

### 基本用法

```bash
node scripts/preprocess/hamzau-jyutping.js
```

使用默认路径：

- 输入: `data/raw/hamzau_jyutping.dict.yaml`
- 输出: `data/processed/qz-jyutping.csv`

### 自定义路径

```bash
node scripts/preprocess/hamzau-jyutping.js [input.yaml] [output.csv]
```

示例：

```bash
node scripts/preprocess/hamzau-jyutping.js \
  data/raw/hamzau_jyutping.dict.yaml \
  data/processed/qz-jyutping.csv
```

## 输入格式说明

Rime 词典格式：

- 前 14 行为 YAML 元数据（以 `---` 开始，以 `...` 结束）
- 从第 16 行开始为实际数据，格式：`词头\t拼音\t权重（可选）`

示例：

```
𢶹	am4
𣍐	mui3
噶	ga3
一把柴	aa1 baa2 caai4
一癲你去搬磚	aa1 din1 ni2 hi3 bun1 zin1
```

## 输出格式说明

CSV 文件包含以下列：

| 列名         | 说明                 | 示例                            |
| ------------ | -------------------- | ------------------------------- |
| `index`      | 行号索引（从1开始）  | `1`                             |
| `entry_type` | 词条类型             | `character` / `word` / `phrase` |
| `headword`   | 词头                 | `𢶹`                            |
| `jyutping`   | 粤拼（空格分隔音节） | `am4`                           |
| `definition` | 释义                 | `未有內容 NO DATA`（默认值）    |

**注意**: 由于这是拼音词典，不包含释义内容，所有词条的 `definition` 字段默认设置为 `未有內容 NO DATA`。

### 词条类型判断规则

- **character** (单字): 1 个字符
- **word** (词语): 2-4 个字符
- **phrase** (短语): 5 个字符及以上

## 处理统计

脚本运行后会显示：

- 总词条数
- 各类型词条数量统计

示例输出：

```
📖 HamZau_JyutPing 词典预处理脚本
   输入文件: /path/to/hamzau_jyutping.dict.yaml
   输出文件: /path/to/qz-jyutping.csv

⏳ 解析 Rime 词典文件...
✅ 解析完成: 13915 个词条

📊 词条类型统计:
   单字 (character): 9026
   词语 (word): 4770
   短语 (phrase): 119

⏳ 生成 CSV 文件...
✅ CSV 文件已生成: /path/to/qz-jyutping.csv
   总词条数: 13915

✅ 预处理完成！
```

## 注意事项

1. **Unicode 字符处理**: 脚本使用 `Array.from()` 正确处理 Unicode 扩展字符（如 CJK 扩展字符），确保单字被正确识别。

2. **CSV 转义**: 脚本会自动处理包含逗号、引号或换行符的字段值。

3. **空值处理**: 如果词头或拼音为空，该行会被跳过。

4. **权重信息**: 原始数据中的权重信息会被保留在内存中，但不会写入 CSV（因为标准 CSV 格式不包含此字段）。

## 后续步骤

预处理完成后，可以使用项目的标准转换流程：

```bash
# 验证 CSV 文件
npm run validate -- data/processed/qz-jyutping.csv

# 转换为 JSON 格式（需要先创建适配器）
# node scripts/csv-to-json.js --dict qz-jyutping --input data/processed/qz-jyutping.csv
```

## 数据来源与许可

**数据来源**: [HamZau_JyutPing](https://github.com/LaiJoengzit/hamzau_jyutping)  
**许可证**: GPL-3.0

本项目使用的 HamZau_JyutPing（欽拼）词典数据来自上述 GitHub 仓库，遵循 GPL-3.0 许可证。使用本数据时请遵守相应的许可证要求。

## 相关文件

- 输入文件: `data/raw/hamzau_jyutping.dict.yaml`
- 输出文件: `data/processed/qz-jyutping.csv`
- 脚本文件: `scripts/preprocess/hamzau-jyutping.js`

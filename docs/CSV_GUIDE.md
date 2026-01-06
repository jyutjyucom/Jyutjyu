# CSV 录入规范 CSV Entry Guidelines

## 1. 概述

本文档为数据录入人员提供详细的 CSV 格式规范，确保数据一致性和后续构建的顺利进行。

### 重要原则

1. **保留原貌**: 原书写法在 `headword_display` 中如实记录
2. **标准化**: 推荐写法在 `headword_normalized` 中规范记录
3. **一行一义**: 每个释义单独一行（便于后续聚合）
4. **使用分隔符**: 多个例句用 `|` 分隔，不要换行
5. **UTF-8 编码**: 必须使用 UTF-8 编码保存 CSV

---

## 2. 必填字段说明

### 2.1 基础结构字段

| 列名 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `id` | 否* | 行唯一标识（用于多义项聚合） | `GZ001` |
| `parent_id` | 否 | 父条目ID（用于字词关系） | `GZ001` |
| `headword_display` | **是** | 原书词头（包括括号等） | `阿（亚）SIR` |
| `headword_normalized` | **是** | 推荐标准写法 | `阿Sir` |
| `jyutping` | **是** | 粤拼（空格分隔音节） | `aa3 soe4` |
| `original_romanization` | 否 | 原书注音（如不同于粤拼） | `aa sir` (耶鲁) |
| `entry_type` | **是** | 词条类型 | `word` |
| `definition` | **是** | 释义 | `警察` |

**\*注**: 如果有多义项需要聚合，`id` 必填。

### 2.2 内容字段

| 列名 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `label` | 否 | 词性/分类标签 | `[名词]` 或 `[形]` |
| `examples` | 否 | 例句/组词（`\|` 分隔） | `阿Sir早晨\|差佬阿Sir` |
| `example_jyutping` | 否 | 例句拼音（`\|` 分隔，与例句对应） | `aa3 soe4 zou2 san4\|caai1 lou2 aa3 soe4` |
| `example_translation` | 否 | 例句翻译（`\|` 分隔） | `警察早上好\|警察` |

### 2.3 参见字段

| 列名 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `ref_word` | 否 | 参见其他词条（站内链接） | `臊虾仔` 或 `飞发,飞机` (逗号分隔多个) |
| `ref_section` | 否 | 参见书中章节 | `二C2` 或 `第123页` |

### 2.4 词典特有字段

| 列名 | 适用词典 | 说明 | 示例 |
|------|----------|------|------|
| `category` | 分类词典 | 分类路径（`>` 分隔层级） | `职业 > 公务人员` |
| `usage` | 俗语词典 | 用法说明 | `贬义，多用于批评` |
| `etymology` | 词源词典 | 词源考证 | `源自英语 sir` |
| `register` | 所有 | 语域 | `口语` / `书面` / `粗俗` |
| `notes` | 所有 | 备注 | `有音无字，异体写法：乜嘢` |

---

## 3. 字段详细说明

### 3.1 词头处理 (`headword_display` & `headword_normalized`)

#### 场景 1: 括号异形词

**原书**: 阿（亚）SIR  
**录入**:
- `headword_display`: `阿（亚）SIR`
- `headword_normalized`: `阿Sir` （选择常用写法）

**说明**: 构建脚本会自动提取括号内外的变体用于搜索。

#### 场景 2: 开天窗字 □

**原书**: □嘢 (mat1 je5)  
**录入**:
- `headword_display`: `□嘢`
- `headword_normalized`: `□嘢` （保持不变）
- `notes`: `有音无字，常见异形词写法：乜嘢、咩嘢`

**说明**: 系统会自动检测 □ 并标记 `is_placeholder: true`。

#### 场景 3: 多个写法并列

**原书**: 冇 / 无  
**录入**:
- `headword_display`: `冇/无`
- `headword_normalized`: `冇` （选粤语常用字）

### 3.2 粤拼 (`jyutping`)

#### 格式要求

- **音节用空格分隔**: `aa3 soe4` ✅，`aa3soe4` ❌
- **声调必须标注**: `aa3` ✅，`aa` ❌
- **多音字用逗号**: 如果一个词有多种读音，在不同行记录（见多义项处理）

#### 示例

| 词 | 粤拼 | 说明 |
|----|------|------|
| 飞 | `fei1` | 单音节 |
| 阿Sir | `aa3 soe4` | 双音节，空格分隔 |
| 广州话 | `gwong2 zau1 waa2` | 三音节 |

### 3.3 词条类型 (`entry_type`)

| 值 | 说明 | 示例 |
|----|------|------|
| `character` | 单字 | 飞、人、食 |
| `word` | 词语（双字及以上） | 阿Sir、广州话 |
| `phrase` | 短语/俗语 | 阿茂整饼、有钱使得鬼推磨 |

**选择标准**:
- 字典体例：字头用 `character`，字头下的词用 `word`
- 俗语词典：一律用 `phrase`

### 3.4 例句 (`examples`)

#### 格式

- **分隔符**: 用 `|` 分隔多个例句
- **换行**: 不要在 CSV 单元格内换行（会破坏格式）
- **标点**: 保留原书标点

#### 示例

```csv
examples,example_jyutping,example_translation
阿Sir早晨|差佬阿Sir|问阿Sir,aa3 soe4 zou2 san4|caai1 lou2 aa3 soe4|man6 aa3 soe4,警察早上好|警察|问警察
```

**说明**: 如果没有拼音或翻译，留空即可（但分隔符 `|` 要对应）:

```csv
examples,example_jyutping
阿Sir早晨|差佬阿Sir,|
```

### 3.5 参见处理 (`ref_word` & `ref_section`)

#### 参见词条 (`ref_word`)

**原书**: [参见"臊虾仔"]  
**录入**: `ref_word` = `臊虾仔`

**多个参见**: `ref_word` = `飞发,飞机,飞快` （逗号分隔，无空格）

#### 参见章节 (`ref_section`)

**原书**: [重见二C2] 或 [见第123页]  
**录入**: `ref_section` = `二C2` 或 `第123页`

**说明**: 章节参见不会生成站内链接，仅作提示显示。

---

## 4. 多行聚合规则

### 4.1 多义项聚合（同词头同拼音）

如果一个词有多个释义，**分行记录**，但保持 `id` / `headword` / `jyutping` 相同。

#### CSV 示例

```csv
id,headword_display,headword_normalized,jyutping,entry_type,definition,label,examples
GZ001,飞,飞,fei1,character,鸟虫用翼在空中活动,[动],雀仔飞咗去|飞机
GZ001,飞,飞,fei1,character,形容快速,[形],飞快|健步如飞
GZ001,飞,飞,fei1,character,消失走掉,[动],佢飞咗去边
```

#### 转换后 JSON

```json
{
  "id": "GZ001",
  "headword": { "display": "飞", "normalized": "飞" },
  "phonetic": { "jyutping": ["fei1"] },
  "senses": [
    {
      "definition": "鸟虫用翼在空中活动",
      "label": "[动]",
      "examples": [...]
    },
    {
      "definition": "形容快速",
      "label": "[形]",
      "examples": [...]
    },
    {
      "definition": "消失走掉",
      "label": "[动]",
      "examples": [...]
    }
  ]
}
```

### 4.2 字词关系（字头-词条）

《现代汉语词典》体例：字头下收录词条。

#### CSV 示例

```csv
id,parent_id,headword_display,headword_normalized,jyutping,entry_type,definition
GZ001,,飞,飞,fei1,character,鸟虫用翼在空中活动
GZ002,GZ001,飞发,飞发,fei1 faat3,word,理发
GZ003,GZ001,飞机,飞机,fei1 gei1,word,飞行器
```

#### 展示效果

```
【字】飞 (fei1)
  1. [动] 鸟虫用翼在空中活动
  
  下属词条:
  → 飞发 (fei1 faat3): 理发
  → 飞机 (fei1 gei1): 飞行器
```

---

## 5. 特殊情况处理

### 5.1 原书无拼音

**情况**: 旧书可能只有汉字，无标音。  
**处理**: 
1. 录入人员查询 [粤音资料集成](https://jyut.net) 或 [粤典](https://words.hk) 补充
2. `original_romanization` 留空
3. `jyutping` 必填（标注来源）

**示例**:
```csv
headword_display,jyutping,original_romanization,notes
阿Sir,aa3 soe4,,粤拼由录入者补充（参考粤典）
```

### 5.2 多音字

**情况**: 同一个词在不同语境有不同读音。  
**处理**: 
1. 分行记录不同读音
2. 在 `definition` 中注明读音差异

**示例**:
```csv
id,headword_display,jyutping,definition,label
GZ100,行,haang4,走路,[动]
GZ101,行,hong4,可以、行业,[动/名]
```

### 5.3 原书有误

**情况**: 原书拼音或汉字明显错误。  
**处理**:
1. `headword_display` 保留原书（尊重原著）
2. `headword_normalized` 写正确写法
3. `notes` 栏注明: `原书作"xxx"，疑误`

**示例**:
```csv
headword_display,headword_normalized,jyutping,notes
阿Ser,阿Sir,aa3 soe4,原书作"阿Ser"，应为"Sir"
```

---

## 6. 工具与辅助

### 6.1 推荐工具

- **Excel / Google Sheets**: 编辑 CSV
- **VS Code + CSV 插件**: `Rainbow CSV` 扩展（彩色显示列）
- **粤音查询**: [jyut.net](https://jyut.net) / [words.hk](https://words.hk)
- **粤拼输入法**: [RIME 方案](https://github.com/rime/rime-cantonese)

### 6.2 CSV 模板

下载空白模板: [`data/templates/entry-template.csv`](../data/templates/entry-template.csv)

### 6.3 验证脚本

录入完成后运行验证:

```bash
pnpm run validate -- data/processed/your-file.csv
```

会检查:
- ✅ 必填字段完整性
- ✅ 粤拼格式正确性
- ✅ 参见引用完整性
- ✅ UTF-8 编码

---

## 7. 常见错误与解决

### 错误 1: CSV 列数不一致

**现象**: 部分行列数比表头少或多  
**原因**: 单元格内有未转义的逗号或换行  
**解决**: 
- 确保特殊内容用双引号包裹: `"阿Sir说：""早晨"""`
- 不要在单元格内按 Enter 换行

### 错误 2: 乱码

**现象**: 中文显示为 ???  
**原因**: 文件编码非 UTF-8  
**解决**: 
- Excel: 另存为 → 选择 "CSV UTF-8 (逗号分隔)"
- VS Code: 右下角选择编码 → 保存为 UTF-8

### 错误 3: 粤拼验证失败

**现象**: `Invalid jyutping: aa soe4`  
**原因**: 缺少声调数字  
**解决**: `aa3 soe4` ✅

### 错误 4: 例句分隔符错误

**现象**: 例句全部挤在一起  
**原因**: 用了中文竖线 `｜` 或其他符号  
**解决**: 必须用半角竖线 `|` (Shift + \)

---

## 8. 提交流程

### 步骤 1: 自查

- [ ] 所有行的必填字段已填写
- [ ] 粤拼格式正确（空格、声调）
- [ ] 文件编码为 UTF-8
- [ ] 运行验证脚本无错误

### 步骤 2: 提交 PR

1. Fork 仓库
2. 将 CSV 放入 `data/processed/`
3. 提交 PR，标题格式: `[Data] 添加《xxx词典》数据`
4. PR 描述中说明:
   - 词典来源
   - 总条目数
   - 校对人员

### 步骤 3: Review

维护者会检查:
- 数据格式规范性
- 内容准确性（抽查）
- 版权合规性

---

## 9. 附录: 完整示例行

```csv
id,parent_id,headword_display,headword_normalized,jyutping,original_romanization,entry_type,definition,label,examples,example_jyutping,ref_word,ref_section,category,usage,etymology,register,notes
GZ042,,阿Sir,阿Sir,aa3 soe4,aa sir,word,警察,[名],阿Sir早晨|差佬阿Sir,aa3 soe4 zou2 san4|caai1 lou2 aa3 soe4,,,职业称谓 > 公务人员,,,口语,源自英语 sir
```

---

## 10. 版本历史

- **v1.0** (2025-12-31): 初始版本

---

**有疑问？** 请在 [GitHub Discussions](https://github.com/jyutjyucom/jyutjyu/discussions) 提问。  
**发现规范问题？** 欢迎提 [Issue](https://github.com/jyutjyucom/jyutjyu/issues)。


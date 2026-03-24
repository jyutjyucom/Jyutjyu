# 分片功能测试指南

## 功能说明

Wiktionary 适配器现在支持自动分片，在数据生成完成后会自动将大文件分成多个小文件，优化前端加载性能。

## 配置状态

✅ 适配器配置完成：

- `enable_chunking: true` - 启用自动分片
- `chunk_output_dir: 'wiktionary'` - 分片输出目录
- `postProcess()` 函数 - 自动执行分片

## 使用方法

### 完整数据生成（包含自动分片）

```bash
# 方式1: 使用 npm 脚本（推荐）
npm run build:data:wiktionary

# 方式2: 直接运行脚本
node scripts/jsonl-to-json.js \
  --dict wiktionary-cantonese \
  --input data/processed/wiktionary_cantonese_entries.jsonl
```

### 流程说明

1. **读取 JSONL 数据** - 加载原始 Wiktionary 词条
2. **转换格式** - 使用适配器转换为标准格式
3. **聚合词条** - 合并重复词条和多义项
4. **写入 JSON** - 生成完整的 JSON 文件
5. **更新索引** - 更新 `index.json`，添加 `chunked: true` 配置
6. **🆕 自动分片** - 调用 `postProcess()` 执行分片
   - 按拼音首字母分片（a-z + other）
   - 优化数据结构，移除冗余字段
   - 生成 `manifest.json` 索引
   - 减少文件大小 50%+

### 预期输出

```
public/dictionaries/
├── wiktionary-cantonese.json          # 完整文件（135 MB，备份用）
└── wiktionary/                        # 分片目录
    ├── manifest.json                  # 分片索引
    ├── a.json                         # 978 条 (0.62 MB)
    ├── b.json                         # 6,154 条 (4.01 MB)
    ├── c.json                         # 7,312 条 (4.73 MB)
    └── ...                            # 共 22 个分片
```

## 测试建议

### 1. 小数据集测试（快速验证）

```bash
# 只处理前 1000 条数据
node scripts/jsonl-to-json.js \
  --dict wiktionary-cantonese \
  --input data/processed/wiktionary_cantonese_entries.jsonl \
  --limit 1000
```

预期输出：

- ✅ 生成完整 JSON 文件
- ✅ 自动执行分片
- ✅ 生成 2-5 个分片文件
- ✅ 生成 manifest.json

### 2. 验证分片完整性

```bash
# 检查分片目录
ls -lh public/dictionaries/wiktionary/

# 查看 manifest
cat public/dictionaries/wiktionary/manifest.json | head -20

# 检查分片数量
ls public/dictionaries/wiktionary/*.json | wc -l
```

检查项：

- ✅ 分片文件存在（20-30 个 .json 文件）
- ✅ manifest.json 存在
- ✅ 各分片文件大小合理（0.5-8 MB）
- ✅ 总大小约为原文件的 50%

### 3. 前端功能测试

1. 启动开发服务器（如果未运行）：

   ```bash
   npm run dev
   ```

2. 打开浏览器访问：http://localhost:3000/search

3. 打开浏览器开发者工具 → Network 标签

4. 搜索测试词语：
   - `book` → 应只加载 `b.json` (~4MB)
   - `nei5` → 应只加载 `n.json` (~2.5MB)
   - `你好` → 应只加载 `n.json` (~2.5MB)

5. 验证日志：
   - 控制台应显示：`✅ 已加载分片: wiktionary/x.json`
   - 不应加载 `wiktionary-cantonese.json`（135MB）

## 性能对比

| 场景        | 优化前     | 优化后     | 改善   |
| ----------- | ---------- | ---------- | ------ |
| 首次访问    | 下载 135MB | 0 MB       | ↓ 100% |
| 搜索 "book" | 已加载     | 下载 4MB   | ↓ 97%  |
| 搜索 "nei5" | 已加载     | 下载 2.5MB | ↓ 98%  |
| 内存占用    | ~200 MB    | ~30 MB     | ↓ 85%  |

## 故障排除

### 问题：分片未自动执行

**症状**：

- 只生成了 `wiktionary-cantonese.json`
- 没有生成 `wiktionary/` 目录

**检查**：

```bash
# 1. 确认配置正确
node -e "import('./scripts/adapters/wiktionary-cantonese.js').then(m => console.log(m.DICTIONARY_INFO.enable_chunking))"

# 2. 查看日志是否有错误提示
```

### 问题：前端未使用分片

**症状**：

- 浏览器仍然下载 `wiktionary-cantonese.json`

**检查**：

```bash
# 1. 确认索引文件配置正确
cat public/dictionaries/index.json | grep -A 5 wiktionary

# 应包含:
# "chunked": true,
# "chunk_dir": "wiktionary"
```

### 问题：分片文件缺失

**症状**：

- 搜索某些词语失败
- 控制台报 404 错误

**解决**：

```bash
# 重新运行分片脚本
node scripts/split-dictionary.cjs \
  public/dictionaries/wiktionary-cantonese.json \
  public/dictionaries/wiktionary
```

## 禁用自动分片

如果需要禁用自动分片（例如用于调试）：

```javascript
// scripts/adapters/wiktionary-cantonese.js
export const DICTIONARY_INFO = {
  // ...
  enable_chunking: false, // 改为 false
  // ...
};
```

## 手动分片

如果需要手动重新分片现有的 JSON 文件：

```bash
node scripts/split-dictionary.cjs \
  public/dictionaries/wiktionary-cantonese.json \
  public/dictionaries/wiktionary
```

## 更多信息

- 详细文档：查看 `scripts/adapters/README.md` 中的"大型词典优化：分片加载"章节
- 适配器源码：`scripts/adapters/wiktionary-cantonese.js`
- 分片脚本：`scripts/split-dictionary.cjs`
- 前端实现：`composables/useDictionary.ts`

# 贡献指南 Contributing Guide

感谢你对**粤语辞丛**项目的关注！本项目是一个开源的粤语词典聚合平台，我们欢迎各种形式的贡献。

## 📋 目录

1. [贡献方式](#贡献方式)
2. [数据贡献](#数据贡献)
3. [代码贡献](#代码贡献)
4. [问题反馈](#问题反馈)
5. [开发指南](#开发指南)
6. [代码规范](#代码规范)
7. [提交规范](#提交规范)

---

## 🤝 贡献方式

### 1. 数据贡献（推荐）

- 校对 OCR 提取的词典数据
- 提供新的粤语词典资源
- 补充词条的例句、释义
- 修正错误的粤拼或汉字

### 2. 代码贡献

- 修复 Bug
- 实现新功能
- 优化性能
- 改进 UI/UX
- 编写测试

### 3. 文档贡献

- 完善项目文档
- 翻译文档（英文）
- 编写教程
- 改进注释

### 4. 推广传播

- 分享项目给粤语学习者
- 在社交媒体推广
- 撰写使用体验文章

---

## 📚 数据贡献

数据贡献是本项目最重要的部分！

### ⚠️ 内容授权政策

在开始贡献之前，请务必了解不同类型数据的授权要求：

#### 🔹 第三方出版词典（如《实用广州话分类词典》）

⚠️ **重要说明**：目前项目中使用的《实用广州话分类词典》《广州话俗语词典》等数据来源于互联网上的公开扫描版本，其内容受著作权法保护，**未经出版方或作者授权**。

- **当前状态**：仅限于**技术原型演示**和学术研究
- **使用限制**：不构成任何商业使用或再分发行为
- **版权尊重**：我们鼓励用户支持正版出版物
- **权利声明**：如您是权利人并希望修改或下架相关内容，请通过 [GitHub Issues](https://github.com/jyutjyucom/jyutjyu/issues) 联系我们

#### 🔹 社区原创词表授权政策

💡 **默认协议**：所有个人原创词表的贡献者，默认同意将其内容以 **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)** 协议发布。

这意味着：
- ✅ 他人可以在**非商业用途**下自由复制、分享和改编您的作品
- ✅ 必须**明确署名**原作者
- ❌ 不可用于盈利目的

**其他许可方式**：如果您希望采用其他许可方式（如 CC0、CC BY、CC BY-SA），请在提交 Pull Request 时在描述中特别说明。

**署名格式示例**：
```
作者姓名. (年份). 词表名称. 粤语辞丛 (jyutjyu.com)
```

例如：`陈明. (2025). 四邑话日常用语词表. 粤语辞丛 (jyutjyu.com)`

#### 🔹 公有领域内容

对于版权已过期或作者明确放弃版权的内容（如作者去世满50年、首次发表满50年），可以自由使用。虽然法律上无需署名，但建议在学术和道德上标注来源。

#### 🔹 权利人声明

如果您是收录内容的权利人（作者、出版社、版权继承人等），对本平台的使用有任何疑问或意见：

**联系方式**:
- **GitHub Issues** (推荐): https://github.com/jyutjyucom/jyutjyu/issues
- **GitHub Discussions**: https://github.com/jyutjyucom/jyutjyu/discussions

**回应承诺**:
- 常规请求：7个工作日内回应
- 紧急下架请求：48小时内处理

---

### 前置要求

1. 熟悉粤语（会听说或能查工具书）
2. 了解基本的粤拼规则（可学习 [粤拼教程](https://jyut.net)）
3. 有一定的数据录入经验

### 贡献流程

#### Step 1: 获取数据源

**方式 A - 校对已有 OCR 数据**  
查看 [`data/raw/`](./data/raw/) 目录下是否有待校对的 CSV 文件。

**方式 B - 提供新词典**  
如果你有粤语词典资源（纸质或电子）:
1. 在 [Discussions](https://github.com/jyutjyucom/jyutjyu/discussions) 发帖说明
2. 与维护者讨论版权和录入方案
3. 获得批准后开始 OCR 或手工录入

#### Step 2: 学习 CSV 规范

详细阅读 [CSV 录入规范](./docs/CSV_GUIDE.md)，了解:
- 必填字段
- 粤拼格式
- 多义项处理
- 特殊情况处理

#### Step 3: 录入数据

1. 下载 [CSV 模板](./data/templates/entry-template.csv)
2. 使用 Excel / Google Sheets 打开
3. 按规范逐行录入
4. **保存为 UTF-8 编码的 CSV**

**校对技巧**:
- 每录入 50-100 条，运行一次验证脚本
- 使用 [粤音资料集成](https://jyut.net) 核对粤拼
- 遇到疑问记录在 `notes` 栏

#### Step 4: 验证数据

安装依赖并运行验证:

```bash
# 安装 Node.js 依赖
pnpm install

# 验证 CSV 文件
pnpm run validate -- data/processed/your-file.csv
```

修复所有报错后再提交。

#### Step 5: 提交 Pull Request

1. Fork 本仓库
2. 将校对好的 CSV 放入 `data/processed/`
3. 创建分支: `git checkout -b data/add-xxx-dictionary`
4. 提交: `git commit -m "feat(data): 添加《xxx词典》数据"`
5. Push 并创建 PR

**PR 模板**:

```markdown
## 数据贡献

### 词典信息
- **书名/词表名**: 《实用广州话分类词典》
- **作者**: 麦耘、谭步云
- **出版社**: 广东人民出版社（如适用）
- **出版年份**: 1997 年
- **条目数**: 5234 条
- **数据来源**: [请选择：出版词典扫描 / 个人原创整理 / 公有领域]

### 完成情况
- [x] OCR 提取（或手工录入）
- [x] 人工校对
- [x] 粤拼标注
- [x] 验证通过

### 授权信息
- **版权状态**: [请说明：受版权保护 / CC BY-NC 4.0 / CC0 / 公有领域]
- **使用许可**: [如为原创，请确认同意以 CC BY-NC 4.0 发布；如为出版物，请说明仅用于技术演示]
- **署名要求**: [建议的署名方式]

### 备注
部分开天窗字已用 □ 标记，并在 notes 中注明常见写法。

### Checklist
- [x] 已阅读 CSV 录入规范
- [x] 已阅读并理解内容授权政策
- [x] 运行验证脚本无错误
- [x] 文件编码为 UTF-8
- [x] 版权合规（公版/已授权/明确用途限制）
- [x] 如为原创，同意以 CC BY-NC 4.0 协议发布（或已说明其他协议）
```

---

## 💻 代码贡献

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- 熟悉 Vue 3 / Nuxt 3

### 开发流程

#### Step 1: 设置开发环境

```bash
# Fork 并 Clone 仓库
git clone https://github.com/YOUR_USERNAME/jyutjyu.git
cd jyutjyu

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000

#### Step 2: 创建功能分支

```bash
git checkout -b feat/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

#### Step 3: 开发与测试

- 代码风格遵循 [代码规范](#代码规范)
- 添加必要的注释
- 编写单元测试（如适用）

```bash
# 运行 Linter
pnpm run lint

# 运行测试
pnpm test

# 构建检查
pnpm build
```

#### Step 4: 提交 Pull Request

```bash
git add .
git commit -m "feat: 添加粤拼搜索功能"
git push origin feat/your-feature-name
```

创建 PR 并详细描述:
- 解决了什么问题
- 如何测试
- 截图（如 UI 改动）

---

## 🐛 问题反馈

### 如何提 Issue

1. 搜索是否已有类似 Issue
2. 选择合适的 Issue 模板
3. 提供详细信息:
   - 浏览器版本
   - 复现步骤
   - 期望行为 vs 实际行为
   - 截图（如有）

### Issue 模板示例

```markdown
**描述问题**
搜索"阿Sir"时，简体"阿sir"无法匹配。

**复现步骤**
1. 打开首页
2. 输入"阿sir"（全小写）
3. 点击搜索
4. 无结果

**期望行为**
应该能匹配到"阿Sir"词条（忽略大小写）。

**环境**
- 浏览器: Chrome 120
- 操作系统: macOS 14
- 网站版本: v0.1.0

**截图**
[附上截图]
```

---

## 🛠️ 开发指南

### 项目结构

```
jyutjyu/
├── components/       # Vue 组件
│   ├── DictCard.vue
│   ├── DictTable.vue
│   └── SearchBar.vue
├── composables/      # Vue Composables (组合式函数)
│   ├── useSearch.ts
│   └── useDictionary.ts
├── pages/            # Nuxt 页面
│   ├── index.vue
│   └── search.vue
├── content/          # Nuxt Content 数据
│   └── dictionaries/
├── scripts/          # 构建脚本
│   ├── csv-to-json.js
│   └── validate.js
├── types/            # TypeScript 类型
└── nuxt.config.ts    # Nuxt 配置
```

### 关键技术点

#### 1. Nuxt Content 查询

```typescript
// composables/useDictionary.ts
export const useDictionary = () => {
  const searchEntries = async (query: string) => {
    return await queryContent('dictionaries')
      .where({
        $or: [
          { 'headword.search': { $contains: query } },
          { 'keywords': { $contains: query } }
        ]
      })
      .find()
  }
}
```

#### 2. MiniSearch 集成

```typescript
// composables/useSearch.ts
import MiniSearch from 'minisearch'

const miniSearch = new MiniSearch({
  fields: ['headword.search', 'keywords', 'senses.definition'],
  storeFields: ['id', 'headword', 'phonetic'],
  searchOptions: {
    boost: { 'headword.search': 2 },
    fuzzy: 0.2
  }
})
```

#### 3. 响应式布局

```vue
<template>
  <!-- 移动端：卡片 -->
  <div class="md:hidden">
    <DictCard v-for="entry in entries" :key="entry.id" :entry="entry" />
  </div>
  
  <!-- 桌面端：表格 -->
  <div class="hidden md:block">
    <DictTable :entries="entries" />
  </div>
</template>
```

---

## 📐 代码规范

### TypeScript

- 使用严格模式 (`strict: true`)
- 避免 `any`，使用具体类型
- 导出类型到 `types/` 目录

### Vue 组件

- 使用 Composition API (`<script setup>`)
- Props 和 Emits 使用 TypeScript 类型
- 组件命名用 PascalCase

```vue
<script setup lang="ts">
interface Props {
  entry: DictionaryEntry
}

const props = defineProps<Props>()
</script>
```

### CSS

- 使用 Tailwind CSS 类名
- 避免自定义 CSS（除非必要）
- 响应式断点: `sm:` `md:` `lg:`

### 命名约定

- 文件名: `kebab-case.vue`
- 变量: `camelCase`
- 常量: `UPPER_SNAKE_CASE`
- 类型: `PascalCase`

---

## 📝 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链

### Scope 范围

- `data`: 数据相关
- `search`: 搜索功能
- `ui`: 界面
- `build`: 构建脚本
- `docs`: 文档

### 示例

```bash
feat(search): 添加粤拼模糊搜索

- 支持不带声调的粤拼搜索
- 添加拼音归一化处理
- 更新搜索索引权重

Closes #42
```

---

## 🎯 优先级任务

当前最需要的贡献:

1. **数据校对** - 首批两本词典的 OCR 校对
2. **搜索优化** - MiniSearch 集成与调优
3. **响应式UI** - 卡片/表格视图实现
4. **文档翻译** - README 等文档的英文版本

---

## ❓ 常见问题

### 关于内容使用

**Q: 我可以将平台内容用于商业项目吗？**  
A: 取决于具体内容。出版词典仅限技术演示，社区词表(CC BY-NC 4.0)仅限非商业用途。如贡献者采用 CC BY 或 CC0 协议，则可商业使用。

**Q: 如何引用词典内容写论文？**  
A: 请引用原始出版物，如：`麦耘, 谭步云. (1997). 实用广州话分类词典. 广东人民出版社.` 如需提及本平台，注明：`数据获取: 通过粤语辞丛平台查询 (https://jyutjyu.com)`

**Q: 我能下载整个数据库吗？**  
A: 技术上可以（项目开源），但请遵守各词典的授权限制，建议仅用于个人学习和非商业研究。

**Q: 如何确保我的原创贡献不被商业利用？**  
A: 使用默认的 CC BY-NC 4.0 协议（禁止商业使用），在 PR 中明确说明限制条件，我们会在平台上清楚标识授权信息。

**Q: 项目代码的许可是什么？**  
A: 代码采用 MIT License（允许商业使用），数据遵循各自的授权协议。

### 关于贡献流程

**Q: 我发现了某个词条的错误，可以修改吗？**  
A: 可以！请提交 Issue 说明问题，或直接提交 Pull Request 修正（推荐）。修正后的数据将以原词典的授权协议发布。

**Q: 我不会编程，能贡献吗？**  
A: 当然可以！数据校对、词条补充、错误反馈都是重要贡献，不需要编程知识。

---

## 📚 参考资源

### 法律法规
- [中华人民共和国著作权法](https://enipc.court.gov.cn/zh-cn/news/view-405.html)
- [信息网络传播权保护条例](https://www.cac.gov.cn/2013-02/18/c_126468776.htm)

### 知识共享协议
- [CC BY-NC 4.0 中文版](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans)
- [选择许可协议工具](https://creativecommons.org/choose/)
- [知识共享中国大陆](https://creativecommons.net.cn/)

### 项目文档
- [数据规范 (DATA_SCHEMA.md)](./docs/DATA_SCHEMA.md)
- [CSV 录入指南 (CSV_GUIDE.md)](./docs/CSV_GUIDE.md)

---

## 💬 联系方式

- **GitHub Discussions**: [讨论区](https://github.com/jyutjyucom/jyutjyu/discussions)
- **Issues**: [问题追踪](https://github.com/jyutjyucom/jyutjyu/issues)
- **Email**: your-email@example.com

---

## 📜 行为准则

- 尊重所有贡献者
- 包容不同的观点
- 接受建设性批评
- 关注项目利益

---

**再次感谢你的贡献！** 🙏

每一行代码、每一条数据都是在为粤语文化的保育和传承添砖加瓦。


# 粤语辞丛 The Jyut Collection

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 开放的粤语词典聚合平台 | An Open Platform for Cantonese Dictionaries

## 项目简介

**粤语辞丛**（jyutjyu.com）是一个致力于保存和传播粤语文化的开放词典平台。我们收集、整理和数字化各类粤语词典，包括分类词典、俗语词典、词源词典等，为粤语学习者、爱好者和研究者提供统一的查询入口。

### 核心特性

- 🔍 **智能搜索** - 支持繁简体自动转换、粤拼、多音字、模糊匹配
- 📚 **多词典聚合** - 统一查询不同来源和结构的词典
- 🎯 **异构数据处理** - 智能处理不同词典的特有字段
- 📱 **响应式设计** - 手机卡片式、桌面表格式自适应展示
- 🎨 **简洁现代** - 轻量级UI，专注内容本身
- 🔄 **双存储模式** - 支持静态 JSON（零成本）或 MongoDB（高性能）

### 📊 项目进度

- ✅ **Phase 0**: 项目架构与文档
- ✅ **Phase 1**: MVP 原型开发
  - ✅ 数据处理脚本 (CSV → JSON)
  - ✅ 前端搜索和展示
  - ✅ 8 条真实数据测试
- ✅ **Phase 2**: 数据导入 (大规模数据)
- ⏳ **Phase 3**: 高级搜索 (全文检索、权重排序)

### 收录词典

- ✅ **实用广州话分类词典**（7,549 词条）
- ✅ **广州话俗语词典**（2,516 词条，含歇后语）
- ✅ **廣州方言詞典**（7,461 词条，白宛如编，1998年）
- ✅ **粵典 (words.hk)**（59,019 词条，社区协作）
- ✅ **Wiktionary Cantonese**（102,195 词条，社区协作）
- ✅ **粵語辭源**（3,951 词条，含文献引用及按语）
- 🔜 更多词典陆续上架...

## 📜 内容授权说明

本平台收录的词典内容根据来源实施分类授权管理：

### 📖 出版词典

如《实用广州话分类词典》《广州话俗语词典》《廣州方言詞典》《粵語辭源》等，内容受著作权法保护，数据来源于互联网公开扫描资源。

- **当前状态**: 仅限于技术原型演示和学术研究
- **使用限制**: 不构成商业使用或再分发行为
- **版权尊重**: 我们鼓励用户支持正版出版物
- **权利声明**: 如您是权利人并希望修改或下架相关内容，请通过 [GitHub Issues](https://github.com/jyutjyucom/jyutjyu/issues) 联系我们

**收录的出版词典**：
- 实用广州话分类词典（麦耘、谭步云编，广东人民出版社，1997年版）
- 广州话俗语词典（欧阳觉亚、周无忌、饶秉才编，广东人民出版社，2010年版）
- 廣州方言詞典（白宛如编，江苏教育出版社，1998年版）
- 粵語辭源（谭步云编，广东人民出版社，2025年版）

### ✍️ 社区协作词典

#### 粵典 (words.hk)

采用 [Non-Commercial Open Data License 1.0](https://words.hk/base/hoifong/)（非商业开放资料授权协议）

- **版权持有人**: Hong Kong Lexicography Limited（香港辞书有限公司）
- ✅ 允许非商业使用、复制、修改、发布
- ✅ 必须保留署名和版权告示
- ⚠️ 商业使用需获授权（收入低于地区中位数 3 倍的小型个人业务可豁免）
- 📄 详见：https://words.hk/base/hoifong/

#### Wiktionary Cantonese

采用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)（知识共享 署名-相同方式共享 4.0 国际许可协议）

- **版权持有人**: Wikimedia Foundation & Wiktionary contributors
- ✅ 允许复制、分发、传播、修改和创作演绎作品
- ✅ 允许商业使用
- ✅ 必须给予适当的署名
- ✅ 如对本作品进行修改，必须以相同许可协议分发
- 📄 详见：https://creativecommons.org/licenses/by-sa/4.0/

### ✍️ 社区原创词表

由个人爱好者、研究者等贡献的原创内容，建议采用 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans) 国际许可协议发布，详见[贡献指南](./CONTRIBUTING.md#内容授权政策)。

- ✅ 允许非商业性使用、复制和改编
- ✅ 必须保留作者署名
- ❌ 禁止用于商业目的

## 技术栈

- **框架**: [Nuxt 3](https://nuxt.com/) - Vue 3 全栈框架，支持 SSR
- **UI框架**: [Tailwind CSS](https://tailwindcss.com/) - 原子化CSS框架
- **数据存储**: 静态 JSON 或 [MongoDB Atlas](https://www.mongodb.com/atlas)（可选）
- **中文转换**: [OpenCC.js](https://github.com/nk2028/opencc-js) - 繁简转换
- **部署**: [Vercel](https://vercel.com/) - 边缘计算部署平台

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm, pnpm 或 yarn

### 安装运行

```bash
# 克隆仓库
git clone https://github.com/jyutjyucom/jyutjyu.git
cd jyutjyu

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3002

### 数据存储模式

项目支持两种数据存储模式，通过环境变量 `.env` 控制：

#### 模式一：静态 JSON（默认）

零数据库，数据以 JSON 文件形式存储在 `public/dictionaries/` 目录，适合：
- 快速部署和测试
- 小型项目或演示
- 无服务器成本

```bash
# .env（默认，无需设置）
NUXT_PUBLIC_USE_API=false
```

#### 模式二：MongoDB Atlas（推荐生产环境）

使用 MongoDB 云数据库，支持全文搜索和高性能查询，适合：
- 大规模词典数据（17万+词条）
- 生产环境部署
- 需要复杂查询和全文搜索

```bash
# .env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net
MONGODB_DB_NAME=Jyutjyu
NUXT_PUBLIC_USE_API=true
```

详细配置请参考 [MongoDB 配置指南](./docs/MONGODB_SETUP.md)。

### 数据处理

```bash
# 验证 CSV 数据
npm run validate -- data/processed/your-file.csv

# 转换为 JSON（通用）
npm run build:data -- --dict dictionary-id --input data/processed/your-file.csv

# 转换粵典数据
npm run build:data:hk

# 转换广州话分类词典
npm run build:data:gzpc

# 转换 Wiktionary 数据
npm run build:data:wiktionary
```

> **📥 关于 Wiktionary 数据**: 由于原始文件过大（约1.1GB），项目不直接提供源文件。请参考 [Wiktionary 使用指南](./docs/WIKTIONARY_GUIDE.md) 了解如何从 [Kaikki.org](https://kaikki.org/dictionary/Chinese/) 下载并筛选粤语词条。

## 项目结构

```
jyutjyu/
├── components/           # Vue 组件
│   └── DictCard.vue      # 词条卡片
├── composables/          # Vue Composables
│   └── useDictionary.ts  # 词典查询逻辑
├── content/              # Nuxt Content 数据
│   └── dictionaries/     # 词典索引
├── data/                 # 原始数据
│   ├── processed/        # 校对后的 CSV
│   └── templates/        # CSV 模板
├── docs/                 # 项目文档
│   ├── CSV_GUIDE.md      # CSV 录入规范
│   └── DATA_SCHEMA.md    # 数据结构设计
├── pages/                # Nuxt 页面
│   ├── index.vue         # 首页
│   └── search.vue        # 搜索结果页
├── public/               # 静态资源
│   └── dictionaries/     # 词典 JSON 数据
├── scripts/              # 构建脚本
│   ├── csv-to-json.js    # CSV 转 JSON
│   ├── validate.js       # 数据验证
│   ├── utils/            # 工具函数
│   └── adapters/         # 词典适配器
└── types/                # TypeScript 类型定义
    └── dictionary.ts
```

## 贡献数据

我们欢迎社区贡献！如果你有粤语词典资源或校对能力，请查看：

- [贡献指南](./CONTRIBUTING.md) - 贡献流程与授权政策
- [CSV录入规范](./docs/CSV_GUIDE.md) - 数据格式标准

> ⚠️ **重要提醒**: 提交原创词表前，请了解默认的 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans) 授权协议。详见[贡献指南](./CONTRIBUTING.md#内容授权政策)。

### 数据流程

1. **准备数据** - 按照 CSV 规范整理数据
2. **验证数据** - 运行 `npm run validate` 检查
3. **转换数据** - 运行 `npm run build:data` 转换为 JSON
4. **提交 PR** - 提交到 GitHub

## 开发路线

- [x] Phase 0: 项目架构与文档
- [x] Phase 1: MVP 原型 (首页 + 搜索 + 卡片展示)
- [x] Phase 2: 数据导入 (首批词典)
- [x] Phase 3: 高级搜索 (✅ 简繁通搜、粤拼搜索)
- [ ] Phase 4: 表格视图与响应式优化
- [ ] Phase 5: 词条关联 (参见系统)
- [ ] Phase 6: 多方言支持与筛选
- [ ] Phase 7: Beta 发布

## 文档

- [贡献指南](./CONTRIBUTING.md) - 如何参与贡献（含授权政策）
- [CSV录入规范](./docs/CSV_GUIDE.md) - 如何整理和录入数据
- [数据结构设计](./docs/DATA_SCHEMA.md) - TypeScript 类型和 JSON 格式
- [MongoDB 配置指南](./docs/MONGODB_SETUP.md) - 如何配置 MongoDB 数据存储
- [Wiktionary 使用指南](./docs/WIKTIONARY_GUIDE.md) - 如何获取和处理 Wiktionary 数据
- [适配器开发](./scripts/adapters/README.md) - 如何为新词典创建适配器
- [测试指南](./scripts/TEST_GUIDE.md) - 如何测试数据处理脚本

## 许可证

- **项目代码**: [MIT License](./LICENSE) - 允许商业使用
- **词典数据**: 遵循各自的授权协议（见[内容授权说明](#内容授权说明)）

## 致谢

感谢所有为粤语文化保育做出贡献的学者、编者和志愿者。

---

**网站**: https://jyutjyu.com  
**讨论**: [GitHub Discussions](https://github.com/jyutjyucom/jyutjyu/discussions)  
**问题反馈**: [GitHub Issues](https://github.com/jyutjyucom/jyutjyu/issues)

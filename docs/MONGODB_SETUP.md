# MongoDB Atlas 配置指南

本文档介绍如何配置 MongoDB Atlas 作为词典数据的后端存储。

## 1. 创建 MongoDB Atlas 账号和集群

1. 访问 [MongoDB Atlas](https://cloud.mongodb.com/)
2. 注册账号（可用 Google 登录）
3. 创建免费集群：
   - 选择 **M0 Sandbox**（免费）
   - 选择离你最近的区域（如 AWS Hong Kong）
   - 集群名称：`Jyutjyu`

## 2. 配置数据库访问

### 创建数据库用户

1. 左侧菜单 → **Database Access**
2. 点击 **Add New Database User**
3. 设置：
   - Authentication Method: Password
   - Username: `jyutjyucom_db_user`
   - Password: 生成一个强密码（保存好！）
   - Database User Privileges: **Read and write to any database**
4. 点击 **Add User**

### 配置网络访问

由于 Vercel Serverless Functions 使用动态 IP，需要允许所有 IP 访问：

1. 左侧菜单 → **Network Access**
2. 点击 **Add IP Address**
3. 点击 **ALLOW ACCESS FROM ANYWHERE**（会自动填入 `0.0.0.0/0`）
4. Comment 填写：`Vercel Serverless (all IPs)`
5. 点击 **Confirm**

> ⚠️ **安全说明**：虽然允许所有 IP，但连接仍需要用户名+密码认证，且使用 TLS 加密。确保使用强密码（16+ 位）。

**本地开发时**，也可以单独添加你的 IP：
1. 点击 **Add Current IP Address** 添加本机 IP
2. 这样本地开发和生产环境都能访问

## 3. 获取连接字符串

1. 左侧菜单 → **Database**
2. 点击集群的 **Connect** 按钮
3. 选择 **Drivers**
4. 复制连接字符串，类似：
   ```
   mongodb+srv://jyutjyucom_db_user:<password>@jyutjyu.XXXXXXXX.mongodb.net/?retryWrites=true&w=majority
   ```
5. 替换 `<password>` 为你的实际密码

## 4. 本地配置

### 创建 .env 文件

```bash
cp env.example .env
```

编辑 `.env`：

```env
MONGODB_URI=mongodb+srv://jyutjyucom_db_user:YOUR_PASSWORD@jyutjyu.XXXXXXXX.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=Jyutjyu
NUXT_PUBLIC_USE_API=true
```

## 5. 导入数据

确保本地 JSON 数据已构建好（`public/dictionaries/` 目录下有数据）。

```bash
# 安装 mongodb 驱动
npm install mongodb

# 运行导入脚本
node scripts/import-to-mongodb.js
```

导入完成后会显示统计信息：

```
🎉 导入完成! 共 175230 条词条

📊 词典统计:
   Wiktionary Cantonese: 102195 条
   粵典 (words.hk): 59019 条
   实用广州话分类词典: 7549 条
   粵語辭源: 3951 条
   广州话俗语词典: 2516 条
```

## 6. 创建 Atlas Search 索引

Atlas Search 提供全文搜索功能，支持中文分词。

### 在 Atlas UI 创建索引

1. 左侧菜单 → **Database**
2. 点击集群名称进入详情
3. 选择 **Search** 标签页
4. 点击 **Create Search Index**
5. 选择 **JSON Editor**
6. 配置：
   - Database: `jyutjyu`
   - Collection: `entries`
   - Index Name: `default`

### 索引定义 JSON

粘贴以下配置：

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "headword": {
        "type": "document",
        "fields": {
          "normalized": {
            "type": "string",
            "analyzer": "lucene.cjk"
          },
          "display": {
            "type": "string",
            "analyzer": "lucene.cjk"
          }
        }
      },
      "phonetic": {
        "type": "document",
        "fields": {
          "jyutping": {
            "type": "string",
            "analyzer": "lucene.standard"
          }
        }
      },
      "senses": {
        "type": "document",
        "fields": {
          "definition": {
            "type": "string",
            "analyzer": "lucene.cjk"
          }
        }
      },
      "source_book": {
        "type": "stringFacet"
      },
      "dialect": {
        "type": "document",
        "fields": {
          "name": {
            "type": "stringFacet"
          }
        }
      },
      "keywords": {
        "type": "string",
        "analyzer": "lucene.cjk"
      }
    }
  }
}
```

7. 点击 **Create Search Index**
8. 等待索引构建完成（约 1-5 分钟）

## 7. Vercel 部署配置

### 添加环境变量

在 Vercel 项目设置中：

1. 进入项目 → **Settings** → **Environment Variables**
2. 添加以下变量：

| Name | Value |
|------|-------|
| `MONGODB_URI` | 你的 MongoDB 连接字符串 |
| `MONGODB_DB_NAME` | `jyutjyu` |
| `NUXT_PUBLIC_USE_API` | `true` |

3. 重新部署项目

## 8. 验证

### 本地测试

```bash
npm run dev
```

访问 http://localhost:3002/api/search?q=食

应该返回：
```json
{
  "success": true,
  "query": "食",
  "mode": "normal",
  "total": 50,
  "results": [...]
}
```

### API 端点

| 端点 | 说明 |
|------|------|
| `GET /api/search?q=查询词&limit=50&mode=normal` | 搜索词条 |
| `GET /api/search?q=查询词&mode=reverse` | 反查释义 |
| `GET /api/entry/:id` | 获取单个词条 |
| `GET /api/dictionaries` | 获取词典列表 |

## 9. 回退模式

如果 MongoDB 连接失败或未配置，系统会自动回退到静态 JSON 模式。

设置 `NUXT_PUBLIC_USE_API=false` 可强制使用静态文件模式。

## 常见问题

### Q: Atlas Search 索引构建失败？

检查：
- 索引名称是否为 `default`
- JSON 格式是否正确
- 数据库和集合名称是否正确

### Q: 连接超时？

检查：
- Network Access 是否允许你的 IP
- 连接字符串是否正确
- 密码中的特殊字符是否正确编码

### Q: 搜索结果不理想？

- 确保 Atlas Search 索引状态为 "Active"
- 检查 `lucene.cjk` 分词器是否正确配置
- 调整搜索权重（在 `server/api/search.ts` 中）

## 成本估算

MongoDB Atlas M0 免费层：
- 存储：512 MB（当前数据约 120 MB）
- 没有并发连接限制
- Atlas Search 免费使用

对于 175K 词条的词典应用，免费层完全足够。

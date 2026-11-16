# Cloudflare D1 迁移可行性评估

> 评估对象：Jyutjyu（粵語辭叢）当前 Nuxt 4 + MongoDB Atlas 架构
> 评估时间：2026-11-16
> 结论基于：仓库代码实测、生产环境 API 实测、以及一个覆盖全部 273,143 条词条的 SQLite/FTS5 原型

---

## 0. 结论速览

**可行，而且在你「必须上 Cloudflare」这个前提下，D1 是唯一合理的选择。**
但需要明确：这不是「把 Mongo 驱动换成 D1 驱动」，而是**换掉检索引擎**（Atlas Search → SQLite FTS5 + 离线预分词）。工作量与风险 80% 集中在这一块。

| 维度 | 结论 |
| --- | --- |
| 数据量适配 | ✅ 273,143 条 / 192 MB JSON → D1 实测 360 MB（含全文索引），10 GB 上限有 27 倍余量 |
| 全文检索 | ✅ D1 官方支持 FTS5；用「单字 + 双字」离线预分词可覆盖 100% 中文查询 |
| 关键约束 | ⚠️ D1 单库单线程；单次查询行数会计费；单条 LIKE/GLOB 模式上限 50 字节 |
| 延迟 | 🟢 预计 P50 30–60 ms，优于当前生产的 85–790 ms |
| 相关性 | 🟡 可做到接近持平，但需要 1–2 轮调参（bm25 权重 vs 现在 Atlas score + 二次打分） |
| 功能完整度 | 🟢 过滤、排序、分组、facets、分页、审核过滤全部可在 SQL 内完成，部分还能做得更准 |
| 成本 | 🟢 Workers Paid $5/月 + D1 用量，预计 $5–10/月；当前 Cloud Run + Atlas 通常 $20–70/月 |
| 工作量 | 🟡 单人约 13–14 人日（3 周日历时间），可分 4 个可回滚阶段 |

**一句话：体验不会退步，多数指标会变好；真正的风险是「搜索排序手感」和「D1 单库吞吐」，前者靠黄金查询集回归，后者靠边缘缓存。**

---

## 1. 现状基线（实测）

### 1.1 部署形态

生产域名 `jyutjyu.com` 前置 Cloudflare，但响应头带 `x-cloud-trace-context`，源站是 **Google Cloud Run 上的 Nitro node-server**，数据在 **MongoDB Atlas**。也就是说现在是「CF 做 CDN/防护 + GCP 跑 Node + Atlas 存数据」三段式，不是纯 Cloudflare。

仓库里已经有 `wrangler.jsonc`（含 account_id、assets 绑定、`run_worker_first`）和一批 `server/shims/mongodb-*.ts`，说明 Workers + Mongo 的尝试已经做过——这正是你感受到 CPU 问题的来源。

### 1.2 生产 API 实测（2026-11-16，香港网络）

| 接口 | 耗时 | 备注 |
| --- | --- | --- |
| `/api/search?q=唔該` | 138 ms | 常用双字 |
| `/api/search?q=hoeng1 gong2` | **792 ms** | 粤拼查询，长尾明显 |
| `/api/search?q=城市&mode=reverse` | 207 ms | 反查 |
| `/api/word/香港` | 85 ms | 精确解析 |
| `/api/random` | 256 ms | 随机 |
| `/api/dictionaries` | **540 ms** | 全量 aggregate |
| `/api/suggest?q=香` | 123 ms | |
| `/api/browse?...` | **503** | 生产环境浏览接口当前不可用 |

补充发现：`/api/browse` 返回 503「Missing precomputed browse asset」，但 `/browse-index/manifest.json` 与对应分页文件通过 HTTP 都是 200。原因大概率是服务端用 `process.cwd()/public/browse-index/...` 读文件（`server/utils/browse-index.ts:92`），而容器里只有 `.output/public`，路径对不上。**这类「预计算分片文件缺失就 503」的脆弱性，恰好是 D1 能消除的一类故障。**

### 1.3 数据规模

| 指标 | 数值 |
| --- | --- |
| 词条总数 | 273,143（与生产 `/api/dictionaries` 一致） |
| 去重词头 | 163,222 |
| JSON 体积 | 192 MB（11 部词典，最大单文件 16.4 MB） |
| 平均/最大单条 | 641 B / 11.5 KB |
| 词头长度分布 | 1 字 48,420（17.7%）、2 字 142,666（52.2%）、3 字 40,781（14.9%） |
| 有 headword_variants | 3,172 条 |
| 最大义项数 | 72 |

**70% 的词条是 1–2 个字**——这个数字直接决定了 FTS5 分词方案的选择（见 3.3）。

### 1.4 现有静态资产（迁移的关键约束）

| 目录 | 文件数 | 体积 |
| --- | --- | --- |
| `public/browse-index` | **11,117** | 57 MB |
| `public/exact-match` | **4,098** | 201 MB |
| `public/dictionaries` | 86 | 192 MB |
| `public/search-suggestions` | 1 | 8.2 MB |
| 其他 | ~21 | ~12 MB |
| **部署产物合计** | **15,639** | **512 MB** |

Workers 静态资产上限：Free 20,000 文件 / Paid 100,000 文件，单文件 25 MiB。现在是 Free 配额的 78%，**已经贴边**。而 `exact-match` + `browse-index` 合计 258 MB / 15,215 文件——这两棵目录树在 D1 方案里可以直接删掉（见 4.3），部署产物体积和文件数都降一个数量级。

---

## 2. 为什么 MongoDB 在 Workers 上确实不合适

Cloudflare 官方文档说得很直白（[MongoDB 集成](https://developers.cloudflare.com/workers/databases/third-party-integrations/mongodb/)）：

> 每次 Worker 调用都会新建一条 TCP + TLS 连接到 MongoDB 集群，约 300 ms 连接开销；只建议低流量场景使用，或者用 Durable Object 持久化连接。Hyperdrive 不支持 MongoDB。

具体到本项目，问题会叠加成四层：

1. **每次调用 300 ms 连接开销** —— 你现在搜索 P50 才 138 ms，这条成本比整个查询还贵。
2. **TLS 握手 + 驱动拓扑监控吃 CPU** —— Workers 按 CPU 时间计费且限制严格（Free 10 ms，Paid 默认 30 s），握手、认证、心跳这类「不产生业务价值」的 CPU 是纯损耗。
3. **isolate 不保证复用** —— 连接池在 Worker 里是不稳定资产，冷 isolate 必然重连；Atlas 连接数还会被打爆。
4. **D1 的计费模型完全不同** —— D1 是 Workers 内部的服务绑定，没有 TCP、没有连接池、空闲零计费（scale-to-zero），且天然在边缘。

所以你的判断是对的：**要在 Cloudflare 上跑，数据库就必须换成 Workers 原生的存储**。问题只剩「换成什么、换完之后体验差多少」。

---

## 3. D1 适配性分析

### 3.1 硬指标逐条对表

| D1 限制（[官方](https://developers.cloudflare.com/d1/platform/limits/)） | 本项目 | 余量 |
| --- | --- | --- |
| 单库最大 10 GB（Paid）/ 500 MB（Free） | 原型实测 360 MB | Paid 27×；Free 仅 72%，不建议 |
| 单行/单字符串 2 MB | 最大词条 11.5 KB | 170× |
| 单条 SQL 100 KB | 批量 INSERT 控制行数即可 | 充足 |
| 绑定参数 100 个 | 变体展开最多几十个 | 充足 |
| 查询结果 50 MB | 单次返回 ~30 KB（生产实测） | 充足 |
| 单查询 30 s | 原型最慢 19 ms | 充足 |
| LIKE/GLOB 模式 50 字节 | 中文短语注意不要走 LIKE | 用 FTS 规避 |
| 每 Worker 调用查询数 1000（Paid）/ 50（Free） | 单次搜索 2–5 条 | 充足 |
| 单库单线程、查询串行 | 见 3.5 | ⚠️ 需缓存兜底 |

### 3.2 FTS5 可用性

D1 官方 [SQL statements 文档](https://developers.cloudflare.com/d1/sql-api/sql-statements/) 明确列出支持 **FTS5 模块（含 fts5vocab）**；2026-11-12 的 changelog 还专门修了「含虚拟表的 D1 导出」。所以 `CREATE VIRTUAL TABLE ... USING fts5(...)`、`bm25()`、`highlight()` 都是可用路线。

### 3.3 关键设计：为什么必须「预分词 + 单字/双字索引」

FTS5 内置分词器对中日韩都不友好：

- `unicode61`：一整段中文会被当成**一个 token**，"香港" 无法命中 "香港島"。
- `trigram`：只能匹配 **≥3 个字**的查询。而本项目 70% 词条是 1–2 字，"唔該"、"香港"、"冇" 这些最高频查询会**直接零结果**。
- 自定义分词器：D1 不能加载扩展。

**可行解**：在导入阶段把中文文本离线切成「单字 + 相邻双字」，用空格连接后写入 FTS5 列：

```
"香港島"  →  "香 港 島 香港 港島"
"唔該晒"  →  "唔 該 晒 唔該 該晒"
"hoeng1 gong2"  →  "hoeng1 gong2"   （拉丁文按空格/标点切）
```

查询侧用同一套切分规则：2 字查询变成一个双字 token（精确、高区分度），1 字查询用单字 token，3 字以上用多个双字 token 做 AND/短语。这实际上**复刻了 Atlas `lucene.cjk` 的 CJK 分析器行为**（单字＋双字），所以语义覆盖面是对齐的，不是降级。

词条里定义文本带 `#詞條` 链接标记（如 `#東亞#南海`），切分时 `#` 会被丢弃，不会污染索引。

### 3.4 原型实测（全部 273,143 条真实数据）

用 Node 内置 `node:sqlite`（SQLite 3.51，FTS5）在本地搭了完整原型：`entries` 表 + `entry_fts`（hw / vars / jp / kw / def 五列）+ 索引。

| 指标 | 结果 |
| --- | --- |
| 全量构建耗时 | 13.2 s |
| 数据库体积 | **360 MB**（含 FTS 索引与二级索引） |
| 香港（双字） | 0.3 ms，命中 38 条 |
| 香（单字） | 0.4 ms，命中 543 条 |
| 香港島（三字） | 0.2 ms，命中 2 条 |
| hoeng1 gong2（粤拼） | 0.1 ms |
| 城市（反查释义） | 0.4 ms，命中 305 条 |
| 嘅（反查最常见字） | 19 ms，命中 30,558 条（最坏情况） |
| 前缀 香* | 0.6 ms |
| 词条精确解析（带索引） | <0.1 ms |
| facets（GROUP BY 词典） | 0.2 ms |
| 浏览页 keyset 分页 | <0.1 ms |
| 对照：`LIKE '%香港%'` 全表扫 | 16.3 ms（且计费 273,143 行） |

**排序质量抽查**（原型 vs 生产实际返回）：

| 查询 | 原型 top | 生产 top |
| --- | --- | --- |
| 香港 | 香港 / 香港腳 / 香港紙 / 香港地 | 香港 / 香港腳 / 香港腳 / 香港腳 |
| 唔該 | 唔該 / 唔該晒 / 唔該先 / 唔使唔該 | 唔該 / 唔該 / 唔該 / 唔该 |
| 冇 | 冇 / 冇花冇假 / 冇穿冇爛 | 冇 / 冇 / 冇 / 冇 |

词条族完全一致，差异只在同名词条（不同词典）之间的次序——这本来就是 bm25 权重 + 二次打分要调的参数，不是能力缺失。

### 3.5 计费与吞吐模型

D1 按 **rows read** 计费。原型中不同查询的命中规模：常规词头查询 10–600 行；反查最常见的 `嘅` 约 3 万行。即使按「每次搜索 2,000 行」的保守估计：

- Paid：25 B 行/月 ÷ 2,000 = **1,250 万次搜索/月**才用满免费额度，本项目量级完全无感。
- Free：5 M 行/天 → 约 2,500 次搜索/天，够 demo。Workers Free 的 10 ms CPU 详见附录 B：SSR 本身只占 1.7 ms，真正的瓶颈是 OpenCC 的 103 ms 冷初始化。
- **单库单线程**是唯一需要认真对待的约束：单条查询 0.3–20 ms，理论 50–3000 QPS，但串行排队。对策是边缘缓存（见 4.4）——这是纯静态语料，搜索结果可缓存性极高。

> ⚠️ FTS5 的 `rows_read` 具体如何计数（按 posting 还是按索引页）文档没有明说，Phase 0 spike 必须用 `meta.rows_read` 实测校准，不要用本文估算直接做预算承诺。

---

## 4. 目标架构

### 4.1 拓扑

```
Browser
  │
Cloudflare Edge
  ├── Static Assets（预渲染 HTML / JS / CSS / 字体 / TTS）  ← run_worker_first 只放行 /api/*
  ├── Cache API（搜索结果 / 词条结果，TTL 1h–24h）
  └── Worker（Nuxt 4 SSR, nitro preset=cloudflare_module）
        ├── D1（entries + FTS5）   ← 唯一数据源
        └── GitHub API（反馈）
```

### 4.2 数据模型

```sql
CREATE TABLE entries (
  id           INTEGER PRIMARY KEY,
  entry_id     TEXT NOT NULL UNIQUE,
  source_book  TEXT, dialect TEXT, entry_type TEXT,
  canon        TEXT,          -- 规范词头（分组键）
  hw           TEXT,          -- display + normalized
  jp           TEXT,
  restricted   INTEGER DEFAULT 0,   -- 大陆合规过滤，直接进索引
  payload      TEXT           -- 原始词条 JSON
);
CREATE INDEX idx_canon  ON entries(canon);
CREATE INDEX idx_source ON entries(source_book);
CREATE INDEX idx_type   ON entries(entry_type);

CREATE VIRTUAL TABLE entry_fts USING fts5(hw, vars, jp, kw, def);
-- rowid = entries.id，五列对应权重 10/9/6/4/1
```

### 4.3 Mongo → D1 对照

| 现在 | D1 后 |
| --- | --- |
| `$search` + booster（`server/api/search.ts:776`） | `entry_fts MATCH` + `bm25()` 权重 |
| `fallbackSearch()` 六段 `$regex` 扫描（`:952`） | 删除；FTS 本身即可覆盖前缀/包含/粤拼 |
| `atlasGroupedSearch()`（`:886`） | 一条 SQL 取候选窗口，JS 分组（保留现有逻辑） |
| facets 需要 3–4 次额外 aggregate | 一条 `GROUP BY source_book` |
| `/api/word` 三次 `$or` 查询 | `WHERE canon IN (...)` 单次索引命中 |
| `/api/dictionaries` 540 ms aggregate | 直接读 `/dictionaries/index.json`（已是静态资产） |
| 浏览页 11,117 个预计算分片 + 缺文件就 503 | D1 keyset 分页（`WHERE canon > ? ORDER BY canon LIMIT ?`） |
| exact-match 4,098 个分片（201 MB） | 删除，D1 精确查询 <0.1 ms |
| 随机词条 `$sample` | 预生成 `recommendations.json`（已有）或 `random()` 兜底 |
| 站点地图游标 | `COUNT(*) + keyset`，或保留预计算 |
| 限流内存 Map（`server/middleware/rate-limit.ts`，Workers 上每 isolate 各一份，实际失效） | Durable Object 计数器，或 D1 令牌桶 |
| 审核过滤（查询后过滤） | `WHERE restricted = 0`，索引级过滤 |

删掉 `exact-match` 与 `browse-index` 后，静态资产从 **15,639 文件 / 512 MB** 降到约 **424 文件 / 254 MB**，直接摆脱 Free 配额贴边问题。

### 4.4 缓存策略（D1 方案的关键一环）

语料是静态的、构建期确定的，所以：

1. **Cache API**：`/api/search?q=&filters=` 结果缓存 1–24 h（分页/排序/过滤都进 key），命中率会很高（长尾 + 热门词）。
2. **CDN `Cache-Control`**：搜索/词条接口现在没有缓存头，建议 `public, s-maxage=3600, stale-while-revalidate=86400`。
3. **D1 读复制**（read replication）可在流量上来后开启，读请求就近副本。
4. 热门查询可在构建期预渲染成静态 JSON。

三层叠加后，D1 只需承接冷门查询，单库单线程不再是问题。

---

## 5. 体验差距评估

| 维度 | 现在 | D1 后（预期） | 差距 |
| --- | --- | --- | --- |
| 搜索 P50 | 138 ms | 30–60 ms | 🟢 更快，且少了 300 ms 的跨区/连接成本 |
| 搜索 P95 | 792 ms（粤拼） | 80–150 ms | 🟢 长尾明显收敛 |
| 相关性 | Atlas score + 二次打分 | bm25 + 同款二次打分 | 🟡 需调参，目标「前 10 命中集合一致」 |
| 1–2 字查询 | 正常 | 正常 | 🟢 预分词方案专治这个 |
| 粤拼查询 | 792 ms（明显慢于其他查询） | FTS `jp` 列，0.1 ms | 🟢 明显改善 |
| 反查释义 | 207 ms，常见字走 fallback | 0.4 ms；最常见字 19 ms | 🟢 改善 |
| 分组 / facets | 候选窗口近似，可能不准 | SQL 精确，窗口可加深 | 🟢 更准 |
| 分页深度 | 候选上限 800 | 可无限深（keyset） | 🟢 |
| 浏览页 | 生产当前 503 | 稳定 | 🟢 消除一类故障 |
| 词典列表 | 540 ms | ~20 ms | 🟢 |
| 词条页 | 85 ms | 30–40 ms | 🟢 |
| 随机 | 256 ms | 静态文件 ~20 ms | 🟢 |
| 可用性 | 三段式，任一环挂都 5xx | 单平台，D1 故障 = 全站读故障 | 🔴 集中风险，靠缓存 + 回滚域名缓解 |
| 冷启动 | Cloud Run 冷启动秒级 | Worker 冷启动 10–50 ms | 🟢 |
| 部署 | 15,639 文件 | ~424 文件 | 🟢 |
| 语义搜索 / 拼写容错 | 无 | 无 | ⚪ 持平（Atlas 现在也没开 fuzzy） |

**结论：功能上没有缺口，延迟全面变好；唯一的真实差距是「排序手感」需要回归校准，以及可用性从多组件变成了单平台集中风险。**

需要提前说明的两处「看起来像退步」的地方：

1. **混合查询**（如 `香港 電台`）：Atlas 用 `should` 做 OR 加权，FTS 默认 AND 会有召回差异。建议查询侧统一做 OR + bm25，保持与现在一致。
2. **排序权重**：现在 `calculateSecondaryScore()`（`server/api/search.ts:415`）里有长度、释义丰富度、词典权重的加分，这段逻辑可以原样保留，只把第一段相关性分数从 Atlas score 换成 `-bm25()`，其余不动，能最大限度保持手感。

---

## 6. 迁移方案（可分阶段、可回滚）

| 阶段 | 内容 | 产出 | 人日 |
| --- | --- | --- | --- |
| **P0 Spike** | 单部词典进 D1；验证 FTS5 建表/查询/`meta.rows_read`；`wrangler dev` 本地联调；用 50 条黄金查询对比生产 API | Go/No-Go 报告 + 计费实测 | 1–2 |
| **P1 数据层** | `scripts/import-to-d1.js`（复用现有 adapter 与 `import-to-mongodb.js` 逻辑）；schema；批量导入；词条页/词典列表/建议/随机/站点地图改 D1 | 全部非搜索接口切 D1 | 3 |
| **P2 搜索层** | 预分词器（单测覆盖）；FTS 查询构造；bm25 权重；分组/facets/过滤/排序；黄金集回归 | 搜索 API 切 D1，与生产 A/B 对比 | 4–5 |
| **P3 Workers 化** | `nitro.preset=cloudflare_module`；wrangler 绑定；删除 `server/utils/mongodb.ts` 与 shims；`node:fs` 路径改造（`browse-index.ts:92/217`、`random.ts:33`、`headword-suggestions.ts:2`、`sitemap-*.ts`）；`@nuxt/image` 换 provider（sharp 16 MB 进不了 Worker）；`useDictionary.ts:922` 的 `queryContent` 改读静态 JSON，移除 `@nuxt/content`；限流改 DO | Worker 部署成功 | 2–3 |
| **P4 切流** | 影子流量比对；DNS 灰度；保留 Cloud Run + Atlas 回滚路径 | 全量切换 | 2 |
| | | **合计** | **12–15** |

### 回滚

- 数据：语料在 git 里，D1 随时可重建（13 秒本地构建，线上导入约十几分钟）。
- 流量：Worker 出问题直接 DNS 切回 Cloud Run（Mongo 保持只读双跑 1–2 周）。
- 代码：D1 适配层用独立 `server/utils/db/*`，不散落在 handler 里，方便 feature flag 切换。

### 验收标准（建议写进 PR 描述）

1. 黄金查询集（≥200 条：单字/双字/三字/粤拼/反查/过滤/排序/简繁/生僻）前 10 结果的 Jaccard ≈ 生产 ≥ 0.9。
2. 搜索 P95 < 150 ms（香港节点，冷缓存）；缓存命中 < 20 ms。
3. `meta.rows_read` 单次搜索 < 5,000（P95）。
4. D1 体积 < 1 GB；部署资产 < 1,000 文件。
5. 大陆合规过滤、级联回退、429 限流行为与现在一致。

---

## 7. 成本

| 项 | 现在（估） | D1 后 |
| --- | --- | --- |
| 计算 | Cloud Run 常驻实例 $10–40 | Workers Paid $5 |
| 数据库 | Atlas M0–M10 $0–57 | D1 含在 $5（25 B 行读 / 50 M 行写 / 5 GB 存储） |
| CDN | Cloudflare 现有 | 不变 |
| **合计** | **$15–90/月** | **$5–10/月** |

按 25 B 行读额度，即使每次搜索读 5,000 行，也够 500 万次搜索/月；本项目远达不到。

---

## 8. 风险清单

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| FTS5 排序与 Atlas 手感不一致 | 中 | 黄金集回归 + 保留二次打分 + bm25 权重可调 |
| 分词边界情况（标点、`#` 标记、中英混排、多音字粤拼） | 中 | 分词器纯函数 + 单测；用全量语料跑「可索引率」断言 |
| D1 单库单线程 | 中 | Cache API + CDN + 读复制；监控 429/overloaded |
| FTS5 `rows_read` 计费口径不明 | 中 | P0 用 `meta.rows_read` 实测；超预算则缩列/去 def 列 |
| 10 GB 单库上限 | 低 | 现在 0.36 GB；真要涨，按词典分库（但跨库无法 JOIN） |
| Worker 包体（现在 38 MB，含 sharp 16 MB + mongodb） | 中 | 移除 sharp/mongodb/@nuxt/content；64 MB 上限内 |
| 静态资产文件数 | 低 | 删两棵预计算树后 424 个；Paid 上限 10 万 |
| 单平台故障集中 | 中 | 保留 Cloud Run 回滚；静态页可独立存活 |
| 导入耗时 / 100 KB 语句限制 | 低 | 分批 `d1 execute --file`；导入脚本本地产出 SQL |
| 供应商锁定 | 低 | 语料与构建脚本在 git，D1 只是可重建的派生层 |

---

## 9. 不建议的做法

- **Workers 直连 Mongo（现状）**：每次 300 ms 连接 + 握手 CPU，低流量也难受；除非改用 DO 代理。
- **Durable Object 代理 Mongo**：能消除重连，但 DO 单线程、单地点，全球用户延迟反而变差，且仍是两套系统。
- **Cloudflare Containers 直接跑现有镜像**：改动最小（Dockerfile 已有），Mongo 照旧；但失去边缘 SSR 与 scale-to-zero，冷启动和成本都不如 Worker，只适合作为过渡或回滚方案。
- **Hyperdrive + Postgres**：可行且全文能力更强（pg_trgm/tsvector），但要引入第二套托管、迁移 SQL、运维更重；只有在「未来要做复杂全文/多租户写入」时才值得。
- **只保留静态 JSON**：客户端要下载 16 MB 级别的词典并建 MiniSearch 索引，首屏和内存都不可接受，且无法服务「反查」这类全量扫描。
- **Cloudflare AI Search / Vectorize**：语义检索有意义，但成本、可控性和「精确词头优先」的产品语义都不匹配，可作为未来的「相关词」补充，不适合替代主搜索。

---

## 10. 附录：P0 Spike 清单

1. `wrangler d1 create jyutjyu` + 本地 `wrangler dev`，建 `entries` / `entry_fts`。
2. 导入 1 部词典（建议 `gz-modern`，16,347 条），验证：
   - `CREATE VIRTUAL TABLE ... fts5` 成功；
   - `bm25()` 可用；
   - 单次查询 `meta.rows_read` / `duration`；
   - 批量插入的语句大小与耗时。
3. 用 20 条查询对比生产 `/api/search` 的 top-10 词头集合。
4. 验证 Worker 内 `d1.batch()` 一次拿齐「结果 + facets + 总数」。
5. 验证 `ASSETS` 绑定读取 `/dictionaries/index.json`（替代 `queryContent` 与 fs）。
6. 记录冷启动与包体（`wrangler deploy --dry-run`）。

> 附：本文的性能数字来自本地 `node:sqlite`（SQLite 3.51）原型；D1 是托管 SQLite，查询计划同源，但会叠加 2–5 ms 网络/服务开销，P0 需按真实 D1 复测。

---

## 11. 附录 B：Free 套餐、SSR 必要性与「换引擎」

### 11.1 实测（本地 built server，Node 24，静态 JSON 模式，`ps cputime` 采样）

| 场景 | 每请求 CPU |
| --- | --- |
| `/word/香港`（完整 Vue SSR，62 KB HTML） | **15 ms** |
| `/api/word/香港`（仅数据解析） | 1 ms |
| `/`（SSR 首页） | 1 ms |
| `/api/search?q=唔該`（warm，移除 OpenCC 后） | 6 ms |
| 首次中文搜索（旧版，OpenCC 初始化） | **103.6 ms** |
| 首次中文搜索（移除 OpenCC 后） | ~10 ms（`ps` 采样噪声级） |
| warm `getQueryVariants`（查表） | 0.009 ms |
| 进程启动到首个请求（Node，含模块加载） | 480 ms（Workers 中属于 startup，1 s 预算，不计入单请求 CPU） |

**修正两次**：

1. 最初说「Free 10 ms 撑不住 Nuxt SSR + OpenCC」——方向对，但把两件事混在一起了。
2. 随后在旧构建上量到 SSR 只要 1.7 ms，据此说 SSR 不是瓶颈——**那个数字来自过期的 `.output`（2026-05 的构建）**。用当前源码重新构建后，`/word/香港` 的 SSR 是 **15 ms**，与 Cloudflare 官方「SSR 类负载 10–20 ms」的经验值一致。

所以准确的结论是：**OpenCC 的 103 ms 是独立的、可修的阻塞点（已修，见 11.2）；SSR 的 15 ms 是第二个阻塞点，Free 的 10 ms 放不下词条页。** 首页、API 都在 1–6 ms，只有完整的词条页渲染会超。

### 11.2 该修的是 OpenCC，不是 SSR

1. **构建期生成双向字表**：现有 `server/generated/trad-variant-map.json`（24,684 字，361 KB）已经是一半，补齐反向后运行时只做 Map 查表 → 0.01 ms。
2. **索引期展开变体**（更彻底）：每条词条的简/繁/异体都预先写进 FTS，查询侧完全不转换。代价是索引体积 +20–50%，Free 的 500 MB 更紧张。

推荐第 1 种：几乎零成本，且能把 `opencc-js`（1.1 MB）整个从 Worker 包里拿掉。

### 11.3 Nuxt SSR 的必要性

- 静态路由（`/`、`/about`、`/search`、`/browse` × 5 语言）**已经全部预渲染**，根本不过 Worker。
- 动态 SSR 只剩 `/word/**`（163,222 个词头）与 `/api/*`。
- SSR 存在的唯一理由是 **SEO + 首屏**：`sitemaps/*.xml` 按词头枚举，说明词条页被搜索引擎收录是产品目标。Baidu 对 JS 渲染支持很差，砍掉 SSR 等于放弃词条页的长尾自然流量。

所以「Nuxt SSR 是否必要」等价于「词条页是否要 SEO」。如果要，就保留；如果不要，SPA 确实能省掉全部 SSR CPU。

### 11.4 极致省钱的四条路

| 方案 | 月成本 | 搜索体验 | 词条页 SEO | 工作量 |
| --- | --- | --- | --- | --- |
| **A** Workers + D1（Paid） | $5–10 | 好 | 完整 | ~2 周 |
| **A'** 同上，Free + 去 OpenCC | $0 | 好，但冷 isolate 有 1102 风险 | 完整 | 2 周 + 2 天 |
| **B** 全静态 + 客户端 MiniSearch | $0 | 差（首屏下载 16 MB、建索引耗内存） | 无 | 0（现有 JSON 模式） |
| **C** 静态 SPA 壳 + 轻量 API Worker | $0–5 | 中（首屏空壳，需等 fetch） | 弱 | ~1 周 |
| **D** 换框架（Astro / Hono / SvelteKit） | $5 | 同 A | 同 A | 3–4 周，收益 ≈ 0 |

关键经济事实：**Workers 的静态资产请求免费且不限量**（[定价脚注](https://developers.cloudflare.com/workers/platform/pricing/)），所以「全静态」确实能 $0——代价是搜索退回客户端方案，这正是当初引入 API 模式要解决的问题。

### 11.5 如果一定要 $0 的清单

1. 去掉运行时 OpenCC（11.2）。
2. D1 控制在 500 MB 内：只索引 hw/vars/jp/kw；`def` 列改按需 LIKE 或放 R2。
3. Cache API 缓存搜索与词条 HTML，热门命中率 >80%。
4. 静态资产 <20,000 文件（删两棵预计算树后 424 个，够）。
5. 监控 `exceededCpu` 与 D1 `rows_read`。
6. 接受 100k 请求/天上限与冷 isolate 偶发 1102。

### 11.6 建议

先做 A'：把 OpenCC 移出请求路径（已完成，见 11.2），然后给 `/word/**` 加 Cache API（HTML 按词头缓存 24 h），再跑一周影子流量观察 `exceededCpu` 比例。若缓存命中率能做到 90% 以上，$0 有机会成立；否则 $5 买安心——为省 $5 重写前端不划算。

> 附：移除 OpenCC 后重新构建，服务端产物从 38 MB 降到 14 MB（去掉了 `sharp`/`@img` 与 `@nuxt/content` 的依赖树），首次中文搜索的 103 ms 初始化也消失了。


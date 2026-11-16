# D1 本地端到端验证报告

> 日期：2026-11-16
> 环境：wrangler 4.162.0 + 本地 workerd + 本地 D1（miniflare）
> 结论：**可行。** 全量 273,143 条词条可在本地 D1 跑起来，搜索 p50 2–9 ms、候选覆盖率 98.5%；
> 需要三处修正（随机词条、反查常见字、排序接入现有二次打分），然后就能进部署阶段。

---

## 1. 做了什么

1. 新增 `utils/cjk-tokenize.mjs`：把中文切成「单字 + 相邻双字」，解决 FTS5 对 1–2 字查询无解的问题。
2. 新增 `scripts/d1-spike/schema.sql`：`entries` 表 + `entry_fts`（contentless FTS5，5 列权重 10/9/6/4/1）。
3. 新增 `scripts/import-to-d1.js`：把 `public/dictionaries` 导出成 `data/d1/seed.sql`（含主题、索引、FTS 插入）。
4. 新增 `scripts/d1-spike/worker.mjs`：真实 Worker + D1 binding，实现 search / grouped / facets / suggest / word / browse / random。
5. 导入本地 D1，压测、覆盖率、并发、与生产 API 对比。

## 2. 数据与导入

| 项 | 数值 |
| --- | --- |
| 词条数 | 273,143（entries 与 FTS 行数一致） |
| 受限词条标记 | 1,625（来自 `cn-restricted-entry-ids.json`） |
| 生成的 SQL | 280 MB（`data/d1/seed.sql`，已 gitignore） |
| 生成耗时 | 7.3 s |
| 本地导入耗时 | 约 3–5 分钟（miniflare，含 FTS 索引） |
| D1 数据库体积 | **320 MB**（10 GB 上限的 3.1%） |

FTS 用 `content=''`（contentless），不重复存储原文，因此比早先原型（360 MB）更小。

## 3. 延迟与计费（本地 D1，单位 ms）

| 端点 | p50 | p95 | D1 duration p50 | rows_read p50 |
| --- | --- | --- | --- | --- |
| search 香港（2 字） | 4.8 | 6.0 | 2 ms | 2,239 |
| search 唔該（2 字） | 8.6 | 9.5 | 6 ms | 6,223 |
| search 香（1 字） | 3.9 | 4.9 | 2 ms | 1,644 |
| search 冇（1 字） | 4.6 | 5.4 | 2 ms | 3,423 |
| search hoeng1 gong2 | 5.6 | 6.0 | 3 ms | 4,163 |
| reverse 城市 | 7.1 | 7.9 | 5 ms | 5,968 |
| **reverse 嘅（最坏）** | **46.4** | 47.7 | 43 ms | **109,645** |
| grouped 香港 | 2.6 | 2.9 | 1 ms | 113 |
| facets 香港 | 2.2 | 3.3 | 0 ms | 121 |
| word 香港 | 2.0 | 2.3 | 0 ms | 5 |
| browse keyset | 2.0 | 3.4 | 0 ms | 173 |
| **random** | **83.2** | 89.3 | 80 ms | **546,286** |

对比生产（2026-11-16 实测）：搜索 138–792 ms、word 85 ms、dictionaries 540 ms。**本地 D1 全面更快。**

按 rows_read 折算：典型搜索 2k–6k 行，Paid 的 25 B 行/月约等于 400 万–1,200 万次搜索；Free 的 5 M 行/天约 800–2,500 次搜索/天。

## 4. 召回：98.5%

用生产 API 的 top-10 词头，检查它们是否出现在 D1 的完整匹配池里（13 条查询，含正查、反查、粤拼、1–3 字）：

| 查询 | 匹配池 | 生产 top-10 覆盖 |
| --- | --- | --- |
| 香港 / 唔該 / 香 / 冇 / 電台 / 食飯 / 香港人 / 唔該晒 / 城市 / 好 / 睇 | 243–1,785 | 100% |
| 得 | 892 | 90% |
| hoeng1 gong2 | 935 | 90% |
| **平均** | | **98.5%** |

关键修正过程（两次迭代，都是真实踩坑）：

1. **必须做查询变体展开**。只查「唔該」命中 11 条，加上「唔该」共 28 条；不做简繁展开会漏掉近一半。
   用构建期生成的映射表展开只需 **0.009 ms**，没有 OpenCC 的 103 ms 初始化。
2. **FTS 的 token 之间要用 OR，不是 AND**。Atlas 的 `should` 本质是 OR + 打分；用 AND 会让「香港人」只剩 2 条命中，OR 之后覆盖 100%。
   bm25 会自动把「命中更多 token」的条目排在前面，这正是我们要的行为。

## 5. 排序：需要接入现有二次打分

- 正查 top-1 命中：**7/9**（香港、唔該、香、冇、得、電台、hoeng1 gong2 均正确）。
- 加入「词头完全相等优先」的 boost 后，前三名与生产基本一致（香港 ×4 → 香港腳…）。
- 但 top-10 的**顺序**仍有差异（bm25 vs 生产的二次打分：词条长度、释义丰富度、词典权重）。
- 这不是能力缺失：生产代码里的 `calculateSecondaryScore()` 本来就在 JS 层重排候选，迁移时原样保留即可。

## 6. 并发（单库单线程）

50 个并发搜索「香港」：

- 总耗时 194–207 ms，单请求 p50 169–182 ms，**吞吐 ≈ 250 req/s**。

这是 D1 单库串行的必然结果（4 ms × 50）。对本项目量级足够；再加 Cache API 后，热门查询基本不碰 D1。

## 7. 三个必须的修正

| 问题 | 数据 | 处理 |
| --- | --- | --- |
| `random` 全表扫描 | 83 ms / 546k 行 | 用现成的 `public/recommendations.json`（构建期已生成） |
| 反查最常见字 | 46 ms / 110k 行 | Cache API（按 query 缓存 1 h）+ 监控慢查询 |
| 排序手感 | top-1 7/9 | 迁移时保留 `calculateSecondaryScore` 与分组逻辑 |

## 8. 还没验证的（需要真实 Cloudflare）

1. 真实 D1 的网络 RTT（本地是 unix socket，线上多 1–5 ms）。
2. Workers 的真实 CPU 计费（本地 wrangler dev 拿不到 CPU 指标；需 `wrangler tail` / Analytics）。
3. 真实并发下的 `overloaded` 行为与读复制。
4. 远程导入耗时与 `d1 execute --remote` 的稳定性。
5. 部署本身（需要 Cloudflare 登录）。

## 9. 复现方式

```bash
node scripts/import-to-d1.js                      # 生成 data/d1/seed.sql
npx wrangler d1 execute jyutjyu --local --config wrangler.spike.jsonc --file=data/d1/seed.sql
npx wrangler dev --config wrangler.spike.jsonc --port 8788
node scripts/d1-spike/bench.mjs                   # 延迟 / rows_read
node scripts/d1-spike/coverage.mjs                # 与生产对比召回
node scripts/d1-spike/parity.mjs                  # 与生产对比排序
node scripts/d1-spike/concurrency.mjs             # 并发
```


---

## 10. 集成進展（第二階段，2026-11-16）

### 10.1 已完成

| 模組 | 內容 |
| --- | --- |
| `server/utils/d1.ts` | D1 binding（`__env__.DB` / `event.context.cloudflare.env.DB`）、資料模式 `d1 / mongo / json` |
| `server/utils/d1-entries.ts` | 詞條 ID 查詢、詞典統計、`entry_forms` 精確詞頭查詢 |
| `server/utils/d1-search.ts` | FTS5 搜尋（變體展開 + OR token + bm25 + exact boost），輸出沿用 `buildGroupedSearchResponse` |
| `/api/word/:headword` | D1 精確解析（`entry_forms`），保留原本的 canonical 選擇邏輯 |
| `/api/entry/:id` | D1 直查 + 既有地區過濾 |
| `/api/dictionaries` | D1 `GROUP BY source_book`（原本 540 ms 的 aggregate） |
| `/api/search` | D1 分支：分組、facets、排序全部沿用現有 JS 邏輯 |
| `/api/random` | D1 模式跳過 `random()` 全表掃描，直接用預生成推薦 |
| sitemap 輔助 | `count(DISTINCT canon)` 與 keyset 分頁 |

### 10.2 本地驗證（node:sqlite shim + 真實 273k 資料）

| 檢查 | 結果 |
| --- | --- |
| `getEntryByIdFromD1("hk-cantowords_000278")` | 香港，2 個義項 |
| `getDictionaryStatsFromD1()` | 273,143 條 / 11 部詞典（與生產一致） |
| `findEntriesByForms(["香港"])` | 4 條（與生產 `/api/word` 一致） |
| `findEntriesByForms(["唔該","唔该"])` | 9 條 |
| `searchEntriesFromD1("香港")` | 10 組，首位 香港，**3–4 ms**（warm） |
| `searchEntriesFromD1("城市", reverse)` | 10 組，首位 城市 |
| 粵拼 `hoeng1 gong2` | 首位 香港 |

### 10.3 Workers 打包

`NITRO_PRESET=cloudflare_module npx nuxt build`：

- 產物 **8.15 MB（1.94 MB gzip）**，遠低於 64 MB 上限
- 產出 `.output/server/index.mjs` + `.output/public` + `_headers`
- `wrangler.app.jsonc` 已配置 `main`、`assets`、`d1_databases`

### 10.4 已知缺口（下一步）

1. `/api/suggest` 與 `/word/:headword/related` 仍走 Mongo。
2. `browse-index.ts` / `sitemap-browse.ts` 仍有 `node:fs` 讀取，Workers 上需改走 `ASSETS` binding（`fetchAssetJson`）。
3. 限流仍是進程內 Map（Workers 每個 isolate 一份），需換 Durable Object 或 D1 令牌桶。
4. 全應用 `wrangler dev` 在本次沙箱環境因 esbuild service `spawn EBADF` 無法啟動（spike worker 先前可正常運行）；需在一般環境重跑。
5. `@nuxtjs/i18n` 8.x 與 Nuxt 4 的 unhead v2 不相容，暫時以 root `unhead@1.11` 解決；長期應升級到 i18n v10。
6. 搜尋排序仍需接回 `calculateSecondaryScore`（目前 D1 只做 exact + bm25）。



---

## 11. 第三階段：i18n v10 升級 + Workers 資產讀取

### 11.1 @nuxtjs/i18n 8.5.6 → 10.4.1

升級後**不再需要 unhead v1 的 workaround**（root `unhead` 已移除），但踩了三個坑：

| 坑 | 現象 | 解法 |
| --- | --- | --- |
| `vueI18n` 相對路徑被當成 `i18n/` 底下 | `Vue I18n configuration file ./i18n.config.ts not found in .../i18n`，訊息全部載入失敗 | 傳**絕對路徑**（`fileURLToPath(new URL(...))`） |
| config 內的相對 import 被 Nitro prerender 外部化成 `/locales/...` | prerender 500：`Cannot find module '/locales/en.source.mjs'` | 訊息改由 `plugins/i18n-messages.ts` 在執行時註冊，不再放進 `i18n.config.ts` |
| Cloudflare preset 的 prerender payload cache 不接受 key `"/"` | `[unstorage] Invalid key: "/"` | 關掉 `experimental.payloadExtraction`（payload 內嵌 HTML） |

結果：`0` 個 `[intlify] Not found` 警告，五個語系的預渲染 HTML 都正確（`粵語辭叢` / `Search`）。

### 11.2 移除 Worker 上的 `node:fs`

| 檔案 | 改動 |
| --- | --- |
| `server/utils/browse-index.ts` | 字典 JSON / chunk manifest 改走 `fetchAssetJson`（ASSETS binding） |
| `server/utils/sitemap-browse.ts` | 字典 id 清單改讀 `/browse-index/manifest.json` 或 `/dictionaries/index.json` |
| `server/utils/sitemap-meta.ts` | lastmod 改讀 `index.json` 的 `last_updated`，不再 `stat` 檔案 |

### 11.3 搜尋建議改走 D1

`getHeadwordSuggestions` 在 D1 模式下改呼叫 `getHeadwordSuggestionsFromD1`（FTS 前綴 + 詞頭前綴 boost），
不再讀 8.2 MB 的 `search-suggestions/records.json`。

實測：`香港` 0.5 ms、`唔該` 4.1 ms（首次 75 ms 為模組初始化）。

### 11.4 目前狀態

- `npm test`：98/98
- `eslint`：0 errors
- `NITRO_PRESET=cloudflare_module npx nuxt build`：成功
- 仍未處理：限流（進程內 Map）、related words 走 JSON/ASSETS 回退、搜尋二次打分、部署（需登入）



---

## 12. 部署結果（2026-11-16）

| 項目 | 值 |
| --- | --- |
| Worker URL | https://jyutjyu.huangjunxin.workers.dev |
| 帳號 | huangjunxin@live.cn（9e0a4763…） |
| D1 | `jyutjyu` / `1a45931d-5323-457b-a39e-bf73dd841cde`（APAC） |
| D1 大小 | 332.5 MB |
| 匯入 | 81,956 條語句，2,189,163 rows written，57.8 s |
| 部署 | 15,606 個靜態資產 + Worker 9.9 MB（gzip 1.96 MB） |
| Startup time | 264 ms |

### 12.1 驗證

| 路徑 | 狀態 | 冷啟 | 暖機 |
| --- | --- | --- | --- |
| `/` | 200 | 471 ms | - |
| `/browse/` | 200 | 433 ms | - |
| `/en/`、`/zh-Hant/` | 200 | ~370 ms | - |
| `/word/香港`（SSR） | 200 | 380–680 ms | 53–79 ms |
| `/api/search?q=香港` | 200 | 564 ms | 84–108 ms |
| `/api/word/香港` | 200 | 382 ms | 53–79 ms |
| `/api/dictionaries` | 200 | 1.1 s | - |
| `/api/suggest?q=香港` | 200 | - | 10 條建議 |
| `/api/random` | 200 | 1.0 s | - |

- 簡體查詢（唔该）、粵拼（hoeng1 gong2）、反查（城市）都正常。
- 30 並發搜尋 + 10 並發 SSR：全部 200，沒有 1102（CPU 超限）。
- 搜尋排序：香港 ×4 → 香港腳，與生產一致。

### 12.2 Free 方案限制

- `wrangler.jsonc` 的 `limits.cpu_ms` **必須移除**（Free 不支援），部署才能成功；升級 Paid 後再加回。
- 冷啟 0.4–1.1 s（Free 沒有保溫），暖請求 50–110 ms。
- 100k 請求/天、D1 5M 行讀/天、單庫 500 MB（目前 332 MB，餘量 33%）。
- 靜態資產 15,606 / 20,000 檔，已用 78%。

### 12.3 待辦

1. 升級 Workers Paid（$5）以恢復 CPU 上限、避免冷啟、放寬 D1 額度。
2. 綁定自訂網域（目前 jyutjyu.com 在另一個帳號）。
3. 限流改 Durable Object / D1。
4. 搜尋接入 `calculateSecondaryScore`，讓排序完全對齊生產。



---

## 13. 自訂網域與 DNS（2026-11-16）

### 13.1 現況

| 項目 | 值 |
| --- | --- |
| Zone | `jyutjyu.com`（id `0ada3072…`，status active，NS quincy/sydney） |
| Worker Routes | `jyutjyu.com/*`、`www.jyutjyu.com/*` |
| 憑證 | Let's Encrypt `CN=jyutjyu.com`，2026-11-16 → 2027-02-14 |
| `https://jyutjyu.com/` | 200，與 workers.dev **同一個 build**（SHA256 一致） |
| `https://www.jyutjyu.com/` | 301 → `https://jyutjyu.com/`（含 /api/*） |
| `http://jyutjyu.com/` | **200（未強制 HTTPS）** |
| `/api/browse` on apex | 200（舊生產是 503，可證明已由新 Worker 接手） |

### 13.2 為什麼用 Zone Route 而不是 Custom Domain

Custom Domain 要求該 hostname 沒有既有 A/CNAME 記錄；apex 目前仍有舊來源的記錄，
而目前的 OAuth token 沒有 `DNS:Edit` 權限，無法刪除。改用 Zone Route：

- 只要 DNS 是 proxied（橘雲），Worker 就攔截該 host 的所有請求；
- 舊來源保留為 fallback，移除 route 即回滾；
- 不需要改動 DNS 記錄。

### 13.3 待辦（需要 Zone Settings 權限）

1. **Always Use HTTPS**：目前 `http://` 仍回 200，需要在
   Dashboard → jyutjyu.com → SSL/TLS → Edge Certificates → Always Use HTTPS 開啟。
   目前的 token 只有 `zone:read`，API 會回 403。
2. 可選：開 HSTS、把 SSL 模式設為 Full (strict)。
3. 之後若要改用 Custom Domain，需要 `DNS:Edit` 刪除 apex 既有記錄。


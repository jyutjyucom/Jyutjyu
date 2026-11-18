# D1 稳定 id 与增量更新

本文记录 `entries.id` 的生成规则、为什么不再用顺序编号，以及日常更新/全量重灌的正确做法。

## 1. 为什么不用顺序 id

D1 里 `entries.id` 是 `INTEGER PRIMARY KEY`（rowid），原来按「index.json 里的词典顺序 → 分片拼接顺序」递增分配。这意味着：

- 任何词典增删一条，它后面所有词条的 id 都会整体顺移；
- 分片词典重新导出、分片边界变化，也会让顺序漂移；
- 增量 SQL 按快照算出来的 id，可能已经和线上对不上——2026-11 就因为这个问题误删过 159 条词条。

## 2. 现在的规则

`id = (sha256(entry_id) 的前 8 字节) & 0x7FFF_FFFF_FFFF_FFFF`，即 63-bit 正整数。

- 实现：[`scripts/utils/stable-id.js`](../scripts/utils/stable-id.js)；
- `scripts/import-to-d1.js`（全量 seed）和 `scripts/d1-delta.js`（增量）共用同一个函数，所以两边算出来的 id 必然一致；
- 构建时会检查碰撞（27 万条约 4e-9），撞了直接让 build 失败，不会悄悄写坏。

`entry_id` 是业务键，也是 URL/反馈里用的标识：

- gz-* / kp / qz：书内编号（`gz-modern_022357`）；
- cantowords / wiktionary：站点/页面 id；
- **台山**：由源字段生成 `ts-english-dict_<sha1(RecordType|号|部|画|繁|简|GPS|汉拼|Nos.)[0:12]>`，同词多义（如「再說」两个义项）追加释义哈希后缀。

所以：改释义/读音/例句 → id 不变，走 UPDATE；增删词条 → 只影响自己；重分片/重导 → 不受顺序影响。

## 3. 为什么 seed 按 id 排序写出

SQLite 的 rowid 是 B+ 树：按 id 升序插入等于一直往最右叶子追加，页填充率约 85–90%；随机顺序插入平均只有 ~57%，同样数据会多占三成空间。

`import-to-d1.js` 现在先把行按 id 高 8 位分 256 个桶落盘，再逐桶按 id 排序写出，所以是全序插入。实测本地库 438MB → 406MB（线上 449MB → 414MB）。

## 4. 已知代价

- **FTS 比顺序 id 大**：FTS5 的 doclist 用 docid 差分编码。62-bit 随机 docid 每个 posting 要 6–9 字节，顺序 id 只要 1–2 字节，实测 `entry_fts_data` 140MB vs 74MB。这是「无状态稳定 id」的固有成本，排序治不了；只有改成持久自增映射才能省，但那会把外部状态请回来，暂不采用。
- **id 超过 JS 安全整数**（> 2^53）。`wrangler d1 execute --json` 会把 id 四舍五入（例如 `523770416880854416` 输出成 `523770416880854400`）。**不要用 JSON 数字比较 id**，要么用字符串，要么用 BigInt。
- **台山 entry_id 变过**，旧 `ts-english-dict_016353` 这类 id 已失效；站内链接走 headword，一般不受影响。

## 5. 日常更新（增量）

```bash
# 1) 重建变动的词典
npm run build:data:gzm

# 2) 和「上一次上线时的快照」比对，生成增量 SQL
node scripts/d1-delta.js \
  --old <上次上线快照的 public/dictionaries 目录> \
  --out data/d1/delta.sql

# 3) 应用
npx wrangler d1 execute jyutjyu --remote --config wrangler.jsonc \
  --file=data/d1/delta.sql -y
```

- 快照就是上次发布时的 `public/dictionaries`（对应某个 git 提交，可用 `git worktree add` 取出）；
- 没有变化时 delta 只包含一行注释；
- `--id-map` 仍然保留，但正常流程不再需要它——只有在有人手工改过 D1 行 id 时才要用来兜底。

## 6. 全量重灌（首次建库 / 灾难恢复 / 改 id 规则）

```bash
npm run build:d1
npx wrangler d1 execute jyutjyu --remote --config wrangler.jsonc \
  --file=data/d1/seed.sql -y
```

- 约 8.2 万条语句、220 万行写、3–5 分钟；
- seed 开头是 `DROP TABLE` + `CREATE`，**导入期间 D1 不可用**，挑低峰做；
- 需要 Workers Paid（免费档每天 10 万行写，不够）。

## 7. 校验

线上：

```sql
SELECT (SELECT count(*) FROM entries) AS n,
       (SELECT count(DISTINCT id) FROM entries) AS distinct_ids,
       (SELECT count(*) FROM entry_forms) AS forms,
       (SELECT count(*) FROM entry_fts) AS fts;
```

本地（不碰线上）：

```bash
sqlite3 /tmp/check.db < data/d1/seed.sql
sqlite3 /tmp/check.db "PRAGMA page_count; PRAGMA freelist_count;"
sqlite3 /tmp/check.db "CREATE VIRTUAL TABLE temp.st USING dbstat;
                       SELECT name, sum(pgsize) FROM st GROUP BY name ORDER BY 2 DESC;"
```

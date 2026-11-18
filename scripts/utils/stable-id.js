import { createHash } from "node:crypto";

/**
 * 由 entry_id 派生稳定的 63-bit 正整数，作为 D1 entries.id（FTS rowid、forms 外键）。
 *
 * 为什么不用顺序编号：id 一旦依赖“第几条”，增删/重分片就会让后面全部顺移，
 * 增量更新就会打错行。改成 entry_id 的哈希后，id 只由业务键决定：
 *   - 改释义/读音 → id 不变，走 UPDATE
 *   - 增删词条 → 只有该词条的 id 增删，不影响其他行
 *
 * 63 bit 的碰撞概率：27 万条约 4e-9，构建时会校验并报错。
 */
export function stableId(entryId) {
  const digest = createHash("sha256").update(String(entryId), "utf8").digest();
  const value = digest.readBigUInt64BE(0) & 0x7fffffffffffffffn;
  return value === 0n ? 1n : value;
}

export function stableIdText(entryId) {
  return stableId(entryId).toString();
}

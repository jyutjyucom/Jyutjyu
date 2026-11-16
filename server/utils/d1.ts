/**
 * D1 綁定與資料模式
 *
 * 模式優先順序：
 *   1. 明確設定 JYUTJYU_DATA_MODE=d1|mongo|json
 *   2. 有 D1 binding（Workers 或 wrangler dev）→ d1
 *   3. 有 MONGODB_URI / NUXT_PUBLIC_USE_API=true → mongo
 *   4. 其餘 → json（靜態檔案）
 */

import { getIsServerApiEnabled } from "./runtime-mode.ts";

export interface D1Result<T> {
  results: T[];
  success?: boolean;
  meta?: { duration?: number; rows_read?: number; rows_written?: number };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
}

export type ServerDataMode = "d1" | "mongo" | "json";

type CloudflareContext = {
  context?: { cloudflare?: { env?: { DB?: D1Database } } };
};

export const getD1Binding = (event?: CloudflareContext): D1Database | null => {
  const fromContext = event?.context?.cloudflare?.env?.DB;
  if (fromContext) return fromContext;

  const globalEnv = (
    globalThis as typeof globalThis & { __env__?: { DB?: D1Database } }
  ).__env__;
  return globalEnv?.DB ?? null;
};

export const getServerDataMode = (event?: CloudflareContext): ServerDataMode => {
  const explicit = String(process.env.JYUTJYU_DATA_MODE || "")
    .trim()
    .toLowerCase();

  if (explicit === "d1" || explicit === "mongo" || explicit === "json") {
    return explicit;
  }

  if (getD1Binding(event)) {
    return "d1";
  }

  return getIsServerApiEnabled() ? "mongo" : "json";
};

export const requireD1 = (event?: CloudflareContext): D1Database => {
  const db = getD1Binding(event);
  if (!db) {
    throw new Error("D1 binding (DB) 未配置");
  }
  return db;
};

export const buildPlaceholders = (count: number): string =>
  new Array(count).fill("?").join(", ");

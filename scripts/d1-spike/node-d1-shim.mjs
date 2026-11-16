import { DatabaseSync } from "node:sqlite";

const file = process.argv[2];
const db = new DatabaseSync(file, { readOnly: true });

const makeStatement = (sql) => {
  const stmt = db.prepare(sql);
  const api = (...args) => ({
    all: async () => ({ results: stmt.all(...args), success: true, meta: {} }),
    first: async () => stmt.get(...args) ?? null,
    run: async () => stmt.run(...args),
  });
  return {
    bind: (...args) => api(...args),
    all: async () => ({ results: stmt.all(), success: true, meta: {} }),
    first: async () => stmt.get() ?? null,
    run: async () => stmt.run(),
  };
};

export const d1 = { prepare: (sql) => makeStatement(sql) };

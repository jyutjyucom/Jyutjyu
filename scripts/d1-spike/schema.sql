-- Jyutjyu D1 schema (search spike)
DROP TABLE IF EXISTS entry_fts;
DROP TABLE IF EXISTS entry_forms;
DROP TABLE IF EXISTS entries;

CREATE TABLE entries (
  id           INTEGER PRIMARY KEY,
  entry_id     TEXT NOT NULL UNIQUE,
  source_book  TEXT NOT NULL,
  dialect      TEXT,
  entry_type   TEXT,
  canon        TEXT NOT NULL,
  hw           TEXT,
  jp           TEXT,
  restricted   INTEGER NOT NULL DEFAULT 0,
  payload      TEXT NOT NULL
);

CREATE TABLE entry_forms (
  key      TEXT NOT NULL,
  entry_id INTEGER NOT NULL,
  PRIMARY KEY (key, entry_id)
) WITHOUT ROWID;

CREATE INDEX idx_entries_canon  ON entries(canon);
CREATE INDEX idx_entries_source ON entries(source_book);
CREATE INDEX idx_entries_type   ON entries(entry_type);
CREATE INDEX idx_entries_dialect ON entries(dialect);

CREATE VIRTUAL TABLE entry_fts USING fts5(
  hw, vars, jp, kw, def,
  content='',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 0'
);

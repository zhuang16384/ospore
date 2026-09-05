/**
 * SQLite connection + schema migrations (better-sqlite3).
 *
 * Pure `better-sqlite3` with zero Electron imports so the whole module is
 * unit-testable under plain Node. Electron-aware wiring (data dir resolution,
 * singleton lifecycle) lives in `./index.ts`.
 */

import Database from 'better-sqlite3'

export type SqliteDatabase = Database.Database
export type SqliteStatement<Params extends unknown[], Result> = Database.Statement<Params, Result>

/** Bump + add a `from < n` block in migrate() to ship a new schema. */
const SCHEMA_VERSION = 1

/** File name of the database inside the resolved data dir. */
export const DB_FILE_NAME = 'ospore.db'

export function openDatabase(dataDir: string): SqliteDatabase {
  const db = new Database(`${dataDir}/${DB_FILE_NAME}`)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}

function migrate(db: SqliteDatabase): void {
  const from = db.pragma('user_version', { simple: true }) as number
  if (from >= SCHEMA_VERSION) return

  db.transaction(() => {
    if (from < 1) {
      db.exec(`
        -- created_at / updated_at: Unix seconds since the epoch, UTC.
        CREATE TABLE projects (
          id          TEXT PRIMARY KEY,
          name        TEXT NOT NULL,
          archived    INTEGER NOT NULL DEFAULT 0,
          created_at  INTEGER NOT NULL,
          updated_at  INTEGER NOT NULL
        );

        CREATE TABLE columns (
          id          TEXT PRIMARY KEY,
          project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          name        TEXT NOT NULL,
          position    INTEGER NOT NULL,
          created_at  INTEGER NOT NULL,
          updated_at  INTEGER NOT NULL
        );
        CREATE INDEX idx_columns_project ON columns(project_id, position);

        CREATE TABLE cards (
          id          TEXT PRIMARY KEY,
          column_id   TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
          title       TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          position    INTEGER NOT NULL,
          created_at  INTEGER NOT NULL,
          updated_at  INTEGER NOT NULL
        );
        CREATE INDEX idx_cards_column ON cards(column_id, position);
      `)
    }
    db.pragma(`user_version = ${SCHEMA_VERSION}`)
  })()
}

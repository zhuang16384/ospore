/**
 * Electron-aware lifecycle for the Kanban store.
 *
 * The data root honors `OSPORE_DATA_DIR` (used by E2E to keep runs off the
 * real user data) and falls back to Electron's `userData`. `setupDatabase()`
 * is called eagerly from onReady and hands the store to the IPC layer.
 */

import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { openDatabase, type SqliteDatabase } from './database'
import { createKanbanStore, type KanbanStore } from './store'

let db: SqliteDatabase | null = null

export function resolveDataDir(): string {
  const override = process.env['OSPORE_DATA_DIR']
  if (override && override.trim() !== '') return override
  return app.getPath('userData')
}

/** Eagerly open the database; idempotent. Called from onReady(). */
export function setupDatabase(): KanbanStore {
  if (db) return createKanbanStore(db)
  const dataDir = resolveDataDir()
  mkdirSync(dataDir, { recursive: true })
  db = openDatabase(dataDir)
  return createKanbanStore(db)
}

/** Close the connection cleanly (app quit). Safe to call twice. */
export function closeDatabase(): void {
  db?.close()
  db = null
}

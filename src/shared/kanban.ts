/**
 * Kanban domain types, shared by main (DB + IPC), preload (bridge typing) and
 * renderer (store + UI). Column and card ordering is a dense 0..n-1 integer
 * `position` maintained by the store layer; consumers only ever read it.
 *
 * Timestamps are Unix seconds since the epoch, UTC — see `@shared/time`
 * for the canonical helpers.
 */

/** Entities carry creation/update timestamps (Unix seconds, UTC). */
export interface Timestamped {
  createdAt: number
  updatedAt: number
}

export interface Project extends Timestamped {
  id: string
  name: string
  archived: boolean
}

export interface BoardColumn extends Timestamped {
  id: string
  projectId: string
  name: string
  position: number
}

export interface BoardCard extends Timestamped {
  id: string
  columnId: string
  title: string
  description: string
  position: number
}

export interface ColumnWithCards extends BoardColumn {
  cards: BoardCard[]
}

/** Full board snapshot for one project: the unit mutations return. */
export interface Board {
  project: Project
  columns: ColumnWithCards[]
}

/** Partial update payload for `card:update`. */
export interface CardChanges {
  title?: string
  description?: string
}

/** Columns created with every new project. */
export const DEFAULT_COLUMN_NAMES: readonly string[] = ['Backlog', 'To Do', 'In Progress', 'Done']

/** Shared input limits so the UI can mirror main-process validation. */
export const MAX_NAME_LENGTH = 120
export const MAX_DESCRIPTION_LENGTH = 5000

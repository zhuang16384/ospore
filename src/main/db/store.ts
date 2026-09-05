/**
 * Kanban data access — the whole persistence surface behind IPC.
 *
 * Conventions:
 * - Ordering is a dense 0..n-1 integer `position` per column (and per board
 *   for columns). Every reorder rewrites the affected sibling positions inside
 *   one transaction, so positions can never drift or collide.
 * - Mutations answer with the "new truth": project ops return the full
 *   re-fetched project list, board ops the full board snapshot. The renderer
 *   stores the answer verbatim and never patches local state.
 * - All input validation happens here (IPC hands over untrusted `unknown`s),
 *   so both hand-written calls and IPC agree on one rule set.
 */

import { randomUUID } from 'node:crypto'
import { DEFAULT_COLUMN_NAMES, MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH } from '@shared/kanban'
import type { Board, BoardCard, BoardColumn, CardChanges, Project, Timestamped } from '@shared/kanban'
import { unixSecondsNow } from '@shared/time'
import type { SqliteDatabase, SqliteStatement } from './database'

export interface KanbanStore {
  listProjects(): Project[]
  createProject(name: string): Project[]
  renameProject(id: string, name: string): Project[]
  setProjectArchived(id: string, archived: boolean): Project[]
  deleteProject(id: string): Project[]

  getBoard(projectId: string): Board
  createColumn(projectId: string, name: string): Board
  renameColumn(columnId: string, name: string): Board
  deleteColumn(columnId: string): Board
  moveColumn(columnId: string, toIndex: number): Board

  createCard(columnId: string, title: string, description?: string): Board
  updateCard(cardId: string, changes: CardChanges): Board
  deleteCard(cardId: string): Board
  moveCard(cardId: string, toColumnId: string, toIndex: number): Board
}

/** DB-row timestamp columns; snake_case twin of shared `Timestamped`. */
interface RowTimestamps {
  created_at: number
  updated_at: number
}

interface ProjectRow extends RowTimestamps {
  id: string
  name: string
  archived: number
}

interface ColumnRow extends RowTimestamps {
  id: string
  project_id: string
  name: string
  position: number
}

interface CardRow extends RowTimestamps {
  id: string
  column_id: string
  title: string
  description: string
  position: number
}

export function createKanbanStore(db: SqliteDatabase): KanbanStore {
  const qProject = db.prepare<[string], ProjectRow>('SELECT * FROM projects WHERE id = ?')
  const qColumn = db.prepare<[string], ColumnRow>('SELECT * FROM columns WHERE id = ?')
  const qCard = db.prepare<[string], CardRow>('SELECT * FROM cards WHERE id = ?')
  const qProjects = db.prepare<[], ProjectRow>('SELECT * FROM projects ORDER BY created_at, rowid')
  const qColumnsByProject = db.prepare<[string], ColumnRow>(
    'SELECT * FROM columns WHERE project_id = ? ORDER BY position'
  )
  const qCardsByColumn = db.prepare<[string], CardRow>(
    'SELECT * FROM cards WHERE column_id = ? ORDER BY position'
  )
  const qMaxColumnPosition = db.prepare<[string], { max: number | null }>(
    'SELECT MAX(position) AS max FROM columns WHERE project_id = ?'
  )
  const qMaxCardPosition = db.prepare<[string], { max: number | null }>(
    'SELECT MAX(position) AS max FROM cards WHERE column_id = ?'
  )
  const iProject = db.prepare(
    'INSERT INTO projects (id, name, archived, created_at, updated_at) VALUES (?, ?, 0, ?, ?)'
  )
  const iColumn = db.prepare(
    'INSERT INTO columns (id, project_id, name, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const iCard = db.prepare(
    'INSERT INTO cards (id, column_id, title, description, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const uProjectName = db.prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?')
  const uProjectArchived = db.prepare(
    'UPDATE projects SET archived = ?, updated_at = ? WHERE id = ?'
  )
  const uColumnName = db.prepare('UPDATE columns SET name = ?, updated_at = ? WHERE id = ?')
  const uColumnPosition = db.prepare('UPDATE columns SET position = ? WHERE id = ?')
  const uCard = db.prepare(
    'UPDATE cards SET title = ?, description = ?, updated_at = ? WHERE id = ?'
  )
  const uCardPosition = db.prepare(
    'UPDATE cards SET column_id = ?, position = ?, updated_at = ? WHERE id = ?'
  )
  const dProject = db.prepare('DELETE FROM projects WHERE id = ?')
  const dColumn = db.prepare('DELETE FROM columns WHERE id = ?')
  const dCard = db.prepare('DELETE FROM cards WHERE id = ?')

  const now = unixSecondsNow

  // -- validation -----------------------------------------------------------

  function requireName(raw: unknown, field: string): string {
    if (typeof raw !== 'string') throw new Error(`${field} must be a string`)
    const name = raw.trim()
    if (name.length === 0) throw new Error(`${field} cannot be empty`)
    if (name.length > MAX_NAME_LENGTH) {
      throw new Error(`${field} cannot exceed ${MAX_NAME_LENGTH} characters`)
    }
    return name
  }

  function requireId(raw: unknown, entity: string): string {
    if (typeof raw !== 'string' || raw.length === 0) throw new Error(`${entity} id is required`)
    return raw
  }

  // -- row mappers ----------------------------------------------------------

  const timestamps = (r: RowTimestamps): Timestamped => ({
    createdAt: r.created_at,
    updatedAt: r.updated_at
  })

  const toProject = (r: ProjectRow): Project => ({
    id: r.id,
    name: r.name,
    archived: r.archived !== 0,
    ...timestamps(r)
  })

  const toColumn = (r: ColumnRow): BoardColumn => ({
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    position: r.position,
    ...timestamps(r)
  })

  const toCard = (r: CardRow): BoardCard => ({
    id: r.id,
    columnId: r.column_id,
    title: r.title,
    description: r.description,
    position: r.position,
    ...timestamps(r)
  })

  // -- internal readers -----------------------------------------------------

  /** Fetch one row by id or throw the store's standard not-found error. */
  function requireRow<Row>(
    stmt: SqliteStatement<[string], Row>,
    id: string,
    entity: string
  ): Row {
    const row = stmt.get(id)
    if (!row) throw new Error(`${entity} not found: ${id}`)
    return row
  }

  const getProjectRow = (id: string): ProjectRow => requireRow(qProject, id, 'Project')
  const getColumnRow = (id: string): ColumnRow => requireRow(qColumn, id, 'Column')

  function listProjects(): Project[] {
    return qProjects.all().map(toProject)
  }

  function boardOf(projectId: string): Board {
    const project = toProject(getProjectRow(projectId))
    const columns = qColumnsByProject.all(projectId).map((row) => ({
      ...toColumn(row),
      cards: qCardsByColumn.all(row.id).map(toCard)
    }))
    return { project, columns }
  }

  /** Board the given column belongs to (before any destructive op). */
  function boardOfColumn(columnId: string): Board {
    return boardOf(getColumnRow(columnId).project_id)
  }

  /** Board the given card belongs to (before any destructive op). */
  function boardOfCard(cardId: string): Board {
    return boardOf(getColumnRow(getCardRow(cardId).column_id).project_id)
  }

  const getCardRow = (id: string): CardRow => requireRow(qCard, id, 'Card')

  // -- reorder helpers ------------------------------------------------------

  /** Rewrite dense positions for a column's cards, given the desired id order. */
  const rewriteCards = db.transaction((columnId: string, orderedIds: string[]) => {
    orderedIds.forEach((id, index) => {
      uCardPosition.run(columnId, index, now(), id)
    })
  })

  const rewriteColumns = db.transaction((orderedIds: string[]) => {
    orderedIds.forEach((id, index) => {
      uColumnPosition.run(index, id)
    })
  })

  function clampIndex(index: number, length: number): number {
    if (!Number.isFinite(index)) return length
    return Math.min(Math.max(Math.trunc(index), 0), length)
  }

  /** `ids` with `movedId` taken out and re-inserted at `toIndex` (clamped). */
  function reordered(ids: string[], movedId: string, toIndex: number): string[] {
    const without = ids.filter((id) => id !== movedId)
    without.splice(clampIndex(toIndex, without.length), 0, movedId)
    return without
  }

  /** First free slot among a parent's children (dense positions: 0..n-1). */
  function nextPosition(
    stmt: SqliteStatement<[string], { max: number | null }>,
    parentId: string
  ): number {
    return (stmt.get(parentId)?.max ?? -1) + 1
  }

  // -- store ----------------------------------------------------------------

  const store: KanbanStore = {
    listProjects,

    createProject(rawName: string): Project[] {
      const name = requireName(rawName, 'Project name')
      const id = randomUUID()
      const ts = now()
      db.transaction(() => {
        iProject.run(id, name, ts, ts)
        DEFAULT_COLUMN_NAMES.forEach((columnName, index) => {
          iColumn.run(randomUUID(), id, columnName, index, ts, ts)
        })
      })()
      return listProjects()
    },

    renameProject(rawId: string, rawName: string): Project[] {
      const id = requireId(rawId, 'Project')
      const name = requireName(rawName, 'Project name')
      getProjectRow(id) // 404 check
      uProjectName.run(name, now(), id)
      return listProjects()
    },

    setProjectArchived(rawId: string, rawArchived: boolean): Project[] {
      const id = requireId(rawId, 'Project')
      if (typeof rawArchived !== 'boolean') throw new Error('archived must be a boolean')
      getProjectRow(id) // 404 check
      uProjectArchived.run(rawArchived ? 1 : 0, now(), id)
      return listProjects()
    },

    deleteProject(rawId: string): Project[] {
      const id = requireId(rawId, 'Project')
      dProject.run(id) // columns + cards cascade
      return listProjects()
    },

    getBoard(rawProjectId: string): Board {
      return boardOf(requireId(rawProjectId, 'Project'))
    },

    createColumn(rawProjectId: string, rawName: string): Board {
      const projectId = requireId(rawProjectId, 'Project')
      const name = requireName(rawName, 'Column name')
      getProjectRow(projectId) // 404 check
      const position = nextPosition(qMaxColumnPosition, projectId)
      const ts = now()
      iColumn.run(randomUUID(), projectId, name, position, ts, ts)
      return boardOf(projectId)
    },

    renameColumn(rawColumnId: string, rawName: string): Board {
      const columnId = requireId(rawColumnId, 'Column')
      const name = requireName(rawName, 'Column name')
      uColumnName.run(name, now(), columnId)
      return boardOfColumn(columnId)
    },

    deleteColumn(rawColumnId: string): Board {
      const columnId = requireId(rawColumnId, 'Column')
      const projectId = getColumnRow(columnId).project_id // resolve before the cascade
      dColumn.run(columnId)
      return boardOf(projectId)
    },

    moveColumn(rawColumnId: string, rawToIndex: number): Board {
      const columnId = requireId(rawColumnId, 'Column')
      const { project_id: projectId } = getColumnRow(columnId)
      const orderedIds = reordered(
        qColumnsByProject.all(projectId).map((row) => row.id),
        columnId,
        rawToIndex
      )
      rewriteColumns(orderedIds)
      return boardOf(projectId)
    },

    createCard(rawColumnId: string, rawTitle: string, rawDescription?: string): Board {
      const columnId = requireId(rawColumnId, 'Column')
      const title = requireName(rawTitle, 'Card title')
      const description =
        typeof rawDescription === 'undefined' ? '' : requireDescription(rawDescription)
      getColumnRow(columnId) // 404 check
      const position = nextPosition(qMaxCardPosition, columnId)
      const ts = now()
      iCard.run(randomUUID(), columnId, title, description, position, ts, ts)
      return boardOfColumn(columnId)
    },

    updateCard(rawCardId: string, changes: CardChanges): Board {
      const cardId = requireId(rawCardId, 'Card')
      if (changes === null || typeof changes !== 'object') {
        throw new Error('Card changes must be an object')
      }
      const existing = getCardRow(cardId)
      const title =
        typeof changes.title === 'undefined'
          ? existing.title
          : requireName(changes.title, 'Card title')
      const description =
        typeof changes.description === 'undefined'
          ? existing.description
          : requireDescription(changes.description)
      uCard.run(title, description, now(), cardId)
      return boardOfCard(cardId)
    },

    deleteCard(rawCardId: string): Board {
      const cardId = requireId(rawCardId, 'Card')
      const projectId = boardOfCard(cardId).project.id // resolve before the delete
      dCard.run(cardId)
      return boardOf(projectId)
    },

    moveCard(rawCardId: string, rawToColumnId: string, rawToIndex: number): Board {
      const cardId = requireId(rawCardId, 'Card')
      const toColumnId = requireId(rawToColumnId, 'Column')
      const card = getCardRow(cardId)
      const destColumn = getColumnRow(toColumnId)
      const sourceColumn = getColumnRow(card.column_id)
      if (destColumn.project_id !== sourceColumn.project_id) {
        throw new Error('Cannot move a card across projects')
      }

      const destinationIds = reordered(
        qCardsByColumn.all(toColumnId).map((row) => row.id),
        cardId,
        rawToIndex
      )
      if (card.column_id === toColumnId) {
        rewriteCards(toColumnId, destinationIds)
      } else {
        const sourceIds = qCardsByColumn
          .all(card.column_id)
          .map((row) => row.id)
          .filter((id) => id !== cardId)
        db.transaction(() => {
          rewriteCards(card.column_id, sourceIds)
          rewriteCards(toColumnId, destinationIds)
        })()
      }
      return boardOf(destColumn.project_id)
    }
  }

  function requireDescription(raw: unknown): string {
    if (typeof raw !== 'string') throw new Error('Card description must be a string')
    const description = raw.trim()
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(`Card description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`)
    }
    return description
  }

  return store
}

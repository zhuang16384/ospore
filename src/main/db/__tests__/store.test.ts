import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type SqliteDatabase } from '../database'
import { createKanbanStore, type KanbanStore } from '../store'

/** Real SQLite in a throwaway dir — exercises schema, cascades and reorders. */
describe('kanban store', () => {
  let db: SqliteDatabase
  let store: KanbanStore
  let dataDir: string

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'ospore-store-test-'))
    db = openDatabase(dataDir)
    store = createKanbanStore(db)
  })

  afterEach(() => {
    db.close()
    rmSync(dataDir, { recursive: true, force: true })
  })

  // -- projects -------------------------------------------------------------

  it('creates a project with the default columns', () => {
    const projects = store.createProject('Prototype')
    expect(projects).toHaveLength(1)
    expect(projects[0]).toMatchObject({ name: 'Prototype', archived: false })

    const board = store.getBoard(projects[0].id)
    expect(board.columns.map((c) => c.name)).toEqual(['Backlog', 'To Do', 'In Progress', 'Done'])
    expect(board.columns.map((c) => c.position)).toEqual([0, 1, 2, 3])
  })

  it('persists across connections (restart survival)', () => {
    const [project] = store.createProject('Keep')
    const backlog = store.getBoard(project.id).columns[0]
    store.createCard(backlog.id, 'Survives')

    db.close()
    db = openDatabase(dataDir)
    store = createKanbanStore(db)

    const projects = store.listProjects()
    expect(projects.map((p) => p.name)).toEqual(['Keep'])
    const cards = store.getBoard(project.id).columns[0].cards
    expect(cards.map((c) => c.title)).toEqual(['Survives'])
  })

  it('rejects empty and whitespace-only project names', () => {
    expect(() => store.createProject('   ')).toThrow('cannot be empty')
    expect(() => store.renameProject('missing', '')).toThrow('cannot be empty')
  })

  it('renames and archives projects', () => {
    const [project] = store.createProject('Old')
    let projects = store.renameProject(project.id, 'New')
    expect(projects[0].name).toBe('New')

    projects = store.setProjectArchived(project.id, true)
    expect(projects[0].archived).toBe(true)

    projects = store.setProjectArchived(project.id, false)
    expect(projects[0].archived).toBe(false)
  })

  it('throws on unknown project ids', () => {
    expect(() => store.getBoard('missing')).toThrow('Project not found')
    expect(() => store.renameProject('missing', 'x')).toThrow()
  })

  it('deleting a project cascades columns and cards', () => {
    const [project] = store.createProject('Doomed')
    const backlog = store.getBoard(project.id).columns[0]
    store.createCard(backlog.id, 'Card')

    store.deleteProject(project.id)

    expect(store.listProjects()).toHaveLength(0)
    expect(db.prepare('SELECT COUNT(*) AS n FROM columns').get()).toEqual({ n: 0 })
    expect(db.prepare('SELECT COUNT(*) AS n FROM cards').get()).toEqual({ n: 0 })
  })

  // -- columns --------------------------------------------------------------

  it('appends new columns at the end', () => {
    const [project] = store.createProject('P')
    const board = store.createColumn(project.id, 'Review')
    expect(board.columns.map((c) => c.name)).toEqual([
      'Backlog',
      'To Do',
      'In Progress',
      'Done',
      'Review'
    ])
    expect(board.columns.at(-1)?.position).toBe(4)
  })

  it('renames columns within the board', () => {
    const [project] = store.createProject('P')
    const board = store.getBoard(project.id)
    const next = store.renameColumn(board.columns[1].id, 'Up Next')
    expect(next.columns[1].name).toBe('Up Next')
  })

  it('deleting a column cascades its cards but keeps siblings', () => {
    const [project] = store.createProject('P')
    const board = store.getBoard(project.id)
    store.createCard(board.columns[0].id, 'Orphan')
    store.createCard(board.columns[1].id, 'Survivor')

    const next = store.deleteColumn(board.columns[0].id)

    expect(next.columns.map((c) => c.name)).toEqual(['To Do', 'In Progress', 'Done'])
    expect(next.columns.flatMap((c) => c.cards.map((card) => card.title))).toEqual(['Survivor'])
  })

  it('moves columns and renumbers densely', () => {
    const [project] = store.createProject('P')
    let board = store.getBoard(project.id)
    const [backlog, todo] = board.columns

    board = store.moveColumn(board.columns[3].id, 0)
    expect(board.columns.map((c) => c.name)).toEqual(['Done', 'Backlog', 'To Do', 'In Progress'])

    board = store.moveColumn(backlog.id, 2)
    expect(board.columns.map((c) => c.name)).toEqual(['Done', 'To Do', 'Backlog', 'In Progress'])

    board = store.moveColumn(todo.id, 99) // clamps to end
    expect(board.columns.map((c) => c.name)).toEqual(['Done', 'Backlog', 'In Progress', 'To Do'])
    expect(board.columns.map((c) => c.position)).toEqual([0, 1, 2, 3])
  })

  // -- cards ----------------------------------------------------------------

  it('creates cards with dense positions and optional descriptions', () => {
    const [project] = store.createProject('P')
    const board = store.getBoard(project.id)
    const column = board.columns[0]

    store.createCard(column.id, 'One')
    store.createCard(column.id, 'Two', 'with description')
    const next = store.createCard(column.id, 'Three')

    const cards = next.columns[0].cards
    expect(cards.map((c) => c.title)).toEqual(['One', 'Two', 'Three'])
    expect(cards.map((c) => c.position)).toEqual([0, 1, 2])
    expect(cards[1].description).toBe('with description')
    expect(cards[0].description).toBe('')
  })

  it('updates card title and description', () => {
    const [project] = store.createProject('P')
    const column = store.getBoard(project.id).columns[0]
    store.createCard(column.id, 'Draft')

    const board = store.updateCard(cardId(store, project.id, 0), {
      title: 'Final',
      description: 'done'
    })

    expect(board.columns[0].cards[0]).toMatchObject({ title: 'Final', description: 'done' })
  })

  it('rejects invalid card payloads', () => {
    const [project] = store.createProject('P')
    const column = store.getBoard(project.id).columns[0]

    expect(() => store.createCard(column.id, '  ')).toThrow('cannot be empty')
    expect(() => store.createCard('missing', 'x')).toThrow('Column not found')
    expect(() => store.updateCard('missing', { title: 'x' })).toThrow('Card not found')
    expect(() => store.updateCard(cardId(store, project.id, -1), null as never)).toThrow()
  })

  it('moves a card within its column, renumbering densely', () => {
    const [project] = store.createProject('P')
    const column = store.getBoard(project.id).columns[0]
    store.createCard(column.id, 'A')
    store.createCard(column.id, 'B')
    store.createCard(column.id, 'C')
    const [a, , c] = cardIds(store, project.id)

    let board = store.moveCard(c, column.id, 0)
    expect(board.columns[0].cards.map((card) => card.title)).toEqual(['C', 'A', 'B'])

    board = store.moveCard(a, column.id, 99) // clamps to end
    expect(board.columns[0].cards.map((card) => card.title)).toEqual(['C', 'B', 'A'])
    expect(board.columns[0].cards.map((card) => card.position)).toEqual([0, 1, 2])
  })

  it('moves a card across columns leaving dense positions behind', () => {
    const [project] = store.createProject('P')
    const board = store.getBoard(project.id)
    const [backlog, , , done] = board.columns
    store.createCard(backlog.id, 'A')
    store.createCard(backlog.id, 'B')
    store.createCard(backlog.id, 'C')
    const [a, b] = cardIds(store, project.id)

    const next = store.moveCard(b, done.id, 0)

    const backlogCards = next.columns[0].cards
    const doneCards = next.columns[3].cards
    expect(backlogCards.map((card) => card.title)).toEqual(['A', 'C'])
    expect(backlogCards.map((card) => card.position)).toEqual([0, 1])
    expect(doneCards.map((card) => card.title)).toEqual(['B'])
    expect(doneCards[0].columnId).toBe(done.id)
    expect(a).toBeDefined()
  })

  it('refuses cross-project card moves', () => {
    const [p1] = store.createProject('One')
    const p2 = store.createProject('Two').at(-1)!
    const col1 = store.getBoard(p1.id).columns[0]
    const col2 = store.getBoard(p2.id).columns[0]
    store.createCard(col1.id, 'Stray')

    expect(() => store.moveCard(cardId(store, p1.id, 0), col2.id, 0)).toThrow('across projects')
  })

  it('deletes a card without disturbing siblings', () => {
    const [project] = store.createProject('P')
    const column = store.getBoard(project.id).columns[0]
    store.createCard(column.id, 'A')
    store.createCard(column.id, 'B')

    const next = store.deleteCard(cardId(store, project.id, 1))

    expect(next.columns[0].cards.map((card) => card.title)).toEqual(['A'])
    expect(next.columns[0].cards[0].position).toBe(0)
  })

  it('validates description type and length', () => {
    const [project] = store.createProject('P')
    const column = store.getBoard(project.id).columns[0]
    expect(() => store.createCard(column.id, 'x', 42 as never)).toThrow('must be a string')
    expect(() => store.createCard(column.id, 'x', 'y'.repeat(5001))).toThrow('cannot exceed 5000')
  })
})

// -- helpers -----------------------------------------------------------------

function cardIds(store: KanbanStore, projectId: string): string[] {
  return store.getBoard(projectId).columns.flatMap((c) => c.cards.map((card) => card.id))
}

function cardId(store: KanbanStore, projectId: string, index: number): string {
  const ids = cardIds(store, projectId)
  return ids[index < 0 ? index + ids.length : index]
}

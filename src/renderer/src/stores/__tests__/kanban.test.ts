// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useKanban } from '../kanban'
import type { Board, Project } from '@shared/kanban'

/**
 * Store test against a fully mocked window.ospore: mutations must replace
 * the snapshots with the main-process answer and surface errors in `error`.
 */

const project: Project = {
  id: 'p1',
  name: 'Prototype',
  archived: false,
  createdAt: 1704067200,
  updatedAt: 1704067200
}

const board: Board = {
  project,
  columns: [
    {
      id: 'c1',
      projectId: 'p1',
      name: 'Backlog',
      position: 0,
      createdAt: 1704067200,
      updatedAt: 1704067200,
      cards: [
        {
          id: 'k1',
          columnId: 'c1',
          title: 'First',
          description: '',
          position: 0,
          createdAt: 1704067200,
          updatedAt: 1704067200
        }
      ]
    }
  ]
}

function resetStore(): void {
  useKanban.setState({
    view: 'projects',
    loading: false,
    error: null,
    projects: [],
    board: null,
    draggingCardId: null,
    editingCardId: null
  })
}

describe('kanban store', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    resetStore()
    window.ospore = {
      listProjects: vi.fn().mockResolvedValue([project]),
      createProject: vi.fn(),
      renameProject: vi.fn(),
      setProjectArchived: vi.fn(),
      deleteProject: vi.fn(),
      getBoard: vi.fn().mockResolvedValue(board),
      createColumn: vi.fn(),
      renameColumn: vi.fn(),
      deleteColumn: vi.fn(),
      moveColumn: vi.fn(),
      createCard: vi.fn(),
      updateCard: vi.fn(),
      deleteCard: vi.fn(),
      moveCard: vi.fn()
    } as unknown as Window['ospore']
  })

  it('init loads projects', async () => {
    await useKanban.getState().init()
    expect(useKanban.getState().projects).toEqual([project])
    expect(useKanban.getState().loading).toBe(false)
  })

  it('init surfaces errors', async () => {
    window.ospore.listProjects = vi.fn().mockRejectedValue(new Error('disk on fire'))
    await useKanban.getState().init()
    expect(useKanban.getState().error).toBe('disk on fire')
    expect(useKanban.getState().loading).toBe(false)
  })

  it('openProject swaps to the board view with the fresh board', async () => {
    await useKanban.getState().openProject('p1')
    const state = useKanban.getState()
    expect(state.view).toBe('board')
    expect(state.board).toEqual(board)
  })

  it('createProject replaces the project list and answers true', async () => {
    const next = [{ ...project, id: 'p2', name: 'Second' }]
    window.ospore.createProject = vi.fn().mockResolvedValue(next)

    const ok = await useKanban.getState().createProject('Second')

    expect(ok).toBe(true)
    expect(useKanban.getState().projects).toEqual(next)
    expect(window.ospore.createProject).toHaveBeenCalledWith('Second')
  })

  it('createProject answers false and records the error on failure', async () => {
    window.ospore.createProject = vi.fn().mockRejectedValue(new Error('cannot be empty'))

    const ok = await useKanban.getState().createProject('  ')

    expect(ok).toBe(false)
    expect(useKanban.getState().error).toBe('cannot be empty')
  })

  it('archiving a project updates the list', async () => {
    window.ospore.setProjectArchived = vi.fn().mockResolvedValue([{ ...project, archived: true }])

    await useKanban.getState().setProjectArchived('p1', true)

    expect(useKanban.getState().projects[0].archived).toBe(true)
    expect(useKanban.getState().error).toBeNull()
  })

  it('moveCard replaces the board and clears drag state', async () => {
    await useKanban.getState().openProject('p1')
    useKanban.setState({ draggingCardId: 'k1' })

    const moved = structuredClone(board)
    moved.columns[0].cards[0].columnId = 'c2'
    window.ospore.moveCard = vi.fn().mockResolvedValue(moved)

    await useKanban.getState().moveCard('k1', 'c2', 0)

    const state = useKanban.getState()
    expect(window.ospore.moveCard).toHaveBeenCalledWith('k1', 'c2', 0)
    expect(state.board).toEqual(moved)
    expect(state.draggingCardId).toBeNull()
    expect(state.error).toBeNull()
  })

  it('showProjects resets view + drag state', async () => {
    await useKanban.getState().openProject('p1')
    useKanban.setState({ draggingCardId: 'k1', editingCardId: 'k1' })

    useKanban.getState().showProjects()

    const state = useKanban.getState()
    expect(state.view).toBe('projects')
    expect(state.board).toBeNull()
    expect(state.draggingCardId).toBeNull()
    expect(state.editingCardId).toBeNull()
  })
})

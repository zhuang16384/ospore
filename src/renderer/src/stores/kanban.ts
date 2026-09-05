/**
 * Kanban UI state (zustand).
 *
 * Holds the two "truth snapshots" the main process hands back — the project
 * list and the open board — plus pure view state (current view, drag state,
 * error banner). Every mutation replaces the affected snapshot with the
 * server answer, so the renderer never patches or re-orders locally.
 */

import { create } from 'zustand'
import type { Board, CardChanges, Project } from '@shared/kanban'

export type KanbanView = 'projects' | 'board'

interface KanbanState {
  view: KanbanView
  loading: boolean
  error: string | null
  projects: Project[]
  board: Board | null
  /** Card id currently being dragged, or null. Used for drop indicators. */
  draggingCardId: string | null
  /** Card whose edit modal is open, or null. */
  editingCardId: string | null

  init(): Promise<void>
  refreshProjects(): Promise<void>
  openProject(projectId: string): Promise<void>
  showProjects(): void
  createProject(name: string): Promise<boolean>
  renameProject(projectId: string, name: string): Promise<boolean>
  setProjectArchived(projectId: string, archived: boolean): Promise<void>
  deleteProject(projectId: string): Promise<void>

  createColumn(name: string): Promise<boolean>
  renameColumn(columnId: string, name: string): Promise<boolean>
  deleteColumn(columnId: string): Promise<void>
  moveColumn(columnId: string, toIndex: number): Promise<void>

  createCard(columnId: string, title: string): Promise<boolean>
  updateCard(cardId: string, changes: CardChanges): Promise<boolean>
  deleteCard(cardId: string): Promise<void>
  moveCard(cardId: string, toColumnId: string, toIndex: number): Promise<void>

  setDraggingCardId(cardId: string | null): void
  setEditingCardId(cardId: string | null): void
  setError(error: string | null): void
}

/**
 * Runs an async action with the shared error banner discipline: any rejection
 * lands in `error` (message only — stacks don't help users), success clears it.
 * `*Name` variants answer false on failure so forms can keep their draft.
 */
async function run(
  set: (partial: Partial<KanbanState>) => void,
  action: () => Promise<void>
): Promise<void> {
  try {
    await action()
    set({ error: null })
  } catch (error) {
    set({ error: error instanceof Error ? error.message : String(error) })
  }
}

export const useKanban = create<KanbanState>()((set, get) => ({
  view: 'projects',
  loading: false,
  error: null,
  projects: [],
  board: null,
  draggingCardId: null,
  editingCardId: null,

  async init(): Promise<void> {
    set({ loading: true })
    await run(set, async () => {
      set({ projects: await window.ospore.listProjects() })
    })
    set({ loading: false })
  },

  async refreshProjects(): Promise<void> {
    await run(set, async () => {
      set({ projects: await window.ospore.listProjects() })
    })
  },

  async openProject(projectId: string): Promise<void> {
    await run(set, async () => {
      set({ board: await window.ospore.getBoard(projectId), view: 'board' })
    })
  },

  showProjects(): void {
    set({ view: 'projects', board: null, draggingCardId: null, editingCardId: null })
  },

  async createProject(name: string): Promise<boolean> {
    const projects = await window.ospore.createProject(name).catch((error: unknown) => {
      set({ error: error instanceof Error ? error.message : String(error) })
      return null
    })
    if (!projects) return false
    set({ projects, error: null })
    return true
  },

  async renameProject(projectId: string, name: string): Promise<boolean> {
    const projects = await window.ospore.renameProject(projectId, name).catch((error: unknown) => {
      set({ error: error instanceof Error ? error.message : String(error) })
      return null
    })
    if (!projects) return false
    set({ projects, error: null })
    return true
  },

  async setProjectArchived(projectId: string, archived: boolean): Promise<void> {
    await run(set, async () => {
      set({ projects: await window.ospore.setProjectArchived(projectId, archived) })
    })
  },

  async deleteProject(projectId: string): Promise<void> {
    await run(set, async () => {
      set({ projects: await window.ospore.deleteProject(projectId) })
    })
  },

  async createColumn(name: string): Promise<boolean> {
    const board = get().board
    if (!board) return false
    const next = await window.ospore
      .createColumn(board.project.id, name)
      .catch((error: unknown) => {
        set({ error: error instanceof Error ? error.message : String(error) })
        return null
      })
    if (!next) return false
    set({ board: next, error: null })
    return true
  },

  async renameColumn(columnId: string, name: string): Promise<boolean> {
    const next = await window.ospore.renameColumn(columnId, name).catch((error: unknown) => {
      set({ error: error instanceof Error ? error.message : String(error) })
      return null
    })
    if (!next) return false
    set({ board: next, error: null })
    return true
  },

  async deleteColumn(columnId: string): Promise<void> {
    await run(set, async () => {
      set({ board: await window.ospore.deleteColumn(columnId) })
    })
  },

  async moveColumn(columnId: string, toIndex: number): Promise<void> {
    await run(set, async () => {
      set({ board: await window.ospore.moveColumn(columnId, toIndex) })
    })
  },

  async createCard(columnId: string, title: string): Promise<boolean> {
    const next = await window.ospore.createCard(columnId, title).catch((error: unknown) => {
      set({ error: error instanceof Error ? error.message : String(error) })
      return null
    })
    if (!next) return false
    set({ board: next, error: null })
    return true
  },

  async updateCard(cardId: string, changes: CardChanges): Promise<boolean> {
    const next = await window.ospore.updateCard(cardId, changes).catch((error: unknown) => {
      set({ error: error instanceof Error ? error.message : String(error) })
      return null
    })
    if (!next) return false
    set({ board: next, error: null })
    return true
  },

  async deleteCard(cardId: string): Promise<void> {
    await run(set, async () => {
      set({ board: await window.ospore.deleteCard(cardId) })
    })
  },

  async moveCard(cardId: string, toColumnId: string, toIndex: number): Promise<void> {
    await run(set, async () => {
      set({
        board: await window.ospore.moveCard(cardId, toColumnId, toIndex),
        draggingCardId: null
      })
    })
  },

  setDraggingCardId(cardId: string | null): void {
    set({ draggingCardId: cardId })
  },

  setEditingCardId(cardId: string | null): void {
    set({ editingCardId: cardId })
  },

  setError(error: string | null): void {
    set({ error })
  }
}))

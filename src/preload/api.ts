import { IpcEvents } from '@shared/ipc-events'
import type { Board, CardChanges, Project } from '@shared/kanban'

export interface IPCRendererLike {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>
  /** Fire-and-forget send (Renderer -> Main, no reply). */
  send(channel: string, ...args: unknown[]): void
  on(channel: string, listener: (...args: unknown[]) => void): void
  removeListener(channel: string, listener: (...args: unknown[]) => void): void
}

export interface OsporeAPI {
  // Projects — every mutation resolves with the full, re-ordered project list.
  listProjects(): Promise<Project[]>
  createProject(name: string): Promise<Project[]>
  renameProject(id: string, name: string): Promise<Project[]>
  setProjectArchived(id: string, archived: boolean): Promise<Project[]>
  deleteProject(id: string): Promise<Project[]>

  // Board + columns — mutations resolve with the full board snapshot.
  getBoard(projectId: string): Promise<Board>
  createColumn(projectId: string, name: string): Promise<Board>
  renameColumn(columnId: string, name: string): Promise<Board>
  deleteColumn(columnId: string): Promise<Board>
  moveColumn(columnId: string, toIndex: number): Promise<Board>

  // Cards — mutations resolve with the full board snapshot.
  createCard(columnId: string, title: string, description?: string): Promise<Board>
  updateCard(cardId: string, changes: CardChanges): Promise<Board>
  deleteCard(cardId: string): Promise<Board>
  moveCard(cardId: string, toColumnId: string, toIndex: number): Promise<Board>
}

export function createOsporeAPI(ipcRenderer: IPCRendererLike): OsporeAPI {
  const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> =>
    ipcRenderer.invoke(channel, ...args) as Promise<T>

  return {
    listProjects: (): Promise<Project[]> => invoke(IpcEvents.PROJECT_LIST),
    createProject: (name: string): Promise<Project[]> => invoke(IpcEvents.PROJECT_CREATE, name),
    renameProject: (id: string, name: string): Promise<Project[]> =>
      invoke(IpcEvents.PROJECT_RENAME, id, name),
    setProjectArchived: (id: string, archived: boolean): Promise<Project[]> =>
      invoke(IpcEvents.PROJECT_SET_ARCHIVED, id, archived),
    deleteProject: (id: string): Promise<Project[]> => invoke(IpcEvents.PROJECT_DELETE, id),

    getBoard: (projectId: string): Promise<Board> => invoke(IpcEvents.BOARD_GET, projectId),
    createColumn: (projectId: string, name: string): Promise<Board> =>
      invoke(IpcEvents.COLUMN_CREATE, projectId, name),
    renameColumn: (columnId: string, name: string): Promise<Board> =>
      invoke(IpcEvents.COLUMN_RENAME, columnId, name),
    deleteColumn: (columnId: string): Promise<Board> => invoke(IpcEvents.COLUMN_DELETE, columnId),
    moveColumn: (columnId: string, toIndex: number): Promise<Board> =>
      invoke(IpcEvents.COLUMN_MOVE, columnId, toIndex),

    createCard: (columnId: string, title: string, description?: string): Promise<Board> =>
      invoke(IpcEvents.CARD_CREATE, columnId, title, description),
    updateCard: (cardId: string, changes: CardChanges): Promise<Board> =>
      invoke(IpcEvents.CARD_UPDATE, cardId, changes),
    deleteCard: (cardId: string): Promise<Board> => invoke(IpcEvents.CARD_DELETE, cardId),
    moveCard: (cardId: string, toColumnId: string, toIndex: number): Promise<Board> =>
      invoke(IpcEvents.CARD_MOVE, cardId, toColumnId, toIndex)
  }
}

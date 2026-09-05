/**
 * Kanban IPC handlers.
 *
 * Registered through the same `IPCMainLike` abstraction as `setupIPC()` so
 * tests can wire a fake ipcMain and assert the channel wiring without
 * Electron. The store is injected by the caller (`setupDatabase()` in
 * onReady).
 */

import { IpcEvents } from '@shared/ipc-events'
import type { CardChanges } from '@shared/kanban'
import type { IPCMainLike } from './ipc'
import type { KanbanStore } from './db/store'

export function registerKanbanHandlers(ipc: IPCMainLike, store: KanbanStore): void {
  ipc.handle(IpcEvents.PROJECT_LIST, () => store.listProjects())
  ipc.handle(IpcEvents.PROJECT_CREATE, (_, name) => store.createProject(name as string))
  ipc.handle(IpcEvents.PROJECT_RENAME, (_, id, name) =>
    store.renameProject(id as string, name as string)
  )
  ipc.handle(IpcEvents.PROJECT_SET_ARCHIVED, (_, id, archived) =>
    store.setProjectArchived(id as string, archived as boolean)
  )
  ipc.handle(IpcEvents.PROJECT_DELETE, (_, id) => store.deleteProject(id as string))

  ipc.handle(IpcEvents.BOARD_GET, (_, projectId) => store.getBoard(projectId as string))
  ipc.handle(IpcEvents.COLUMN_CREATE, (_, projectId, name) =>
    store.createColumn(projectId as string, name as string)
  )
  ipc.handle(IpcEvents.COLUMN_RENAME, (_, columnId, name) =>
    store.renameColumn(columnId as string, name as string)
  )
  ipc.handle(IpcEvents.COLUMN_DELETE, (_, columnId) => store.deleteColumn(columnId as string))
  ipc.handle(IpcEvents.COLUMN_MOVE, (_, columnId, toIndex) =>
    store.moveColumn(columnId as string, toIndex as number)
  )

  ipc.handle(IpcEvents.CARD_CREATE, (_, columnId, title, description) =>
    store.createCard(columnId as string, title as string, description as string | undefined)
  )
  ipc.handle(IpcEvents.CARD_UPDATE, (_, cardId, changes) =>
    store.updateCard(cardId as string, changes as CardChanges)
  )
  ipc.handle(IpcEvents.CARD_DELETE, (_, cardId) => store.deleteCard(cardId as string))
  ipc.handle(IpcEvents.CARD_MOVE, (_, cardId, toColumnId, toIndex) =>
    store.moveCard(cardId as string, toColumnId as string, toIndex as number)
  )
}

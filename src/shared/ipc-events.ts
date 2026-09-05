/**
 * Single source of truth for all IPC channel names.
 *
 * Shared by the main process, the preload bridge, and the renderer so that a
 * channel name can never drift between the three. Renaming a channel is a
 * compile-time operation, not a string search.
 */
export const IpcEvents = {
  // Projects. Every mutation answers with the full, re-ordered project list
  // ("return the new truth") so the renderer never recomputes order locally.
  PROJECT_LIST: 'project:list',
  PROJECT_CREATE: 'project:create',
  PROJECT_RENAME: 'project:rename',
  PROJECT_SET_ARCHIVED: 'project:set-archived',
  PROJECT_DELETE: 'project:delete',

  // Board + columns. Column mutations answer with the full board snapshot.
  BOARD_GET: 'board:get',
  COLUMN_CREATE: 'column:create',
  COLUMN_RENAME: 'column:rename',
  COLUMN_DELETE: 'column:delete',
  COLUMN_MOVE: 'column:move',

  // Cards. Mutations answer with the full board snapshot (moves renumber
  // positions, so a partial answer could drift).
  CARD_CREATE: 'card:create',
  CARD_UPDATE: 'card:update',
  CARD_DELETE: 'card:delete',
  CARD_MOVE: 'card:move'
} as const

export type IpcEvent = (typeof IpcEvents)[keyof typeof IpcEvents]

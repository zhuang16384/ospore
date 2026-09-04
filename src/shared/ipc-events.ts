/**
 * Single source of truth for all IPC channel names.
 *
 * Shared by the main process, the preload bridge, and the renderer so that a
 * channel name can never drift between the three. Renaming a channel is a
 * compile-time operation, not a string search.
 */
export const IpcEvents = {
  /** Health-check handler -> returns 'pong'. */
  PING: 'ping'
} as const

export type IpcEvent = (typeof IpcEvents)[keyof typeof IpcEvents]

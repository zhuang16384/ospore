import { ipcMain } from 'electron'
import { IpcEvents } from '@shared/ipc-events'

/**
 * Central IPC module.
 *
 * Everything that registers main-process IPC handlers goes through here. The
 * `IPCMainLike` abstraction lets the handlers be exercised with a fake ipcMain
 * in tests, and gives a single place to add cross-cutting concerns (sender
 * validation, ready handshake, ...) later without touching every feature.
 */

export interface IPCMainLike {
  handle(channel: string, listener: (...args: unknown[]) => unknown): void
  /** Register a fire-and-forget listener (Renderer -> Main, no reply). */
  on(channel: string, listener: (...args: unknown[]) => void): void
}

/** Manager bound to Electron's `ipcMain`. Prefer this over importing ipcMain directly. */
export const ipcManager: IPCMainLike = ipcMain

export function setupIPC(customIPCMain: IPCMainLike = ipcManager): void {
  customIPCMain.handle(IpcEvents.PING, async () => 'pong')
}

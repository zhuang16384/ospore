import { ipcMain } from 'electron'
import { registerFileHandlers } from './contexts/file-ipc'
import { registerWorkspaceHandlers } from './contexts/workspace-ipc'
import type { WorkspaceService } from './workspace.service'

/**
 * Central IPC module — the composition root.
 *
 * Everything that registers main-process IPC handlers goes through here. The
 * `IPCMainLike` abstraction lets handlers be exercised with a fake ipcMain in
 * tests, and gives one place to add cross-cutting concerns (sender validation,
 * a ready handshake, …) without touching every feature.
 *
 * v0 registers four read-only channels; v0.1 adds conversation/agent channels
 * and the `file:changed` push.
 */

export interface IPCMainLike {
  handle(channel: string, listener: (...args: unknown[]) => unknown): void
  /** Register a fire-and-forget listener (Renderer -> Main, no reply). */
  on(channel: string, listener: (...args: unknown[]) => void): void
}

/** Manager bound to Electron's `ipcMain`. Prefer this over importing ipcMain directly. */
export const ipcManager: IPCMainLike = ipcMain

export function setupIPC(
  customIPCMain: IPCMainLike = ipcManager,
  workspace: WorkspaceService
): void {
  registerWorkspaceHandlers(customIPCMain, workspace)
  registerFileHandlers(customIPCMain, workspace)
}

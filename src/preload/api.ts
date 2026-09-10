import { IpcEvents } from '@shared/ipc-events'
import type { FileContent, FileNode, WorkspaceState } from '@shared/domain'

/**
 * The bridge surface exposed to the renderer as `window.ospore`.
 *
 * Only wrapped methods are exposed — never `ipcRenderer` itself. v0 is
 * read-only (four invoke channels); v0.1 adds agent channels plus `on()`
 * subscriptions for streaming and file-change pushes.
 */

export interface IPCRendererLike {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>
  /** Fire-and-forget send (Renderer -> Main, no reply). */
  send(channel: string, ...args: unknown[]): void
  on(channel: string, listener: (...args: unknown[]) => void): void
  removeListener(channel: string, listener: (...args: unknown[]) => void): void
}

export interface OsporeAPI {
  /** Current workspace root + the recent-workspace list. */
  getWorkspace(): Promise<WorkspaceState>
  /** Open a workspace; omit `path` to show the native directory dialog. */
  openWorkspace(path?: string): Promise<WorkspaceState>
  /** Immediate children of a workspace-relative directory. */
  listDirectory(relPath: string): Promise<FileNode[]>
  /** Read a workspace-relative text file. */
  readFile(relPath: string): Promise<FileContent>
  /** Hand an http(s) URL to the OS browser. */
  openExternal(url: string): Promise<void>
}

export function createOsporeAPI(ipcRenderer: IPCRendererLike): OsporeAPI {
  const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> =>
    ipcRenderer.invoke(channel, ...args) as Promise<T>

  return {
    getWorkspace: (): Promise<WorkspaceState> => invoke(IpcEvents.WORKSPACE_GET),
    openWorkspace: (path?: string): Promise<WorkspaceState> =>
      invoke(IpcEvents.WORKSPACE_OPEN, path),
    listDirectory: (relPath: string): Promise<FileNode[]> => invoke(IpcEvents.FILE_TREE, relPath),
    readFile: (relPath: string): Promise<FileContent> => invoke(IpcEvents.FILE_READ, relPath),
    openExternal: (url: string): Promise<void> => invoke(IpcEvents.OPEN_EXTERNAL, url)
  }
}

/**
 * Single source of truth for all IPC channel names.
 *
 * Shared by the main process, the preload bridge, and the renderer so that a
 * channel name can never drift between the three. Renaming a channel is a
 * compile-time operation, not a string search.
 *
 * v0 is read-only: four channels, no mutations, no event pushes. v0.1 adds
 * conversation/agent channels and the `file:changed` push.
 */
export const IpcEvents = {
  /** Current workspace + recent list. */
  WORKSPACE_GET: 'workspace:get',
  /** Open a workspace; without a path the main process shows a directory dialog. */
  WORKSPACE_OPEN: 'workspace:open',

  /** Immediate children of a workspace-relative directory. */
  FILE_TREE: 'file:tree',
  /** Read a workspace-relative text file. */
  FILE_READ: 'file:read',

  /** Hand an http(s) URL to the OS browser. */
  OPEN_EXTERNAL: 'shell:open-external'
} as const

export type IpcEvent = (typeof IpcEvents)[keyof typeof IpcEvents]

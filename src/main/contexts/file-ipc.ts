import { IpcEvents } from '@shared/ipc-events'
import type { FileContent, FileNode } from '@shared/domain'
import { listDirectory } from '../files/file-tree.service'
import { readTextFile } from '../files/file.service'
import type { IPCMainLike } from '../ipc'
import type { WorkspaceService } from '../workspace.service'

/**
 * File IPC — both handlers are read-only and resolve their path against the
 * workspace root. Anything outside the root is rejected by
 * `resolveInsideRoot`, not here.
 */
export function registerFileHandlers(ipc: IPCMainLike, workspace: WorkspaceService): void {
  ipc.handle(IpcEvents.FILE_TREE, (_event, relPath): FileNode[] => {
    return listDirectory(workspace.requireRoot(), requireRelPath(relPath))
  })

  ipc.handle(IpcEvents.FILE_READ, (_event, relPath): FileContent => {
    const path = requireRelPath(relPath)
    return { path, text: readTextFile(workspace.requireRoot(), path) }
  })
}

/** IPC arguments are untrusted input — validate before touching the filesystem. */
function requireRelPath(raw: unknown): string {
  if (typeof raw !== 'string') throw new Error('Path must be a string')
  return raw
}

import { IpcEvents } from '@shared/ipc-events'
import type { WorkspaceState } from '@shared/domain'
import type { IPCMainLike } from '../ipc'
import type { WorkspaceService } from '../workspace.service'

/**
 * Workspace IPC.
 *
 * `workspace:open` with no argument opens the native directory dialog; passing
 * a path opens it directly (used by the "recent workspaces" list).
 */
export function registerWorkspaceHandlers(ipc: IPCMainLike, workspace: WorkspaceService): void {
  ipc.handle(IpcEvents.WORKSPACE_GET, (): WorkspaceState => workspace.state())

  ipc.handle(IpcEvents.WORKSPACE_OPEN, (_event, path): Promise<WorkspaceState> => {
    const requested = typeof path === 'string' && path !== '' ? path : undefined
    return workspace.open(requested)
  })
}

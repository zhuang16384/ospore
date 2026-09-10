/**
 * The workspace the user is currently browsing.
 *
 * Holds the single piece of mutable session state in v0 (the open root) and
 * owns the directory dialog. The root is canonicalized on open so every later
 * containment check is comparing like with like.
 */

import { dialog } from 'electron'
import type { WorkspaceState } from '@shared/domain'
import type { ConfigStore } from './config/config.store'
import { getMainWindow } from './windows'
import { canonicalRoot } from './workspace'

export interface WorkspaceService {
  /** Current root, or null when nothing is open. */
  root(): string | null
  /** Current root, throwing if none is open — for handlers that need one. */
  requireRoot(): string
  /** Root + recents, as the renderer wants it. */
  state(): WorkspaceState
  /** Open `path`, or show a directory dialog when it is omitted. */
  open(path?: string): Promise<WorkspaceState>
}

export function createWorkspaceService(config: ConfigStore): WorkspaceService {
  // `read()` prunes directories that no longer exist, so restoring the head of
  // the MRU list is safe. Re-canonicalize anyway: a hand-edited config.json must
  // not be able to smuggle in a path that bypasses the containment check.
  let root: string | null = null
  const [mostRecent] = config.read().recentWorkspaces
  if (mostRecent) {
    try {
      root = canonicalRoot(mostRecent.path)
    } catch {
      root = null
    }
  }

  function state(): WorkspaceState {
    return { root, recents: config.read().recentWorkspaces }
  }

  async function open(path?: string): Promise<WorkspaceState> {
    let target = path
    if (!target) {
      const window = getMainWindow()
      const options = { properties: ['openDirectory' as const] }
      const result = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options)
      if (result.canceled || result.filePaths.length === 0) return state()
      target = result.filePaths[0]
    }

    root = canonicalRoot(target)
    config.rememberWorkspace(root)
    return state()
  }

  return {
    root: () => root,
    requireRoot: () => {
      if (!root) throw new Error('No workspace is open')
      return root
    },
    state,
    open
  }
}

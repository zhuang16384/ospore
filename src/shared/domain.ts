/**
 * Ospore v0 domain types — shared by main, preload and renderer.
 *
 * v0 is a document viewer: a workspace is an arbitrary local directory, and the
 * only state we persist is the recent-workspace list (see `config.store.ts`).
 * "Recent workspace" is deliberately UI state rather than a domain entity — the
 * Project entity arrives with SQLite in v0.1.
 */

/** A directory the user opened before. Ordered most-recent-first. */
export interface RecentWorkspace {
  /** Absolute, workspace-root path (canonical: symlinks resolved). */
  path: string
  /** Display name — the directory's basename. */
  name: string
  /** Unix seconds, UTC — see `@shared/time`. */
  lastOpenedAt: number
}

/** Everything the renderer needs to render the workspace state. */
export interface WorkspaceState {
  /** Current workspace root, or null when nothing is open yet. */
  root: string | null
  /** MRU list, most recent first. */
  recents: RecentWorkspace[]
}

export type FileNodeKind = 'file' | 'directory'

/** One entry in the file tree. `path` is relative to the workspace root. */
export interface FileNode {
  name: string
  /** POSIX-style path relative to the workspace root. */
  path: string
  kind: FileNodeKind
  /** True when the viewer has a renderer for this file (markdown / html). */
  openable: boolean
}

/** Payload of `file:read`. */
export interface FileContent {
  path: string
  text: string
}

/** Extensions the v0 viewer can open. Anything else is listed but greyed out. */
export const OPENABLE_EXTENSIONS: readonly string[] = ['.md', '.markdown', '.html', '.htm']

/** Cap on the recent-workspace list. */
export const MAX_RECENT_WORKSPACES = 20

/** Refuse to read files bigger than this — a viewer, not an editor. */
export const MAX_FILE_BYTES = 2 * 1024 * 1024

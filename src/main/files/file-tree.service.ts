/**
 * Directory listing for the file tree.
 *
 * One level per call, on purpose: the renderer expands on demand instead of
 * receiving a whole repository over IPC.
 */

import { readdirSync, statSync } from 'node:fs'
import type { FileNode } from '@shared/domain'
import { isIgnoredDirectory, isOpenable, resolveInsideRoot } from '../workspace'

/** Immediate children of `relPath` (relative to `root`), directories first. */
export function listDirectory(root: string, relPath: string): FileNode[] {
  const dir = resolveInsideRoot(root, relPath)
  const nodes: FileNode[] = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const childPath = relPath === '' ? entry.name : `${relPath}/${entry.name}`

    let isDirectory = entry.isDirectory()
    let isFile = entry.isFile()

    // Symlinks are followed only when they resolve inside the workspace —
    // `resolveInsideRoot` throws for anything that escapes, and a dangling link
    // is simply hidden.
    if (entry.isSymbolicLink()) {
      try {
        const stats = statSync(resolveInsideRoot(root, childPath))
        isDirectory = stats.isDirectory()
        isFile = stats.isFile()
      } catch {
        continue
      }
    }

    if (!isDirectory && !isFile) continue
    if (isDirectory && isIgnoredDirectory(entry.name)) continue

    nodes.push({
      name: entry.name,
      path: childPath,
      kind: isDirectory ? 'directory' : 'file',
      openable: isFile && isOpenable(entry.name)
    })
  }

  return nodes.sort(compareNodes)
}

/** Directories first, then files; alphabetical within each group. */
function compareNodes(a: FileNode, b: FileNode): number {
  if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
}

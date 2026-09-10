/**
 * Reading a workspace file into the renderer.
 *
 * Refuses anything outside the workspace (via `resolveInsideRoot`) and anything
 * larger than {@link MAX_FILE_BYTES} — the viewer streams a whole file into
 * React state, so an accidental multi-hundred-MB read must fail loudly instead
 * of freezing the window.
 */

import { readFileSync, statSync } from 'node:fs'
import { MAX_FILE_BYTES } from '@shared/domain'
import { resolveInsideRoot } from '../workspace'

export function readTextFile(root: string, relPath: string): string {
  const absolute = resolveInsideRoot(root, relPath)
  const stats = statSync(absolute)

  if (!stats.isFile()) throw new Error(`Not a file: ${relPath}`)
  if (stats.size > MAX_FILE_BYTES) {
    throw new Error(`File is too large to open (${Math.round(stats.size / 1024)} KB)`)
  }

  return readFileSync(absolute, 'utf8')
}

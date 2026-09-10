/**
 * Workspace path rules — deliberately pure (no Electron, no DB) so every rule
 * is unit-testable.
 *
 * The workspace root is always stored **canonical** (`realpathSync`), which
 * makes containment checks meaningful even when the user picks a path through a
 * symlink.
 */

import { realpathSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import { OPENABLE_EXTENSIONS } from '@shared/domain'

/** Dependency/build trees the viewer never descends into. */
const IGNORED_DIRECTORIES = new Set(['node_modules', 'build-output', 'dist', 'out'])

/** Canonicalize a directory the user picked (resolves symlinks, normalizes). */
export function canonicalRoot(dir: string): string {
  return realpathSync(resolve(dir))
}

/**
 * Resolve `relPath` inside `root`, refusing anything that escapes it.
 *
 * `root` must already be canonical — see {@link canonicalRoot}. The check runs
 * twice: once on the lexical path, once after following symlinks, so a link
 * pointing outside the workspace cannot be used to read foreign files.
 */
export function resolveInsideRoot(root: string, relPath: string): string {
  const target = resolve(root, relPath)
  if (!isInside(root, target)) throw new Error(`Path escapes the workspace: ${relPath}`)

  let real: string
  try {
    real = realpathSync(target)
  } catch {
    throw new Error(`Path not found: ${relPath}`)
  }
  if (!isInside(root, real)) throw new Error(`Path escapes the workspace: ${relPath}`)
  return real
}

function isInside(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(root + sep)
}

/**
 * Hidden directories and known dependency/build trees are hidden from the tree.
 * Hidden *files* (`.gitignore`, `.env.example`, …) are still shown — they are
 * part of what a repository looks like on disk.
 */
export function isIgnoredDirectory(name: string): boolean {
  return name.startsWith('.') || IGNORED_DIRECTORIES.has(name)
}

/** Whether the viewer has a renderer for this file name. */
export function isOpenable(fileName: string): boolean {
  return OPENABLE_EXTENSIONS.includes(extname(fileName).toLowerCase())
}

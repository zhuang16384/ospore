/**
 * Renderer-safe path helpers.
 *
 * Workspace-relative paths are POSIX-style by construction (main's
 * `file-tree.service.ts` joins with '/'), so these never need `node:path`.
 */

/** Lower-case extension including the dot, or '' for extension-less names. */
export function extname(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  return dot <= 0 ? '' : base.slice(dot).toLowerCase()
}

/** Directory part of a path — '' when the path sits at the workspace root. */
export function dirname(path: string): string {
  const slash = path.lastIndexOf('/')
  return slash === -1 ? '' : path.slice(0, slash)
}

/** Join a workspace-relative directory and a name (POSIX, collapses ''). */
export function joinPath(dir: string, name: string): string {
  return dir === '' ? name : `${dir}/${name}`
}

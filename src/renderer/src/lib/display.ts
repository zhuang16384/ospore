/**
 * Display helpers that must stay renderer-safe (no `node:path`).
 *
 * Workspace-relative paths are POSIX-style by construction (see main's
 * `file-tree.service.ts`), so splitting on '/' is enough.
 */

/** Last segment of a path — used to label the workspace root. */
export function baseName(path: string): string {
  const segments = path.split('/').filter((segment) => segment !== '')
  return segments[segments.length - 1] ?? path
}

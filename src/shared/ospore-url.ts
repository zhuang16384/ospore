/**
 * The `ospore://` URL scheme — one definition shared by main (which serves it)
 * and renderer (which links to it).
 *
 * A custom scheme is required instead of `srcdoc` or `file://`:
 * - `srcdoc` breaks relative paths, so an html document loses its own CSS,
 *   images and fonts;
 * - `file://` would hand the renderer far more filesystem reach than we want.
 *
 * Shape: `ospore://workspace/<workspace-relative/path>`.
 */

export const OSPORE_SCHEME = 'ospore'
export const OSPORE_HOST = 'workspace'

/** Build an `ospore://` URL for a workspace-relative path. */
export function buildOsporeUrl(relPath: string): string {
  const encoded = relPath
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${OSPORE_SCHEME}://${OSPORE_HOST}/${encoded}`
}

/** Extract the workspace-relative path from an `ospore://` URL. */
export function parseOsporeUrl(rawUrl: string): string {
  const url = new URL(rawUrl)
  if (url.protocol !== `${OSPORE_SCHEME}:`) {
    throw new Error(`Not an ${OSPORE_SCHEME} URL: ${rawUrl}`)
  }
  if (url.host !== OSPORE_HOST) {
    throw new Error(`Unknown ${OSPORE_SCHEME} host: ${url.host}`)
  }
  return decodeURIComponent(url.pathname).replace(/^\/+/, '')
}

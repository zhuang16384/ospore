/**
 * Resolving markdown hrefs against the document that contains them.
 *
 * Pure and renderer-safe: given the containing document's workspace-relative
 * path, it says what the view should do with a link — open the OS browser,
 * switch documents, load a resource through `ospore://`, or ignore it.
 *
 * Relative hrefs resolve against the **document's own directory**, not the
 * workspace root, and anything that walks above the root is ignored rather than
 * clamped: a link out of the workspace is never followed.
 */

import { buildOsporeUrl } from '@shared/ospore-url'
import { dirname } from './path'

export type LinkTarget =
  /** http(s) — handed to the OS browser. */
  | { kind: 'external'; url: string }
  /** Another markdown document inside the workspace — switches the pane. */
  | { kind: 'document'; path: string }
  /** A workspace file to load through `ospore://` (images, mostly). */
  | { kind: 'resource'; url: string }
  /** Anchors, mailto:, workspace escapes — nothing the viewer can do. */
  | { kind: 'ignore' }

const DOCUMENT_EXTENSIONS = ['.md', '.markdown']

export function resolveMarkdownHref(href: string, docPath: string): LinkTarget {
  const trimmed = href.trim()
  if (trimmed === '' || trimmed.startsWith('#')) return { kind: 'ignore' }

  if (hasScheme(trimmed)) {
    return /^https?:\/\//i.test(trimmed) ? { kind: 'external', url: trimmed } : { kind: 'ignore' }
  }

  const path = resolveRelative(dirname(docPath), stripQueryAndHash(trimmed))
  if (path === null || path === '') return { kind: 'ignore' }

  return isDocument(path)
    ? { kind: 'document', path }
    : { kind: 'resource', url: buildOsporeUrl(path) }
}

/** Any leading `scheme:` (http:, mailto:, data:, …) means "not a relative path". */
function hasScheme(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href)
}

function stripQueryAndHash(href: string): string {
  return href.split('#')[0].split('?')[0]
}

function isDocument(path: string): boolean {
  const lower = path.toLowerCase()
  return DOCUMENT_EXTENSIONS.some((extension) => lower.endsWith(extension))
}

/**
 * Resolve `href` against `baseDir`, returning null when it climbs out of the
 * workspace. A leading '/' means "relative to the workspace root" (the common
 * convention in repository docs).
 */
function resolveRelative(baseDir: string, href: string): string | null {
  const decoded = decodeHref(href)
  const segments = decoded.startsWith('/') || baseDir === '' ? [] : baseDir.split('/')

  for (const segment of decoded.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (segments.length === 0) return null
      segments.pop()
      continue
    }
    segments.push(segment)
  }

  return segments.join('/')
}

function decodeHref(href: string): string {
  try {
    return decodeURIComponent(href)
  } catch {
    return href
  }
}

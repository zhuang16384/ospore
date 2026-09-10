/**
 * Serving workspace files to the renderer over `ospore://`.
 *
 * Every request resolves through {@link resolveInsideRoot}, so the scheme cannot
 * be used to read outside the workspace, and every response carries a CSP with
 * no `script-src` — a second line of defence behind the iframe's `sandbox`
 * attribute, in case a document ever reaches the renderer through another path.
 */

import { net, protocol } from 'electron'
import { pathToFileURL } from 'node:url'
import { OSPORE_SCHEME, parseOsporeUrl } from '@shared/ospore-url'
import { resolveInsideRoot } from './workspace'
import type { WorkspaceService } from './workspace.service'

/** Applied to everything the scheme serves: style and media, never script. */
export const SERVED_CSP =
  "default-src 'none'; style-src 'unsafe-inline' ospore:; img-src ospore: data:; font-src ospore:; media-src ospore:"

/**
 * Declare the scheme as privileged. Must run **before** `app.whenReady()` —
 * Chromium locks the scheme registry at startup.
 */
export function registerOsporeScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: OSPORE_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }
  ])
}

/** Install the request handler. Must run after `app.whenReady()`. */
export function registerOsporeProtocol(workspace: WorkspaceService): void {
  protocol.handle(OSPORE_SCHEME, async (request) => {
    let absolute: string
    try {
      absolute = resolveInsideRoot(workspace.requireRoot(), parseOsporeUrl(request.url))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const escapes = message.includes('escapes the workspace')
      return new Response(message, {
        status: escapes ? 403 : 404,
        headers: { 'content-type': 'text/plain; charset=utf-8' }
      })
    }

    const response = await net.fetch(pathToFileURL(absolute).toString())
    const headers = new Headers(response.headers)
    headers.set('Content-Security-Policy', SERVED_CSP)
    return new Response(response.body, { status: response.status, headers })
  })
}

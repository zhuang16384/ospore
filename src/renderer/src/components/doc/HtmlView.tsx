/**
 * Sandboxed html view.
 *
 * Served over `ospore://` so the document's own relative CSS, images and fonts
 * resolve — `srcdoc` would break every one of them. The iframe gets an empty
 * `sandbox` attribute (no scripts, no preload bridge, opaque origin) and the
 * protocol response adds a CSP without `script-src`, so a document cannot run
 * code even if the sandbox attribute is ever loosened by mistake.
 *
 * `key` forces a fresh document when the path changes; otherwise the iframe
 * would keep showing the previous page.
 */

import { buildOsporeUrl } from '@shared/ospore-url'

export function HtmlView({ path }: { path: string }): JSX.Element {
  return (
    <iframe
      key={path}
      title={path}
      sandbox=""
      src={buildOsporeUrl(path)}
      className="min-h-0 w-full flex-1 border-0 bg-white"
      data-testid="html-view"
    />
  )
}

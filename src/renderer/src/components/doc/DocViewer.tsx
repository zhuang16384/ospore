/**
 * Document pane — dispatches on file type.
 *
 * Markdown scrolls inside the pane; html scrolls inside its own sandboxed
 * iframe, so the two branches own their scrolling rather than the article.
 */

import type { ReactNode } from 'react'
import { extname } from '@renderer/lib/path'
import { useFiles } from '@renderer/stores/files.store'
import { HtmlView } from './HtmlView'
import { MarkdownView } from './MarkdownView'

export function DocViewer(): JSX.Element {
  const doc = useFiles((s) => s.doc)
  const docLoading = useFiles((s) => s.docLoading)

  if (docLoading) return <Centered>Loading…</Centered>
  if (!doc) return <Centered>Select a document on the left</Centered>

  const extension = extname(doc.path)
  const isHtml = extension === '.html' || extension === '.htm'

  return (
    <article className="flex h-full min-w-0 flex-1 flex-col" data-testid="doc-viewer">
      <header className="shrink-0 border-b border-rule px-6 py-2 text-small text-text-muted">
        {doc.path}
      </header>
      {isHtml ? (
        <HtmlView path={doc.path} />
      ) : (
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <MarkdownView text={doc.text} path={doc.path} />
        </div>
      )}
    </article>
  )
}

function Centered({ children }: { children: ReactNode }): JSX.Element {
  return <div className="flex flex-1 items-center justify-center text-text-muted">{children}</div>
}

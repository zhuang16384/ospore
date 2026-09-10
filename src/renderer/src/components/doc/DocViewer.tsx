/**
 * Document pane — dispatches on file type.
 *
 * v0 currently renders raw text in both branches; the markdown renderer
 * (Phase 4) and the sandboxed html view (Phase 5) slot in behind the same
 * dispatch.
 */

import type { ReactNode } from 'react'
import { extname } from '@renderer/lib/path'
import { useFiles } from '@renderer/stores/files.store'

export function DocViewer(): JSX.Element {
  const doc = useFiles((s) => s.doc)
  const docLoading = useFiles((s) => s.docLoading)

  if (docLoading) return <Centered>加载中…</Centered>
  if (!doc) return <Centered>从左侧选择一篇文档</Centered>

  const extension = extname(doc.path)
  const isHtml = extension === '.html' || extension === '.htm'

  return (
    <article className="scrollbar-thin h-full flex-1 overflow-y-auto" data-testid="doc-viewer">
      <header className="sticky top-0 z-10 border-b border-rule bg-bg/95 px-6 py-2 text-small text-text-muted backdrop-blur">
        {doc.path}
      </header>
      {isHtml ? <RawText text={doc.text} /> : <RawText text={doc.text} />}
    </article>
  )
}

function Centered({ children }: { children: ReactNode }): JSX.Element {
  return <div className="flex flex-1 items-center justify-center text-text-muted">{children}</div>
}

function RawText({ text }: { text: string }): JSX.Element {
  return <pre className="px-6 py-4 whitespace-pre-wrap font-sans text-note">{text}</pre>
}

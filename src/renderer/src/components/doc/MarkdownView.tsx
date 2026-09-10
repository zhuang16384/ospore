/**
 * Markdown rendering.
 *
 * react-markdown builds a React tree rather than an html string, which is what
 * lets links and images be rewritten to their workspace-aware form: external
 * links go to the OS browser, sibling documents switch the pane, and everything
 * else is served over `ospore://` (see `lib/markdown-links.ts`).
 *
 * Remote images are deliberately **not** fetched — v0 does not touch the
 * network, so `![alt](https://…)` renders as its alt text instead.
 */

import type { ReactNode } from 'react'
import Markdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { resolveMarkdownHref } from '@renderer/lib/markdown-links'
import { useFiles } from '@renderer/stores/files.store'

export function MarkdownView({ text, path }: { text: string; path: string }): JSX.Element {
  return (
    <div className="prose prose-invert max-w-3xl px-6 py-4">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ href, children }) => (
            <MarkdownLink href={href} docPath={path}>
              {children}
            </MarkdownLink>
          ),
          img: ({ src, alt }) => <MarkdownImage src={src} alt={alt} docPath={path} />
        }}
      >
        {text}
      </Markdown>
    </div>
  )
}

interface LinkProps {
  href?: string
  docPath: string
  children?: ReactNode
}

function MarkdownLink({ href, docPath, children }: LinkProps): JSX.Element {
  if (!href) return <span>{children}</span>

  const target = resolveMarkdownHref(href, docPath)

  if (target.kind === 'external') {
    return (
      <a
        href={target.url}
        title={target.url}
        onClick={(event) => {
          event.preventDefault()
          void window.ospore.openExternal(target.url)
        }}
      >
        {children}
      </a>
    )
  }

  if (target.kind === 'document') {
    return (
      <a
        href="#"
        title={target.path}
        onClick={(event) => {
          event.preventDefault()
          void useFiles.getState().openDoc(target.path)
        }}
      >
        {children}
      </a>
    )
  }

  // Anchors, foreign schemes and workspace escapes keep their text but lose the link.
  return <span>{children}</span>
}

interface ImageProps {
  src?: string
  alt?: string
  docPath: string
}

function MarkdownImage({ src, alt, docPath }: ImageProps): JSX.Element | null {
  if (!src) return null

  const target = resolveMarkdownHref(src, docPath)
  if (target.kind !== 'resource') {
    return alt ? <span className="text-text-muted">{alt}</span> : null
  }

  return <img src={target.url} alt={alt ?? ''} />
}

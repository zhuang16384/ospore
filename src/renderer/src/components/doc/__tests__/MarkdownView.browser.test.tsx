import '@renderer/styles/globals.css'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownView } from '../MarkdownView'

/**
 * The Dracula document theme, in real Chromium.
 *
 * Colours are asserted as computed pixels because that is the only way to know
 * the palette reached the screen: Tailwind Typography resolves its own dark
 * theme into `--tw-prose-invert-*`, and a wrong selector depth there silently
 * keeps the neutral defaults while every class name still looks right.
 *
 * The syntax colours are the official Dracula highlight.js theme. highlight.js's
 * bundled `base16/dracula.css` is a different palette, so a regression to it
 * would show up here as orange-ish keywords instead of pink.
 */

const DOC = [
  '# Heading',
  '',
  'Body with **bold**, *italic*, `inline code` and a [link](https://example.com).',
  '',
  '> quoted text',
  '',
  '```js',
  '// note',
  'const value = "text"',
  '```'
].join('\n')

function renderDoc(): HTMLElement {
  const { container } = render(<MarkdownView text={DOC} path="README.md" />)
  return container
}

function computed(root: HTMLElement, selector: string, property: string): string {
  const element = root.querySelector(selector)
  if (!element) throw new Error(`no element for ${selector}`)
  return getComputedStyle(element)[property as never] as string
}

describe('MarkdownView Dracula theme', () => {
  it('paints the reading surface with the Dracula background and foreground', () => {
    const container = renderDoc()

    expect(computed(container, '[data-testid="markdown-view"]', 'backgroundColor')).toBe(
      'rgb(40, 42, 54)'
    )
    expect(computed(container, '[data-testid="markdown-view"]', 'color')).toBe('rgb(248, 248, 242)')
    expect(computed(container, 'p', 'color')).toBe('rgb(248, 248, 242)')
  })

  it('maps prose roles onto Dracula accents', () => {
    const container = renderDoc()

    expect(computed(container, 'h1', 'color')).toBe('rgb(255, 121, 198)') // pink
    expect(computed(container, 'a', 'color')).toBe('rgb(139, 233, 253)') // cyan
    expect(computed(container, 'strong', 'color')).toBe('rgb(255, 184, 108)') // orange
    expect(computed(container, 'p code', 'color')).toBe('rgb(80, 250, 123)') // green
    expect(computed(container, 'blockquote', 'borderLeftColor')).toBe('rgb(189, 147, 249)') // purple
    expect(computed(container, 'blockquote p', 'color')).toBe('rgb(98, 114, 164)') // comment
  })

  it('gives code blocks a raised Dracula surface', () => {
    const container = renderDoc()

    expect(computed(container, 'pre', 'backgroundColor')).toBe('rgb(33, 34, 44)')
    expect(computed(container, 'pre code', 'color')).toBe('rgb(248, 248, 242)')
  })

  it('highlights syntax with the Dracula highlight.js palette', () => {
    const container = renderDoc()

    expect(computed(container, '.hljs-keyword', 'color')).toBe('rgb(255, 121, 198)') // pink
    expect(computed(container, '.hljs-string', 'color')).toBe('rgb(241, 250, 140)') // yellow
    expect(computed(container, '.hljs-comment', 'color')).toBe('rgb(98, 114, 164)') // comment
  })
})

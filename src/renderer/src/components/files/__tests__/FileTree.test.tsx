// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileNode } from '@shared/domain'
import { useFiles } from '@renderer/stores/files.store'
import { FileTree } from '../FileTree'

/**
 * Regression: rows used to resize when you clicked them.
 *
 * `cn()` runs tailwind-merge, which cannot tell that the custom `--text-*`
 * tokens are font sizes — it filed `text-small` under *text color*, so the
 * `text-text-muted` on an unopenable file and the `text-text-primary` added on
 * selection both deleted it. Directory rows (which never went through `cn()`)
 * kept 12px while file rows fell back to the inherited 15px.
 *
 * jsdom applies no stylesheet, so this asserts the class contract rather than
 * computed pixels: one size class on every row, and it survives the color class
 * that selection adds. `lib/__tests__/utils.test.ts` covers `cn()` itself and
 * `utils.test.ts` guards that the tokens stay in the stylesheet's `@theme`.
 */
const NODES: FileNode[] = [
  { name: 'docs', path: 'docs', kind: 'directory', openable: false },
  { name: 'README.md', path: 'README.md', kind: 'file', openable: true },
  { name: 'notes.txt', path: 'notes.txt', kind: 'file', openable: false }
]

beforeEach(() => {
  useFiles.getState().reset()
  useFiles.setState({ children: { '': NODES } })
  window.ospore = {
    listDirectory: vi.fn().mockResolvedValue(NODES),
    readFile: vi.fn()
  } as unknown as Window['ospore']
})

function rows(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Files"] button')]
}

/** Exact class match — `includes()` would also hit `hover:bg-accent-surface`. */
function hasClass(element: HTMLElement | undefined, name: string): boolean {
  return element?.classList.contains(name) === true
}

describe('FileTree', () => {
  it('gives every row the same font-size class, whatever its kind or color', () => {
    render(<FileTree />)

    expect(rows()).toHaveLength(NODES.length)
    for (const row of rows()) expect(row.className).toContain('text-small')
  })

  it('keeps the font size when selection adds a text color', () => {
    useFiles.setState({ doc: { path: 'README.md', text: '# Hello' } })
    render(<FileTree />)

    const active = rows().filter((row) => hasClass(row, 'bg-accent-surface'))
    expect(active.map((row) => row.textContent)).toEqual(['README.md'])
    expect(active[0].className).toContain('text-small')
    expect(active[0].className).toContain('text-text-primary')
  })

  it('indents one level per directory depth', () => {
    useFiles.setState({ children: { '': NODES, docs: [] }, expanded: { docs: true } })
    render(<FileTree />)

    const indent = (text: string): string =>
      rows().find((row) => row.textContent?.includes(text))?.style.paddingLeft ?? ''
    expect(indent('docs')).toBe('8px')
    expect(indent('README.md')).toBe('22px')
  })
})

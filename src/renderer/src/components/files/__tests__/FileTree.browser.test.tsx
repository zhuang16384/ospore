import '@renderer/styles/globals.css'
import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileNode } from '@shared/domain'
import { useFiles } from '@renderer/stores/files.store'
import { FileTree } from '../FileTree'

/**
 * The file tree in real Chromium.
 *
 * jsdom applies no stylesheet, so it cannot see the bug these tests exist for:
 * tailwind-merge used to delete `text-small` from any row that also set a text
 * color, which dropped file rows to the inherited 15px while directory rows
 * stayed at 12px — and made a file grow the moment it was selected.
 *
 * The app stylesheet has to be imported explicitly. It is not decoration: the
 * 15px fallback these assertions guard against comes from `body`'s
 * `font-size: var(--font-note)` in globals.css. Importing it also means a token
 * that drifts out of `@theme` (and therefore compiles to no utility at all)
 * fails here, which is the one link a jsdom test cannot reach.
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
    readFile: vi.fn().mockResolvedValue({ path: 'README.md', text: '# Hello' })
  } as unknown as Window['ospore']
})

function row(text: string): HTMLButtonElement {
  const found = [
    ...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Files"] button')
  ].find((element) => element.textContent?.includes(text))
  if (!found) throw new Error(`No file-tree row for ${text}`)
  return found
}

function rows(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Files"] button')]
}

/** Everything the eye reads as "the text moved or changed weight". */
function box(element: HTMLButtonElement): Record<string, number | string> {
  const label = element.querySelector('span')
  const rect = element.getBoundingClientRect()
  return {
    fontSize: getComputedStyle(label ?? element).fontSize,
    fontWeight: getComputedStyle(label ?? element).fontWeight,
    rowHeight: +rect.height.toFixed(2),
    rowWidth: +rect.width.toFixed(2),
    rowTop: +rect.top.toFixed(2),
    labelLeft: +(label?.getBoundingClientRect().left ?? 0).toFixed(2)
  }
}

describe('FileTree in a browser', () => {
  it('renders every row at one font size and one height', () => {
    render(<FileTree />)

    expect(rows()).toHaveLength(NODES.length)
    // Directories, openable files and muted files must all read the same.
    expect(new Set(rows().map((element) => box(element).fontSize))).toEqual(new Set(['12px']))
    expect(new Set(rows().map((element) => box(element).rowHeight))).toEqual(
      new Set([box(rows()[0]).rowHeight])
    )
  })

  it('does not resize a row when it is selected', async () => {
    const user = userEvent.setup()
    render(<FileTree />)

    const target = row('README.md')
    const before = box(target)
    expect(before.fontSize).toBe('12px')

    await user.click(target)
    await waitFor(() => expect(target.classList.contains('bg-accent-surface')).toBe(true))

    expect(box(target)).toEqual(before)
  })

  it('keeps the indentation of the row it does not select', async () => {
    const user = userEvent.setup()
    render(<FileTree />)

    const sibling = row('notes.txt')
    const before = box(sibling)

    await user.click(row('README.md'))
    await waitFor(() => expect(row('README.md').classList.contains('bg-accent-surface')).toBe(true))

    expect(box(sibling)).toEqual(before)
  })
})

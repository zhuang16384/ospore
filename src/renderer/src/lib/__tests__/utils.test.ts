import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FONT_SIZE_TOKENS, cn } from '../utils'

/**
 * Regression guard for the font-size / text-color collision.
 *
 * `text-small` used to be dropped by tailwind-merge whenever a text color
 * followed it in the same `cn()` call, which is what made file-tree rows resize
 * on selection. These cases pin the behaviour in both directions.
 */
describe('cn', () => {
  it('keeps a custom font size next to a text color', () => {
    expect(cn('text-small', 'text-text-muted')).toBe('text-small text-text-muted')
    expect(cn('text-small', 'text-text-primary')).toBe('text-small text-text-primary')
    expect(cn('text-note', 'text-text-secondary')).toBe('text-note text-text-secondary')
  })

  it('still merges a real conflict', () => {
    expect(cn('text-small', 'text-note')).toBe('text-note')
    expect(cn('text-text-muted', 'text-text-primary')).toBe('text-text-primary')
  })

  it('leaves text-align alone', () => {
    expect(cn('text-left', 'text-small')).toBe('text-left text-small')
  })

  it('is order-independent in both directions', () => {
    expect(cn('text-text-muted', 'text-small')).toBe('text-text-muted text-small')
  })
})

/**
 * The token list is hand-written, so make sure adding `--text-*` to the
 * stylesheet without registering it here fails loudly instead of silently
 * reintroducing the bug. `FileTree.browser.test.tsx` covers the other half —
 * that a token actually compiles and renders at the right size.
 */
describe('FONT_SIZE_TOKENS', () => {
  it('lists every font size declared in the @theme block', () => {
    const css = readFileSync(new URL('../../styles/globals.css', import.meta.url), 'utf8')

    // Tailwind only turns a token into a `text-*` utility when it sits inside
    // `@theme`. A size that drifts out to `:root` still exists as a CSS
    // variable but compiles to no utility at all, so match the block, not the
    // whole file.
    const theme = css.match(/@theme[^{]*\{([\s\S]*?)\n\}/)?.[1] ?? ''
    expect(theme, 'globals.css must declare an @theme block').not.toBe('')

    const declared = [...theme.matchAll(/^\s*--text-([a-z0-9-]+):/gm)].map((m) => m[1])

    expect(declared.length).toBeGreaterThan(0)
    expect([...declared].sort()).toEqual([...FONT_SIZE_TOKENS].sort())
  })
})

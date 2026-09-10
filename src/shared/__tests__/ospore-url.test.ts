import { describe, expect, it } from 'vitest'
import { OSPORE_HOST, OSPORE_SCHEME, buildOsporeUrl, parseOsporeUrl } from '../ospore-url'

describe('ospore url', () => {
  it('builds a workspace url', () => {
    expect(buildOsporeUrl('docs/design/ui/index.html')).toBe(
      `${OSPORE_SCHEME}://${OSPORE_HOST}/docs/design/ui/index.html`
    )
  })

  it('strips leading and trailing separators', () => {
    expect(buildOsporeUrl('/docs/')).toBe(`${OSPORE_SCHEME}://${OSPORE_HOST}/docs`)
  })

  it('encodes characters that would change the url shape', () => {
    expect(buildOsporeUrl('docs/a b#c?.md')).toBe(
      `${OSPORE_SCHEME}://${OSPORE_HOST}/docs/a%20b%23c%3F.md`
    )
  })

  it('round-trips a path with spaces and unicode', () => {
    const path = 'docs/café notes/a b.md'
    expect(parseOsporeUrl(buildOsporeUrl(path))).toBe(path)
  })

  it('round-trips the workspace root', () => {
    expect(parseOsporeUrl(buildOsporeUrl(''))).toBe('')
  })

  it('rejects a foreign host', () => {
    expect(() => parseOsporeUrl(`${OSPORE_SCHEME}://elsewhere/a.md`)).toThrow('Unknown ospore host')
  })

  it('rejects a foreign scheme', () => {
    expect(() => parseOsporeUrl('https://example.com/a.md')).toThrow('Not an ospore URL')
  })
})

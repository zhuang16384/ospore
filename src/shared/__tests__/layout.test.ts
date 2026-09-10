import { describe, expect, it } from 'vitest'
import { DEFAULT_LAYOUT, SIDEBAR, clampSidebarWidth, normalizeLayout } from '../layout'

describe('clampSidebarWidth', () => {
  it('keeps a width inside the stored bounds', () => {
    expect(clampSidebarWidth(400)).toBe(400)
  })

  it('pulls a width up to the minimum and down to the maximum', () => {
    expect(clampSidebarWidth(10)).toBe(SIDEBAR.min)
    expect(clampSidebarWidth(10_000)).toBe(SIDEBAR.max)
  })

  it('rounds fractional widths so the style stays a whole pixel', () => {
    expect(clampSidebarWidth(300.6)).toBe(301)
  })

  it('falls back to the default for values that would break the layout', () => {
    // NaN would render as `width: NaNpx` and collapse the rail.
    expect(clampSidebarWidth(Number.NaN)).toBe(SIDEBAR.default)
    expect(clampSidebarWidth(Number.POSITIVE_INFINITY)).toBe(SIDEBAR.default)
  })

  it('leaves room for the document pane when the container is known', () => {
    // 800 - 320 = 480, below the stored maximum, so the container wins.
    expect(clampSidebarWidth(700, 800)).toBe(480)
  })

  it('never goes below the minimum, however narrow the window', () => {
    // 200 - 320 is negative; the rail still gets its minimum.
    expect(clampSidebarWidth(700, 200)).toBe(SIDEBAR.min)
  })

  it('falls back to the stored bounds when the container cannot be measured', () => {
    // An unmeasurable container must not shrink the ceiling; the static maximum
    // still applies, and a width already inside the bounds is untouched.
    expect(clampSidebarWidth(700, Number.NaN)).toBe(700)
    expect(clampSidebarWidth(99_999, Number.NaN)).toBe(SIDEBAR.max)
  })
})

describe('normalizeLayout', () => {
  it('accepts a well-formed layout', () => {
    expect(normalizeLayout({ sidebarWidth: 333 })).toEqual({ sidebarWidth: 333 })
  })

  it('repairs anything else into the default', () => {
    for (const input of [undefined, null, 'wide', {}, { sidebarWidth: 'wide' }, 42]) {
      expect(normalizeLayout(input)).toEqual(DEFAULT_LAYOUT)
    }
  })

  it('clamps an out-of-range stored width instead of trusting it', () => {
    expect(normalizeLayout({ sidebarWidth: 99_999 })).toEqual({ sidebarWidth: SIDEBAR.max })
    expect(normalizeLayout({ sidebarWidth: -5 })).toEqual({ sidebarWidth: SIDEBAR.min })
  })

  it('returns a fresh object so callers cannot mutate the default', () => {
    expect(normalizeLayout(null)).not.toBe(DEFAULT_LAYOUT)
  })
})

import '@renderer/styles/globals.css'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SIDEBAR } from '@shared/layout'
import { useLayout } from '@renderer/stores/layout.store'
import App from '../../../App'

/**
 * Drag-to-resize, in real Chromium.
 *
 * jsdom has neither layout nor pointer capture, so the arithmetic would be
 * testing a mock. Here the pane is really measured, which is the point: a
 * splitter that reports the right number but never changes the box is exactly
 * the failure this guards against. `@shared/layout`'s clamp is covered
 * separately in the node lane; this file is about the wiring — pointer to store
 * to style to measured width.
 *
 * The viewport is set to 1280x800 in `vitest.config.ts`; at the default 414px
 * there is no room beside the document minimum and everything clamps to 180.
 */

beforeEach(() => {
  useLayout.setState({ sidebarWidth: SIDEBAR.default, dragging: false, error: null })
  window.ospore = {
    getWorkspace: vi.fn().mockResolvedValue({ root: '/repo', recents: [] }),
    openWorkspace: vi.fn(),
    listDirectory: vi.fn().mockResolvedValue([]),
    readFile: vi.fn(),
    getLayout: vi.fn().mockResolvedValue({ sidebarWidth: SIDEBAR.default }),
    setLayout: vi.fn().mockImplementation((layout) => Promise.resolve(layout)),
    openExternal: vi.fn()
  } as unknown as Window['ospore']
})

function splitter(): HTMLElement {
  return document.querySelector('[data-testid="splitter"]') as HTMLElement
}

/** The rail is the splitter's previous sibling, so its box is the sidebar. */
function railWidth(): number {
  return Math.round(
    (splitter().previousElementSibling as HTMLElement).getBoundingClientRect().width
  )
}

/** Room the document pane's minimum leaves for the rail. */
function roomForRail(): number {
  return Math.round(splitter().parentElement!.getBoundingClientRect().width - SIDEBAR.docMin)
}

function pointer(type: string, clientX: number): PointerEvent {
  return new PointerEvent(type, { clientX, bubbles: true, pointerId: 1 })
}

async function fire(events: Event[]): Promise<void> {
  await act(async () => {
    for (const event of events) splitter().dispatchEvent(event)
  })
}

/** A full press-drag-release, the way the pointer actually arrives. */
async function drag(to: number): Promise<void> {
  await fire([pointer('pointerdown', 300), pointer('pointermove', to), pointer('pointerup', to)])
}

async function mountApp(): Promise<void> {
  render(<App />)
  await vi.waitFor(() => expect(splitter()).toBeTruthy())
}

describe('Splitter in a browser', () => {
  it('widens the rail as the handle is dragged right', async () => {
    await mountApp()
    expect(railWidth()).toBe(SIDEBAR.default)

    await drag(460)

    expect(railWidth()).toBe(460)
  })

  it('never lets the rail squeeze the document below its minimum', async () => {
    await mountApp()

    await drag(99_999) // far past the right edge of the window

    // The cap is whichever comes first: the stored maximum, or the room the
    // document pane's minimum leaves.
    expect(railWidth()).toBe(Math.min(SIDEBAR.max, Math.max(SIDEBAR.min, roomForRail())))
  })

  it('never collapses the rail to nothing', async () => {
    await mountApp()

    await drag(0)

    expect(railWidth()).toBe(SIDEBAR.min)
  })

  it('resizes with the arrow keys, and coarsely with Shift', async () => {
    await mountApp()

    await fire([new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })])
    expect(railWidth()).toBe(SIDEBAR.default + SIDEBAR.step)

    await fire([new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true })])
    expect(railWidth()).toBe(SIDEBAR.default + SIDEBAR.step + SIDEBAR.step * 4)

    await fire([new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })])
    expect(railWidth()).toBe(SIDEBAR.default + SIDEBAR.step * 4)

    await fire([new KeyboardEvent('keydown', { key: 'End', bubbles: true })])
    expect(railWidth()).toBe(SIDEBAR.max)

    await fire([new KeyboardEvent('keydown', { key: 'Home', bubbles: true })])
    expect(railWidth()).toBe(SIDEBAR.min)
  })

  it('restores the default on double-click', async () => {
    await mountApp()
    await drag(460)
    expect(railWidth()).toBe(460)

    await fire([new MouseEvent('dblclick', { bubbles: true })])

    expect(railWidth()).toBe(SIDEBAR.default)
  })

  it('persists once per gesture, not once per pointermove', async () => {
    await mountApp()

    const steps = [300, 320, 340, 360]
    await fire([
      pointer('pointerdown', steps[0]),
      ...steps.slice(1).map((x) => pointer('pointermove', x))
    ])
    // Mid-drag the store is updated but nothing has been written yet.
    expect(window.ospore.setLayout).not.toHaveBeenCalled()

    await fire([pointer('pointerup', 360)])

    expect(window.ospore.setLayout).toHaveBeenCalledTimes(1)
    expect(window.ospore.setLayout).toHaveBeenCalledWith({ sidebarWidth: 360 })
  })

  it('does not keep resizing after the pointer is released', async () => {
    await mountApp()
    await drag(400)

    await fire([pointer('pointermove', 700)])

    expect(railWidth()).toBe(400)
  })

  it('restores the stored width on start', async () => {
    window.ospore.getLayout = vi
      .fn()
      .mockResolvedValue({ sidebarWidth: 400 }) as unknown as Window['ospore']['getLayout']

    await mountApp()

    expect(railWidth()).toBe(400)
  })

  it('exposes itself to assistive tech as a vertical splitter', async () => {
    await mountApp()

    await vi.waitFor(() => expect(railWidth()).toBe(SIDEBAR.default))
    expect(splitter().getAttribute('role')).toBe('separator')
    expect(splitter().getAttribute('aria-orientation')).toBe('vertical')
    expect(splitter().getAttribute('aria-valuenow')).toBe(String(SIDEBAR.default))
    expect(splitter().tabIndex).toBe(0)
  })
})

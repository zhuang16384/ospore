/**
 * Layout state (zustand).
 *
 * Width is applied live while dragging and written back to `config.json` only
 * when the drag ends — a pointermove stream must not become a write stream.
 * `dragging` lives here rather than inside the splitter because the whole layout
 * has to react to it (no text selection, resize cursor everywhere).
 */

import { create } from 'zustand'
import { DEFAULT_LAYOUT, clampSidebarWidth } from '@shared/layout'
import { messageOf } from '@renderer/lib/errors'

interface LayoutStore {
  sidebarWidth: number
  dragging: boolean
  error: string | null

  load(): Promise<void>
  beginResize(): void
  resizeTo(width: number): void
  endResize(): Promise<void>
}

export const useLayout = create<LayoutStore>()((set, get) => ({
  sidebarWidth: DEFAULT_LAYOUT.sidebarWidth,
  dragging: false,
  error: null,

  async load(): Promise<void> {
    try {
      const { sidebarWidth } = await window.ospore.getLayout()
      set({ sidebarWidth: clampSidebarWidth(sidebarWidth), error: null })
    } catch (error) {
      // A layout that cannot be read is not worth blocking the app for; the
      // default is perfectly usable.
      set({ error: messageOf(error) })
    }
  },

  beginResize(): void {
    set({ dragging: true })
  },

  resizeTo(width: number): void {
    set({ sidebarWidth: clampSidebarWidth(width) })
  },

  async endResize(): Promise<void> {
    set({ dragging: false })
    try {
      const stored = await window.ospore.setLayout({ sidebarWidth: get().sidebarWidth })
      set({ sidebarWidth: clampSidebarWidth(stored.sidebarWidth), error: null })
    } catch (error) {
      set({ error: messageOf(error) })
    }
  }
}))

/**
 * Workspace UI state (zustand).
 *
 * Holds the snapshot the main process hands back — the current root and the
 * recent-workspace list — plus the error banner. Every mutation replaces the
 * whole snapshot with the main-process answer, so the renderer never patches
 * state locally.
 */

import { create } from 'zustand'
import type { RecentWorkspace } from '@shared/domain'
import { messageOf } from '@renderer/lib/errors'

interface WorkspaceStore {
  root: string | null
  recents: RecentWorkspace[]
  loading: boolean
  error: string | null

  init(): Promise<void>
  open(path?: string): Promise<void>
  setError(error: string | null): void
}

export const useWorkspace = create<WorkspaceStore>()((set) => ({
  root: null,
  recents: [],
  loading: false,
  error: null,

  async init(): Promise<void> {
    set({ loading: true })
    try {
      const state = await window.ospore.getWorkspace()
      set({ root: state.root, recents: state.recents, error: null })
    } catch (error) {
      set({ error: messageOf(error) })
    } finally {
      set({ loading: false })
    }
  },

  async open(path?: string): Promise<void> {
    set({ loading: true })
    try {
      const state = await window.ospore.openWorkspace(path)
      set({ root: state.root, recents: state.recents, error: null })
    } catch (error) {
      set({ error: messageOf(error) })
    } finally {
      set({ loading: false })
    }
  },

  setError(error: string | null): void {
    set({ error })
  }
}))

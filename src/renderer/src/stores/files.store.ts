/**
 * File-tree + open-document state (zustand).
 *
 * The tree is loaded lazily, one directory at a time, and cached by directory
 * path — so expanding is free the second time and collapsing never throws the
 * listing away. `reset()` is called whenever the workspace root changes,
 * because relative paths are only meaningful within one root.
 */

import { create } from 'zustand'
import type { FileNode } from '@shared/domain'
import { messageOf } from '@renderer/lib/errors'

interface FilesStore {
  /** Children per directory path ('' is the workspace root). */
  children: Record<string, FileNode[]>
  /** Which directories are expanded. */
  expanded: Record<string, boolean>
  /** Which directories are mid-load. */
  loading: Record<string, boolean>
  /** The open document, or null when the viewer is empty. */
  doc: { path: string; text: string } | null
  docLoading: boolean
  error: string | null

  ensureLoaded(dirPath: string): Promise<void>
  toggle(dirPath: string): Promise<void>
  openDoc(path: string): Promise<void>
  reset(): void
  setError(error: string | null): void
}

export const useFiles = create<FilesStore>()((set, get) => ({
  children: {},
  expanded: {},
  loading: {},
  doc: null,
  docLoading: false,
  error: null,

  async ensureLoaded(dirPath: string): Promise<void> {
    if (get().children[dirPath]) return
    set((state) => ({ loading: { ...state.loading, [dirPath]: true } }))
    try {
      const nodes = await window.ospore.listDirectory(dirPath)
      set((state) => ({
        children: { ...state.children, [dirPath]: nodes },
        error: null
      }))
    } catch (error) {
      set({ error: messageOf(error) })
    } finally {
      set((state) => ({ loading: { ...state.loading, [dirPath]: false } }))
    }
  },

  async toggle(dirPath: string): Promise<void> {
    const open = get().expanded[dirPath] === true
    set((state) => ({ expanded: { ...state.expanded, [dirPath]: !open } }))
    if (!open) await get().ensureLoaded(dirPath)
  },

  async openDoc(path: string): Promise<void> {
    set({ docLoading: true })
    try {
      const file = await window.ospore.readFile(path)
      set({ doc: { path: file.path, text: file.text }, error: null })
    } catch (error) {
      set({ error: messageOf(error) })
    } finally {
      set({ docLoading: false })
    }
  },

  reset(): void {
    set({ children: {}, expanded: {}, loading: {}, doc: null, docLoading: false, error: null })
  },

  setError(error: string | null): void {
    set({ error })
  }
}))

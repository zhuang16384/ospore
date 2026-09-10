/**
 * File-tree + open-document state (zustand).
 *
 * The tree is loaded lazily, one directory at a time, and cached by directory
 * path — so expanding is free the second time and collapsing never throws the
 * listing away.
 *
 * Relative paths are only meaningful within one root, so switching workspaces
 * has to drop the whole cache *and* reload: `loadWorkspace` does both, because
 * splitting them is how the tree ended up empty after "Open Folder".
 */

import { create } from 'zustand'
import type { FileNode } from '@shared/domain'
import { messageOf } from '@renderer/lib/errors'

/**
 * Bumped whenever the workspace changes.
 *
 * A directory listing that was requested under an older generation resolves
 * against the *previous* root, so its answer is thrown away rather than written
 * into the new cache. Without this, switching twice in quick succession can
 * plant the old tree under the new root.
 */
let generation = 0

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

  loadWorkspace(): Promise<void>
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

  /**
   * Point the tree at a new workspace root.
   *
   * One action on purpose: the cache has to be dropped and level 0 reloaded as
   * a unit. Doing them from separate effects leaves a window where the cache is
   * empty and nothing will ever refill it — and React runs child effects before
   * parent ones, so a child-keyed reload would read the old cache and then be
   * wiped by the parent's reset.
   */
  async loadWorkspace(): Promise<void> {
    generation += 1
    get().reset()
    await get().ensureLoaded('')
  },

  async ensureLoaded(dirPath: string): Promise<void> {
    if (get().children[dirPath]) return
    const startedAt = generation
    set((state) => ({ loading: { ...state.loading, [dirPath]: true } }))
    try {
      const nodes = await window.ospore.listDirectory(dirPath)
      if (startedAt !== generation) return
      set((state) => ({
        children: { ...state.children, [dirPath]: nodes },
        error: null
      }))
    } catch (error) {
      if (startedAt !== generation) return
      set({ error: messageOf(error) })
    } finally {
      if (startedAt === generation) {
        set((state) => ({ loading: { ...state.loading, [dirPath]: false } }))
      }
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

// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileNode } from '@shared/domain'
import { useFiles } from '../files.store'

/**
 * Workspace switching.
 *
 * Regression: the tree cache was cleared by the shell but refilled by
 * FileTree's *mount* effect, which never re-runs when the root changes — so
 * "Open Folder" left the rail empty. Cache-drop and reload have to be one
 * action.
 *
 * The generation guard is tested here rather than through the UI because it is
 * about which async answer is allowed to win, not about rendering.
 */

function node(name: string): FileNode {
  return { name, path: name, kind: 'file', openable: true }
}

const listDirectory = vi.fn()

beforeEach(() => {
  vi.restoreAllMocks()
  useFiles.getState().reset()
  listDirectory.mockReset()
  window.ospore = { listDirectory } as unknown as Window['ospore']
})

describe('loadWorkspace', () => {
  it('drops the old cache and loads the new root', async () => {
    listDirectory.mockResolvedValueOnce([node('one.md')])
    await useFiles.getState().loadWorkspace()
    useFiles.setState({ expanded: { docs: true }, doc: { path: 'one.md', text: '' } })

    listDirectory.mockResolvedValueOnce([node('two.md')])
    await useFiles.getState().loadWorkspace()

    const state = useFiles.getState()
    expect(state.children['']).toEqual([node('two.md')])
    // Selection and expansion belong to the old root.
    expect(state.expanded).toEqual({})
    expect(state.doc).toBeNull()
  })

  it('discards a listing that arrives after the workspace changed', async () => {
    let releaseSlowRead: (nodes: FileNode[]) => void = () => {}
    listDirectory
      .mockImplementationOnce(
        () => new Promise<FileNode[]>((resolve) => (releaseSlowRead = resolve))
      )
      .mockResolvedValueOnce([node('two.md')])

    const slowRead = useFiles.getState().loadWorkspace()
    await useFiles.getState().loadWorkspace()
    expect(useFiles.getState().children['']).toEqual([node('two.md')])

    // The answer for the previous root lands last and must be ignored.
    releaseSlowRead([node('one.md')])
    await slowRead

    expect(useFiles.getState().children['']).toEqual([node('two.md')])
  })

  it('does not refetch a directory it already has', async () => {
    listDirectory.mockResolvedValue([node('one.md')])
    await useFiles.getState().loadWorkspace()
    await useFiles.getState().loadWorkspace()

    expect(listDirectory).toHaveBeenCalledTimes(2)
  })
})

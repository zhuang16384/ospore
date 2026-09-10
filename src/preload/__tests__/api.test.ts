import { describe, expect, it, vi } from 'vitest'
import { IpcEvents } from '@shared/ipc-events'
import { createOsporeAPI, type IPCRendererLike } from '../api'

/**
 * Bridge spot-checks, not exhaustive pass-through coverage: one call per
 * channel plus rejection propagation. The rest is typed glue.
 */

function makeRenderer(invoke = vi.fn().mockResolvedValue(undefined)): IPCRendererLike {
  return { invoke, send: vi.fn(), on: vi.fn(), removeListener: vi.fn() }
}

describe('createOsporeAPI', () => {
  it('getWorkspace invokes its channel', async () => {
    const invoke = vi.fn().mockResolvedValue({ root: null, recents: [] })
    const api = createOsporeAPI(makeRenderer(invoke))

    await api.getWorkspace()

    expect(invoke).toHaveBeenCalledWith(IpcEvents.WORKSPACE_GET)
  })

  it('openWorkspace forwards an optional path', async () => {
    const invoke = vi.fn().mockResolvedValue({ root: '/ws', recents: [] })
    const api = createOsporeAPI(makeRenderer(invoke))

    await api.openWorkspace('/ws')
    expect(invoke).toHaveBeenCalledWith(IpcEvents.WORKSPACE_OPEN, '/ws')

    await api.openWorkspace()
    expect(invoke).toHaveBeenLastCalledWith(IpcEvents.WORKSPACE_OPEN, undefined)
  })

  it('file methods forward the relative path', async () => {
    const invoke = vi.fn().mockResolvedValue(undefined)
    const api = createOsporeAPI(makeRenderer(invoke))

    await api.listDirectory('docs')
    expect(invoke).toHaveBeenCalledWith(IpcEvents.FILE_TREE, 'docs')

    await api.readFile('docs/a.md')
    expect(invoke).toHaveBeenCalledWith(IpcEvents.FILE_READ, 'docs/a.md')
  })

  it('layout methods forward the geometry', async () => {
    const invoke = vi.fn().mockResolvedValue({ sidebarWidth: 320 })
    const api = createOsporeAPI(makeRenderer(invoke))

    await api.getLayout()
    expect(invoke).toHaveBeenCalledWith(IpcEvents.LAYOUT_GET)

    await api.setLayout({ sidebarWidth: 320 })
    expect(invoke).toHaveBeenCalledWith(IpcEvents.LAYOUT_SET, { sidebarWidth: 320 })
  })

  it('propagates rejections from the main process', async () => {
    const invoke = vi.fn().mockRejectedValue(new Error('No workspace is open'))
    const api = createOsporeAPI(makeRenderer(invoke))

    await expect(api.listDirectory('')).rejects.toThrow('No workspace is open')
  })
})

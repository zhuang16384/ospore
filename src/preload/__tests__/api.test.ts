import { describe, expect, it, vi } from 'vitest'
import { createOsporeAPI, type IPCRendererLike } from '../api'
import { IpcEvents } from '@shared/ipc-events'

/**
 * Bridge spot-checks, not exhaustive pass-through coverage: one method per
 * argument shape plus rejection propagation. The rest is typed glue.
 */

describe('createOsporeAPI', () => {
  it('read methods invoke their channel', async () => {
    const invoke = vi.fn().mockResolvedValue([])
    const api = createOsporeAPI(makeRenderer(invoke))

    await api.listProjects()
    expect(invoke).toHaveBeenCalledWith(IpcEvents.PROJECT_LIST)
  })

  it('mutation methods forward args on their channels', async () => {
    const invoke = vi.fn().mockResolvedValue([])
    const api = createOsporeAPI(makeRenderer(invoke))

    await api.createProject('Prototype')
    expect(invoke).toHaveBeenCalledWith(IpcEvents.PROJECT_CREATE, 'Prototype')

    await api.moveCard('k1', 'c2', 3)
    expect(invoke).toHaveBeenCalledWith(IpcEvents.CARD_MOVE, 'k1', 'c2', 3)
  })

  it('propagates rejections from the main process', async () => {
    const invoke = vi.fn().mockRejectedValue(new Error('Project not found: missing'))
    const api = createOsporeAPI(makeRenderer(invoke))

    await expect(api.getBoard('missing')).rejects.toThrow('Project not found: missing')
  })
})

function makeRenderer(invoke: ReturnType<typeof vi.fn>): IPCRendererLike {
  return {
    invoke,
    send: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
  }
}

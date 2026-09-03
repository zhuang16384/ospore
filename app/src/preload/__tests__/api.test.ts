import { describe, expect, it, vi } from 'vitest'
import { createOsporeAPI, type IPCRendererLike } from '../api'
import { IpcEvents } from '@shared/ipc-events'

describe('createOsporeAPI', () => {
  it('ping invokes the ping channel', async () => {
    const invoke = vi.fn().mockResolvedValue('pong')
    const fakeIPCRenderer: IPCRendererLike = {
      invoke,
      send: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn()
    }

    const api = createOsporeAPI(fakeIPCRenderer)
    await expect(api.ping()).resolves.toBe('pong')
    expect(invoke).toHaveBeenCalledWith(IpcEvents.PING)
  })
})

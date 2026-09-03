import { describe, expect, it, vi } from 'vitest'
import { setupIPC, type IPCMainLike } from '../ipc'
import { IpcEvents } from '@shared/ipc-events'

describe('setupIPC', () => {
  it('registers a ping handler that answers pong', async () => {
    const handlers = new Map<string, (...args: unknown[]) => unknown>()
    const fakeIPCMain: IPCMainLike = {
      handle: (channel, listener) => handlers.set(channel, listener),
      on: vi.fn()
    }

    setupIPC(fakeIPCMain)

    const handler = handlers.get(IpcEvents.PING)
    expect(handler).toBeDefined()
    await expect(handler?.()).resolves.toBe('pong')
  })
})

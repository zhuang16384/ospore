import { describe, expect, it, vi } from 'vitest'
import { setupIPC, type IPCMainLike } from '../ipc'
import { IpcEvents } from '@shared/ipc-events'

describe('setupIPC', () => {
  it('registers kanban handlers that forward to the store', async () => {
    const handlers = new Map<string, (...args: unknown[]) => unknown>()
    const fakeIPCMain: IPCMainLike = {
      handle: (channel, listener) => handlers.set(channel, listener),
      on: vi.fn()
    }
    const listProjects = vi.fn().mockReturnValue([])
    const store = { listProjects } as unknown as Parameters<typeof setupIPC>[1]

    setupIPC(fakeIPCMain, store)

    const handler = handlers.get(IpcEvents.PROJECT_LIST)
    expect(handler).toBeDefined()
    expect(handler?.({})).toEqual([])
    expect(listProjects).toHaveBeenCalledTimes(1)
  })
})

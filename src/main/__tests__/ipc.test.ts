import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { IpcEvents } from '@shared/ipc-events'
import type { WorkspaceState } from '@shared/domain'
import { setupIPC, type IPCMainLike } from '../ipc'
import { canonicalRoot } from '../workspace'
import type { WorkspaceService } from '../workspace.service'

type Handler = (...args: unknown[]) => unknown

function makeIPC(): { ipc: IPCMainLike; handlers: Map<string, Handler> } {
  const handlers = new Map<string, Handler>()
  const ipc: IPCMainLike = {
    handle: (channel, listener) => handlers.set(channel, listener),
    on: vi.fn()
  }
  return { ipc, handlers }
}

function makeWorkspace(root: string | null): WorkspaceService {
  const state: WorkspaceState = { root, recents: [] }
  return {
    root: () => root,
    requireRoot: () => {
      if (!root) throw new Error('No workspace is open')
      return root
    },
    state: () => state,
    open: vi.fn().mockResolvedValue(state)
  }
}

describe('setupIPC (v0)', () => {
  it('registers exactly the four read-only channels', () => {
    const { ipc, handlers } = makeIPC()

    setupIPC(ipc, makeWorkspace('/ws'))

    expect([...handlers.keys()].sort()).toEqual(
      [
        IpcEvents.WORKSPACE_GET,
        IpcEvents.WORKSPACE_OPEN,
        IpcEvents.FILE_TREE,
        IpcEvents.FILE_READ
      ].sort()
    )
  })

  it('workspace:get answers with the current state', () => {
    const { ipc, handlers } = makeIPC()
    setupIPC(ipc, makeWorkspace('/ws'))

    expect(handlers.get(IpcEvents.WORKSPACE_GET)?.({})).toEqual({ root: '/ws', recents: [] })
  })

  it('workspace:open forwards an explicit path, and omits an empty one', async () => {
    const { ipc, handlers } = makeIPC()
    const workspace = makeWorkspace(null)
    setupIPC(ipc, workspace)
    const open = handlers.get(IpcEvents.WORKSPACE_OPEN)!

    await open({}, '/picked')
    expect(workspace.open).toHaveBeenCalledWith('/picked')

    await open({}, '')
    expect(workspace.open).toHaveBeenLastCalledWith(undefined)
  })

  it('file:read and file:tree resolve against the workspace root', () => {
    const base = mkdtempSync(join(tmpdir(), 'ospore-ipc-test-'))
    try {
      writeFileSync(join(base, 'note.md'), '# hello')
      const { ipc, handlers } = makeIPC()
      setupIPC(ipc, makeWorkspace(canonicalRoot(base)))

      expect(handlers.get(IpcEvents.FILE_READ)?.({}, 'note.md')).toEqual({
        path: 'note.md',
        text: '# hello'
      })
      expect(handlers.get(IpcEvents.FILE_TREE)?.({}, '')).toEqual([
        { name: 'note.md', path: 'note.md', kind: 'file', openable: true }
      ])
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  })

  it('file handlers refuse to run without a workspace', () => {
    const { ipc, handlers } = makeIPC()
    setupIPC(ipc, makeWorkspace(null))

    expect(() => handlers.get(IpcEvents.FILE_TREE)?.({}, '')).toThrow('No workspace is open')
  })

  it('rejects non-string paths from the renderer', () => {
    const { ipc, handlers } = makeIPC()
    setupIPC(ipc, makeWorkspace('/ws'))

    expect(() => handlers.get(IpcEvents.FILE_READ)?.({}, 42)).toThrow('Path must be a string')
  })
})

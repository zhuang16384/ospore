import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MAX_RECENT_WORKSPACES } from '@shared/domain'
import { DEFAULT_LAYOUT, SIDEBAR } from '@shared/layout'
import { createConfigStore, type ConfigStore } from '../config.store'

/**
 * Real filesystem in a throwaway dir — the store's whole job is file behaviour
 * (atomic write, corrupt-file recovery, pruning), so faking `fs` would test
 * nothing.
 */
describe('config store', () => {
  let dataDir: string
  let store: ConfigStore

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'ospore-config-test-'))
    store = createConfigStore(dataDir)
  })

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true })
  })

  const configPath = (): string => join(dataDir, 'config.json')

  /** A real directory the store can remember. */
  function makeDir(name: string): string {
    const path = join(dataDir, name)
    mkdirSync(path, { recursive: true })
    return path
  }

  it('starts empty when no config file exists', () => {
    expect(store.read()).toEqual({ version: 1, recentWorkspaces: [], layout: DEFAULT_LAYOUT })
  })

  it('remembers a workspace and re-reads it from disk', () => {
    const dir = makeDir('project')

    store.rememberWorkspace(dir)

    expect(store.read().recentWorkspaces).toEqual([
      { path: dir, name: 'project', lastOpenedAt: expect.any(Number) }
    ])
  })

  it('moves an already-known workspace to the front instead of duplicating it', () => {
    const a = makeDir('a')
    const b = makeDir('b')

    store.rememberWorkspace(a)
    store.rememberWorkspace(b)
    store.rememberWorkspace(a)

    expect(store.read().recentWorkspaces.map((entry) => entry.name)).toEqual(['a', 'b'])
  })

  it('caps the list and drops the oldest entries', () => {
    for (let index = 0; index < MAX_RECENT_WORKSPACES + 5; index++) {
      store.rememberWorkspace(makeDir(`dir-${String(index).padStart(2, '0')}`))
    }

    const { recentWorkspaces } = store.read()
    expect(recentWorkspaces).toHaveLength(MAX_RECENT_WORKSPACES)
    expect(recentWorkspaces[0].name).toBe(`dir-${MAX_RECENT_WORKSPACES + 4}`)
  })

  it('prunes directories that no longer exist', () => {
    const gone = makeDir('gone')
    const kept = makeDir('kept')
    store.rememberWorkspace(gone)
    store.rememberWorkspace(kept)

    rmSync(gone, { recursive: true, force: true })

    expect(store.read().recentWorkspaces.map((entry) => entry.name)).toEqual(['kept'])
  })

  it('quarantines a corrupt file instead of crashing', () => {
    writeFileSync(configPath(), '{ this is not json')

    const config = store.read()

    expect(config).toEqual({ version: 1, recentWorkspaces: [], layout: DEFAULT_LAYOUT })
    expect(readFileSync(`${configPath()}.bak`, 'utf8')).toBe('{ this is not json')
    // the config was rebuilt, so the app is usable from here on
    expect(JSON.parse(readFileSync(configPath(), 'utf8'))).toEqual(config)
  })

  it('tolerates a valid document with junk entries', () => {
    writeFileSync(
      configPath(),
      JSON.stringify({ version: 1, recentWorkspaces: [{ path: 42 }, 'nope', { path: '' }] })
    )

    expect(store.read()).toEqual({ version: 1, recentWorkspaces: [], layout: DEFAULT_LAYOUT })
  })

  it('tolerates a document whose recents field has the wrong type', () => {
    writeFileSync(configPath(), JSON.stringify({ version: 1, recentWorkspaces: 'nope' }))

    expect(store.read()).toEqual({ version: 1, recentWorkspaces: [], layout: DEFAULT_LAYOUT })
  })

  it('writes atomically — a successful write leaves no temp file behind', () => {
    store.rememberWorkspace(makeDir('project'))

    expect(JSON.parse(readFileSync(configPath(), 'utf8')).recentWorkspaces).toHaveLength(1)
    expect(() => readFileSync(`${configPath()}.tmp`, 'utf8')).toThrow()
  })

  it('defaults the layout of a config written before the field existed', () => {
    // This is the shape v0.0.1 shipped; it must not be treated as corrupt.
    writeFileSync(configPath(), JSON.stringify({ version: 1, recentWorkspaces: [] }), 'utf8')

    expect(store.read().layout).toEqual(DEFAULT_LAYOUT)
  })

  it('persists a layout and re-reads it from disk', () => {
    store.setLayout({ sidebarWidth: 400 })

    expect(store.read().layout).toEqual({ sidebarWidth: 400 })
    expect(JSON.parse(readFileSync(configPath(), 'utf8')).layout).toEqual({ sidebarWidth: 400 })
  })

  it('clamps a layout rather than storing an unusable width', () => {
    expect(store.setLayout({ sidebarWidth: 5 }).layout).toEqual({ sidebarWidth: SIDEBAR.min })
    expect(store.setLayout({ sidebarWidth: 99_999 }).layout).toEqual({ sidebarWidth: SIDEBAR.max })
  })

  it('repairs a hand-edited layout without discarding the recents', () => {
    const dir = makeDir('project')
    store.rememberWorkspace(dir)
    writeFileSync(
      configPath(),
      JSON.stringify({ version: 1, recentWorkspaces: [{ path: dir }], layout: 'wide' }),
      'utf8'
    )

    const config = store.read()
    expect(config.layout).toEqual(DEFAULT_LAYOUT)
    expect(config.recentWorkspaces.map((entry) => entry.path)).toEqual([dir])
  })

  it('does not forget the layout when a workspace is opened', () => {
    store.setLayout({ sidebarWidth: 400 })
    store.rememberWorkspace(makeDir('project'))

    expect(store.read().layout).toEqual({ sidebarWidth: 400 })
  })

  it('does not forget the recents when the layout is saved', () => {
    const dir = makeDir('project')
    store.rememberWorkspace(dir)
    store.setLayout({ sidebarWidth: 400 })

    expect(store.read().recentWorkspaces.map((entry) => entry.path)).toEqual([dir])
  })
})

/**
 * `config.json` — the only thing v0 persists.
 *
 * JSON is enough because the data is flat and bounded (a most-recently-used
 * list of directories): no relations, no queries. SQLite arrives with
 * conversations in v0.1.
 *
 * Two rules keep this file from ever bricking the app: writes are atomic
 * (tmp + rename), and a corrupt file is quarantined to `config.json.bak`
 * instead of throwing.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { basename, join } from 'node:path'
import { MAX_RECENT_WORKSPACES, type RecentWorkspace } from '@shared/domain'
import { DEFAULT_LAYOUT, normalizeLayout, type LayoutPreferences } from '@shared/layout'
import { unixSecondsNow } from '@shared/time'

const CONFIG_FILE_NAME = 'config.json'
/** Shape version — a future release can migrate on this. */
const CONFIG_VERSION = 1

export interface OsporeConfig {
  version: number
  recentWorkspaces: RecentWorkspace[]
  /** Pane geometry. Optional fields default rather than invalidating the file. */
  layout: LayoutPreferences
}

export interface ConfigStore {
  /** Current config, with entries for missing directories pruned away. */
  read(): OsporeConfig
  /** Move `path` to the front of the MRU list and persist. */
  rememberWorkspace(path: string): OsporeConfig
  /** Replace the layout preferences and persist. */
  setLayout(layout: LayoutPreferences): OsporeConfig
}

export function createConfigStore(dataDir: string): ConfigStore {
  const file = join(dataDir, CONFIG_FILE_NAME)
  const empty = (): OsporeConfig => ({
    version: CONFIG_VERSION,
    recentWorkspaces: [],
    layout: { ...DEFAULT_LAYOUT }
  })

  function write(config: OsporeConfig): void {
    mkdirSync(dataDir, { recursive: true })
    const tmp = `${file}.tmp`
    writeFileSync(tmp, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
    // rename(2) is atomic within a filesystem: config.json is never half-written.
    renameSync(tmp, file)
  }

  function quarantine(): void {
    try {
      copyFileSync(file, `${file}.bak`)
    } catch {
      // best effort — a failed backup must not stop the app from starting
    }
  }

  function read(): OsporeConfig {
    if (!existsSync(file)) return empty()

    let raw: string
    try {
      raw = readFileSync(file, 'utf8')
    } catch {
      return empty()
    }

    const parsed = parseConfig(raw)
    if (!parsed) {
      quarantine()
      const fresh = empty()
      write(fresh)
      return fresh
    }

    return {
      version: CONFIG_VERSION,
      layout: parsed.layout,
      recentWorkspaces: parsed.recentWorkspaces.filter((entry) => isExistingDirectory(entry.path))
    }
  }

  function rememberWorkspace(path: string): OsporeConfig {
    const current = read()
    const entry: RecentWorkspace = {
      path,
      name: basename(path),
      lastOpenedAt: unixSecondsNow()
    }
    const config: OsporeConfig = {
      version: CONFIG_VERSION,
      // Opening a workspace must not forget how the window was laid out.
      layout: current.layout,
      recentWorkspaces: [
        entry,
        ...current.recentWorkspaces.filter((item) => item.path !== path)
      ].slice(0, MAX_RECENT_WORKSPACES)
    }
    write(config)
    return config
  }

  function setLayout(layout: LayoutPreferences): OsporeConfig {
    const current = read()
    const config: OsporeConfig = {
      version: CONFIG_VERSION,
      layout: normalizeLayout(layout),
      recentWorkspaces: current.recentWorkspaces
    }
    write(config)
    return config
  }

  return { read, rememberWorkspace, setLayout }
}

/** Parse and validate an unknown document; null means "corrupt, start over". */
function parseConfig(raw: string): OsporeConfig | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null) return null

  const recents = (value as { recentWorkspaces?: unknown }).recentWorkspaces
  if (!Array.isArray(recents)) return null

  const recentWorkspaces: RecentWorkspace[] = []
  for (const item of recents) {
    if (typeof item !== 'object' || item === null) continue
    const { path, name, lastOpenedAt } = item as Partial<RecentWorkspace>
    if (typeof path !== 'string' || path === '') continue
    recentWorkspaces.push({
      path,
      name: typeof name === 'string' && name !== '' ? name : basename(path),
      lastOpenedAt: typeof lastOpenedAt === 'number' ? lastOpenedAt : 0
    })
  }
  // A missing or malformed `layout` is not corruption — it is a config written
  // before the field existed, or by hand. Default it rather than starting over.
  return {
    version: CONFIG_VERSION,
    layout: normalizeLayout((value as { layout?: unknown }).layout),
    recentWorkspaces
  }
}

function isExistingDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

import { test as base, _electron, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Per-test Electron launch fixture.
 *
 * Every test gets a fresh temp data dir (OSPORE_DATA_DIR — reserved for the
 * app's data root so future stores never touch the real ~/.ospore during
 * E2E) and a live first window.
 */

// In a plain Node process, require('electron') resolves to the binary path.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const electronPath = require('electron') as unknown as string

/** Repo root — its package.json `main` points at out/main/index.js (the built app). */
const appRoot = join(__dirname, '..', '..')

export interface OsporeApp {
  app: ElectronApplication
  page: Page
  dataDir: string
}

export const test = base.extend<{ ospore: OsporeApp }>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires the first fixture arg to be destructured
  ospore: async ({}, use) => {
    const dataDir = mkdtempSync(join(tmpdir(), 'ospore-e2e-data-'))

    const app = await _electron.launch({
      executablePath: electronPath,
      args: [appRoot, ...(process.env.CI ? ['--no-sandbox', '--disable-gpu'] : [])],
      env: { ...process.env, OSPORE_DATA_DIR: dataDir }
    })
    // Surface main-process crashes (e.g. a better-sqlite3 ABI mismatch) instead
    // of dying silently as a firstWindow() timeout.
    app.process().stderr?.on('data', (chunk) => console.error(`[electron] ${chunk}`))

    const page = await app.firstWindow()

    await use({ app, page, dataDir })

    await app.close()
    rmSync(dataDir, { recursive: true, force: true })
  }
})

export { expect } from '@playwright/test'

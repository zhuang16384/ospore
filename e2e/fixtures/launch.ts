import { test as base, _electron, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Per-test Electron launch fixture.
 *
 * Every test gets a fresh temp data dir (OSPORE_DATA_DIR — reserved for the
 * app's data root so future stores never touch the real ~/.ospore during
 * E2E) and a live first window. `launchOspore()` is exported separately so
 * restart tests can relaunch against the *same* data dir.
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

/** Launch the built app against an explicit data dir (fresh or reused). */
export async function launchOspore(dataDir: string): Promise<ElectronApplication> {
  const app = await _electron.launch({
    executablePath: electronPath,
    // `--no-sandbox` is needed when the test process itself runs inside a
    // restricted environment (CI containers, agent shells) where Chromium's
    // sandbox cannot start.
    //
    // `--disable-gpu` is deliberately NOT passed: without a GPU process
    // Chromium stops producing frames under Xvfb, so `requestAnimationFrame`
    // never ticks and Playwright's actionability ("stable") check never
    // satisfies — every click times out while the DOM looks perfectly fine.
    args: [appRoot, ...(process.env.CI ? ['--no-sandbox'] : [])],
    env: { ...process.env, OSPORE_DATA_DIR: dataDir }
  })
  // Surface main-process crashes (e.g. a better-sqlite3 ABI mismatch) instead
  // of dying silently as a firstWindow() timeout.
  app.process().stderr?.on('data', (chunk) => console.error(`[electron] ${chunk}`))
  return app
}

export const test = base.extend<{ ospore: OsporeApp }>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires the first fixture arg to be destructured
  ospore: async ({}, use) => {
    const dataDir = mkdtempSync(join(tmpdir(), 'ospore-e2e-data-'))

    const app = await launchOspore(dataDir)
    const page = await app.firstWindow()

    await use({ app, page, dataDir })

    await app.close()
    // give the OS a beat to release the sqlite files before the temp cleanup
    await new Promise((resolve) => setTimeout(resolve, 250))
    rmSync(dataDir, { recursive: true, force: true })
  }
})

export { expect } from '@playwright/test'

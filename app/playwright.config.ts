import { defineConfig } from '@playwright/test'

/**
 * Playwright E2E config.
 *
 * Specs live in e2e/specs and drive the BUILT app (build-output/out/) through
 * Playwright's experimental Electron launcher — run via `pnpm e2e` so the
 * pree2e hook rebuilds better-sqlite3 for the Electron ABI and refreshes
 * build-output/out/ first. One worker: a single Electron instance at a time
 * keeps the native module and xvfb runs stable.
 */
export default defineConfig({
  testDir: './e2e/specs',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'build-output/e2e-report', open: 'never' }]],
  outputDir: 'build-output/e2e-results'
})

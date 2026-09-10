import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { expect, launchOspore, test } from '../fixtures/launch'

/**
 * The v0 "Done" loop against the packaged-code path: a remembered workspace is
 * restored without a dialog, the tree lists what is on disk, documents render,
 * and both survive a restart.
 *
 * The workspace is a throwaway directory rather than the repo itself, so the
 * test never depends on what the working tree happens to contain.
 */
test.describe('workspace viewer', () => {
  test.slow() // two Electron launches (restart check) need more than the default 30s

  test('restores a remembered workspace, lists files and opens a document', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'ospore-e2e-workspace-'))
    const dataDir = mkdtempSync(join(tmpdir(), 'ospore-e2e-data-'))
    writeFileSync(join(workspace, 'README.md'), '# From disk')
    mkdirSync(join(workspace, 'docs'))
    writeFileSync(join(workspace, 'docs', 'guide.md'), '# Guide')
    writeFileSync(join(workspace, 'notes.txt'), 'plain text')
    seedRecents(dataDir, workspace)

    const app = await launchOspore(dataDir)
    try {
      const page = await app.firstWindow()

      await expect(page.getByText('Select a document on the left')).toBeVisible()
      await expect(page.getByText('README.md')).toBeVisible()
      await expect(page.getByText('notes.txt')).toBeVisible()

      await page.getByText('README.md').click()
      // Rendered markdown, not the raw source.
      await expect(page.getByRole('heading', { name: 'From disk' })).toBeVisible()
    } finally {
      await app.close()
    }

    // Restart against the same data dir and workspace: everything is still there.
    const restarted = await launchOspore(dataDir)
    try {
      const page = await restarted.firstWindow()
      await page.getByText('README.md').click()
      await expect(page.getByRole('heading', { name: 'From disk' })).toBeVisible()
    } finally {
      await restarted.close()
      rmSync(workspace, { recursive: true, force: true })
      rmSync(dataDir, { recursive: true, force: true })
    }
  })

  test('renders html in a sandbox that still loads relative stylesheets', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'ospore-e2e-html-'))
    const dataDir = mkdtempSync(join(tmpdir(), 'ospore-e2e-data-'))
    // A relative stylesheet is the point: `srcdoc` would break this link, so a
    // green background proves the ospore:// protocol is actually serving it.
    writeFileSync(join(workspace, 'style.css'), 'body { background-color: rgb(1, 2, 3); }')
    writeFileSync(
      join(workspace, 'page.html'),
      '<!doctype html><link rel="stylesheet" href="style.css"><h1>Styled</h1>'
    )
    seedRecents(dataDir, workspace)

    const app = await launchOspore(dataDir)
    try {
      const page = await app.firstWindow()
      await page.getByText('page.html').click()

      const frame = page.frameLocator('[data-testid="html-view"]')
      await expect(frame.locator('h1')).toHaveText('Styled')
      await expect(frame.locator('body')).toHaveCSS('background-color', 'rgb(1, 2, 3)')
    } finally {
      await app.close()
      rmSync(workspace, { recursive: true, force: true })
      rmSync(dataDir, { recursive: true, force: true })
    }
  })
})

/** Seed the MRU list the way a previous session would have left it. */
function seedRecents(dataDir: string, workspace: string): void {
  writeFileSync(
    join(dataDir, 'config.json'),
    JSON.stringify({
      version: 1,
      recentWorkspaces: [{ path: workspace, name: basename(workspace), lastOpenedAt: 0 }]
    })
  )
}

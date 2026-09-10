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

  test('restores a workspace, switches to another, and remembers both', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'ospore-e2e-workspace-'))
    const other = mkdtempSync(join(tmpdir(), 'ospore-e2e-other-'))
    const dataDir = mkdtempSync(join(tmpdir(), 'ospore-e2e-data-'))
    writeFileSync(join(workspace, 'README.md'), '# From disk')
    mkdirSync(join(workspace, 'docs'))
    writeFileSync(join(workspace, 'docs', 'guide.md'), '# Guide')
    writeFileSync(join(workspace, 'notes.txt'), 'plain text')
    writeFileSync(join(other, 'other.md'), '# Other workspace')
    seedRecents(dataDir, workspace)

    // Carried from the first launch to the restarted one.
    let resizedWidth = 0

    const app = await launchOspore(dataDir)
    try {
      const page = await app.firstWindow()

      await expect(page.getByText('Select a document on the left')).toBeVisible()
      await expect(page.getByText('README.md')).toBeVisible()
      await expect(page.getByText('notes.txt')).toBeVisible()

      await page.getByText('README.md').click()
      // Rendered markdown, not the raw source.
      await expect(page.getByRole('heading', { name: 'From disk' })).toBeVisible()

      // Switch workspaces. The native picker is swapped for a fixed answer in
      // the main process, then the real button is clicked — dropping the tree
      // cache and refilling it used to live in different components, so a
      // second "Open Folder" left the rail empty and no unit test can see the
      // dialog-to-store hop.
      await app.evaluate(({ dialog }, target) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [target] })
      }, other)
      await page.getByRole('button', { name: /open folder/i }).click()

      await expect(page.getByText('other.md')).toBeVisible()
      await expect(page.getByText('README.md')).toHaveCount(0)
      await expect(page.getByText('Select a document on the left')).toBeVisible()

      // Resize the rail. The width has to survive a restart, which is the only
      // part of this that needs a real config.json and a real round trip.
      const rail = page.getByRole('navigation', { name: 'Files' })
      const handle = page.getByTestId('splitter')
      const box = (await handle.boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + 400, box.y + box.height / 2, { steps: 5 })
      await page.mouse.up()
      resizedWidth = Math.round((await rail.boundingBox())!.width)
      expect(resizedWidth).toBeGreaterThan(288)
    } finally {
      await app.close()
    }

    // Restart: the switched-to workspace is the one that comes back, and the
    // rail is the width it was left at.
    const restarted = await launchOspore(dataDir)
    try {
      const page = await restarted.firstWindow()
      await page.getByText('other.md').click()
      await expect(page.getByRole('heading', { name: 'Other workspace' })).toBeVisible()

      const rail = page.getByRole('navigation', { name: 'Files' })
      await expect
        .poll(async () => Math.round((await rail.boundingBox())!.width))
        .toBe(resizedWidth)
    } finally {
      await restarted.close()
      rmSync(workspace, { recursive: true, force: true })
      rmSync(other, { recursive: true, force: true })
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

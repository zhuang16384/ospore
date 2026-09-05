import { expect, launchOspore, test } from '../fixtures/launch'

/**
 * The issue #1 "Done" loop, end to end against the packaged-code path:
 * create project -> add cards -> drag & drop -> restart -> still there.
 */

test.describe('kanban', () => {
  test.slow() // create -> board -> cards -> drag -> restart is a long ride

  test('full loop: create, board, cards, drag & drop, restart persistence', async ({ ospore }) => {
    const { page, app, dataDir } = ospore

    // -- create the project ---------------------------------------------------
    await page.getByLabel('New project name').fill('Prototype')
    await page.getByRole('button', { name: 'Create project' }).click()
    await expect(page.getByText('Prototype')).toBeVisible()

    // -- open the board: default columns are there -----------------------------
    await page.getByTestId('project-open').click()
    const backlog = page.locator('section[aria-label="Backlog"]')
    const done = page.locator('section[aria-label="Done"]')
    await expect(page.getByRole('heading', { name: 'Backlog' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible()

    // -- add cards --------------------------------------------------------------
    await addCard(page, 'Backlog', 'Design the schema')
    await addCard(page, 'Backlog', 'Wire the IPC bridge')
    await expect(backlog.locator('[data-card-id]')).toHaveCount(2)

    // -- edit one card ---------------------------------------------------------
    await backlog.locator('[data-card-id]', { hasText: 'Design the schema' }).click()
    await page.getByLabel('Description').fill('tables + migrations')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(backlog.getByText('tables + migrations')).toBeVisible()

    // -- drag & drop a card into Done -------------------------------------------
    await backlog
      .locator('[data-card-id]', { hasText: 'Design the schema' })
      .dragTo(done.locator('[data-card-id], .min-h-24').first())
    await expect(done.locator('[data-card-id]', { hasText: 'Design the schema' })).toBeVisible()
    await expect(backlog.locator('[data-card-id]')).toHaveCount(1)

    // -- customize: add a column -------------------------------------------------
    await page.getByTestId('add-column').click()
    await page.getByTestId('name-dialog-input').fill('Review')
    await page
      .getByTestId('modal-overlay')
      .getByRole('button', { name: 'Add', exact: true })
      .click()
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible()

    // -- restart: same data dir, brand-new process -------------------------------
    await app.close()
    const app2 = await launchOspore(dataDir)
    try {
      const page2 = await app2.firstWindow()

      await expect(page2.getByText('Prototype')).toBeVisible()
      await page2.getByTestId('project-open').click()

      const backlog2 = page2.locator('section[aria-label="Backlog"]')
      const done2 = page2.locator('section[aria-label="Done"]')
      await expect(done2.locator('[data-card-id]', { hasText: 'Design the schema' })).toBeVisible()
      await expect(done2.getByText('tables + migrations')).toBeVisible() // edits survived too
      await expect(
        backlog2.locator('[data-card-id]', { hasText: 'Wire the IPC bridge' })
      ).toBeVisible()
      await expect(page2.getByRole('heading', { name: 'Review' })).toBeVisible()
    } finally {
      await app2.close()
    }
  })

  test('project management: rename, archive, restore, delete', async ({ ospore }) => {
    const { page } = ospore

    await page.getByLabel('New project name').fill('Scratch')
    await page.getByRole('button', { name: 'Create project' }).click()
    await expect(page.getByText('Scratch')).toBeVisible()

    // rename
    await page.getByTitle('Rename project').click()
    await page.getByTestId('name-dialog-input').fill('Scratch v2')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Scratch v2')).toBeVisible()

    // archive -> moves to the archived section
    await page.getByTitle('Archive project').click()
    await expect(page.getByText('Archived (1)')).toBeVisible()
    await expect(page.getByTitle('Restore project')).toBeVisible()

    // restore -> back among active projects
    await page.getByTitle('Restore project').click()
    await expect(page.getByText('Archived (1)')).toHaveCount(0)
    await expect(page.getByTitle('Archive project')).toBeVisible()

    // delete with confirmation
    await page.getByTitle('Delete project').click()
    await page.getByTestId('confirm-accept').click()
    await expect(page.getByTestId('projects-empty')).toBeVisible()
  })
})

/** Fills the add-card composer in a column (opening it if needed) and submits. */
async function addCard(
  page: import('@playwright/test').Page,
  column: string,
  title: string
): Promise<void> {
  const section = page.locator(`section[aria-label="${column}"]`)
  const composer = section.getByTestId('card-composer')
  if (!(await composer.isVisible())) {
    await section.getByRole('button', { name: 'Add card' }).click()
  }
  await composer.fill(title)
  await section.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(section.locator('[data-card-id]', { hasText: title })).toBeVisible()
}

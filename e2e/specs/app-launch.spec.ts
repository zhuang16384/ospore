import { expect, test } from '../fixtures/launch'

test.describe('app launch', () => {
  test('opens a window with the app shell', async ({ ospore }) => {
    const { page } = ospore

    await expect(page.getByText('Ospore')).toBeVisible()
    await expect(page).toHaveTitle('Ospore')
  })

  // Full-stack smoke: renderer boots, store initializes, IPC bridge answers,
  // and the SQLite-backed empty state renders. (The kanban spec covers the
  // deeper CRUD/drag/persistence loop.)
  test('loads the projects view with no projects', async ({ ospore }) => {
    const { page } = ospore

    await expect(page.getByTestId('projects-empty')).toBeVisible()
  })
})

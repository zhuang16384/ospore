import { expect, test } from '../fixtures/launch'

test.describe('app launch', () => {
  test('opens a window with the app shell', async ({ ospore }) => {
    const { page } = ospore

    await expect(page.getByRole('banner').getByRole('heading', { name: 'Ospore' })).toBeVisible()
    await expect(page).toHaveTitle('Ospore')
  })

  // Full-stack smoke: renderer boots, the workspace store initializes, the IPC
  // bridge answers, and a fresh data dir lands on the welcome screen.
  test('shows the welcome screen on a fresh install', async ({ ospore }) => {
    const { page } = ospore

    await expect(page.getByTestId('open-workspace')).toBeVisible()
    await expect(page.getByTestId('recent-workspaces')).toHaveCount(0)
  })
})

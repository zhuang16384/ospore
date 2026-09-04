import { expect, test } from '../fixtures/launch'

test.describe('app launch', () => {
  test('opens a window with the app shell', async ({ ospore }) => {
    const { page } = ospore

    await expect(page.getByText('Ospore')).toBeVisible()
    await expect(page).toHaveTitle('Ospore')
  })

  test('answers a renderer -> main ping', async ({ ospore }) => {
    const { page } = ospore

    await page.getByRole('button', { name: 'Ping main' }).click()

    await expect(page.getByTestId('ping-reply')).toHaveText('pong')
  })
})

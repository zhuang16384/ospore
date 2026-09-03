// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'

declare global {
  interface Window {
    ospore: { ping: () => Promise<string> }
  }
}

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the app identity', () => {
    render(<App />)
    expect(screen.getByText('Ospore')).toBeInTheDocument()
  })

  it('round-trips a ping through the preload bridge', async () => {
    window.ospore = { ping: vi.fn().mockResolvedValue('pong') }
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Ping main' }))

    expect(await screen.findByTestId('ping-reply')).toHaveTextContent('pong')
    expect(window.ospore.ping).toHaveBeenCalled()
  })
})

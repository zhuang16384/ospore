import { useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'

/**
 * Main window shell (initialization skeleton).
 *
 * Renders the app identity plus one IPC round-trip (renderer -> preload ->
 * main -> back) so the whole bridge is exercised from the first commit. Swap
 * the placeholder body for the real UI as features land.
 */
export default function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Ospore</h1>
        <p className="text-text-secondary">An Electron application with React and TypeScript.</p>
        <PingButton />
      </div>
    </ErrorBoundary>
  )
}

function PingButton(): JSX.Element {
  const [reply, setReply] = useState<string | null>(null)

  const onClick = (): void => {
    void window.ospore.ping().then(setReply)
  }

  return (
    <div className="flex items-center gap-2" data-testid="ping">
      <button
        type="button"
        onClick={onClick}
        className="rounded-md border border-rule bg-surface px-3 py-1.5 text-note hover:accent-surface"
      >
        Ping main
      </button>
      {reply !== null && (
        <span className="font-mono text-small text-text-secondary" data-testid="ping-reply">
          {reply}
        </span>
      )}
    </div>
  )
}

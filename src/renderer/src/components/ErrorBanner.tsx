/**
 * Global error banner.
 *
 * Both stores surface failures here so a rejected IPC call is never silent;
 * dismissing clears both.
 */

import { CircleAlert, X } from 'lucide-react'
import { useFiles } from '@renderer/stores/files.store'
import { useWorkspace } from '@renderer/stores/workspace.store'

export function ErrorBanner(): JSX.Element | null {
  const workspaceError = useWorkspace((s) => s.error)
  const filesError = useFiles((s) => s.error)
  const error = workspaceError ?? filesError

  if (!error) return null

  const dismiss = (): void => {
    useWorkspace.getState().setError(null)
    useFiles.getState().setError(null)
  }

  return (
    <div
      className="flex items-center gap-2 border-b border-destructive/40 bg-destructive/15 px-4 py-2 text-small"
      role="alert"
      data-testid="error-banner"
    >
      <CircleAlert size={14} className="shrink-0 text-destructive" />
      <span className="flex-1">{error}</span>
      <button
        type="button"
        className="shrink-0 text-text-secondary hover:text-text-primary"
        aria-label="Dismiss error"
        onClick={dismiss}
      >
        <X size={14} />
      </button>
    </div>
  )
}

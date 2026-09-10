/**
 * Empty state: shown when no workspace is open.
 *
 * The recent-workspace list is the v0 "start screen" — it is UI state (an MRU
 * cache), not a project list.
 */

import { FolderOpen, History } from 'lucide-react'
import { useWorkspace } from '@renderer/stores/workspace.store'
import { baseName } from '@renderer/lib/display'
import { unixSecondsToDatestamp } from '@shared/time'
import { Button } from '@renderer/components/ui/button'

export function Welcome(): JSX.Element {
  const recents = useWorkspace((s) => s.recents)
  const open = useWorkspace((s) => s.open)

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 self-center p-8">
      <div className="text-center">
        <h1 className="text-lg font-semibold tracking-tight">Ospore</h1>
        <p className="mt-1 text-text-secondary">
          Open a directory to read the markdown and html documents inside.
        </p>
      </div>

      <Button variant="primary" onClick={() => void open()} data-testid="open-workspace">
        <FolderOpen size={14} /> Open Folder…
      </Button>

      {recents.length > 0 && (
        <section className="w-full" data-testid="recent-workspaces">
          <h2 className="mb-2 flex items-center gap-1.5 text-small uppercase tracking-widest text-text-muted">
            <History size={13} /> Recent
          </h2>
          <ul className="space-y-1">
            {recents.map((recent) => (
              <li key={recent.path}>
                <button
                  type="button"
                  className="w-full truncate rounded-md border border-rule bg-surface px-3 py-2 text-left text-small hover:border-accent/60"
                  title={recent.path}
                  onClick={() => void open(recent.path)}
                >
                  <span className="block font-medium">{recent.name || baseName(recent.path)}</span>
                  <span className="block truncate text-text-muted">
                    {recent.path} · {unixSecondsToDatestamp(recent.lastOpenedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

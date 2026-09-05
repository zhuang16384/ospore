/**
 * Main window shell: header (identity + breadcrumb + project switcher), global
 * error banner, and the two views (projects home / board). View switching is
 * store state, not routing — the app has exactly two screens and deep links
 * are out of scope for v0.1.
 */

import { useEffect } from 'react'
import { ArrowLeft, ChevronRight, CircleAlert, X } from 'lucide-react'
import { useKanban } from '@renderer/stores/kanban'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProjectsPage } from './components/ProjectsPage'
import { BoardPage } from './components/board/BoardPage'
import { Button } from './components/ui/button'

export default function App(): JSX.Element {
  const view = useKanban((s) => s.view)
  const board = useKanban((s) => s.board)
  const projects = useKanban((s) => s.projects)

  useEffect(() => {
    void useKanban.getState().init()
  }, [])

  return (
    <ErrorBoundary>
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-2 border-b border-rule px-4 py-2">
          <h1 className="text-small font-semibold uppercase tracking-widest text-text-secondary">
            Ospore
          </h1>
          {view === 'board' && board && (
            <nav className="flex items-center gap-2" aria-label="Breadcrumb">
              <Button variant="ghost" size="sm" onClick={() => useKanban.getState().showProjects()}>
                <ArrowLeft size={14} /> Projects
              </Button>
              <ChevronRight size={14} className="text-text-muted" />
              <select
                className="max-w-48 truncate rounded-md border border-rule bg-surface px-2 py-1 text-note text-text-primary focus-visible:outline-2 focus-visible:outline-accent"
                value={board.project.id}
                aria-label="Switch project"
                data-testid="project-switcher"
                onChange={(event) => void useKanban.getState().openProject(event.target.value)}
              >
                {projects
                  .filter((p) => !p.archived)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </nav>
          )}
        </header>

        <ErrorBanner />

        <main className="min-h-0 flex-1">
          {view === 'projects' ? <ProjectsPage /> : <BoardPage />}
        </main>
      </div>
    </ErrorBoundary>
  )
}

function ErrorBanner(): JSX.Element | null {
  const error = useKanban((s) => s.error)
  if (!error) return null
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
        onClick={() => useKanban.getState().setError(null)}
      >
        <X size={14} />
      </button>
    </div>
  )
}

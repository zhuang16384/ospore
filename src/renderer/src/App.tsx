/**
 * Main window shell.
 *
 * v0 layout: header (identity + workspace path + open button), error banner,
 * then a two-pane body — file tree on the left, document on the right. The
 * right rail becomes the agent conversation in v0.1, so the horizontal split
 * is already the final shape.
 */

import { useEffect } from 'react'
import { FolderOpen } from 'lucide-react'
import { useFiles } from '@renderer/stores/files.store'
import { useWorkspace } from '@renderer/stores/workspace.store'
import { baseName } from '@renderer/lib/display'
import { Button } from './components/ui/button'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErrorBanner } from './components/ErrorBanner'
import { FileTree } from './components/files/FileTree'
import { Welcome } from './components/files/Welcome'
import { DocViewer } from './components/doc/DocViewer'

export default function App(): JSX.Element {
  const root = useWorkspace((s) => s.root)
  const open = useWorkspace((s) => s.open)

  useEffect(() => {
    void useWorkspace.getState().init()
  }, [])

  // Relative paths only mean something inside one root, so the whole tree cache
  // is dropped whenever the workspace changes.
  useEffect(() => {
    useFiles.getState().reset()
  }, [root])

  return (
    <ErrorBoundary>
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-3 border-b border-rule px-4 py-2">
          <h1 className="text-small font-semibold uppercase tracking-widest text-text-secondary">
            Ospore
          </h1>
          {root && (
            <>
              <span className="truncate text-small text-text-muted" title={root}>
                {baseName(root)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto shrink-0"
                onClick={() => void open()}
              >
                <FolderOpen size={14} /> Open Folder
              </Button>
            </>
          )}
        </header>

        <ErrorBanner />

        <main className="flex min-h-0 flex-1">
          {root ? (
            <>
              <FileTree />
              <DocViewer />
            </>
          ) : (
            <Welcome />
          )}
        </main>
      </div>
    </ErrorBoundary>
  )
}

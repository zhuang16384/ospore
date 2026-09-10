/**
 * Main window shell.
 *
 * v0 layout: header (identity + workspace path + open button), error banner,
 * then a two-pane body — file tree on the left, document on the right, with a
 * draggable divider between them. The right rail becomes the agent conversation
 * in v0.1, so the horizontal split is already the final shape.
 *
 * The shell owns the geometry: the rails themselves know nothing about how wide
 * they are, which keeps the split resizable without threading props through
 * every panel.
 */

import { useEffect } from 'react'
import { FolderOpen } from 'lucide-react'
import { useFiles } from '@renderer/stores/files.store'
import { useLayout } from '@renderer/stores/layout.store'
import { useWorkspace } from '@renderer/stores/workspace.store'
import { baseName } from '@renderer/lib/display'
import { cn } from '@renderer/lib/utils'
import { Button } from './components/ui/button'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErrorBanner } from './components/ErrorBanner'
import { FileTree } from './components/files/FileTree'
import { Welcome } from './components/files/Welcome'
import { Splitter } from './components/layout/Splitter'
import { DocViewer } from './components/doc/DocViewer'

export default function App(): JSX.Element {
  const root = useWorkspace((s) => s.root)
  const open = useWorkspace((s) => s.open)
  const sidebarWidth = useLayout((s) => s.sidebarWidth)
  const dragging = useLayout((s) => s.dragging)

  useEffect(() => {
    void useWorkspace.getState().init()
    void useLayout.getState().load()
  }, [])

  // Relative paths only mean something inside one root, so a workspace switch
  // has to drop the tree cache and reload it. `loadWorkspace` does both, which
  // is what keeps it from leaving an empty tree behind (see files.store.ts).
  useEffect(() => {
    if (root) void useFiles.getState().loadWorkspace()
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

        <main
          className={cn(
            'flex min-h-0 flex-1',
            // While dragging, the pointer is over the panes not the handle: keep
            // the resize cursor and stop the drag turning into a text selection.
            dragging && 'cursor-col-resize select-none'
          )}
        >
          {root ? (
            <>
              <div className="flex min-h-0 shrink-0" style={{ width: sidebarWidth }}>
                <FileTree />
              </div>
              <Splitter
                width={sidebarWidth}
                onResizeStart={() => useLayout.getState().beginResize()}
                onResize={(width) => useLayout.getState().resizeTo(width)}
                onResizeEnd={() => void useLayout.getState().endResize()}
              />
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

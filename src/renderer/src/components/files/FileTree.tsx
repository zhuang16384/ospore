/**
 * Left rail: the workspace file tree.
 *
 * One directory level per component instance; a directory's children render
 * only when it is expanded, matching the lazy loading in the store.
 */

import { useEffect } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import type { FileNode } from '@shared/domain'
import { useFiles } from '@renderer/stores/files.store'
import { cn } from '@renderer/lib/utils'

export function FileTree(): JSX.Element {
  const ensureLoaded = useFiles((s) => s.ensureLoaded)

  useEffect(() => {
    void ensureLoaded('')
  }, [ensureLoaded])

  return (
    <nav aria-label="Files" className="scrollbar-thin h-full w-72 shrink-0 overflow-y-auto py-1">
      <FileTreeLevel dirPath="" depth={0} />
    </nav>
  )
}

function FileTreeLevel({ dirPath, depth }: { dirPath: string; depth: number }): JSX.Element | null {
  const children = useFiles((s) => s.children[dirPath])
  if (!children) return null

  if (children.length === 0) {
    return <p className="px-3 py-1 text-small text-text-muted">(empty)</p>
  }

  return (
    <ul>
      {children.map((node) => (
        <li key={node.path}>
          {node.kind === 'directory' ? (
            <DirectoryRow node={node} depth={depth} />
          ) : (
            <FileRow node={node} depth={depth} />
          )}
        </li>
      ))}
    </ul>
  )
}

function DirectoryRow({ node, depth }: { node: FileNode; depth: number }): JSX.Element {
  const toggle = useFiles((s) => s.toggle)
  const expanded = useFiles((s) => s.expanded[node.path] === true)

  return (
    <>
      <button
        type="button"
        className="flex w-full items-center gap-1 rounded-sm py-1 text-left text-small hover:bg-accent-surface"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        aria-expanded={expanded}
        onClick={() => void toggle(node.path)}
      >
        {expanded ? (
          <ChevronDown size={13} className="shrink-0 text-text-muted" />
        ) : (
          <ChevronRight size={13} className="shrink-0 text-text-muted" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {expanded && <FileTreeLevel dirPath={node.path} depth={depth + 1} />}
    </>
  )
}

function FileRow({ node, depth }: { node: FileNode; depth: number }): JSX.Element {
  const openDoc = useFiles((s) => s.openDoc)
  const activePath = useFiles((s) => s.doc?.path)
  const active = activePath === node.path

  return (
    <button
      type="button"
      disabled={!node.openable}
      title={node.openable ? node.path : 'Only markdown and html can be opened in v0'}
      className={cn(
        'flex w-full items-center gap-1 rounded-sm py-1 text-left text-small',
        node.openable ? 'hover:bg-accent-surface' : 'cursor-default text-text-muted',
        active && 'bg-accent-surface text-text-primary'
      )}
      style={{ paddingLeft: `${depth * 12 + 22}px` }}
      onClick={() => void openDoc(node.path)}
    >
      <FileText size={13} className="shrink-0 text-text-muted" />
      <span className="truncate">{node.name}</span>
    </button>
  )
}

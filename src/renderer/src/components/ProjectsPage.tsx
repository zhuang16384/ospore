/**
 * Projects home: create + switch projects, rename / archive / delete, and a
 * collapsed section for archived projects.
 */

import { useState } from 'react'
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react'
import { MAX_NAME_LENGTH } from '@shared/kanban'
import type { Project } from '@shared/kanban'
import { unixSecondsToDatestamp } from '@shared/time'
import { useKanban } from '@renderer/stores/kanban'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { ConfirmDialog } from '@renderer/components/ui/modal'
import { NameDialog } from '@renderer/components/ui/name-dialog'

export function ProjectsPage(): JSX.Element {
  const projects = useKanban((s) => s.projects)
  const loading = useKanban((s) => s.loading)
  const createProject = useKanban((s) => s.createProject)

  const [newName, setNewName] = useState('')

  const active = projects.filter((p) => !p.archived)
  const archived = projects.filter((p) => p.archived)

  const submit = async (): Promise<void> => {
    const name = newName.trim()
    if (!name) return
    const ok = await createProject(name)
    if (ok) setNewName('')
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-8 p-6">
        <section>
          <h1 className="mb-3 text-lg font-semibold tracking-tight">Projects</h1>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <Input
              value={newName}
              maxLength={MAX_NAME_LENGTH}
              placeholder="New project name"
              aria-label="New project name"
              onChange={(event) => setNewName(event.target.value)}
            />
            <Button variant="primary" disabled={newName.trim().length === 0} type="submit">
              <Plus size={14} /> Create project
            </Button>
          </form>
        </section>

        {loading ? (
          <p className="text-text-secondary">Loading…</p>
        ) : active.length === 0 ? (
          <p className="text-text-secondary" data-testid="projects-empty">
            No projects yet — create one above to start a board.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </ul>
        )}

        {archived.length > 0 && (
          <section>
            <h2 className="mb-3 text-small font-semibold uppercase tracking-widest text-text-muted">
              Archived ({archived.length})
            </h2>
            <ul className="space-y-2">
              {archived.map((project) => (
                <ArchivedRow key={project.id} project={project} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

function ProjectCard({ project }: { project: Project }): JSX.Element {
  const openProject = useKanban((s) => s.openProject)
  const setProjectArchived = useKanban((s) => s.setProjectArchived)
  const deleteProject = useKanban((s) => s.deleteProject)

  const [renaming, setRenaming] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <li className="group rounded-lg border border-rule bg-surface p-4 transition-colors hover:accent-surface">
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => void openProject(project.id)}
        data-testid="project-open"
      >
        <span className="block font-medium">{project.name}</span>
        <span className="mt-1 block text-small text-text-muted">
          Created {unixSecondsToDatestamp(project.createdAt)}
        </span>
      </button>
      <div className="mt-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          title="Rename project"
          onClick={() => setRenaming(true)}
        >
          <Pencil size={14} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title="Archive project"
          onClick={() => void setProjectArchived(project.id, true)}
        >
          <Archive size={14} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title="Delete project"
          className="hover:text-destructive"
          onClick={() => setConfirmingDelete(true)}
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {renaming && (
        <NameDialog
          title="Rename project"
          label="Project name"
          initialName={project.name}
          onCancel={() => setRenaming(false)}
          onSubmit={(name) => useKanban.getState().renameProject(project.id, name)}
        />
      )}
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete project?"
        body={
          <span>
            <strong>{project.name}</strong> and every column and card in it will be permanently
            deleted.
          </span>
        }
        onConfirm={() => {
          setConfirmingDelete(false)
          void deleteProject(project.id)
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </li>
  )
}

function ArchivedRow({ project }: { project: Project }): JSX.Element {
  const setProjectArchived = useKanban((s) => s.setProjectArchived)
  const deleteProject = useKanban((s) => s.deleteProject)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <li className="flex items-center gap-3 rounded-md border border-rule bg-surface px-3 py-2">
      <span className="flex-1 text-text-secondary">{project.name}</span>
      <Button
        size="icon"
        variant="ghost"
        title="Restore project"
        onClick={() => void setProjectArchived(project.id, false)}
      >
        <ArchiveRestore size={14} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        title="Delete project"
        className="hover:text-destructive"
        onClick={() => setConfirmingDelete(true)}
      >
        <Trash2 size={14} />
      </Button>
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete project?"
        body={
          <span>
            <strong>{project.name}</strong> and every column and card in it will be permanently
            deleted.
          </span>
        }
        onConfirm={() => {
          setConfirmingDelete(false)
          void deleteProject(project.id)
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </li>
  )
}

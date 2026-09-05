// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { useKanban } from '../stores/kanban'
import type { Board, Project } from '@shared/kanban'

declare global {
  interface Window {
    ospore: {
      listProjects: () => Promise<Project[]>
      createProject: (name: string) => Promise<Project[]>
      getBoard: (projectId: string) => Promise<Board>
    }
  }
}

const projects: Project[] = [
  {
    id: 'p1',
    name: 'Prototype',
    archived: false,
    createdAt: 1704067200,
    updatedAt: 1704067200
  },
  {
    id: 'p2',
    name: 'Other',
    archived: false,
    createdAt: 1704153600,
    updatedAt: 1704153600
  }
]

const board = (project: Project): Board => ({
  project,
  columns: [
    {
      id: 'c1',
      projectId: project.id,
      name: 'Backlog',
      position: 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      cards: []
    }
  ]
})

function resetStore(): void {
  useKanban.setState({
    view: 'projects',
    loading: false,
    error: null,
    projects: [],
    board: null,
    draggingCardId: null,
    editingCardId: null
  })
}

describe('App', () => {
  beforeEach(() => {
    window.ospore = {
      listProjects: vi.fn().mockResolvedValue(projects),
      getBoard: vi
        .fn()
        .mockImplementation(async (projectId: string) =>
          board(projects.find((p) => p.id === projectId) ?? projects[0])
        ),
      createProject: vi.fn().mockResolvedValue([...projects])
    }
    resetStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the app identity and loads projects on mount', async () => {
    render(<App />)
    expect(screen.getByText('Ospore')).toBeInTheDocument()
    expect(window.ospore.listProjects).toHaveBeenCalled()
    expect(await screen.findByText('Prototype')).toBeInTheDocument()
  })

  it('creates a project from the home form', async () => {
    render(<App />)
    await userEvent.type(await screen.findByLabelText('New project name'), 'Roadmap')
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }))
    expect(window.ospore.createProject).toHaveBeenCalledWith('Roadmap')
  })

  it('shows the empty state when no projects exist', async () => {
    window.ospore = {
      ...window.ospore,
      listProjects: vi.fn().mockResolvedValue([])
    }
    render(<App />)
    expect(await screen.findByTestId('projects-empty')).toBeInTheDocument()
  })

  it('board header offers a way back and direct project switching', async () => {
    useKanban.setState({ view: 'board', projects, board: board(projects[0]) })
    render(<App />)

    // Back button returns to the projects list.
    await userEvent.click(screen.getByRole('button', { name: 'Projects' }))
    expect(useKanban.getState().view).toBe('projects')

    // Dropdown switches boards without leaving the board view.
    useKanban.setState({ view: 'board', board: board(projects[0]) })
    const switcher = await screen.findByTestId('project-switcher')
    await userEvent.selectOptions(switcher, 'p2')

    expect(window.ospore.getBoard).toHaveBeenCalledWith('p2')
    await waitFor(() => expect(useKanban.getState().board?.project.id).toBe('p2'))
    expect(useKanban.getState().view).toBe('board')
  })
})

// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileNode, RecentWorkspace, WorkspaceState } from '@shared/domain'
import App from '../App'
import { useFiles } from '../stores/files.store'
import { useLayout } from '../stores/layout.store'
import { useWorkspace } from '../stores/workspace.store'

const recents: RecentWorkspace[] = [{ path: '/repo', name: 'repo', lastOpenedAt: 1704067200 }]

const rootChildren: FileNode[] = [
  { name: 'docs', path: 'docs', kind: 'directory', openable: false },
  { name: 'README.md', path: 'README.md', kind: 'file', openable: true },
  { name: 'main.ts', path: 'main.ts', kind: 'file', openable: false }
]

function mockApi(initial: WorkspaceState): void {
  window.ospore = {
    getWorkspace: vi.fn().mockResolvedValue(initial),
    openWorkspace: vi.fn().mockResolvedValue(initial),
    listDirectory: vi.fn().mockResolvedValue(rootChildren),
    readFile: vi.fn().mockResolvedValue({ path: 'README.md', text: '# Hello' }),
    getLayout: vi.fn().mockResolvedValue({ sidebarWidth: 288 }),
    setLayout: vi.fn().mockImplementation((layout) => Promise.resolve(layout)),
    openExternal: vi.fn()
  } as unknown as Window['ospore']
}

function resetStores(): void {
  useWorkspace.setState({ root: null, recents: [], loading: false, error: null })
  useFiles.setState({
    children: {},
    expanded: {},
    loading: {},
    doc: null,
    docLoading: false,
    error: null
  })
  useLayout.setState({ sidebarWidth: 288, dragging: false, error: null })
}

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    resetStores()
  })

  it('shows the welcome screen with recent workspaces when nothing is open', async () => {
    mockApi({ root: null, recents })

    render(<App />)

    expect(await screen.findByTestId('open-workspace')).toBeInTheDocument()
    expect(screen.getByTestId('recent-workspaces')).toBeInTheDocument()
    expect(screen.getByText('repo')).toBeInTheDocument()
  })

  it('hides the recent list when there is nothing to remember', async () => {
    mockApi({ root: null, recents: [] })

    render(<App />)

    await screen.findByTestId('open-workspace')
    expect(screen.queryByTestId('recent-workspaces')).not.toBeInTheDocument()
  })

  it('opens the directory dialog on demand', async () => {
    mockApi({ root: null, recents: [] })
    render(<App />)

    await userEvent.click(await screen.findByTestId('open-workspace'))

    expect(window.ospore.openWorkspace).toHaveBeenCalledWith(undefined)
  })

  it('opens a remembered workspace without a dialog', async () => {
    mockApi({ root: null, recents })
    render(<App />)

    await userEvent.click(await screen.findByText('repo'))

    expect(window.ospore.openWorkspace).toHaveBeenCalledWith('/repo')
  })

  it('renders the file tree and opens a markdown document', async () => {
    mockApi({ root: '/repo', recents })

    render(<App />)

    await userEvent.click(await screen.findByText('README.md'))

    expect(window.ospore.readFile).toHaveBeenCalledWith('README.md')
    // markdown is rendered, not echoed: '# Hello' becomes a heading
    expect(await screen.findByRole('heading', { name: 'Hello' })).toBeInTheDocument()
  })

  it('hands external markdown links to the OS browser', async () => {
    mockApi({ root: '/repo', recents })
    window.ospore.readFile = vi.fn().mockResolvedValue({
      path: 'README.md',
      text: 'see [the site](https://example.com/docs)'
    }) as unknown as Window['ospore']['readFile']

    render(<App />)
    await userEvent.click(await screen.findByText('README.md'))
    await userEvent.click(await screen.findByRole('link', { name: 'the site' }))

    expect(window.ospore.openExternal).toHaveBeenCalledWith('https://example.com/docs')
  })

  it('lists non-openable files but keeps them inert', async () => {
    mockApi({ root: '/repo', recents })

    render(<App />)

    const sourceFile = await screen.findByText('main.ts')
    expect(sourceFile.closest('button')).toBeDisabled()
    await waitFor(() => expect(window.ospore.readFile).not.toHaveBeenCalled())
  })

  it('surfaces a failed read in the error banner', async () => {
    mockApi({ root: '/repo', recents })
    window.ospore.readFile = vi
      .fn()
      .mockRejectedValue(
        new Error('File is too large to open (4096 KB)')
      ) as unknown as Window['ospore']['readFile']

    render(<App />)
    await userEvent.click(await screen.findByText('README.md'))

    expect(await screen.findByTestId('error-banner')).toHaveTextContent('File is too large')
  })
})

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { canonicalRoot } from '../../workspace'
import { listDirectory } from '../file-tree.service'

describe('file tree service', () => {
  let base: string
  let root: string

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'ospore-tree-test-'))
    root = join(base, 'workspace')
    mkdirSync(join(root, 'docs'), { recursive: true })
    mkdirSync(join(root, 'src'), { recursive: true })
    mkdirSync(join(root, 'node_modules', 'left-pad'), { recursive: true })
    mkdirSync(join(root, '.git'), { recursive: true })
    writeFileSync(join(root, 'README.md'), '# readme')
    writeFileSync(join(root, '.gitignore'), 'node_modules')
    writeFileSync(join(root, 'docs', 'guide.md'), '# guide')
    writeFileSync(join(root, 'docs', 'diagram.png'), 'png')
    writeFileSync(join(root, 'src', 'main.ts'), 'export {}')
  })

  afterEach(() => {
    rmSync(base, { recursive: true, force: true })
  })

  const canonical = (): string => canonicalRoot(root)

  it('lists directories first, then files, alphabetically', () => {
    expect(listDirectory(canonical(), '').map((node) => node.name)).toEqual([
      'docs',
      'src',
      '.gitignore',
      'README.md'
    ])
  })

  it('hides dependency and VCS directories but keeps hidden files', () => {
    const names = listDirectory(canonical(), '').map((node) => node.name)

    expect(names).not.toContain('node_modules')
    expect(names).not.toContain('.git')
    expect(names).toContain('.gitignore')
  })

  it('marks only markdown and html files as openable', () => {
    const docs = listDirectory(canonical(), 'docs')

    expect(docs.map((node) => [node.name, node.openable])).toEqual([
      ['diagram.png', false],
      ['guide.md', true]
    ])
  })

  it('reports POSIX-relative paths that can be fed back to file:read', () => {
    expect(listDirectory(canonical(), 'docs').map((node) => node.path)).toEqual([
      'docs/diagram.png',
      'docs/guide.md'
    ])
  })

  it('refuses to list outside the workspace', () => {
    expect(() => listDirectory(canonical(), '../')).toThrow('escapes the workspace')
  })
})

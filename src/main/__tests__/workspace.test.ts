import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { canonicalRoot, isIgnoredDirectory, isOpenable, resolveInsideRoot } from '../workspace'

/**
 * The containment guard is the only thing standing between the renderer and
 * arbitrary filesystem reads, so every escape route gets its own case.
 */
describe('workspace path rules', () => {
  let root: string
  let outside: string

  beforeEach(() => {
    const base = mkdtempSync(join(tmpdir(), 'ospore-workspace-test-'))
    root = join(base, 'workspace')
    outside = join(base, 'outside')
    mkdirSync(join(root, 'docs'), { recursive: true })
    mkdirSync(outside, { recursive: true })
    writeFileSync(join(root, 'docs', 'a.md'), '# a')
    writeFileSync(join(outside, 'secret.txt'), 'secret')
  })

  afterEach(() => {
    rmSync(join(root, '..'), { recursive: true, force: true })
  })

  it('resolves a nested path inside the workspace', () => {
    expect(resolveInsideRoot(canonicalRoot(root), 'docs/a.md')).toBe(join(root, 'docs', 'a.md'))
  })

  it('resolves the root itself', () => {
    expect(resolveInsideRoot(canonicalRoot(root), '')).toBe(root)
  })

  it('rejects a parent-directory escape', () => {
    expect(() => resolveInsideRoot(canonicalRoot(root), '../outside/secret.txt')).toThrow(
      'escapes the workspace'
    )
  })

  it('rejects an absolute path outside the workspace', () => {
    expect(() => resolveInsideRoot(canonicalRoot(root), join(outside, 'secret.txt'))).toThrow(
      'escapes the workspace'
    )
  })

  it('rejects a symlink that points outside the workspace', () => {
    symlinkSync(outside, join(root, 'escape-hatch'))

    expect(() => resolveInsideRoot(canonicalRoot(root), 'escape-hatch/secret.txt')).toThrow(
      'escapes the workspace'
    )
  })

  it('reports a missing path distinctly', () => {
    expect(() => resolveInsideRoot(canonicalRoot(root), 'docs/missing.md')).toThrow('not found')
  })

  it('canonicalizes a root reached through a symlink', () => {
    symlinkSync(root, join(root, '..', 'link-to-workspace'))

    expect(canonicalRoot(join(root, '..', 'link-to-workspace'))).toBe(root)
  })
})

describe('tree rules', () => {
  it('hides hidden and dependency directories', () => {
    expect(isIgnoredDirectory('.git')).toBe(true)
    expect(isIgnoredDirectory('.pi')).toBe(true)
    expect(isIgnoredDirectory('node_modules')).toBe(true)
    expect(isIgnoredDirectory('build-output')).toBe(true)
    expect(isIgnoredDirectory('docs')).toBe(false)
    expect(isIgnoredDirectory('src')).toBe(false)
  })

  it('opens only markdown and html', () => {
    expect(isOpenable('README.md')).toBe(true)
    expect(isOpenable('page.HTML')).toBe(true)
    expect(isOpenable('notes.markdown')).toBe(true)
    expect(isOpenable('index.htm')).toBe(true)
    expect(isOpenable('main.ts')).toBe(false)
    expect(isOpenable('Makefile')).toBe(false)
    expect(isOpenable('.gitignore')).toBe(false)
  })
})

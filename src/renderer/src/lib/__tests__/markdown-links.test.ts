import { describe, expect, it } from 'vitest'
import { buildOsporeUrl } from '@shared/ospore-url'
import { resolveMarkdownHref } from '../markdown-links'

const DOC = 'docs/design/001_architecture.md'

describe('resolveMarkdownHref', () => {
  it('sends http and https to the OS browser', () => {
    expect(resolveMarkdownHref('https://example.com/a', DOC)).toEqual({
      kind: 'external',
      url: 'https://example.com/a'
    })
    expect(resolveMarkdownHref('http://example.com/a', DOC)).toEqual({
      kind: 'external',
      url: 'http://example.com/a'
    })
  })

  it('ignores non-http schemes and in-page anchors', () => {
    expect(resolveMarkdownHref('mailto:a@b.c', DOC)).toEqual({ kind: 'ignore' })
    expect(resolveMarkdownHref('#section', DOC)).toEqual({ kind: 'ignore' })
    expect(resolveMarkdownHref('data:text/plain,hi', DOC)).toEqual({ kind: 'ignore' })
    expect(resolveMarkdownHref('   ', DOC)).toEqual({ kind: 'ignore' })
  })

  it("resolves a sibling document against the document's own directory", () => {
    expect(resolveMarkdownHref('002_data_model.md', DOC)).toEqual({
      kind: 'document',
      path: 'docs/design/002_data_model.md'
    })
  })

  it('resolves a parent-directory document without escaping the workspace', () => {
    expect(resolveMarkdownHref('../requirements-v0.md', DOC)).toEqual({
      kind: 'document',
      path: 'docs/requirements-v0.md'
    })
  })

  it('treats a leading slash as workspace-root-relative', () => {
    expect(resolveMarkdownHref('/README.md', DOC)).toEqual({
      kind: 'document',
      path: 'README.md'
    })
  })

  it('strips query strings and fragments before resolving', () => {
    expect(resolveMarkdownHref('002_data_model.md#models', DOC)).toEqual({
      kind: 'document',
      path: 'docs/design/002_data_model.md'
    })
  })

  it('ignores links that climb above the workspace root', () => {
    expect(resolveMarkdownHref('../../../../etc/passwd', DOC)).toEqual({ kind: 'ignore' })
    expect(resolveMarkdownHref('/../secret.md', DOC)).toEqual({ kind: 'ignore' })
  })

  it('serves non-document files through ospore://', () => {
    expect(resolveMarkdownHref('diagrams/flow.png', DOC)).toEqual({
      kind: 'resource',
      url: buildOsporeUrl('docs/design/diagrams/flow.png')
    })
  })

  it('decodes percent-encoded and spaced paths', () => {
    expect(resolveMarkdownHref('a%20b%20notes.md', DOC)).toEqual({
      kind: 'document',
      path: 'docs/design/a b notes.md'
    })
  })

  it('recognises the .markdown extension', () => {
    expect(resolveMarkdownHref('other.markdown', DOC)).toEqual({
      kind: 'document',
      path: 'docs/design/other.markdown'
    })
  })

  it('resolves from the workspace root when the document sits there', () => {
    expect(resolveMarkdownHref('docs/guide.md', 'README.md')).toEqual({
      kind: 'document',
      path: 'docs/guide.md'
    })
  })
})

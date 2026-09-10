import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MarkdownView } from '../MarkdownView'

/**
 * CJK-friendly emphasis.
 *
 * CommonMark refuses to open emphasis when the character inside the delimiter is
 * punctuation and the one outside is a letter. Chinese writes exactly that way —
 * `是**「编码产能」**；` — so the asterisks rendered literally and, worse, the
 * following `**` paired with the one after it and bolded an unrelated span. The
 * `remark-cjk-friendly` plugins relax that rule.
 *
 * These run in the node lane: markdown to markup needs no browser, and the
 * colours are covered by `MarkdownView.browser.test.tsx`.
 */

function render(text: string): string {
  return renderToStaticMarkup(<MarkdownView text={text} path="docs/note.md" />)
}

describe('markdown emphasis in Chinese text', () => {
  it('emphasises a quotation whose opening delimiter follows a letter', () => {
    // Broken side: outside is a letter (`是`), inside is punctuation (`「`).
    const html = render('瓶颈是**「人的编码产能」**；但时代变了。')

    expect(html).toContain('<strong>「人的编码产能」</strong>')
    expect(html).not.toContain('**')
  })

  it('emphasises a sentence whose closing delimiter precedes a letter', () => {
    // Broken side: inside is punctuation (`。`), outside is a letter (`这`).
    const html = render('**该星号不会被识别。**这是因为标点紧邻着字母。')

    expect(html).toContain('<strong>该星号不会被识别。</strong>')
    expect(html).not.toContain('**')
  })

  it('emphasises a quotation whose closing bracket precedes a letter', () => {
    const html = render('**「引用内容」**后面直接接字，没有空格。')

    expect(html).toContain('<strong>「引用内容」</strong>')
    expect(html).not.toContain('**')
  })
})

describe('markdown emphasis that already worked', () => {
  it('keeps a parenthesis run, which plain CommonMark handles', () => {
    // Outside is punctuation, so this one never needed the plugin; it is here
    // to catch the plugins over-reaching.
    expect(render('（**重点**）括号里也要能加粗。')).toContain('<strong>重点</strong>')
  })

  it('still bolds plain ASCII runs', () => {
    expect(render('a **b** c')).toContain('<strong>b</strong>')
  })

  it('still strikes through a CJK run', () => {
    expect(render('这段~~已废弃~~了')).toContain('<del>已废弃</del>')
  })
})

describe('markdown emphasis is not over-eager', () => {
  it('leaves spaced single asterisks alone', () => {
    const html = render('2 * 3 * 4')

    expect(html).not.toContain('<em>')
  })

  it('leaves underscores inside a word alone', () => {
    const html = render('snake_case_name 是个标识符。')

    expect(html).not.toContain('<em>')
  })

  it('leaves a lone double asterisk alone', () => {
    const html = render('未配对的 ** 星号保持原样。')

    expect(html).toContain('**')
  })
})

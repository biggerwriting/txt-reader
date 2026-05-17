// src/core/parser.test.ts
import { describe, it, expect } from 'vitest'
import { parseChapters } from './parser'

describe('parseChapters', () => {
  it('detects 第X章 pattern', () => {
    const text = '前言内容\n第一章 少年\n正文第一章\n第二章 成长\n正文第二章'
    const chapters = parseChapters(text)
    expect(chapters).toHaveLength(3)
    expect(chapters[0].title).toBe('前言')
    expect(chapters[0].index).toBe(0)
    expect(chapters[1].title).toBe('第一章 少年')
    expect(chapters[1].index).toBe(1)
    expect(chapters[2].title).toBe('第二章 成长')
    expect(chapters[2].index).toBe(2)
  })

  it('detects Chapter X pattern', () => {
    const text = 'preface\nChapter 1 Beginning\ncontent\nChapter 2 Middle\ncontent'
    const chapters = parseChapters(text)
    expect(chapters).toHaveLength(3)
    expect(chapters[0].title).toBe('前言')
    expect(chapters[1].title).toBe('Chapter 1 Beginning')
  })

  it('detects arabic numeral chapter: 第4章', () => {
    const text = '第4章 出发\n正文内容\n第5章 到达\n正文内容'
    const chapters = parseChapters(text)
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('第4章 出发')
    expect(chapters[1].title).toBe('第5章 到达')
  })

  it('does not treat "1. " or "2. " list items as chapters', () => {
    const text = '1. 苹果\n2. 香蕉\n3. 橙子'
    const chapters = parseChapters(text)
    // Should fall back to pages, not extract fake chapters
    expect(chapters[0].title).toBe('第 1 页')
  })

  it('falls back to 2000-char pages when no pattern matches', () => {
    const text = 'a'.repeat(5500)
    const chapters = parseChapters(text)
    expect(chapters).toHaveLength(3)
    expect(chapters[0].title).toBe('第 1 页')
    expect(chapters[2].title).toBe('第 3 页')
  })

  it('does not treat body sentences starting with numbers as chapters', () => {
    const text = '2 people walked in\n10 years later\n3 days passed'
    const chapters = parseChapters(text)
    // Should fall back to pages, not extract fake chapters
    expect(chapters[0].title).toBe('第 1 页')
  })

  it('creates 前言 chapter for content before first header', () => {
    const text = '作者的话\n这是序言内容\n第一章 开始\n正文内容'
    const chapters = parseChapters(text)
    expect(chapters[0].title).toBe('前言')
    expect(chapters[0].offset).toBe(0)
    expect(chapters[1].title).toBe('第一章 开始')
  })

  it('chapter offset + length covers correct text slice', () => {
    const text = '第一章 开始\n第一章正文内容\n第二章 结束\n第二章正文内容'
    const chapters = parseChapters(text)
    const slice = text.slice(chapters[0].offset, chapters[0].offset + chapters[0].length)
    expect(slice).toContain('第一章 开始')
    expect(slice).toContain('第一章正文内容')
    expect(slice).not.toContain('第二章')
  })
})

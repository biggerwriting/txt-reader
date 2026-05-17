// src/core/parser.test.ts
import { describe, it, expect } from 'vitest'
import { parseChapters } from './parser'

describe('parseChapters', () => {
  it('detects 第X章 pattern', () => {
    const text = '前言内容\n第一章 少年\n正文第一章\n第二章 成长\n正文第二章'
    const chapters = parseChapters(text)
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('第一章 少年')
    expect(chapters[0].index).toBe(0)
    expect(chapters[1].title).toBe('第二章 成长')
    expect(chapters[1].index).toBe(1)
  })

  it('detects Chapter X pattern', () => {
    const text = 'preface\nChapter 1 Beginning\ncontent\nChapter 2 Middle\ncontent'
    const chapters = parseChapters(text)
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('Chapter 1 Beginning')
  })

  it('detects numeric list pattern', () => {
    const text = '1、第一节\n内容\n2、第二节\n内容'
    const chapters = parseChapters(text)
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('1、第一节')
  })

  it('falls back to 2000-char pages when no pattern matches', () => {
    const text = 'a'.repeat(5500)
    const chapters = parseChapters(text)
    expect(chapters).toHaveLength(3)
    expect(chapters[0].title).toBe('第 1 页')
    expect(chapters[2].title).toBe('第 3 页')
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

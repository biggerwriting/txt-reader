// src/core/parser.ts
import type { Chapter } from '../types'

const PATTERNS = [
  /^第[零一二三四五六七八九十百千万\d]+[章节回]([\s　\u3000]|$)/,
  /^Chapter\s*\d+/i,
]

const FALLBACK_PAGE_SIZE = 2000

export function parseChapters(text: string): Chapter[] {
  const lines = text.split('\n')

  // Find which pattern matches the most lines (pick dominant pattern)
  let bestPattern: RegExp | null = null
  let bestCount = 0
  for (const pattern of PATTERNS) {
    const count = lines.filter(l => pattern.test(l.trim())).length
    if (count > bestCount) {
      bestCount = count
      bestPattern = pattern
    }
  }

  if (bestCount > 0 && bestPattern) {
    return extractByPattern(text, lines, bestPattern)
  }

  return fallbackPages(text)
}

function extractByPattern(text: string, lines: string[], pattern: RegExp): Chapter[] {
  const chapters: Chapter[] = []
  let charOffset = 0
  let currentStart: number | null = null
  let currentTitle = ''
  let currentIndex = 0

  for (const line of lines) {
    const lineLen = line.length + 1 // +1 for \n
    const trimmed = line.trim()

    if (pattern.test(trimmed)) {
      if (currentStart !== null) {
        chapters.push({
          index: currentIndex++,
          title: currentTitle,
          offset: currentStart,
          length: charOffset - currentStart,
        })
      }
      currentStart = charOffset
      currentTitle = trimmed
    }

    charOffset += lineLen
  }

  // Push last chapter
  if (currentStart !== null) {
    chapters.push({
      index: currentIndex,
      title: currentTitle,
      offset: currentStart,
      length: text.length - currentStart,
    })
  }

  // Insert synthetic 前言 chapter for content before the first detected header
  if (chapters.length > 0 && chapters[0].offset > 0) {
    const preambleLength = chapters[0].offset
    for (const ch of chapters) {
      ch.index += 1
    }
    chapters.unshift({
      index: 0,
      title: '前言',
      offset: 0,
      length: preambleLength,
    })
  }

  return chapters
}

function fallbackPages(text: string): Chapter[] {
  const chapters: Chapter[] = []
  let offset = 0
  let index = 0

  while (offset < text.length) {
    const length = Math.min(FALLBACK_PAGE_SIZE, text.length - offset)
    const pageNum = index + 1
    chapters.push({
      index: index++,
      title: `第 ${pageNum} 页`,
      offset,
      length,
    })
    offset += length
  }

  return chapters
}

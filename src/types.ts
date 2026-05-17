// src/types.ts

export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for HTTP (non-secure) contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

export interface Chapter {
  index: number
  title: string      // original title line text
  offset: number     // char offset in full text
  length: number
}

export interface Book {
  id: string
  title: string
  chapters: Chapter[]
  fullText: string
  totalChars: number
  importedAt: number
  currentChapter: number
  currentScrollY: number
  readSeconds: number
  lastReadAt: number
}

export interface Bookmark {
  id: string
  bookId: string
  chapterIndex: number
  chapterTitle: string
  createdAt: number
}

export interface Prefs {
  fontSize: number   // default 18, range 14–28
}

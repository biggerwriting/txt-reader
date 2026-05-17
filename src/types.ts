// src/types.ts

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

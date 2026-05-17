// src/core/storage.test.ts
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { Storage } from './storage'
import type { Book, Bookmark } from '../types'

function makeBook(id: string): Book {
  return {
    id,
    title: `Book ${id}`,
    chapters: [],
    fullText: 'hello',
    totalChars: 5,
    importedAt: Date.now(),
    currentChapter: 0,
    currentScrollY: 0,
    readSeconds: 0,
    lastReadAt: 0,
  }
}

describe('Storage', () => {
  let storage: Storage

  beforeEach(() => {
    storage = new Storage()
  })

  it('saves and retrieves a book', async () => {
    const book = makeBook('b1')
    await storage.saveBook(book)
    const retrieved = await storage.getBook('b1')
    expect(retrieved).toEqual(book)
  })

  it('lists all books ordered by lastReadAt desc', async () => {
    const b1 = { ...makeBook('b1'), lastReadAt: 100 }
    const b2 = { ...makeBook('b2'), lastReadAt: 200 }
    await storage.saveBook(b1)
    await storage.saveBook(b2)
    const list = await storage.listBooks()
    expect(list[0].id).toBe('b2')
    expect(list[1].id).toBe('b1')
  })

  it('deletes a book', async () => {
    await storage.saveBook(makeBook('b1'))
    await storage.deleteBook('b1')
    const retrieved = await storage.getBook('b1')
    expect(retrieved).toBeNull()
  })

  it('saves and retrieves bookmarks for a book', async () => {
    const bm: Bookmark = {
      id: 'bm1',
      bookId: 'b1',
      chapterIndex: 3,
      chapterTitle: '第三章',
      createdAt: Date.now(),
    }
    await storage.saveBookmark(bm)
    const list = await storage.getBookmarks('b1')
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('bm1')
  })

  it('deletes a bookmark', async () => {
    const bm: Bookmark = {
      id: 'bm1', bookId: 'b1', chapterIndex: 0,
      chapterTitle: '第一章', createdAt: Date.now(),
    }
    await storage.saveBookmark(bm)
    await storage.deleteBookmark('bm1')
    const list = await storage.getBookmarks('b1')
    expect(list).toHaveLength(0)
  })
})

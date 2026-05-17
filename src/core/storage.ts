// src/core/storage.ts
import type { Book, Bookmark } from '../types'

const DB_NAME = 'txt-reader'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('books')) {
        db.createObjectStore('books', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('bookmarks')) {
        const bm = db.createObjectStore('bookmarks', { keyPath: 'id' })
        bm.createIndex('bookId', 'bookId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const s = t.objectStore(store)
    const req = fn(s)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export class Storage {
  private dbPromise = openDB()

  async saveBook(book: Book): Promise<void> {
    const db = await this.dbPromise
    await tx(db, 'books', 'readwrite', s => s.put(book))
  }

  async getBook(id: string): Promise<Book | null> {
    const db = await this.dbPromise
    const result = await tx<Book | undefined>(db, 'books', 'readonly', s => s.get(id))
    return result ?? null
  }

  async listBooks(): Promise<Book[]> {
    const db = await this.dbPromise
    const books = await tx<Book[]>(db, 'books', 'readonly', s => s.getAll())
    return books.sort((a, b) => b.lastReadAt - a.lastReadAt)
  }

  async deleteBook(id: string): Promise<void> {
    const db = await this.dbPromise
    await tx(db, 'books', 'readwrite', s => s.delete(id))
    // Also delete bookmarks for this book
    const bms = await this.getBookmarks(id)
    for (const bm of bms) {
      await this.deleteBookmark(bm.id)
    }
  }

  async saveBookmark(bookmark: Bookmark): Promise<void> {
    const db = await this.dbPromise
    await tx(db, 'bookmarks', 'readwrite', s => s.put(bookmark))
  }

  async getBookmarks(bookId: string): Promise<Bookmark[]> {
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const t = db.transaction('bookmarks', 'readonly')
      const store = t.objectStore('bookmarks')
      const index = store.index('bookId')
      const req = index.getAll(bookId)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  async deleteBookmark(id: string): Promise<void> {
    const db = await this.dbPromise
    await tx(db, 'bookmarks', 'readwrite', s => s.delete(id))
  }
}

export const storage = new Storage()

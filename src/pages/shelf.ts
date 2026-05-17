// src/pages/shelf.ts
import { storage } from '../core/storage'
import { parseChapters } from '../core/parser'
import type { Book } from '../types'
import type { Router } from '../router'

function formatDate(ts: number): string {
  if (!ts) return '未读过'
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function formatProgress(book: Book): string {
  if (!book.chapters.length) return '0%'
  const pct = Math.round((book.currentChapter / book.chapters.length) * 100)
  return `${pct}%`
}

function showDeleteDialog(book: Book, onConfirm: () => void): void {
  const overlay = document.createElement('div')
  overlay.className = 'dialog-overlay'
  overlay.innerHTML = `
    <div class="dialog">
      <h3>删除书籍</h3>
      <p>确定要删除《${book.title}》吗？进度和书签将一并删除。</p>
      <div class="dialog-actions">
        <button class="btn btn-ghost" id="cancel-btn">取消</button>
        <button class="btn btn-danger" id="confirm-btn">删除</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  overlay.querySelector('#cancel-btn')!.addEventListener('click', () => overlay.remove())
  overlay.querySelector('#confirm-btn')!.addEventListener('click', () => {
    overlay.remove()
    onConfirm()
  })
}

export async function mountShelf(container: HTMLElement, router: Router): Promise<void> {
  async function render(): Promise<void> {
    const books = await storage.listBooks()

    container.innerHTML = `
      <div class="page">
        <div class="topbar">
          <h1>我的书架</h1>
          <label class="icon-btn" title="导入" style="cursor:pointer">
            ＋
            <input type="file" accept=".txt" id="file-input" style="display:none" />
          </label>
        </div>
        <div class="scroll-list" id="book-list">
          ${books.length === 0 ? `
            <div class="empty-state">
              <div style="font-size:48px">📚</div>
              <div>书架空空如也</div>
              <div>点击右上角 ＋ 导入 txt 文件</div>
            </div>
          ` : books.map(b => `
            <div class="book-card" data-id="${b.id}">
              <h2>${b.title}</h2>
              <div class="meta">
                <span>${b.chapters.length} 章</span>
                <span>进度 ${formatProgress(b)}</span>
                <span>上次 ${formatDate(b.lastReadAt)}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-bar-fill" style="width:${formatProgress(b)}"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `

    const fileInput = container.querySelector<HTMLInputElement>('#file-input')!
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0]
      if (!file) return
      const text = await file.text()
      const chapters = parseChapters(text)
      const book: Book = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.txt$/i, ''),
        chapters,
        fullText: text,
        totalChars: text.length,
        importedAt: Date.now(),
        currentChapter: 0,
        currentScrollY: 0,
        readSeconds: 0,
        lastReadAt: 0,
      }
      await storage.saveBook(book)
      render()
    })

    let pressTimer: ReturnType<typeof setTimeout>
    container.querySelectorAll('.book-card').forEach(card => {
      const id = (card as HTMLElement).dataset.id!
      card.addEventListener('click', () => router.navigate(`/reader/${id}`))
      card.addEventListener('touchstart', () => {
        pressTimer = setTimeout(async () => {
          const book = await storage.getBook(id)
          if (!book) return
          showDeleteDialog(book, async () => {
            await storage.deleteBook(id)
            render()
          })
        }, 600)
      })
      card.addEventListener('touchend', () => clearTimeout(pressTimer))
      card.addEventListener('touchmove', () => clearTimeout(pressTimer))
    })
  }

  await render()
}

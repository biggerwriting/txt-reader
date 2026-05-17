// src/components/toc.ts
import type { Book } from '../types'

export class TocDrawer {
  private backdrop: HTMLElement
  private drawer: HTMLElement

  constructor(
    private book: Book,
    private onSelect: (chapterIndex: number) => void
  ) {
    this.backdrop = document.createElement('div')
    this.backdrop.className = 'backdrop'

    this.drawer = document.createElement('div')
    this.drawer.className = 'drawer'
    this.drawer.innerHTML = `
      <div class="topbar" style="border-bottom:1px solid var(--border)">
        <h1>目录</h1>
        <button class="icon-btn" id="toc-close">✕</button>
      </div>
      <div class="scroll-list" style="padding:8px 0">
        ${book.chapters.map(ch => `
          <div class="book-card" data-index="${ch.index}" style="margin:4px 12px;padding:12px">
            ${ch.title}
          </div>
        `).join('')}
      </div>
    `

    this.backdrop.addEventListener('click', () => this.close())
    this.drawer.querySelector('#toc-close')!.addEventListener('click', () => this.close())
    this.drawer.querySelectorAll('.book-card').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt((item as HTMLElement).dataset.index!)
        this.onSelect(index)
        this.close()
      })
    })
  }

  open(): void {
    document.body.appendChild(this.backdrop)
    document.body.appendChild(this.drawer)
    requestAnimationFrame(() => {
      this.backdrop.classList.add('visible')
      this.drawer.classList.add('open')
    })
  }

  close(): void {
    this.backdrop.classList.remove('visible')
    this.drawer.classList.remove('open')
    setTimeout(() => {
      this.backdrop.remove()
      this.drawer.remove()
    }, 250)
  }
}

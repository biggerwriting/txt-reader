// src/components/settings.ts
import { storage } from '../core/storage'
import { loadPrefs, savePrefs } from '../core/prefs'
import type { Book } from '../types'

export class SettingsSheet {
  private backdrop: HTMLElement
  private sheet: HTMLElement

  constructor(
    private book: Book,
    private onFontSizeChange: (size: number) => void,
    private onBookmarkJump: (chapterIndex: number) => void
  ) {
    this.backdrop = document.createElement('div')
    this.backdrop.className = 'backdrop'
    this.sheet = document.createElement('div')
    this.sheet.className = 'sheet'
    this.backdrop.addEventListener('click', () => this.close())
  }

  async open(): Promise<void> {
    const prefs = await loadPrefs()
    const bookmarks = await storage.getBookmarks(this.book.id)

    this.sheet.innerHTML = `
      <div style="margin-bottom:24px">
        <div class="topbar" style="padding:0 0 12px;border-bottom:1px solid var(--border);margin-bottom:16px">
          <h1 style="font-size:16px">设置</h1>
        </div>
        <label style="font-size:13px;color:var(--text-muted);display:block;margin-bottom:8px">
          字体大小：<span id="font-size-display">${prefs.fontSize}</span>px
        </label>
        <input type="range" id="font-slider" min="14" max="28" step="1" value="${prefs.fontSize}"
          style="width:100%;accent-color:var(--accent)" />
      </div>
      <div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">书签</div>
        ${bookmarks.length === 0
          ? `<div style="font-size:13px;color:var(--text-muted)">暂无书签</div>`
          : bookmarks.map(bm => `
            <div style="display:flex;align-items:center;justify-content:space-between;
                        padding:10px 0;border-bottom:1px solid var(--border)">
              <div class="bm-jump" data-index="${bm.chapterIndex}"
                   style="cursor:pointer;flex:1;min-width:0">
                <div style="font-size:14px">${bm.chapterTitle}</div>
                ${bm.excerpt ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">${bm.excerpt}…</div>` : ''}
              </div>
              <button class="icon-btn bm-delete" data-id="${bm.id}"
                      style="font-size:14px;color:var(--text-muted)">✕</button>
            </div>
          `).join('')}
      </div>
    `

    const slider = this.sheet.querySelector<HTMLInputElement>('#font-slider')!
    const display = this.sheet.querySelector<HTMLElement>('#font-size-display')!

    slider.addEventListener('input', async () => {
      const size = parseInt(slider.value)
      display.textContent = String(size)
      this.onFontSizeChange(size)
      await savePrefs({ fontSize: size })
    })

    this.sheet.querySelectorAll('.bm-jump').forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt((el as HTMLElement).dataset.index!)
        this.onBookmarkJump(index)
        this.close()
      })
    })

    this.sheet.querySelectorAll('.bm-delete').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation()
        const id = (el as HTMLElement).dataset.id!
        await storage.deleteBookmark(id)
        // Remove old DOM elements immediately before re-rendering
        this.backdrop.remove()
        this.sheet.remove()
        await this.open()
      })
    })

    document.body.appendChild(this.backdrop)
    document.body.appendChild(this.sheet)
    requestAnimationFrame(() => {
      this.backdrop.classList.add('visible')
      this.sheet.classList.add('open')
    })
  }

  close(): void {
    this.backdrop.classList.remove('visible')
    this.sheet.classList.remove('open')
    setTimeout(() => {
      this.backdrop.remove()
      this.sheet.remove()
    }, 250)
  }
}

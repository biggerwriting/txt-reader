// src/pages/reader.ts
import { storage } from '../core/storage'
import { ReadingTimer } from '../core/timer'
import { loadPrefs } from '../core/prefs'
import { TocDrawer } from '../components/toc'
import { SettingsSheet } from '../components/settings'
import { uuid } from '../types'
import type { Book, Bookmark } from '../types'
import type { Router } from '../router'

export async function mountReader(
  container: HTMLElement,
  router: Router,
  bookId: string
): Promise<void> {
  const book = await storage.getBook(bookId)
  if (!book) { router.navigate('/shelf'); return }

  const prefs = await loadPrefs()
  const timer = new ReadingTimer(book.readSeconds)

  let currentChapter = book.currentChapter
  let barsVisible = true
  let isFirstRender = true
  let unmounted = false

  // --- Render shell ---
  container.innerHTML = `
    <div class="page" id="reader-page" style="font-size:${prefs.fontSize}px">
      <div class="topbar" id="reader-topbar">
        <button class="icon-btn" id="back-btn">←</button>
        <span id="chapter-title" style="font-size:14px;flex:1;text-align:center;
              overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 8px">
          ${book.chapters[currentChapter]?.title ?? ''}
        </span>
        <div style="display:flex;gap:4px">
          <button class="icon-btn" id="toc-btn">☰</button>
          <button class="icon-btn" id="bookmark-btn">🔖</button>
          <button class="icon-btn" id="settings-btn">⚙</button>
        </div>
      </div>

      <div id="content-area" style="flex:1;overflow-y:auto;padding:16px;
           line-height:1.8;-webkit-overflow-scrolling:touch;word-break:break-all"></div>

      <div class="topbar" id="reader-bottombar"
           style="border-top:1px solid var(--border);border-bottom:none;
                  flex-direction:column;gap:6px;padding:10px 16px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="progress-bar" style="flex:1">
            <div class="progress-bar-fill" id="progress-fill" style="width:0%"></div>
          </div>
          <span id="progress-text" style="font-size:12px;color:var(--text-muted);min-width:36px;text-align:right">0%</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);text-align:right" id="time-display">
          ${ReadingTimer.format(book.readSeconds)}
        </div>
      </div>
    </div>
  `

  const contentArea = container.querySelector<HTMLElement>('#content-area')!
  const chapterTitleEl = container.querySelector<HTMLElement>('#chapter-title')!
  const progressFill = container.querySelector<HTMLElement>('#progress-fill')!
  const progressText = container.querySelector<HTMLElement>('#progress-text')!
  const timeDisplay = container.querySelector<HTMLElement>('#time-display')!
  const topbar = container.querySelector<HTMLElement>('#reader-topbar')!
  const bottombar = container.querySelector<HTMLElement>('#reader-bottombar')!
  const page = container.querySelector<HTMLElement>('#reader-page')!

  // --- Render chapter ---
  function renderChapter(index: number): void {
    currentChapter = Math.max(0, Math.min(index, book!.chapters.length - 1))
    const ch = book!.chapters[currentChapter]
    const text = book!.fullText.slice(ch.offset, ch.offset + ch.length)
    const total = book!.chapters.length
    const hasPrev = currentChapter > 0
    const hasNext = currentChapter < total - 1

    contentArea.innerHTML = text
      .split('\n')
      .filter(l => l.trim())
      .map(l => `<p style="margin-bottom:1em">${l.trim()}</p>`)
      .join('') + `
      <div style="display:flex;justify-content:space-between;gap:12px;
                  margin-top:32px;padding-top:16px;border-top:1px solid var(--border)">
        <button id="prev-chapter-btn"
          style="flex:1;padding:12px;border:1px solid var(--border);border-radius:var(--radius);
                 background:var(--surface);color:var(--text);font-size:14px;font-family:inherit;
                 cursor:pointer;${hasPrev ? '' : 'opacity:0;pointer-events:none'}">
          ← 上一章
        </button>
        <button id="next-chapter-btn"
          style="flex:1;padding:12px;border:1px solid var(--border);border-radius:var(--radius);
                 background:var(--surface);color:var(--text);font-size:14px;font-family:inherit;
                 cursor:pointer;${hasNext ? '' : 'opacity:0;pointer-events:none'}">
          下一章 →
        </button>
      </div>`

    contentArea.querySelector('#prev-chapter-btn')?.addEventListener('click', (e) => {
      e.stopPropagation()
      renderChapter(currentChapter - 1)
    })
    contentArea.querySelector('#next-chapter-btn')?.addEventListener('click', (e) => {
      e.stopPropagation()
      renderChapter(currentChapter + 1)
    })
    if (isFirstRender) {
      isFirstRender = false
      // Defer until after layout so scrollTop takes effect (scrollHeight is 0 before paint)
      requestAnimationFrame(() => {
        if (unmounted) return
        contentArea.scrollTop = book!.currentScrollY
      })
    } else {
      contentArea.scrollTop = 0
    }

    chapterTitleEl.textContent = ch.title
    const readChars = ch.offset + ch.length
    const pct = Math.round(readChars / book!.totalChars * 100)
    progressFill.style.width = `${pct}%`
    progressText.textContent = `${pct}%`
  }

  renderChapter(currentChapter)

  // --- Timer tick ---
  timer.start()
  const timerInterval = setInterval(() => {
    timeDisplay.textContent = ReadingTimer.format(timer.elapsed)
  }, 10000)

  const autoSaveInterval = setInterval(() => {
    if (!unmounted) saveProgress()
  }, 30_000)

  // --- Persist on leave ---
  async function saveProgress(): Promise<void> {
    book!.currentChapter = currentChapter
    book!.currentScrollY = contentArea.scrollTop
    book!.readSeconds = timer.elapsed
    book!.lastReadAt = Date.now()
    await storage.saveBook(book!)
  }

  async function persist(): Promise<void> {
    unmounted = true
    document.removeEventListener('visibilitychange', onVisibilityChange)
    timer.stop()
    clearInterval(timerInterval)
    clearInterval(autoSaveInterval)
    await saveProgress()
  }

  // --- Toggle bars ---
  contentArea.addEventListener('click', () => {
    barsVisible = !barsVisible
    topbar.classList.toggle('hidden', !barsVisible)
    bottombar.classList.toggle('hidden', !barsVisible)
  })

  // --- Swipe gestures ---
  let touchStartX = 0
  let touchStartY = 0
  contentArea.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  }, { passive: true })
  contentArea.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX
    const dy = e.changedTouches[0].clientY - touchStartY
    // Only trigger chapter change when horizontal movement dominates (ratio > 2:1)
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
      if (dx < 0) renderChapter(currentChapter + 1)
      else renderChapter(currentChapter - 1)
    }
  })

  // --- Back ---
  container.querySelector('#back-btn')!.addEventListener('click', async () => {
    await persist()
    router.navigate('/shelf')
  })

  // --- TOC ---
  container.querySelector('#toc-btn')!.addEventListener('click', () => {
    const toc = new TocDrawer(book!, (index) => renderChapter(index))
    toc.open()
  })

  // --- Bookmark ---
  container.querySelector('#bookmark-btn')!.addEventListener('click', async () => {
    const ch = book!.chapters[currentChapter]
    const bm: Bookmark = {
      id: uuid(),
      bookId: book!.id,
      chapterIndex: currentChapter,
      chapterTitle: ch.title,
      createdAt: Date.now(),
    }
    await storage.saveBookmark(bm)
    // Brief visual feedback
    const btn = container.querySelector<HTMLElement>('#bookmark-btn')!
    const orig = btn.textContent
    btn.textContent = '✓'
    setTimeout(() => { btn.textContent = orig }, 800)
  })

  // --- Settings ---
  container.querySelector('#settings-btn')!.addEventListener('click', () => {
    const sheet = new SettingsSheet(
      book!,
      (size) => { page.style.fontSize = `${size}px` },
      (index) => renderChapter(index)
    )
    sheet.open()
  })

  // --- Visibility API: pause timer when app backgrounds ---
  const onVisibilityChange = async () => {
    if (unmounted) return
    if (document.hidden) {
      timer.stop()
      await saveProgress()
    } else {
      timer.start()
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
}

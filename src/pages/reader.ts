// src/pages/reader.ts
import { storage } from '../core/storage'
import { ReadingTimer } from '../core/timer'
import { loadPrefs } from '../core/prefs'
import { TocDrawer } from '../components/toc'
import { SettingsSheet } from '../components/settings'
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
      <div class="topbar" id="reader-topbar" style="transition:opacity 0.2s">
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
           line-height:1.8;-webkit-overflow-scrolling:touch"></div>

      <div class="topbar" id="reader-bottombar"
           style="border-top:1px solid var(--border);border-bottom:none;
                  flex-direction:column;gap:6px;padding:10px 16px;transition:opacity 0.2s">
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
    contentArea.innerHTML = text
      .split('\n')
      .filter(l => l.trim())
      .map(l => `<p style="margin-bottom:1em">${l.trim()}</p>`)
      .join('')
    if (isFirstRender) {
      contentArea.scrollTop = book!.currentScrollY
      isFirstRender = false
    } else {
      contentArea.scrollTop = 0
    }

    chapterTitleEl.textContent = ch.title
    const pct = Math.round(((currentChapter + 1) / book!.chapters.length) * 100)
    progressFill.style.width = `${pct}%`
    progressText.textContent = `${pct}%`
  }

  renderChapter(currentChapter)

  // --- Timer tick ---
  timer.start()
  const timerInterval = setInterval(() => {
    timeDisplay.textContent = ReadingTimer.format(timer.elapsed)
  }, 10000)

  // --- Persist on leave ---
  async function persist(): Promise<void> {
    unmounted = true
    document.removeEventListener('visibilitychange', onVisibilityChange)
    timer.stop()
    clearInterval(timerInterval)
    book!.currentChapter = currentChapter
    book!.currentScrollY = contentArea.scrollTop
    book!.readSeconds = timer.elapsed
    book!.lastReadAt = Date.now()
    await storage.saveBook(book!)
  }

  // --- Toggle bars ---
  contentArea.addEventListener('click', () => {
    barsVisible = !barsVisible
    topbar.style.opacity = barsVisible ? '1' : '0'
    topbar.style.pointerEvents = barsVisible ? 'auto' : 'none'
    bottombar.style.opacity = barsVisible ? '1' : '0'
    bottombar.style.pointerEvents = barsVisible ? 'auto' : 'none'
  })

  // --- Swipe gestures ---
  let touchStartX = 0
  contentArea.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX }, { passive: true })
  contentArea.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX
    if (Math.abs(dx) > 60) {
      if (dx < 0) renderChapter(currentChapter + 1)  // left swipe = next
      else renderChapter(currentChapter - 1)           // right swipe = prev
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
      id: crypto.randomUUID(),
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
      await storage.saveBook({ ...book!, readSeconds: timer.elapsed, lastReadAt: Date.now() })
    } else {
      timer.start()
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
}

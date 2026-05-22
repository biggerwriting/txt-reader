# Reader UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 UX issues in the reader: no layout shift on bar toggle, TOC auto-scrolls to current chapter, remove accidental swipe navigation (add bottombar buttons instead), restore per-chapter scroll positions.

**Architecture:** All changes are contained to the reader page (`reader.ts`), the TOC drawer component (`toc.ts`), the CSS (`main.css`), and the `Book` type (`types.ts`). No new files needed. Changes are independent enough to commit per-task.

**Tech Stack:** TypeScript, Vite, Vitest, vanilla DOM, IndexedDB via `Storage` class.

---

## File Map

| File | What changes |
|------|-------------|
| `src/types.ts` | Add optional `chapterScrollPositions?: Record<number, number>` to `Book` |
| `src/styles/main.css` | Remove height/padding from `.topbar` transition; add `.book-card.active` rule |
| `src/components/toc.ts` | Accept `currentChapter` param; `open()` scrolls active item into view |
| `src/pages/reader.ts` | Bar-toggle scroll compensation; pass `currentChapter` to `TocDrawer`; remove swipe handlers; add bottombar prev/next buttons; per-chapter scroll save/restore |
| `src/core/storage.test.ts` | Add round-trip test for `chapterScrollPositions` |

---

## Task 1: Add `chapterScrollPositions` to `Book` type

**Files:**
- Modify: `src/core/storage.test.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Write failing test**

Append to `src/core/storage.test.ts` inside the `describe('Storage', ...)` block:

```typescript
  it('preserves chapterScrollPositions across save/load', async () => {
    const book = makeBook('b-scroll')
    book.chapterScrollPositions = { 0: 150, 1: 320 }
    await storage.saveBook(book)
    const loaded = await storage.getBook('b-scroll')
    expect(loaded?.chapterScrollPositions).toEqual({ 0: 150, 1: 320 })
  })
```

- [ ] **Step 2: Run type-check to verify it fails**

```bash
npx tsc --noEmit
```

Expected: error on `book.chapterScrollPositions = ...` — `Property 'chapterScrollPositions' does not exist on type 'Book'`

- [ ] **Step 3: Add field to `Book` in `src/types.ts`**

In `src/types.ts`, find the `Book` interface and add the new optional field after `lastReadAt`:

```typescript
export interface Book {
  id: string
  title: string
  chapters: Chapter[]
  fullText: string
  totalChars: number
  importedAt: number
  currentChapter: number
  currentScrollY: number
  chapterScrollPositions?: Record<number, number>
  readSeconds: number
  lastReadAt: number
}
```

- [ ] **Step 4: Run type-check and tests to verify they pass**

```bash
npx tsc --noEmit && npm test
```

Expected: 0 type errors, all tests pass including the new one.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/core/storage.test.ts
git commit -m "feat: add chapterScrollPositions field to Book type"
```

---

## Task 2: CSS — fix topbar transition, add active chapter style

**Files:**
- Modify: `src/styles/main.css`

- [ ] **Step 1: Remove height/padding from `.topbar` transition**

In `src/styles/main.css`, find line 48 and replace the transition value:

Old:
```css
  transition: height 0.2s, padding 0.2s, opacity 0.2s;
```

New:
```css
  transition: opacity 0.2s;
```

- [ ] **Step 2: Add `.book-card.active` rule**

Append after the `.book-card` block (after line 90 approximately):

```css
.book-card.active {
  font-weight: 600;
  border-left: 3px solid var(--accent);
}
```

- [ ] **Step 3: Run type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/main.css
git commit -m "feat: fix topbar transition to opacity-only, add active chapter style"
```

---

## Task 3: TocDrawer — scroll to current chapter on open

**Files:**
- Modify: `src/components/toc.ts`
- Modify: `src/pages/reader.ts` (only the TocDrawer instantiation line)

- [ ] **Step 1: Update `TocDrawer` constructor to accept `currentChapter`**

Replace the entire `src/components/toc.ts` with:

```typescript
// src/components/toc.ts
import type { Book } from '../types'

export class TocDrawer {
  private backdrop: HTMLElement
  private drawer: HTMLElement

  constructor(
    private book: Book,
    private currentChapter: number,
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
      const active = this.drawer.querySelector<HTMLElement>(
        `[data-index="${this.currentChapter}"]`
      )
      if (active) {
        active.scrollIntoView({ block: 'center', behavior: 'instant' })
        active.classList.add('active')
      }
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
```

- [ ] **Step 2: Update the TocDrawer call in `src/pages/reader.ts`**

Find the toc-btn click handler (around line 188) and update it to pass `currentChapter`:

Old:
```typescript
  container.querySelector('#toc-btn')!.addEventListener('click', () => {
    const toc = new TocDrawer(book!, (index) => renderChapter(index))
    toc.open()
  })
```

New:
```typescript
  container.querySelector('#toc-btn')!.addEventListener('click', () => {
    const toc = new TocDrawer(book!, currentChapter, (index) => renderChapter(index))
    toc.open()
  })
```

- [ ] **Step 3: Run type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/toc.ts src/pages/reader.ts
git commit -m "feat: scroll TOC to current chapter on open"
```

---

## Task 4: Reader — fix bar-toggle scroll compensation

**Files:**
- Modify: `src/pages/reader.ts`

- [ ] **Step 1: Replace the bar-toggle click handler**

Find the current click handler (around line 158):

Old:
```typescript
  contentArea.addEventListener('click', () => {
    barsVisible = !barsVisible
    topbar.classList.toggle('hidden', !barsVisible)
    bottombar.classList.toggle('hidden', !barsVisible)
  })
```

New:
```typescript
  contentArea.addEventListener('click', () => {
    if (barsVisible) {
      const topH = topbar.offsetHeight
      barsVisible = false
      topbar.classList.add('hidden')
      bottombar.classList.add('hidden')
      // content-area top edge moves up by topH; scroll down to compensate
      contentArea.scrollTop += topH
    } else {
      barsVisible = true
      topbar.classList.remove('hidden')
      bottombar.classList.remove('hidden')
      // topbar reappears; scroll up by its restored height
      contentArea.scrollTop -= topbar.offsetHeight
    }
  })
```

- [ ] **Step 2: Run type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/reader.ts
git commit -m "fix: compensate scrollTop on bar toggle to prevent layout shift"
```

---

## Task 5: Reader — remove swipe; add prev/next chapter buttons to bottombar

**Files:**
- Modify: `src/pages/reader.ts`

- [ ] **Step 1: Replace bottombar HTML in the template**

In `mountReader`, find the bottombar div in the template string (the `<div class="topbar" id="reader-bottombar"...>` block) and replace it with:

Old:
```typescript
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
```

New:
```typescript
      <div class="topbar" id="reader-bottombar"
           style="border-top:1px solid var(--border);border-bottom:none;
                  flex-direction:column;gap:6px;padding:10px 16px">
        <div style="display:flex;gap:8px;width:100%">
          <button id="prev-chap-bar-btn"
            style="flex:1;padding:8px;border:1px solid var(--border);border-radius:var(--radius);
                   background:var(--surface);color:var(--text);font-size:13px;font-family:inherit;
                   cursor:pointer">← 上一章</button>
          <button id="next-chap-bar-btn"
            style="flex:1;padding:8px;border:1px solid var(--border);border-radius:var(--radius);
                   background:var(--surface);color:var(--text);font-size:13px;font-family:inherit;
                   cursor:pointer">下一章 →</button>
        </div>
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
```

- [ ] **Step 2: Add element references for the new buttons**

Find the block of `const` element references (after `container.innerHTML = ...`):

```typescript
  const contentArea = container.querySelector<HTMLElement>('#content-area')!
  const chapterTitleEl = container.querySelector<HTMLElement>('#chapter-title')!
  const progressFill = container.querySelector<HTMLElement>('#progress-fill')!
  const progressText = container.querySelector<HTMLElement>('#progress-text')!
  const timeDisplay = container.querySelector<HTMLElement>('#time-display')!
  const topbar = container.querySelector<HTMLElement>('#reader-topbar')!
  const bottombar = container.querySelector<HTMLElement>('#reader-bottombar')!
  const page = container.querySelector<HTMLElement>('#reader-page')!
```

Add two more lines at the end of this block:

```typescript
  const prevChapBarBtn = container.querySelector<HTMLButtonElement>('#prev-chap-bar-btn')!
  const nextChapBarBtn = container.querySelector<HTMLButtonElement>('#next-chap-bar-btn')!
```

- [ ] **Step 3: Remove the swipe handlers**

Find and delete this entire block (around lines 164–179):

```typescript
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
```

- [ ] **Step 4: Add click handlers for the bottombar buttons**

Add these handlers in the `// --- Back ---` section area (they can go after the back-btn handler):

```typescript
  // --- Bottombar chapter nav ---
  prevChapBarBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    renderChapter(currentChapter - 1)
  })
  nextChapBarBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    renderChapter(currentChapter + 1)
  })
```

- [ ] **Step 5: Run type-check and tests**

```bash
npx tsc --noEmit && npm test
```

Expected: 0 type errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/reader.ts
git commit -m "feat: remove swipe navigation, add prev/next chapter buttons to bottombar"
```

---

## Task 6: Reader — per-chapter scroll position save/restore

**Files:**
- Modify: `src/pages/reader.ts`

- [ ] **Step 1: Update `renderChapter` to save and restore per-chapter scroll**

Find the `renderChapter` function. Replace the entire function body with the following (the changes are: add the scroll-save block at the top, and replace the `isFirstRender` / `scrollTop = 0` block at the bottom):

```typescript
  function renderChapter(index: number): void {
    // Save departing chapter's scroll before switching (skip on first render — DOM not yet laid out)
    if (!isFirstRender) {
      if (!book!.chapterScrollPositions) book!.chapterScrollPositions = {}
      book!.chapterScrollPositions[currentChapter] = contentArea.scrollTop
    }

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

    // Restore this chapter's saved scroll position (0 if never visited)
    const savedScroll = book!.chapterScrollPositions?.[currentChapter] ?? 0
    if (isFirstRender) isFirstRender = false
    requestAnimationFrame(() => {
      if (unmounted) return
      contentArea.scrollTop = savedScroll
    })

    chapterTitleEl.textContent = ch.title
    const readChars = ch.offset + ch.length
    const pct = Math.round(readChars / book!.totalChars * 100)
    progressFill.style.width = `${pct}%`
    progressText.textContent = `${pct}%`
    prevChapBarBtn.style.opacity = hasPrev ? '1' : '0.3'
    prevChapBarBtn.style.pointerEvents = hasPrev ? '' : 'none'
    nextChapBarBtn.style.opacity = hasNext ? '1' : '0.3'
    nextChapBarBtn.style.pointerEvents = hasNext ? '' : 'none'
  }
```

- [ ] **Step 2: Update `saveProgress` to also persist `chapterScrollPositions`**

Find the `saveProgress` function and replace it:

```typescript
  async function saveProgress(): Promise<void> {
    book!.currentChapter = currentChapter
    book!.currentScrollY = contentArea.scrollTop
    book!.chapterScrollPositions = book!.chapterScrollPositions ?? {}
    book!.chapterScrollPositions[currentChapter] = contentArea.scrollTop
    book!.readSeconds = timer.elapsed
    book!.lastReadAt = Date.now()
    await storage.saveBook(book!)
  }
```

- [ ] **Step 3: Run type-check and tests**

```bash
npx tsc --noEmit && npm test
```

Expected: 0 type errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/reader.ts
git commit -m "feat: restore per-chapter scroll position on chapter switch"
```

---

## Manual Verification Checklist

After all tasks complete, verify in the browser (`npm run dev`):

**Feature 1 — no layout shift:**
- [ ] Open a book, scroll to the middle of a chapter
- [ ] Tap content to hide bars → text stays in place (no jump)
- [ ] Tap again to show bars → text stays in place

**Feature 2 — TOC auto-scroll:**
- [ ] Read into chapter 10+ of a multi-chapter book
- [ ] Tap ☰ → drawer opens with the current chapter visible and highlighted (bold, accent border)

**Feature 3 — no accidental swipe:**
- [ ] Swipe left/right across the content → chapter does NOT change
- [ ] Tap content to show bars → prev/next buttons appear in bottombar
- [ ] Tap prev/next buttons → chapter changes correctly
- [ ] Buttons are dimmed/disabled when at first/last chapter

**Feature 4 — per-chapter scroll memory:**
- [ ] Read chapter 1, scroll halfway down, switch to chapter 2
- [ ] Switch back to chapter 1 → resumes from halfway point
- [ ] Close the app, reopen same book → chapter 1 still at halfway point

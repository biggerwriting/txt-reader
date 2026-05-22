# Reader UX Improvements Design

**Date:** 2026-05-22  
**Status:** Approved  
**Scope:** 4 targeted UX fixes to the reading page

---

## Problem Statement

Four UX issues in the reader page need fixing:

1. Toggling the top/bottom bars causes the visible text to jump
2. Opening the TOC always shows from chapter 1 instead of the current chapter
3. Left/right swipe accidentally triggers chapter navigation
4. Returning to a previously visited chapter always starts from the top

---

## Feature 1: No Layout Shift on Bar Toggle

### Root Cause

`.topbar.hidden` currently transitions `height` from 52px to 0. Because `#content-area` is `flex:1`, it grows by the same amount. `scrollTop` stays constant but the visual reading position shifts.

### Solution

Remove `height` and `padding` from `.topbar`'s CSS transition (keep only `opacity`). In the click handler, measure the bars' current heights before toggling and compensate `scrollTop` in the same frame.

**`main.css`** — change `.topbar` transition:
```css
.topbar {
  transition: opacity 0.2s;
}
```

**`reader.ts`** — update the click handler:
```javascript
contentArea.addEventListener('click', () => {
  if (barsVisible) {
    // Measure before collapsing (offsetHeight returns 0 after hidden class applied)
    const topH = topbar.offsetHeight
    barsVisible = false
    topbar.classList.add('hidden')
    bottombar.classList.add('hidden')
    // Content-area top edge moves up by topH; compensate so text stays in place
    contentArea.scrollTop += topH
  } else {
    barsVisible = true
    topbar.classList.remove('hidden')
    bottombar.classList.remove('hidden')
    // Height snaps instantly (no height transition); offsetHeight is now full height
    contentArea.scrollTop -= topbar.offsetHeight
  }
})
```

Only topbar height needs compensation: topbar collapse moves the content-area's top edge upward. Bottombar collapse expands the content-area downward, so the top edge (and visible reading position) is unaffected.

The height snap and scrollTop compensation happen in the same frame so the browser renders them together with no visible jump. Opacity fades smoothly.

---

## Feature 2: TOC Scrolls to Current Chapter

### Root Cause

`TocDrawer` is not passed `currentChapter`, so the list always renders from the top.

### Solution

Add `currentChapter: number` to the `TocDrawer` constructor. In `open()`, after appending to DOM, use `scrollIntoView({ block: 'center', behavior: 'instant' })` on the active item and add an `active` CSS class to highlight it.

**`toc.ts`** — constructor signature:
```typescript
constructor(
  private book: Book,
  private currentChapter: number,
  private onSelect: (chapterIndex: number) => void
)
```

**`toc.ts`** — `open()` method:
```javascript
open(): void {
  document.body.appendChild(this.backdrop)
  document.body.appendChild(this.drawer)
  requestAnimationFrame(() => {
    this.backdrop.classList.add('visible')
    this.drawer.classList.add('open')
    const active = this.drawer.querySelector<HTMLElement>(
      `[data-index="${this.currentChapter}"]`
    )
    active?.scrollIntoView({ block: 'center', behavior: 'instant' })
    active?.classList.add('active')
  })
}
```

**`reader.ts`** — pass `currentChapter` when constructing:
```javascript
const toc = new TocDrawer(book!, currentChapter, (index) => renderChapter(index))
```

Add `.book-card.active` style to `main.css`:
```css
.book-card.active {
  font-weight: 600;
  border-left: 3px solid var(--accent);
}
```

---

## Feature 3: Remove Swipe Gesture; Add Prev/Next to Bottombar

### Changes

1. **Delete** the `touchstart` and `touchend` event listeners from `reader.ts`.
2. **Restructure** the bottombar HTML to include a prev/next row above the progress bar:

```html
<div class="topbar" id="reader-bottombar" ...>
  <div style="display:flex;gap:8px;width:100%">
    <button id="prev-chap-bar-btn" style="flex:1;...">← 上一章</button>
    <button id="next-chap-bar-btn" style="flex:1;...">下一章 →</button>
  </div>
  <div style="display:flex;align-items:center;gap:10px">
    <!-- progress bar -->
  </div>
  <div id="time-display">...</div>
</div>
```

3. Bind click handlers for `#prev-chap-bar-btn` and `#next-chap-bar-btn`.
4. Update button `disabled`/`opacity` state in `renderChapter` (same logic as existing end-of-chapter buttons).
5. **Keep** the end-of-chapter prev/next buttons inside the content area (they remain useful UX when the user scrolls to the bottom).

---

## Feature 4: Per-Chapter Scroll Position Memory

### Root Cause

`Book.currentScrollY` stores a single scroll value (for the last active chapter). When the user leaves chapter 1 mid-way, switches to chapter 2, then returns to chapter 1, `isFirstRender` is already false so `scrollTop = 0` is applied.

### Data Model

Add an optional field to `Book`:

```typescript
export interface Book {
  // existing fields ...
  chapterScrollPositions?: Record<number, number>
}
```

The field is optional for backward compatibility with existing IndexedDB records.

### `renderChapter` Logic

```javascript
function renderChapter(index: number): void {
  // Save departing chapter's scroll (skip on first render — DOM not yet laid out)
  if (!isFirstRender) {
    if (!book!.chapterScrollPositions) book!.chapterScrollPositions = {}
    book!.chapterScrollPositions[currentChapter] = contentArea.scrollTop
  }

  currentChapter = Math.max(0, Math.min(index, book!.chapters.length - 1))
  // ... render HTML ...

  const savedScroll = book!.chapterScrollPositions?.[currentChapter] ?? 0
  if (isFirstRender) isFirstRender = false
  requestAnimationFrame(() => {
    if (unmounted) return
    contentArea.scrollTop = savedScroll
  })
}
```

### `saveProgress` Update

```javascript
async function saveProgress(): Promise<void> {
  book!.currentChapter = currentChapter
  book!.currentScrollY = contentArea.scrollTop          // keep for compat
  book!.chapterScrollPositions = book!.chapterScrollPositions ?? {}
  book!.chapterScrollPositions[currentChapter] = contentArea.scrollTop
  book!.readSeconds = timer.elapsed
  book!.lastReadAt = Date.now()
  await storage.saveBook(book!)
}
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/types.ts` | Add `chapterScrollPositions?: Record<number, number>` to `Book` |
| `src/styles/main.css` | `.topbar` transition: remove height/padding, keep opacity; add `.book-card.active` highlight |
| `src/components/toc.ts` | Add `currentChapter` param; `open()` scrolls to active item |
| `src/pages/reader.ts` | Bar-toggle scroll compensation; delete swipe handlers; add bottombar prev/next buttons; per-chapter scroll save/restore |

---

## Out of Scope

- Bookmark functionality (unchanged)
- Settings sheet (unchanged)
- Shelf page (unchanged)
- Any visual redesign beyond the functional changes above

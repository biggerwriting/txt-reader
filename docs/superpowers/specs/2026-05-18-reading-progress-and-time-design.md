# Reading Progress & Time Tracking Design

**Date:** 2026-05-18
**Status:** Approved

---

## Overview

Enhance the txt-reader app with three capabilities:

1. **Progress restoration** — when reopening a book, silently resume from the exact chapter and scroll position where the user left off.
2. **Auto-save progress** — save reading position every 30 seconds to prevent loss on unexpected exit.
3. **Reading time display** — show per-book reading time on each shelf card, and total cumulative time at the top of the shelf page.

---

## Current State

The `Book` data model already has all required fields:

```typescript
currentChapter: number    // chapter index
currentScrollY: number    // scroll offset in content area
readSeconds: number       // cumulative reading seconds
```

`persist()` in `reader.ts` writes these to IndexedDB. `ReadingTimer` accumulates elapsed seconds and has a `format()` method. The shelf shows progress percentage and last-read date per book.

**What's missing:**
- `currentScrollY` is saved but never restored on open
- No periodic auto-save (only saves on back/background)
- `readSeconds` is not displayed anywhere on the shelf

---

## Design

### 1. Progress Restoration (reader.ts)

On first render, after the chapter content is inserted into the DOM, restore the scroll position:

```
isFirstRender branch:
  renderChapter(currentChapter)
  requestAnimationFrame(() => {
    contentArea.scrollTop = book.currentScrollY
    isFirstRender = false
  })
```

Using `requestAnimationFrame` ensures the browser has laid out the content and `scrollHeight` is valid before setting `scrollTop`. Without this, the scroll assignment is a no-op (content height = 0).

No user-visible prompt or toast — restoration is silent.

### 2. Periodic Auto-Save (reader.ts)

Add a 30-second interval that calls the existing `persist()` function:

```typescript
const autoSaveInterval = setInterval(() => {
  if (!unmounted) persist()
}, 30_000)
```

Clear it at every unmount point (back button handler, `visibilitychange` hide branch that already calls `persist()`). The `unmounted` guard prevents a race where the interval fires after navigation.

Existing save triggers (back button, visibility hide) are unchanged.

### 3. Reading Time Display (shelf.ts)

**Per-book card** — add a time span inside `.meta`, after the existing chapter-count span:

```html
<span>已读 3小时25分钟</span>
```

- Use `ReadingTimer.format(b.readSeconds)` for formatting (already handles h/m display).
- Omit the span entirely when `b.readSeconds === 0` (new books show no time entry).

**Shelf header** — add a subtitle line below "我的书架" when the book list is non-empty:

```html
<h1>我的书架</h1>
<div class="shelf-total-time">累计阅读 12小时08分钟</div>
```

- Compute by summing `readSeconds` across all books: `books.reduce((s, b) => s + b.readSeconds, 0)`.
- Hidden (not rendered) when the book list is empty.
- Style: small muted text, same font as existing `.meta` spans.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/reader.ts` | Restore `scrollTop` on first render; add 30s auto-save interval; clear interval on unmount |
| `src/pages/shelf.ts` | Add per-book time span in card `.meta`; add total-time subtitle in topbar |

No schema changes, no new dependencies, no new files.

---

## Out of Scope

- Toast/snackbar on resume (user confirmed: silent restore)
- Sub-minute time precision (user confirmed: h/m only)
- Separate ProgressService abstraction (YAGNI for this codebase size)

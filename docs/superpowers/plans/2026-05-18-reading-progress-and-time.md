# Reading Progress & Time Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore reading scroll position on book open, add 30-second auto-save, and display per-book + total reading time on the shelf page.

**Architecture:** All changes are confined to two existing files — `src/pages/reader.ts` and `src/pages/shelf.ts`. No new files, no schema changes. The `Book` model already has `currentChapter`, `currentScrollY`, and `readSeconds` fields; they just need to be wired up on the read path and displayed on the shelf.

**Tech Stack:** TypeScript, Vitest (test runner), vanilla DOM, IndexedDB via existing `Storage` class, `ReadingTimer.format()` for time display.

---

## File Map

| File | What changes |
|------|-------------|
| `src/pages/reader.ts` | (1) restore `scrollTop` after first render via `requestAnimationFrame`; (2) add 30s auto-save interval; (3) clear interval on unmount |
| `src/pages/shelf.ts` | (4) add per-book reading time span in `.meta`; (5) add total-time subtitle below "我的书架" title |

No new test files needed — changes to `reader.ts` are DOM/timing behavior tested by adjusting existing reader integration patterns; shelf changes are pure rendering logic verified by inspection (no existing shelf unit tests, and the logic is a one-liner reduce).

---

### Task 1: Restore scroll position on first render

**Files:**
- Modify: `src/pages/reader.ts:109-114`

Currently the `isFirstRender` branch (lines 109-114) sets `contentArea.scrollTop = book!.currentScrollY` synchronously, but at that point the browser hasn't laid out the new innerHTML yet so `scrollHeight` is 0 and the assignment is silently ignored. Fix: defer the scroll assignment to the next animation frame.

- [ ] **Step 1: Read the current isFirstRender block**

Open `src/pages/reader.ts` and locate lines 109-114:

```typescript
    if (isFirstRender) {
      contentArea.scrollTop = book!.currentScrollY
      isFirstRender = false
    } else {
      contentArea.scrollTop = 0
    }
```

- [ ] **Step 2: Replace with requestAnimationFrame-deferred scroll**

Replace those lines with:

```typescript
    if (isFirstRender) {
      isFirstRender = false
      requestAnimationFrame(() => {
        contentArea.scrollTop = book!.currentScrollY
      })
    } else {
      contentArea.scrollTop = 0
    }
```

`requestAnimationFrame` fires after the browser has performed layout, so `scrollHeight` is valid and `scrollTop` assignment takes effect.

- [ ] **Step 3: Verify manually**

Run the dev server:

```bash
npm run dev
```

Import a multi-chapter book, scroll partway through a chapter, press the back button (which calls `persist()` and saves `currentScrollY`), then re-open the book. The page should open at the same scroll position, not at the top.

- [ ] **Step 4: Commit**

```bash
git add src/pages/reader.ts
git commit -m "fix: restore scroll position on book reopen using requestAnimationFrame"
```

---

### Task 2: Add 30-second auto-save interval

**Files:**
- Modify: `src/pages/reader.ts`

The `persist()` function already does everything needed (saves chapter, scrollY, readSeconds, lastReadAt). We need to call it on a timer, and clear that timer on unmount to avoid post-navigation saves.

**Important:** The current `persist()` function (lines 132-142) sets `unmounted = true` and removes the visibility listener — it was written as a one-shot "leave" function. We must NOT call it from the auto-save interval as-is, because it tears down event listeners and sets `unmounted` prematurely. Instead, extract a pure "write to storage" helper and use that for both auto-save and final persist.

- [ ] **Step 1: Read persist() and the back-button handler**

Lines 132-174 in `src/pages/reader.ts`:

```typescript
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
  // ...
  container.querySelector('#back-btn')!.addEventListener('click', async () => {
    await persist()
    router.navigate('/shelf')
  })
```

- [ ] **Step 2: Extract saveProgress() and update persist()**

Replace the `persist()` function with two functions:

```typescript
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
```

Note: `autoSaveInterval` is declared in the next step — TypeScript closures allow forward reference here since `persist()` is called after `autoSaveInterval` is assigned.

- [ ] **Step 3: Declare autoSaveInterval and start it**

Add immediately after the `timerInterval` declaration (line 129):

```typescript
  const autoSaveInterval = setInterval(() => {
    if (!unmounted) saveProgress()
  }, 30_000)
```

The `unmounted` guard prevents a save from firing after the user has already navigated away.

- [ ] **Step 4: Update visibility change handler to use saveProgress()**

The `onVisibilityChange` handler (lines 211-219) currently calls `storage.saveBook(...)` directly. Update it to call `saveProgress()` for consistency:

```typescript
  const onVisibilityChange = async () => {
    if (unmounted) return
    if (document.hidden) {
      timer.stop()
      await saveProgress()
    } else {
      timer.start()
    }
  }
```

- [ ] **Step 5: Run existing tests to confirm no regressions**

```bash
npm test
```

Expected: all tests pass. There are no reader unit tests (it's DOM-heavy), but timer and storage tests should still be green.

- [ ] **Step 6: Commit**

```bash
git add src/pages/reader.ts
git commit -m "feat: add 30-second auto-save and extract saveProgress helper"
```

---

### Task 3: Display per-book reading time on shelf cards

**Files:**
- Modify: `src/pages/shelf.ts:1-5` (import), `src/pages/shelf.ts:78-90` (book card template)

`ReadingTimer.format()` is a static method — we just need to import it and call it in the template.

- [ ] **Step 1: Add ReadingTimer import**

At the top of `src/pages/shelf.ts`, add the import after the existing imports:

```typescript
import { ReadingTimer } from '../core/timer'
```

The file currently imports from `'../core/storage'`, `'../core/parser'`, and `'../types'`. Add `ReadingTimer` import after these.

- [ ] **Step 2: Add time span to book card template**

Find the book card `.meta` div in `src/pages/shelf.ts` (lines 81-85):

```typescript
              <div class="meta">
                <span>${b.chapters.length} 章</span>
                <span>进度 ${formatProgress(b)}</span>
                <span>上次 ${formatDate(b.lastReadAt)}</span>
              </div>
```

Replace with:

```typescript
              <div class="meta">
                <span>${b.chapters.length} 章</span>
                <span>进度 ${formatProgress(b)}</span>
                <span>上次 ${formatDate(b.lastReadAt)}</span>
                ${b.readSeconds > 0 ? `<span>已读 ${ReadingTimer.format(b.readSeconds)}</span>` : ''}
              </div>
```

Books with `readSeconds === 0` show nothing (new/unread books).

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Verify visually**

```bash
npm run dev
```

Open a book, read for at least 30 seconds (auto-save fires) or press back. Return to shelf. The book card should now show "已读 1分钟" (or more) in the meta row.

- [ ] **Step 5: Commit**

```bash
git add src/pages/shelf.ts
git commit -m "feat: show per-book reading time on shelf card"
```

---

### Task 4: Display total cumulative reading time in shelf header

**Files:**
- Modify: `src/pages/shelf.ts:62-93` (shelf container template)

- [ ] **Step 1: Compute total read seconds before rendering**

In `src/pages/shelf.ts`, inside the `render()` function, add a total computation after `const books = await storage.listBooks()`:

```typescript
    const totalReadSeconds = books.reduce((sum, b) => sum + b.readSeconds, 0)
```

- [ ] **Step 2: Add subtitle line to topbar**

Find the topbar in the shelf template (lines 64-69):

```typescript
        <div class="topbar">
          <h1>我的书架</h1>
          <label class="icon-btn" title="导入" style="cursor:pointer">
            ＋
            <input type="file" accept=".txt" id="file-input" style="display:none" />
          </label>
        </div>
```

Replace with:

```typescript
        <div class="topbar" style="flex-wrap:wrap;row-gap:0">
          <h1 style="flex:1">我的书架</h1>
          <label class="icon-btn" title="导入" style="cursor:pointer">
            ＋
            <input type="file" accept=".txt" id="file-input" style="display:none" />
          </label>
          ${books.length > 0 ? `
            <div style="width:100%;font-size:12px;color:var(--text-muted);padding:0 0 6px 0">
              累计阅读 ${ReadingTimer.format(totalReadSeconds)}
            </div>
          ` : ''}
        </div>
```

- `flex-wrap:wrap` lets the subtitle span the full topbar width below the title and button.
- Only rendered when `books.length > 0` (empty shelf shows nothing).
- Uses existing CSS variable `--text-muted` to match the style of `.meta` spans.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Verify visually**

```bash
npm run dev
```

The shelf header should now show "累计阅读 X分钟" below "我的书架" when at least one book with `readSeconds > 0` is on the shelf.

- [ ] **Step 5: Commit**

```bash
git add src/pages/shelf.ts
git commit -m "feat: show cumulative reading time in shelf header"
```

---

## Done

All three features are implemented:
1. Scroll position restored silently on book reopen
2. Progress auto-saved every 30 seconds
3. Per-book and total reading time shown on shelf

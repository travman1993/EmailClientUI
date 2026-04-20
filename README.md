# EmailClientUI
UI interface for an email client for Brent Harrington
#TODO for Brent
    1. Drop the folder into your project
    Put the mailflow/ folder anywhere inside his React app's src/ directory.

    2. Install one dependency
    npm install dompurify

    3. Mount the app
    In root main.jsx or App.jsx:
    import EmailClient from "./mailflow/EmailClient.jsx";
    export default function App() { return <EmailClient />; }

    4. Wire up your backend — one file, one object
    Open useMailStore.js, find the api object around line 100. There are 13 functions. Each one has a comment directly above it showing the exact Tauri invoke() call to swap in. Replace the mock body with your real call and your done. Dont touch anything else.

    5. Swap out the account seed data
    Open accounts.js, find ACCOUNTS at the top, and replace the three placeholder accounts with his real user's account info — or just delete them and let the add-account form handle it at runtime.
    That's it. The UI, state, themes, keyboard shortcuts, accessibility, error handling, sanitization, and pagination are all done. His only job is step 4.


# MailFlow — Production-Ready Email Client UI  
## v4.0 — All 8 Production Fixes Applied

---

## File Structure

```
mailflow/
├── EmailClient.jsx      ← Root app. Mount this. Contains all UI components.
├── useMailStore.js      ← Email state + all actions. Swap api.* → invoke().
├── accounts.js          ← Multi-account management + useAccounts() hook
├── accentThemes.js      ← 17 accent palettes + useThemePrefs() hook
├── ThemeSettings.jsx    ← Settings panel (appearance + accounts)
├── sanitize.js          ← [FIX #1] DOMPurify XSS sanitizer for email HTML
├── ErrorBoundary.jsx    ← [FIX #2] Component crash recovery + PaneError
├── VirtualList.jsx      ← [FIX #4] Virtual scrolling for large mailboxes
├── useKeyboard.js       ← [FIX #5] Full keyboard shortcut system
└── useA11y.js           ← [FIX #6] ARIA, focus trap, live region, a11y utils
```

---

## Quick Start

```jsx
// main.jsx
import EmailClient from "./mailflow/EmailClient.jsx";
export default function App() { return <EmailClient />; }
```

Install the one required dependency:
```bash
npm install dompurify
```

---

## Backend Integration (Plug & Play)

Open `useMailStore.js`. Find the `api` object (~line 100). Replace each function body with your Tauri `invoke()` call or REST fetch. **Nothing else changes.**

```js
// BEFORE (mock):
fetchEmails: async (accountId, folder, cursor, limit) => { ... mock data ... }

// AFTER (Tauri):
fetchEmails: async (accountId, folder, cursor, limit) => {
  return await invoke("get_emails", { accountId, folder, cursor, limit });
},

// AFTER (REST):
fetchEmails: async (accountId, folder, cursor, limit) => {
  return await fetch(`/api/emails?account=${accountId}&folder=${folder}&cursor=${cursor}&limit=${limit}`)
    .then(r => r.json());
},
```

### Expected backend response shape for `fetchEmails`:
```json
{
  "emails": [ /* Email[] */ ],
  "nextCursor": "email-id-50",
  "total": 2847
}
```

### All 13 backend channels:
| Function | Tauri command | Purpose |
|---|---|---|
| `fetchEmails(accountId, folder, cursor, limit)` | `get_emails` | Paginated fetch |
| `searchEmails(accountId, query)` | `search_emails` | Full-text search |
| `sendEmail(payload)` | `send_email` | Send with attachments |
| `deleteEmail(id, permanent)` | `delete_email` | Soft/hard delete |
| `restoreEmail(id)` | `restore_email` | Restore from trash |
| `markRead(id, read)` | `mark_read` | Read/unread toggle |
| `markStarred(id, starred)` | `mark_starred` | Star toggle |
| `markFlagged(id, flagged)` | `mark_flagged` | Flag toggle |
| `moveToFolder(id, folder)` | `move_to_folder` | Move email |
| `markAllRead(accountId, folder)` | `mark_all_read` | Bulk read |
| `bulkDelete(ids, permanent)` | `bulk_delete` | Bulk delete |
| `bulkMove(ids, folder)` | `bulk_move` | Bulk move |

---

## Production Fixes Applied

### Fix #1 — XSS Sanitization (`sanitize.js`)
Every email body goes through DOMPurify before rendering. Blocks `<script>`, JS event handlers (`onclick`, `onerror`, etc.), external resource loads (tracking pixels, remote CSS), and unsafe CSS (`expression()`, `url(http://...)`). Only safe HTML formatting tags are allowed. Preview text strips all HTML entirely.

### Fix #2 — Error Boundaries (`ErrorBoundary.jsx`)
`<ErrorBoundary>` wraps the email list, preview pane, and root app. If any component throws (bad data from backend, null field, unexpected shape), it shows a styled recovery UI with a "Try Again" button instead of a white screen. Stack trace shown in development only. Use `withErrorBoundary(Component)` HOC for quick wrapping.

### Fix #3 — Error States (`useMailStore.js`)
Store now has tri-state: `status: "loading" | "success" | "error"`. On fetch failure: `store.hasError = true`, `store.error = { message, retry }`. The email list renders `<PaneError>` with a retry button. Error from one fetch doesn't block the UI — user can switch folders and try again. Race conditions handled with a fetch ID ref so stale responses are ignored.

### Fix #4 — Virtual Scrolling (`VirtualList.jsx`)
For mailboxes over 100 emails, the list switches to `<VirtualList>` which renders only the visible rows + an overscan buffer. Supports fixed-height rows (fast path) and variable-height rows. `<PaginationSentinel>` at the bottom uses `IntersectionObserver` to trigger `loadMore()` when the user scrolls near the end.

### Fix #5 — Keyboard Shortcuts (`useKeyboard.js`)
Full shortcut system wired into the root app:

| Key | Action |
|-----|--------|
| `j` / `↓` | Next email |
| `k` / `↑` | Previous email |
| `Enter` | Open email |
| `Escape` | Close / deselect |
| `e` | Archive |
| `#` | Delete / trash |
| `s` | Star / unstar |
| `u` | Mark unread |
| `r` | Reply |
| `f` | Forward |
| `c` | Compose |
| `/` | Focus search |
| `?` | Show shortcuts overlay |
| `g i` | Go to Inbox |
| `g s` | Go to Sent |
| `g d` | Go to Drafts |
| `g t` | Go to Trash |
| `g !` | Go to Spam |

Shortcuts auto-disable when typing in inputs, when compose/settings is open.

### Fix #6 — Accessibility / WCAG AA (`useA11y.js`)
- All interactive elements have `aria-label` or `aria-labelledby`  
- `<FocusTrap>` locks keyboard focus inside modals and overlays  
- `useLiveRegion()` announces toast messages to screen readers  
- `<SkipToMain>` link for keyboard users (WCAG 2.4.1)  
- `emailItemA11y()` generates correct `role="option"`, `aria-selected`, `aria-setsize`, `aria-posinset`  
- `useFocusVisible()` shows focus rings only for keyboard users, not mouse  
- `injectA11yStyles()` adds `:focus-visible` ring + `prefers-reduced-motion` support  
- Semantic HTML throughout: `<header>`, `<nav>`, `<main>`, `<aside>`, `<article>`, `<dl>`, `<time>`

### Fix #7 — Attachment Upload (ComposeModal in `EmailClient.jsx`)
The 📎 button now opens a hidden `<input type="file" multiple>`. Selected files are shown as removable chips above the toolbar with filename and formatted size. Attachment array is passed through `sendEmail()` payload so the Rust backend receives the file objects/paths.

### Fix #8 — Pagination (`useMailStore.js` + `VirtualList.jsx`)
Cursor-based pagination. Backend returns `{ emails, nextCursor, total }`. Store exposes `loadMore()`, `hasMore`, `loadingMore`. On desktop: `<PaginationSentinel>` triggers `loadMore()` automatically when scrolled near the bottom. On virtual list: `onScrollEnd` prop triggers the same. Page size defaults to 50 — change `PAGE_SIZE` constant at top of `useMailStore.js`.

---

## Accent Color System

17 palettes across 4 groups. Persisted to `localStorage`. Auto-detects OS dark mode.

| Group | Palettes |
|-------|----------|
| Classic | System Blue, Purple, Teal, Hot Pink |
| Vivid | Lime Green, Neon Green, Neon Cyan, Neon Pink, Neon Orange, Electric Blue |
| Warm | Burnt Orange, Candy Red, Amber, Terracotta |
| Muted | Slate, Rose Gold, Sage Green |

Add a custom palette by appending to `ACCENT_PALETTES` in `accentThemes.js`:
```js
{
  id: "my-color", label: "My Color", group: "Vivid", emoji: "🟢",
  light: { main:"#00AA55", hover:"#008844", surface:"rgba(0,170,85,0.09)", glow:"rgba(0,170,85,0.30)" },
  dark:  { main:"#00DD77", hover:"#44FF99", surface:"rgba(0,221,119,0.13)", glow:"rgba(0,221,119,0.38)" },
}
```
/**
 * useMailStore.js  — v4 (production)
 * ─────────────────────────────────────────────────────────────────────────────
 * Central state store for MailFlow.
 *
 * Fixes applied in this version:
 *   #3 — Error states: loading/error/success tri-state, retry support
 *   #8 — Pagination: cursor-based page loading, loadMore(), hasMore flag
 *
 * Replace every `api.*` call with your Tauri invoke() or REST fetch():
 *   api.fetchEmails   → invoke("get_emails",   { accountId, folder, cursor, limit })
 *   api.searchEmails  → invoke("search_emails",{ accountId, query })
 *   api.sendEmail     → invoke("send_email",   { payload })
 *   api.deleteEmail   → invoke("delete_email", { id, permanent })
 *   api.restoreEmail  → invoke("restore_email",{ id })
 *   api.markRead      → invoke("mark_read",    { id, read })
 *   api.markStarred   → invoke("mark_starred", { id, starred })
 *   api.markFlagged   → invoke("mark_flagged", { id, flagged })
 *   api.moveToFolder  → invoke("move_to_folder",{ id, folder })
 *   api.markAllRead   → invoke("mark_all_read",{ accountId, folder })
 *   api.bulkDelete    → invoke("bulk_delete",  { ids, permanent })
 *   api.bulkMove      → invoke("bulk_move",    { ids, folder })
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ─── PAGINATION CONFIG ────────────────────────────────────────────────────────
const PAGE_SIZE = 50; // emails per page — match your backend's default limit

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_EMAILS = [
  {
    id: "1", accountId: "acc-1", folder: "inbox",
    read: false, starred: true, flagged: false,
    from: { name: "Apple Developer", email: "noreply@apple.com" },
    to: [{ name: "Travis Martin", email: "travis@mailflow.app" }],
    cc: [], bcc: [],
    subject: "Your WWDC invitation is here",
    preview: "We're excited to invite you to this year's Worldwide Developers Conference…",
    body: `<p>Dear Developer,</p><p>We're excited to invite you to Apple's <strong>Worldwide Developers Conference</strong> this summer. Join us for a week of inspiring sessions, labs, and conversations with Apple engineers.</p><p>Register now to secure your spot.</p><br/><p>Best,<br/>The Apple Developer Team</p>`,
    date: new Date(Date.now() - 1000 * 60 * 23),
    attachments: [{ name: "WWDC_Schedule.pdf", size: "2.4 MB", type: "pdf" }],
    tags: ["important"], labels: [],
  },
  {
    id: "2", accountId: "acc-1", folder: "inbox",
    read: false, starred: false, flagged: true,
    from: { name: "Travis Martin", email: "travis@inkflowcrm.com" },
    to: [{ name: "Dev Team", email: "dev@inkflowcrm.com" }],
    cc: [], bcc: [],
    subject: "InkFlow v2.1 — Release notes & what's next",
    preview: "Timezone fixes, improved analytics filtering, new appointment card redesign…",
    body: `<p>Hey team,</p><p>Shipping <strong>InkFlow v2.1</strong> tonight. Here's what landed:</p><ul><li>Timezone mismatch fix on stat cards</li><li>Analytics filtering across all time periods</li><li>New appointment card UI in Calendar view</li><li>Settings persist to Supabase</li></ul><p>Next sprint: client portal beta + email notifications.</p><p>— Travis</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 2),
    attachments: [], tags: ["work"], labels: ["inkflow"],
  },
  {
    id: "3", accountId: "acc-1", folder: "inbox",
    read: true, starred: false, flagged: false,
    from: { name: "Vercel", email: "noreply@vercel.com" },
    to: [{ name: "Travis Martin", email: "travis@mailflow.app" }],
    cc: [], bcc: [],
    subject: "Your deployment is live",
    preview: "mailflow-client.vercel.app deployed. Build: 47s, 0 errors, 0 warnings…",
    body: `<p>Your deployment is live! 🚀</p><p><strong>URL:</strong> mailflow-client.vercel.app<br/><strong>Build time:</strong> 47s<br/><strong>Status:</strong> ✅ Ready</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 5),
    attachments: [], tags: [], labels: [],
  },
  {
    id: "4", accountId: "acc-1", folder: "inbox",
    read: true, starred: false, flagged: false,
    from: { name: "Supabase", email: "support@supabase.io" },
    to: [{ name: "Travis Martin", email: "travis@mailflow.app" }],
    cc: [], bcc: [],
    subject: "Weekly usage summary — April 2026",
    preview: "14,200 DB reads, 2,100 writes. Storage: 1.2 GB / 8 GB this week…",
    body: `<p>Here's your weekly summary:</p><ul><li>DB reads: 14,200</li><li>DB writes: 2,100</li><li>Storage: 1.2 GB / 8 GB</li><li>Auth users: 143 (+12 this week)</li></ul>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 24),
    attachments: [], tags: [], labels: [],
  },
  {
    id: "5", accountId: "acc-1", folder: "sent",
    read: true, starred: false, flagged: false,
    from: { name: "Travis Martin", email: "travis@mailflow.app" },
    to: [{ name: "Sarah Chen", email: "sarah@partner.co" }],
    cc: [], bcc: [],
    subject: "Re: Partnership proposal — RedTop Scoopers",
    preview: "Thanks for reaching out! I'd love to explore a partnership…",
    body: `<p>Hi Sarah,</p><p>The terms look good — let's revisit the exclusivity clause. Call Thursday?</p><p>— Travis</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 48),
    attachments: [], tags: [], labels: [],
  },
  {
    id: "6", accountId: "acc-1", folder: "drafts",
    read: true, starred: false, flagged: false,
    from: { name: "Travis Martin", email: "travis@mailflow.app" },
    to: [], cc: [], bcc: [],
    subject: "Q2 revenue report [DRAFT]",
    preview: "Preliminary Q2 breakdown — still need to finalize projections…",
    body: `<p>[DRAFT]</p><p>Q2: InkFlow $4,200 · TipTotal $340 · Consulting $1,800</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 72),
    attachments: [], tags: ["draft"], labels: [],
  },
  {
    id: "7", accountId: "acc-1", folder: "spam",
    read: false, starred: false, flagged: false,
    from: { name: "Promo Bot 9000", email: "deals@spammysite.biz" },
    to: [{ name: "Travis Martin", email: "travis@mailflow.app" }],
    cc: [], bcc: [],
    subject: "🔥 YOU WON $10,000!!!",
    preview: "Congratulations! Our system randomly selected your email as the winner…",
    body: `<p>🎉 YOU WON!!! Click here to claim your $10,000 prize!</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 96),
    attachments: [], tags: ["spam"], labels: [],
  },
  {
    id: "8", accountId: "acc-2", folder: "inbox",
    read: false, starred: true, flagged: false,
    from: { name: "GitHub", email: "noreply@github.com" },
    to: [{ name: "Travis", email: "travis@dev.io" }],
    cc: [], bcc: [],
    subject: "Security alert: new sign-in to your account",
    preview: "A new sign-in from Chrome on macOS was detected on travman1993…",
    body: `<p>Hi Travis,</p><p>New sign-in to <strong>travman1993</strong>. If this wasn't you, secure your account immediately.</p>`,
    date: new Date(Date.now() - 1000 * 60 * 14),
    attachments: [], tags: ["important"], labels: [],
  },
  {
    id: "9", accountId: "acc-2", folder: "inbox",
    read: true, starred: false, flagged: false,
    from: { name: "Netlify", email: "support@netlify.com" },
    to: [{ name: "Travis", email: "travis@dev.io" }],
    cc: [], bcc: [],
    subject: "Build succeeded: tiptotal.com",
    preview: "Your site tiptotal.com deployed successfully. Deploy time: 34s…",
    body: `<p>✅ Build succeeded for <strong>tiptotal.com</strong></p><p>Time: 34s · Functions: 0 · Edge: 0</p>`,
    date: new Date(Date.now() - 1000 * 60 * 60 * 3),
    attachments: [], tags: [], labels: [],
  },
  {
    id: "10", accountId: "acc-3", folder: "inbox",
    read: false, starred: false, flagged: false,
    from: { name: "Google Workspace", email: "workspace-noreply@google.com" },
    to: [{ name: "Travis", email: "travis@redtopscoopers.com" }],
    cc: [], bcc: [],
    subject: "Your Google Workspace trial ends in 3 days",
    preview: "Your 14-day trial for Google Workspace Business Starter ends April 22…",
    body: `<p>Your trial ends <strong>April 22, 2026</strong>. Add a payment method to keep services active.</p>`,
    date: new Date(Date.now() - 1000 * 60 * 45),
    attachments: [], tags: [], labels: [],
  },
];

// ─── MOCK API ─────────────────────────────────────────────────────────────────
// Every function documented with its Tauri invoke() equivalent.
// Pagination shape expected from backend:
//   { emails: Email[], nextCursor: string | null, total: number }

const api = {
  /**
   * Fetch a page of emails.
   * Tauri: return await invoke("get_emails", { accountId, folder, cursor, limit });
   * REST:  return await fetch(`/api/emails?accountId=${accountId}&folder=${folder}&cursor=${cursor}&limit=${limit}`).then(r=>r.json());
   *
   * @returns {{ emails: Email[], nextCursor: string|null, total: number }}
   */
  fetchEmails: async (accountId, folder, cursor = null, limit = PAGE_SIZE) => {
    await delay(220);

    let all = SEED_EMAILS.filter(e => {
      if (e.accountId !== accountId) return false;
      if (folder === "unread")  return !e.read;
      if (folder === "starred") return e.starred;
      if (folder === "flagged") return e.flagged;
      if (folder === "all")     return true;
      return e.folder === folder;
    });

    // Simulate cursor pagination (in production, backend handles this)
    const startIdx   = cursor ? all.findIndex(e => e.id === cursor) + 1 : 0;
    const page       = all.slice(startIdx, startIdx + limit);
    const nextCursor = startIdx + limit < all.length ? all[startIdx + limit - 1]?.id : null;

    return {
      emails:     page,
      nextCursor: nextCursor,
      total:      all.length,
    };
  },

  /**
   * Search emails (no pagination — search results are complete).
   * Tauri: return await invoke("search_emails", { accountId, query });
   */
  searchEmails: async (accountId, query) => {
    await delay(180);
    const q = query.toLowerCase();
    return SEED_EMAILS.filter(e =>
      e.accountId === accountId &&
      [e.subject, e.from.name, e.preview, e.body]
        .some(s => s.toLowerCase().includes(q))
    );
  },

  /**
   * Send an email.
   * Tauri: return await invoke("send_email", { payload });
   */
  sendEmail: async (payload) => {
    await delay(800);
    const sent = {
      id: `sent-${Date.now()}`,
      accountId: payload.accountId,
      folder: "sent",
      read: true, starred: false, flagged: false,
      from: { name: payload.fromName, email: payload.from },
      to: [{ name: payload.to, email: payload.to }],
      cc: [], bcc: [],
      subject: payload.subject,
      preview: payload.body.replace(/<[^>]*>/g, "").slice(0, 100),
      body: payload.body,
      date: new Date(),
      attachments: payload.attachments || [],
      tags: [], labels: [],
    };
    SEED_EMAILS.push(sent);
    return { ok: true, email: sent };
  },

  /** Tauri: await invoke("delete_email", { id, permanent }); */
  deleteEmail: async (id, permanent = false) => {
    await delay(150);
    const idx = SEED_EMAILS.findIndex(e => e.id === id);
    if (idx === -1) return { ok: false, error: "Not found" };
    if (permanent) SEED_EMAILS.splice(idx, 1);
    else SEED_EMAILS[idx].folder = "trash";
    return { ok: true };
  },

  /** Tauri: await invoke("restore_email", { id }); */
  restoreEmail: async (id) => {
    await delay(150);
    const e = SEED_EMAILS.find(e => e.id === id);
    if (e) e.folder = "inbox";
    return { ok: true };
  },

  /** Tauri: await invoke("mark_read", { id, read }); */
  markRead: async (id, read) => {
    await delay(80);
    const e = SEED_EMAILS.find(e => e.id === id);
    if (e) e.read = read;
    return { ok: true };
  },

  /** Tauri: await invoke("mark_starred", { id, starred }); */
  markStarred: async (id, starred) => {
    await delay(80);
    const e = SEED_EMAILS.find(e => e.id === id);
    if (e) e.starred = starred;
    return { ok: true };
  },

  /** Tauri: await invoke("mark_flagged", { id, flagged }); */
  markFlagged: async (id, flagged) => {
    await delay(80);
    const e = SEED_EMAILS.find(e => e.id === id);
    if (e) e.flagged = flagged;
    return { ok: true };
  },

  /** Tauri: await invoke("move_to_folder", { id, folder }); */
  moveToFolder: async (id, folder) => {
    await delay(100);
    const e = SEED_EMAILS.find(e => e.id === id);
    if (e) e.folder = folder;
    return { ok: true };
  },

  /** Tauri: await invoke("mark_all_read", { accountId, folder }); */
  markAllRead: async (accountId, folder) => {
    await delay(200);
    SEED_EMAILS
      .filter(e => e.accountId === accountId && e.folder === folder)
      .forEach(e => (e.read = true));
    return { ok: true };
  },

  /** Tauri: await invoke("bulk_delete", { ids, permanent }); */
  bulkDelete: async (ids, permanent = false) => {
    await delay(200);
    ids.forEach(id => {
      const idx = SEED_EMAILS.findIndex(e => e.id === id);
      if (idx !== -1) {
        if (permanent) SEED_EMAILS.splice(idx, 1);
        else SEED_EMAILS[idx].folder = "trash";
      }
    });
    return { ok: true };
  },

  /** Tauri: await invoke("bulk_move", { ids, folder }); */
  bulkMove: async (ids, folder) => {
    await delay(200);
    ids.forEach(id => {
      const e = SEED_EMAILS.find(e => e.id === id);
      if (e) e.folder = folder;
    });
    return { ok: true };
  },
};

const delay = ms => new Promise(r => setTimeout(r, ms));

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useMailStore(accountId, folder) {
  // ── State ─────────────────────────────────────────────────────────────────

  const [emails,     setEmails]     = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [checked,    setChecked]    = useState(new Set());

  // Fix #3 — tri-state: "idle" | "loading" | "loadingMore" | "success" | "error"
  const [status,     setStatus]     = useState("idle");
  const [error,      setError]      = useState(null);   // { message, code? }

  // Fix #8 — pagination
  const [cursor,     setCursor]     = useState(null);   // next page cursor from backend
  const [hasMore,    setHasMore]    = useState(false);  // are there more pages?
  const [total,      setTotal]      = useState(0);      // total count from backend
  const [loadingMore,setLoadingMore]= useState(false);

  const [lastSync,   setLastSync]   = useState(null);

  // Prevent race conditions when folder/account switches mid-fetch
  const fetchIdRef = useRef(0);

  // ── Fix #3: Load with error handling ─────────────────────────────────────

  const reload = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;

    setStatus("loading");
    setError(null);
    setEmails([]);
    setCursor(null);
    setHasMore(false);
    setChecked(new Set());
    setSelected(null);

    try {
      const result = await api.fetchEmails(accountId, folder, null, PAGE_SIZE);

      // Stale check — ignore if folder/account switched while fetching
      if (fetchId !== fetchIdRef.current) return;

      setEmails(result.emails);
      setCursor(result.nextCursor);
      setHasMore(result.nextCursor !== null);
      setTotal(result.total ?? result.emails.length);
      setStatus("success");
      setLastSync(new Date());
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;

      console.error("[useMailStore] fetchEmails failed:", err);
      setStatus("error");
      setError({
        message: err?.message || "Failed to load messages. Check your connection and try again.",
        code:    err?.code    || null,
        // Pass this back to PaneError for the retry button
        retry:   () => reload(),
      });
    }
  }, [accountId, folder]);

  useEffect(() => { reload(); }, [reload]);

  // ── Fix #8: Load more (pagination) ───────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || status === "loading") return;

    setLoadingMore(true);
    try {
      const result = await api.fetchEmails(accountId, folder, cursor, PAGE_SIZE);
      setEmails(prev => [...prev, ...result.emails]);
      setCursor(result.nextCursor);
      setHasMore(result.nextCursor !== null);
    } catch (err) {
      console.error("[useMailStore] loadMore failed:", err);
      // Non-fatal — user can scroll back and try again; don't replace main error state
    } finally {
      setLoadingMore(false);
    }
  }, [accountId, folder, cursor, hasMore, loadingMore, status]);

  // ── Individual actions ────────────────────────────────────────────────────

  const markRead = useCallback(async (id, read = true) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, read } : e));
    await api.markRead(id, read);
  }, []);

  const toggleStar = useCallback(async (id) => {
    setEmails(prev => prev.map(e => {
      if (e.id !== id) return e;
      api.markStarred(id, !e.starred);
      return { ...e, starred: !e.starred };
    }));
  }, []);

  const toggleFlag = useCallback(async (id) => {
    setEmails(prev => prev.map(e => {
      if (e.id !== id) return e;
      api.markFlagged(id, !e.flagged);
      return { ...e, flagged: !e.flagged };
    }));
  }, []);

  /**
   * Delete email.
   *   • In trash  → permanent delete
   *   • Elsewhere → soft delete (move to trash)
   * Returns deleted email object for undo support.
   */
  const deleteEmail = useCallback(async (id) => {
    const target = emails.find(e => e.id === id);
    if (!target) return null;
    const permanent = folder === "trash";
    setEmails(prev => prev.filter(e => e.id !== id));
    if (selected?.id === id) setSelected(null);
    await api.deleteEmail(id, permanent);
    return target;
  }, [emails, selected, folder]);

  const restoreEmail = useCallback(async (id) => {
    setEmails(prev => prev.filter(e => e.id !== id));
    if (selected?.id === id) setSelected(null);
    await api.restoreEmail(id);
  }, [selected]);

  const moveToFolder = useCallback(async (id, targetFolder) => {
    setEmails(prev => prev.filter(e => e.id !== id));
    if (selected?.id === id) setSelected(null);
    await api.moveToFolder(id, targetFolder);
  }, [selected]);

  const archiveEmail = useCallback(async (id) => {
    return moveToFolder(id, "archive");
  }, [moveToFolder]);

  const markAllRead = useCallback(async () => {
    setEmails(prev => prev.map(e => ({ ...e, read: true })));
    await api.markAllRead(accountId, folder);
  }, [accountId, folder]);

  // ── Bulk actions ──────────────────────────────────────────────────────────

  const toggleCheck = useCallback((id) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleCheckAll = useCallback(() => {
    setChecked(prev =>
      prev.size === emails.length ? new Set() : new Set(emails.map(e => e.id))
    );
  }, [emails]);

  const clearChecked = useCallback(() => setChecked(new Set()), []);

  const bulkDelete = useCallback(async () => {
    const ids       = [...checked];
    const permanent = folder === "trash";
    setEmails(prev => prev.filter(e => !checked.has(e.id)));
    if (selected && checked.has(selected.id)) setSelected(null);
    setChecked(new Set());
    await api.bulkDelete(ids, permanent);
    return ids.length;
  }, [checked, folder, selected]);

  const bulkMove = useCallback(async (targetFolder) => {
    const ids = [...checked];
    setEmails(prev => prev.filter(e => !checked.has(e.id)));
    if (selected && checked.has(selected.id)) setSelected(null);
    setChecked(new Set());
    await api.bulkMove(ids, targetFolder);
    return ids.length;
  }, [checked, selected]);

  const bulkMarkRead = useCallback(async (read = true) => {
    const ids = [...checked];
    setEmails(prev => prev.map(e => checked.has(e.id) ? { ...e, read } : e));
    setChecked(new Set());
    await Promise.all(ids.map(id => api.markRead(id, read)));
  }, [checked]);

  // ── Select ────────────────────────────────────────────────────────────────

  const selectEmail = useCallback(async (email) => {
    setSelected(email);
    if (email && !email.read) {
      markRead(email.id, true);
    }
  }, [markRead]);

  // ── Search ────────────────────────────────────────────────────────────────

  const search = useCallback(async (query) => {
    if (!query.trim()) { reload(); return; }
    setStatus("loading");
    setError(null);
    try {
      const results = await api.searchEmails(accountId, query);
      setEmails(results);
      setHasMore(false);      // search results are not paginated
      setCursor(null);
      setTotal(results.length);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError({
        message: "Search failed. Please try again.",
        retry:   () => search(query),
      });
    }
  }, [accountId, reload]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const sendEmail = useCallback(async (payload) => {
    return api.sendEmail({ ...payload, accountId });
  }, [accountId]);

  // ── Computed ──────────────────────────────────────────────────────────────

  const loading      = status === "loading";
  const hasError     = status === "error";
  const unreadCount  = emails.filter(e => !e.read).length;
  const allChecked   = checked.size > 0 && checked.size === emails.length;

  return {
    // Data
    emails, selected, checked, lastSync,
    total, hasMore, loadingMore,
    unreadCount, allChecked,

    // Status (Fix #3)
    status,        // "idle" | "loading" | "success" | "error"
    loading,       // convenience boolean
    hasError,      // convenience boolean
    error,         // { message, code, retry } | null

    // Core actions
    reload,
    loadMore,      // Fix #8 — call when user scrolls to bottom
    selectEmail,
    markRead,
    toggleStar,
    toggleFlag,
    deleteEmail,
    restoreEmail,
    moveToFolder,
    archiveEmail,
    markAllRead,
    sendEmail,

    // Bulk
    toggleCheck, toggleCheckAll, clearChecked,
    bulkDelete, bulkMove, bulkMarkRead,

    // Search
    search,
  };
}
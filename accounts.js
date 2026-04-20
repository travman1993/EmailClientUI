/**
 * accounts.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-account management for MailFlow.
 *
 * Provides:
 *  - ACCOUNTS seed data (replace with Rust backend calls)
 *  - useAccounts() hook for switching, adding, removing accounts
 *  - getFolderCounts() for unread badges per folder per account
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useEffect } from "react";

// ─── ACCOUNT DEFINITIONS ──────────────────────────────────────────────────────
// In production, load from: await invoke("get_accounts")
// Each account maps to a separate IMAP/SMTP channel on the Rust side.

export const ACCOUNTS = [];

// Unified "All Inboxes" virtual account
export const ALL_ACCOUNTS_ID = "all";
export const ALL_ACCOUNTS = {
  id: ALL_ACCOUNTS_ID,
  label: "All Inboxes",
  name: "All Accounts",
  email: null,
  provider: "virtual",
  color: "#AF52DE",
  avatarInitials: "All",
  folders: [
    { id: "inbox",   label: "Inbox",   icon: "✉️", system: true },
    { id: "unread",  label: "Unread",  icon: "●",  system: false },
    { id: "starred", label: "Starred", icon: "★",  system: false },
    { id: "flagged", label: "Flagged", icon: "🚩", system: false },
    { id: "sent",    label: "Sent",    icon: "↗️", system: true },
    { id: "trash",   label: "Trash",   icon: "🗑️", system: true },
  ],
  connected: true,
};

// ─── SMART FOLDERS (always shown in sidebar regardless of account) ────────────
export const SMART_FOLDERS = [
  { id: "unread",  label: "Unread",  icon: "●"  },
  { id: "starred", label: "Starred", icon: "★"  },
  { id: "flagged", label: "Flagged", icon: "🚩" },
];

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useAccounts() {
  // Persisted to localStorage so selection survives refresh
  const [activeAccountId, setActiveAccountId] = useState(() => {
    try { return localStorage.getItem("mf_active_account") || null; }
    catch { return "acc-1"; }
  });

  const [accounts, setAccounts] = useState(ACCOUNTS);

  const activeAccount = accounts.find(a => a.id === activeAccountId) || null;

  const switchAccount = useCallback((id) => {
    setActiveAccountId(id);
    try { localStorage.setItem("mf_active_account", id); } catch {}
  }, []);

  /**
   * Add a new account.
   * In production: await invoke("add_account", { config }) first,
   * then push the returned account object here.
   */
  const addAccount = useCallback((accountConfig) => {
    const newAccount = {
      id: `acc-${Date.now()}`,
      connected: false,
      folders: [
        { id:"inbox",  label:"Inbox",  icon:"✉️", system:true },
        { id:"sent",   label:"Sent",   icon:"↗️", system:true },
        { id:"drafts", label:"Drafts", icon:"📝", system:true },
        { id:"spam",   label:"Spam",   icon:"🚫", system:true },
        { id:"trash",  label:"Trash",  icon:"🗑️", system:true },
      ],
      storage: { used: 0, total: 15, unit: "GB" },
      ...accountConfig,
    };
    setAccounts(prev => [...prev, newAccount]);
    return newAccount;
  }, []);

  /**
   * Remove an account and switch away if it was active.
   * In production: await invoke("remove_account", { id }) first.
   */
  const removeAccount = useCallback((id) => {
    setAccounts(prev => {
      const remaining = prev.filter(a => a.id !== id);
      if (activeAccountId === id && remaining.length > 0) {
        switchAccount(remaining[0].id);
      }
      return remaining;
    });
  }, [activeAccountId, switchAccount]);

  /** Update account metadata (name, signature, etc.) */
  const updateAccount = useCallback((id, patch) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  }, []);

  /**
   * Get unread badge counts for all folders across all accounts.
   * Shape: { "acc-1": { inbox: 3, spam: 1 }, "acc-2": { inbox: 1 } }
   * In production replace with: await invoke("get_unread_counts")
   */
  const getUnreadCounts = useCallback((allEmails) => {
    const counts = {};
    for (const acc of accounts) {
      counts[acc.id] = {};
      const accEmails = allEmails.filter(e => e.accountId === acc.id && !e.read);
      for (const f of acc.folders) {
        counts[acc.id][f.id] = accEmails.filter(e => e.folder === f.id).length;
      }
    }
    return counts;
  }, [accounts]);

  /** Total unread across all accounts */
  const totalUnread = useCallback((allEmails) => {
    return allEmails.filter(e => !e.read).length;
  }, []);

  return {
    accounts,
    activeAccount,
    activeAccountId,
    switchAccount,
    addAccount,
    removeAccount,
    updateAccount,
    getUnreadCounts,
    totalUnread,
  };
}

// ─── ACCOUNT AVATAR COMPONENT ─────────────────────────────────────────────────
// Exported so sidebar and topbar can both use it without importing React context.

export function accountInitials(name) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export function accountAvatarStyle(account, size = 28) {
  return {
    width: size,
    height: size,
    borderRadius: "50%",
    background: account.color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: size * 0.36,
    fontWeight: 700,
    letterSpacing: "-0.3px",
    flexShrink: 0,
    userSelect: "none",
    cursor: "pointer",
    transition: "transform .14s ease, box-shadow .14s ease",
  };
}
/**
 * useKeyboard.js  — Fix #5: Keyboard Shortcuts
 * ─────────────────────────────────────────────────────────────────────────────
 * Full keyboard navigation for MailFlow — power user shortcuts matching
 * Gmail and Apple Mail conventions.
 *
 * Usage:
 *   const { focusedIndex } = useKeyboard({
 *     emails,
 *     selected,
 *     onSelect,
 *     onDelete,
 *     onReply,
 *     onForward,
 *     onCompose,
 *     onToggleStar,
 *     onToggleRead,
 *     onSearch,
 *     onNextFolder,
 *     enabled,        // set false when compose/settings modal is open
 *   });
 *
 * Shortcuts:
 *   Navigation:
 *     j / ↓       Next email
 *     k / ↑       Previous email
 *     Enter       Open selected email
 *     Escape      Deselect / close preview / close modal
 *
 *   Actions (require an email to be focused):
 *     e           Archive
 *     #           Move to trash
 *     s           Toggle star
 *     u           Mark as unread
 *     r           Reply
 *     f           Forward
 *
 *   Global:
 *     c           Compose new email
 *     /           Focus search bar
 *     ?           Show keyboard shortcut help overlay
 *     g i         Go to Inbox
 *     g s         Go to Sent
 *     g d         Go to Drafts
 *     g t         Go to Trash
 *     g !         Go to Spam
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import { useState, useEffect, useCallback, useRef } from "react";

// ─── SHORTCUT DEFINITIONS ─────────────────────────────────────────────────────
// For display in the help overlay (useKeyboard returns this)

export const SHORTCUT_GROUPS = [
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["j", "↓"],     description: "Next email"         },
      { keys: ["k", "↑"],     description: "Previous email"     },
      { keys: ["Enter"],       description: "Open email"         },
      { keys: ["Escape"],      description: "Close / Deselect"   },
    ],
  },
  {
    label: "Email Actions",
    shortcuts: [
      { keys: ["e"],           description: "Archive"            },
      { keys: ["#"],           description: "Delete / Trash"     },
      { keys: ["s"],           description: "Star / Unstar"      },
      { keys: ["u"],           description: "Mark as unread"     },
      { keys: ["r"],           description: "Reply"              },
      { keys: ["f"],           description: "Forward"            },
    ],
  },
  {
    label: "Global",
    shortcuts: [
      { keys: ["c"],           description: "Compose new email"  },
      { keys: ["/"],           description: "Search"             },
      { keys: ["?"],           description: "Show shortcuts"     },
      { keys: ["g", "i"],      description: "Go to Inbox"        },
      { keys: ["g", "s"],      description: "Go to Sent"         },
      { keys: ["g", "d"],      description: "Go to Drafts"       },
      { keys: ["g", "t"],      description: "Go to Trash"        },
      { keys: ["g", "!"],      description: "Go to Spam"         },
    ],
  },
];

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useKeyboard({
  emails        = [],
  selected      = null,
  onSelect,
  onDelete,
  onArchive,
  onReply,
  onForward,
  onCompose,
  onToggleStar,
  onToggleRead,
  onSearch,         // () => focusSearchInput
  onFolderSelect,   // (folderId: string) => void
  onClose,          // close preview / modal (Escape)
  enabled = true,
}) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showHelp,     setShowHelp]     = useState(false);
  const pendingGRef = useRef(false);   // tracks "g" prefix for go-to shortcuts
  const gTimeoutRef = useRef(null);    // resets g-prefix after 1s

  // Keep focusedIndex in sync when emails list changes
  useEffect(() => {
    if (selected && emails.length > 0) {
      const idx = emails.findIndex(e => e.id === selected.id);
      if (idx !== -1) setFocusedIndex(idx);
    }
  }, [emails, selected]);

  const navigate = useCallback((direction) => {
    setFocusedIndex(prev => {
      let next;
      if (prev === -1) {
        next = direction === "down" ? 0 : emails.length - 1;
      } else {
        next = direction === "down"
          ? Math.min(emails.length - 1, prev + 1)
          : Math.max(0, prev - 1);
      }
      if (emails[next] && onSelect) {
        onSelect(emails[next]);
      }
      return next;
    });
  }, [emails, onSelect]);

  const focusedEmail = focusedIndex >= 0 ? emails[focusedIndex] : selected;

  const handleKeyDown = useCallback((e) => {
    if (!enabled) return;

    // Ignore shortcuts when typing in inputs / textareas
    const tag = (e.target?.tagName || "").toLowerCase();
    const editable = e.target?.isContentEditable;
    if (["input", "textarea", "select"].includes(tag) || editable) {
      // Only allow Escape to bubble through
      if (e.key !== "Escape") return;
    }

    // ── g-prefix navigation ────────────────────────────────────────────────
    if (pendingGRef.current) {
      clearTimeout(gTimeoutRef.current);
      pendingGRef.current = false;
      const goMap = {
        "i": "inbox",
        "s": "sent",
        "d": "drafts",
        "t": "trash",
        "!": "spam",
        "a": "archive",
      };
      if (goMap[e.key] && onFolderSelect) {
        onFolderSelect(goMap[e.key]);
        e.preventDefault();
        return;
      }
    }

    switch (e.key) {
      // ── Navigation ──────────────────────────────────────────────────────
      case "j":
      case "ArrowDown":
        e.preventDefault();
        navigate("down");
        break;

      case "k":
      case "ArrowUp":
        e.preventDefault();
        navigate("up");
        break;

      case "Enter":
        if (focusedEmail && onSelect) {
          onSelect(focusedEmail);
          e.preventDefault();
        }
        break;

      case "Escape":
        if (showHelp) {
          setShowHelp(false);
        } else if (onClose) {
          onClose();
        }
        e.preventDefault();
        break;

      // ── Actions ─────────────────────────────────────────────────────────
      case "e":
        if (focusedEmail && onArchive) {
          onArchive(focusedEmail.id);
          e.preventDefault();
        }
        break;

      case "#":
        if (focusedEmail && onDelete) {
          onDelete(focusedEmail.id);
          e.preventDefault();
        }
        break;

      case "s":
        if (focusedEmail && onToggleStar) {
          onToggleStar(focusedEmail.id);
          e.preventDefault();
        }
        break;

      case "u":
        if (focusedEmail && onToggleRead) {
          onToggleRead(focusedEmail.id, !focusedEmail.read);
          e.preventDefault();
        }
        break;

      case "r":
        if (focusedEmail && onReply) {
          onReply(focusedEmail);
          e.preventDefault();
        }
        break;

      case "f":
        if (focusedEmail && onForward) {
          onForward(focusedEmail);
          e.preventDefault();
        }
        break;

      // ── Global ──────────────────────────────────────────────────────────
      case "c":
        if (onCompose) {
          onCompose();
          e.preventDefault();
        }
        break;

      case "/":
        if (onSearch) {
          onSearch();
          e.preventDefault();
        }
        break;

      case "?":
        setShowHelp(p => !p);
        e.preventDefault();
        break;

      case "g":
        // Start g-prefix sequence
        pendingGRef.current = true;
        gTimeoutRef.current = setTimeout(() => {
          pendingGRef.current = false;
        }, 1000);
        e.preventDefault();
        break;

      default:
        break;
    }
  }, [
    enabled, navigate, focusedEmail, showHelp,
    onSelect, onClose, onArchive, onDelete, onToggleStar,
    onToggleRead, onReply, onForward, onCompose, onSearch,
    onFolderSelect,
  ]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(gTimeoutRef.current);
    };
  }, [enabled, handleKeyDown]);

  return {
    focusedIndex,
    setFocusedIndex,
    showHelp,
    setShowHelp,
  };
}

// ─── KEYBOARD HELP OVERLAY ────────────────────────────────────────────────────

export function KeyboardHelpOverlay({ onClose, t }) {
  const clr = {
    bg:      t?.surfaceSolid || "#ffffff",
    text:    t?.text         || "#1c1c1e",
    sub:     t?.textSub      || "#636366",
    muted:   t?.textMuted    || "#aeaeb2",
    border:  t?.border       || "rgba(0,0,0,0.08)",
    shadow:  t?.shadowLg     || "0 24px 72px rgba(0,0,0,0.14)",
    accent:  t?.accent       || "#007AFF",
    hover:   t?.surfaceHover || "rgba(0,0,0,0.045)",
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 900,
        background: "rgba(0,0,0,0.35)",
        animation: "fadeIn .18s ease",
      }} />

      {/* Panel */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 910,
        background: clr.bg,
        borderRadius: 16,
        border: `1px solid ${clr.border}`,
        boxShadow: clr.shadow,
        padding: "24px",
        width: 440,
        maxWidth: "90vw",
        maxHeight: "80vh",
        overflowY: "auto",
        animation: "scaleUp .22s cubic-bezier(.34,1.26,.64,1)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: clr.text }}>
              ⌨️ Keyboard Shortcuts
            </div>
            <div style={{ fontSize: 12, color: clr.muted, marginTop: 2 }}>
              Press <KBD t={t}>?</KBD> to toggle this overlay
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: clr.muted, fontSize: 20, lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Shortcut groups */}
        {SHORTCUT_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".8px",
              textTransform: "uppercase",
              color: clr.muted,
              marginBottom: 8,
            }}>
              {group.label}
            </div>
            <div style={{
              background: clr.hover,
              borderRadius: 10,
              overflow: "hidden",
              border: `1px solid ${clr.border}`,
            }}>
              {group.shortcuts.map((sc, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 14px",
                  borderBottom: i < group.shortcuts.length - 1
                    ? `1px solid ${clr.border}`
                    : "none",
                }}>
                  <span style={{ fontSize: 13, color: clr.text }}>
                    {sc.description}
                  </span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {sc.keys.map((key, ki) => (
                      <span key={ki} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {ki > 0 && ki < sc.keys.length && (
                          <span style={{ fontSize: 10, color: clr.muted }}>then</span>
                        )}
                        <KBD t={t}>{key}</KBD>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ fontSize: 11, color: clr.muted, textAlign: "center", marginTop: 4 }}>
          Shortcuts are disabled when typing in input fields
        </div>
      </div>
    </>
  );
}

// ─── KEYBOARD KEY BADGE ───────────────────────────────────────────────────────

export function KBD({ children, t }) {
  return (
    <kbd style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 22,
      height: 22,
      padding: "0 6px",
      background: t?.surfaceSolid || "#ffffff",
      border: `1px solid ${t?.borderStrong || "rgba(0,0,0,0.14)"}`,
      borderRadius: 5,
      boxShadow: "0 1px 0 rgba(0,0,0,0.12)",
      fontSize: 11,
      fontWeight: 600,
      fontFamily: "monospace",
      color: t?.text || "#1c1c1e",
      letterSpacing: 0,
    }}>
      {children}
    </kbd>
  );
}
/**
 * useA11y.js  — Fix #6: Accessibility (WCAG AA)
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides:
 *   useA11y()           — hook for focus trap, live region, skip-to-main
 *   a11yProps()         — generates correct ARIA attributes for email rows
 *   FocusTrap           — wraps modals/overlays to trap keyboard focus inside
 *   ScreenReaderOnly    — visually hidden but readable by screen readers
 *   LiveRegion          — announces dynamic changes (new mail, actions)
 *   SkipToMain          — "skip to main content" link (WCAG 2.4.1)
 *   useFocusVisible     — shows focus rings only for keyboard users
 *
 * WCAG AA compliance targets:
 *   1.4.3  Contrast ratio ≥ 4.5:1 for normal text
 *   2.1.1  All functionality keyboard accessible
 *   2.4.1  Skip navigation link
 *   2.4.3  Focus order logical
 *   2.4.7  Focus visible
 *   4.1.2  Name, Role, Value for UI components
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import { useEffect, useRef, useCallback, useState } from "react";

// ─── ARIA PROPS GENERATORS ────────────────────────────────────────────────────

/**
 * Generate ARIA props for an email list item.
 * Attach these as spread props: <div {...emailItemA11y(email, isSelected)} />
 */
export function emailItemA11y(email, isSelected, index, total) {
  return {
    role:            "option",
    "aria-selected": isSelected,
    "aria-label":    buildEmailAriaLabel(email),
    "aria-setsize":  total,
    "aria-posinset": index + 1,
    tabIndex:        isSelected ? 0 : -1,
  };
}

function buildEmailAriaLabel(email) {
  const parts = [];
  if (!email.read) parts.push("Unread");
  if (email.starred) parts.push("Starred");
  if (email.flagged) parts.push("Flagged");
  parts.push(`From ${email.from?.name || email.from?.email || "unknown"}`);
  parts.push(`Subject: ${email.subject || "No subject"}`);
  if (email.attachments?.length > 0) {
    parts.push(`${email.attachments.length} attachment${email.attachments.length > 1 ? "s" : ""}`);
  }
  const d = email.date;
  if (d) {
    parts.push(d.toLocaleDateString([], { weekday:"long", month:"long", day:"numeric" }));
  }
  return parts.join(". ");
}

/**
 * Generate ARIA props for the email list container.
 */
export function emailListA11y(folderLabel, emailCount) {
  return {
    role:            "listbox",
    "aria-label":    `${folderLabel} — ${emailCount} message${emailCount !== 1 ? "s" : ""}`,
    "aria-multiselectable": true,
  };
}

/**
 * Generate ARIA props for action buttons.
 */
export function actionBtnA11y(label, pressed = undefined) {
  const props = { "aria-label": label };
  if (pressed !== undefined) props["aria-pressed"] = pressed;
  return props;
}

// ─── FOCUS TRAP ───────────────────────────────────────────────────────────────

/**
 * FocusTrap component.
 * Traps keyboard focus inside modals and overlays.
 * When the user reaches the last focusable element and presses Tab,
 * focus wraps back to the first (and vice versa with Shift+Tab).
 *
 * Props:
 *   active   boolean — enable/disable trap
 *   children React nodes
 *   onEscape () => void — called when Escape is pressed
 */
export function FocusTrap({ active = true, onEscape, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    const FOCUSABLE = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(", ");

    const getFocusable = () =>
      Array.from(ref.current?.querySelectorAll(FOCUSABLE) || []);

    // Auto-focus first focusable element
    const first = getFocusable()[0];
    if (first) {
      requestAnimationFrame(() => first.focus());
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onEscape) {
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          lastEl.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastEl) {
          firstEl.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [active, onEscape]);

  return (
    <div ref={ref} style={{ display: "contents" }}>
      {children}
    </div>
  );
}

// ─── SCREEN READER ONLY ───────────────────────────────────────────────────────

/**
 * Renders children visually hidden but announced by screen readers.
 * Use for supplemental context that doesn't need to be visible.
 *
 * Example:
 *   <ScreenReaderOnly>3 unread messages in Inbox</ScreenReaderOnly>
 */
export function ScreenReaderOnly({ children, as: Tag = "span" }) {
  return (
    <Tag style={{
      position: "absolute",
      width: 1,
      height: 1,
      padding: 0,
      margin: -1,
      overflow: "hidden",
      clip: "rect(0,0,0,0)",
      whiteSpace: "nowrap",
      border: 0,
    }}>
      {children}
    </Tag>
  );
}

// ─── LIVE REGION ──────────────────────────────────────────────────────────────

/**
 * LiveRegion — ARIA live region for announcing dynamic changes.
 * Screen readers announce changes to this element automatically.
 *
 * Usage:
 *   const { announce } = useLiveRegion();
 *   announce("Message moved to Trash");
 *   announce("3 new messages", "assertive");
 */
export function useLiveRegion() {
  const politeRef   = useRef(null);
  const assertRef   = useRef(null);

  // Mount hidden live regions into the DOM once
  useEffect(() => {
    const createRegion = (politeness) => {
      const el = document.createElement("div");
      el.setAttribute("aria-live", politeness);
      el.setAttribute("aria-atomic", "true");
      el.setAttribute("role", "status");
      Object.assign(el.style, {
        position: "absolute", width: "1px", height: "1px",
        padding: "0", margin: "-1px", overflow: "hidden",
        clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: "0",
      });
      document.body.appendChild(el);
      return el;
    };

    politeRef.current   = createRegion("polite");
    assertRef.current   = createRegion("assertive");

    return () => {
      politeRef.current?.remove();
      assertRef.current?.remove();
    };
  }, []);

  const announce = useCallback((message, politeness = "polite") => {
    const el = politeness === "assertive" ? assertRef.current : politeRef.current;
    if (!el) return;
    // Clear then set — forces screen reader to re-announce even same message
    el.textContent = "";
    requestAnimationFrame(() => {
      el.textContent = message;
    });
  }, []);

  return { announce };
}

// ─── SKIP TO MAIN ─────────────────────────────────────────────────────────────

/**
 * SkipToMain — "Skip to main content" link visible only on focus.
 * Required for WCAG 2.4.1. Put this as the VERY FIRST child of your root div.
 *
 * The target element should have id="mailflow-main":
 *   <div id="mailflow-main" tabIndex={-1}>...</div>
 */
export function SkipToMain({ t }) {
  return (
    <a
      href="#mailflow-main"
      style={{
        position: "absolute",
        top: -60,
        left: 0,
        zIndex: 9999,
        padding: "10px 16px",
        background: t?.accent || "#007AFF",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        textDecoration: "none",
        borderRadius: "0 0 8px 0",
        transition: "top .15s ease",
      }}
      onFocus={e  => { e.currentTarget.style.top = "0"; }}
      onBlur={e   => { e.currentTarget.style.top = "-60px"; }}
    >
      Skip to main content
    </a>
  );
}

// ─── FOCUS VISIBLE HOOK ───────────────────────────────────────────────────────

/**
 * useFocusVisible()
 * Returns true if the current interaction is keyboard-driven.
 * Use this to show focus rings only for keyboard users (not mouse clicks).
 *
 * Usage:
 *   const isKeyboard = useFocusVisible();
 *   style={{ outline: isKeyboard ? `2px solid ${t.accent}` : "none" }}
 */
export function useFocusVisible() {
  const [isKeyboard, setIsKeyboard] = useState(false);

  useEffect(() => {
    const onMouseDown = () => setIsKeyboard(false);
    const onKeyDown   = (e) => {
      if (["Tab", "ArrowUp", "ArrowDown", "Enter", "Space"].includes(e.key)) {
        setIsKeyboard(true);
      }
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown",   onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown",   onKeyDown);
    };
  }, []);

  return isKeyboard;
}

// ─── ROVING TABINDEX HOOK ─────────────────────────────────────────────────────

/**
 * useRovingTabIndex(items, focusedIndex)
 * Implements the roving tabIndex pattern for list navigation.
 * Only the focused item has tabIndex=0; all others have tabIndex=-1.
 * This means Tab moves focus OUT of the list (correct behavior),
 * while j/k/arrows move within it.
 *
 * Returns itemTabIndex(index) → 0 | -1
 */
export function useRovingTabIndex(itemCount, focusedIndex) {
  return useCallback((index) => {
    if (focusedIndex === -1) return index === 0 ? 0 : -1;
    return index === focusedIndex ? 0 : -1;
  }, [focusedIndex]);
}

// ─── GLOBAL A11Y STYLES ───────────────────────────────────────────────────────

/**
 * Injects global accessibility CSS.
 * Call once in your root component.
 */
export function injectA11yStyles(accent = "#007AFF") {
  if (document.getElementById("mf-a11y-styles")) return;
  const s = document.createElement("style");
  s.id = "mf-a11y-styles";
  s.textContent = `
    /* Focus rings — visible only for keyboard navigation */
    :focus-visible {
      outline: 2px solid ${accent} !important;
      outline-offset: 2px !important;
      border-radius: 4px;
    }

    /* Hide focus ring for mouse users */
    :focus:not(:focus-visible) {
      outline: none !important;
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }

    /* High contrast mode support */
    @media (forced-colors: active) {
      button, a, [role="option"] {
        forced-color-adjust: none;
      }
    }
  `;
  document.head.appendChild(s);
}
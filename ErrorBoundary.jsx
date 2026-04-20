/**
 * ErrorBoundary.jsx  — Fix #2: React Error Boundaries
 * ─────────────────────────────────────────────────────────────────────────────
 * Catches JavaScript errors in any child component tree.
 * Without this, a single bad email from the backend (null field, unexpected
 * data shape) crashes the entire app to a white screen.
 *
 * Usage:
 *   <ErrorBoundary name="EmailList">
 *     <EmailList ... />
 *   </ErrorBoundary>
 *
 *   // With custom fallback:
 *   <ErrorBoundary name="PreviewPane" inline>
 *     <PreviewPane ... />
 *   </ErrorBoundary>
 *
 * Exports:
 *   ErrorBoundary       — class component (required by React for error boundaries)
 *   withErrorBoundary   — HOC wrapper for functional components
 *   PaneError           — pre-styled error state for list/preview panes
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import { Component, createElement } from "react";

// ─── ERROR BOUNDARY CLASS ─────────────────────────────────────────────────────

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError:   false,
      error:      null,
      errorInfo:  null,
      errorCount: 0,
    };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState(prev => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));

    // Log to console in development
    if (process.env.NODE_ENV !== "production") {
      console.error(`[ErrorBoundary: ${this.props.name || "unknown"}]`, error, errorInfo);
    }

    // In production, send to your error reporting service:
    // Sentry.captureException(error, { extra: errorInfo });
    // Or: invoke("log_error", { error: error.message, stack: errorInfo.componentStack });
    if (typeof this.props.onError === "function") {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset() {
    this.setState({
      hasError:  false,
      error:     null,
      errorInfo: null,
    });
    if (typeof this.props.onReset === "function") {
      this.props.onReset();
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback provided by parent
      if (typeof this.props.fallback === "function") {
        return this.props.fallback({
          error:      this.state.error,
          errorInfo:  this.state.errorInfo,
          reset:      this.handleReset,
          errorCount: this.state.errorCount,
        });
      }

      // Default fallback
      return createElement(DefaultErrorUI, {
        error:     this.state.error,
        name:      this.props.name,
        inline:    this.props.inline,
        onReset:   this.handleReset,
        errorCount: this.state.errorCount,
      });
    }

    return this.props.children;
  }
}

// ─── DEFAULT ERROR UI ─────────────────────────────────────────────────────────

function DefaultErrorUI({ error, name, inline, onReset, errorCount }) {
  const isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

  if (inline) {
    // Compact inline error for panes
    return (
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        gap: 12,
        background: "rgba(255,59,48,0.04)",
        border: "1px solid rgba(255,59,48,0.15)",
        borderRadius: 12,
        margin: 16,
      }}>
        <span style={{ fontSize: 32 }}>⚠️</span>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#FF3B30",
          textAlign: "center",
        }}>
          {name ? `${name} failed to load` : "Something went wrong"}
        </div>
        <div style={{
          fontSize: 12,
          color: "#636366",
          textAlign: "center",
          maxWidth: 280,
          lineHeight: 1.5,
        }}>
          {isDev && error?.message
            ? error.message
            : "An unexpected error occurred. This has been logged."}
        </div>
        <button
          onClick={onReset}
          style={{
            marginTop: 4,
            padding: "7px 18px",
            borderRadius: 8,
            border: "1px solid rgba(255,59,48,0.3)",
            background: "rgba(255,59,48,0.08)",
            color: "#FF3B30",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
        {isDev && error?.stack && (
          <pre style={{
            marginTop: 8,
            fontSize: 10,
            color: "#aeaeb2",
            maxWidth: "100%",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            maxHeight: 120,
            padding: "8px 12px",
            background: "rgba(0,0,0,0.04)",
            borderRadius: 6,
          }}>
            {error.stack}
          </pre>
        )}
      </div>
    );
  }

  // Full-pane error (for root-level boundaries)
  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#f2f2f7",
      gap: 16,
      padding: 40,
    }}>
      <span style={{ fontSize: 52 }}>⚠️</span>
      <div style={{
        fontSize: 20,
        fontWeight: 700,
        color: "#1c1c1e",
        textAlign: "center",
      }}>
        MailFlow encountered an error
      </div>
      <div style={{
        fontSize: 14,
        color: "#636366",
        textAlign: "center",
        maxWidth: 400,
        lineHeight: 1.6,
      }}>
        {isDev && error?.message
          ? error.message
          : "Something went wrong. Your data is safe — this is a display error only."}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={onReset}
          style={{
            padding: "10px 24px",
            borderRadius: 10,
            border: "none",
            background: "#007AFF",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload App
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 24px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "transparent",
            color: "#1c1c1e",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Hard Reload
        </button>
      </div>
      {isDev && error?.stack && (
        <details style={{ marginTop: 12, maxWidth: 600, width: "100%" }}>
          <summary style={{ fontSize: 12, color: "#aeaeb2", cursor: "pointer" }}>
            Stack trace (dev only)
          </summary>
          <pre style={{
            marginTop: 8,
            fontSize: 10,
            color: "#636366",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            maxHeight: 200,
            padding: "10px 14px",
            background: "rgba(0,0,0,0.04)",
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.08)",
          }}>
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}

// ─── PRE-STYLED PANE ERROR STATE ──────────────────────────────────────────────
// Used by useMailStore for fetch errors (not component crashes).
// Place where the email list or preview would normally render.

export function PaneError({ message, onRetry, t }) {
  // t is the theme object — falls back gracefully if not provided
  const clr = {
    bg:      t?.bg           || "#f2f2f7",
    text:    t?.text         || "#1c1c1e",
    sub:     t?.textSub      || "#636366",
    muted:   t?.textMuted    || "#aeaeb2",
    accent:  t?.accent       || "#007AFF",
    red:     t?.red          || "#FF3B30",
    border:  t?.border       || "rgba(0,0,0,0.08)",
    surface: t?.surfaceSolid || "#ffffff",
  };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: clr.bg,
      gap: 12,
      padding: 40,
    }}>
      <span style={{ fontSize: 40, opacity: 0.5 }}>📭</span>
      <div style={{ fontSize: 15, fontWeight: 600, color: clr.red }}>
        Failed to load messages
      </div>
      <div style={{
        fontSize: 13,
        color: clr.sub,
        textAlign: "center",
        maxWidth: 300,
        lineHeight: 1.6,
      }}>
        {message || "Could not connect to the mail server. Check your connection and try again."}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 4,
            padding: "8px 20px",
            borderRadius: 9,
            border: `1px solid ${clr.accent}`,
            background: "transparent",
            color: clr.accent,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all .14s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = clr.accent;
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = clr.accent;
          }}
        >
          ↺ Retry
        </button>
      )}
    </div>
  );
}

// ─── HOC WRAPPER ─────────────────────────────────────────────────────────────

/**
 * withErrorBoundary(Component, options)
 * Wraps a functional component with an ErrorBoundary.
 *
 * @param {React.ComponentType} Comp
 * @param {{ name?: string, inline?: boolean, onError?: Function }} opts
 */
export function withErrorBoundary(Comp, opts = {}) {
  const Wrapped = (props) => (
    createElement(ErrorBoundary, {
      name:    opts.name || Comp.displayName || Comp.name,
      inline:  opts.inline ?? true,
      onError: opts.onError,
    },
      createElement(Comp, props)
    )
  );
  Wrapped.displayName = `WithErrorBoundary(${Comp.displayName || Comp.name})`;
  return Wrapped;
}
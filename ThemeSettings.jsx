/**
 * ThemeSettings.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full settings panel for MailFlow.
 * Sections:
 *   1. Appearance — light/dark toggle + accent color picker
 *   2. Accounts   — list, switch, add, remove accounts
 *   3. About
 *
 * Props:
 *   onClose       () => void
 *   dark          boolean
 *   toggleDark    () => void
 *   accentId      string
 *   setAccent     (id: string) => void
 *   accounts      Account[]
 *   activeAccountId string
 *   switchAccount (id: string) => void
 *   removeAccount (id: string) => void
 *   addAccount    (config) => void
 *   theme         object  (full theme token object from buildTheme)
 *   isMobile      boolean
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import { useState, useContext } from "react";
import { ACCENT_PALETTES, PALETTE_GROUPS } from "./accentThemes.js";
import { accountAvatarStyle } from "./accounts.js";

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
const SectionHeader = ({ label, t }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, letterSpacing: ".9px",
    textTransform: "uppercase", color: t.textMuted,
    padding: "18px 0 6px",
  }}>
    {label}
  </div>
);

// ─── SETTING ROW ─────────────────────────────────────────────────────────────
const Row = ({ label, description, control, t }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 0", borderBottom: `1px solid ${t.border}`, gap: 16,
  }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>{label}</div>
      {description && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{description}</div>}
    </div>
    <div style={{ flexShrink: 0 }}>{control}</div>
  </div>
);

// ─── TOGGLE SWITCH ────────────────────────────────────────────────────────────
const Toggle = ({ on, onChange, accent }) => {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: on ? accent : "rgba(120,120,128,0.32)",
        border: "none", cursor: "pointer", padding: 3,
        display: "flex", alignItems: "center",
        justifyContent: on ? "flex-end" : "flex-start",
        transition: "background .2s ease",
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        transition: "transform .18s ease",
      }} />
    </button>
  );
};

// ─── ACCENT SWATCH ────────────────────────────────────────────────────────────
const Swatch = ({ palette, selected, onClick, dark }) => {
  const color = (dark ? palette.dark : palette.light).main;
  const glow  = (dark ? palette.dark : palette.light).glow;
  return (
    <button
      onClick={() => onClick(palette.id)}
      title={palette.label}
      style={{
        width: 32, height: 32, borderRadius: "50%",
        background: color,
        border: selected ? `3px solid ${color}` : "3px solid transparent",
        outline: selected ? `2px solid ${color}` : "none",
        outlineOffset: 2,
        cursor: "pointer",
        boxShadow: selected ? `0 0 12px ${glow}` : "none",
        transition: "all .15s ease",
        transform: selected ? "scale(1.15)" : "scale(1)",
        flexShrink: 0,
      }}
    />
  );
};

// ─── ADD ACCOUNT MINI FORM ────────────────────────────────────────────────────
const AddAccountForm = ({ onAdd, onCancel, t }) => {
  const [form, setForm] = useState({
    label: "", name: "", email: "", provider: "imap",
    imap_host: "", imap_port: "993",
    smtp_host: "", smtp_port: "587",
  });
  const [step, setStep] = useState(1);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const inputStyle = {
    width: "100%", border: `1px solid ${t.border}`,
    background: t.surfaceHover, borderRadius: 8,
    padding: "8px 10px", fontSize: 13, color: t.text,
    outline: "none", marginBottom: 8,
  };

  return (
    <div style={{
      padding: "14px 16px",
      background: t.surfaceSolid,
      borderRadius: 12,
      border: `1px solid ${t.border}`,
      marginTop: 10,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>
        {step === 1 ? "Account info" : "Server settings"}
      </div>

      {step === 1 && (
        <>
          <input placeholder="Account label (e.g. Work)" value={form.label}
            onChange={e => set("label", e.target.value)} style={inputStyle} />
          <input placeholder="Your name" value={form.name}
            onChange={e => set("name", e.target.value)} style={inputStyle} />
          <input placeholder="Email address" type="email" value={form.email}
            onChange={e => set("email", e.target.value)} style={inputStyle} />
          <select value={form.provider} onChange={e => set("provider", e.target.value)}
            style={{ ...inputStyle, appearance: "none" }}>
            <option value="imap">IMAP / SMTP</option>
            <option value="gmail">Gmail (OAuth)</option>
            <option value="outlook">Outlook (OAuth)</option>
          </select>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 6 }}>INCOMING (IMAP)</div>
          <input placeholder="IMAP host (e.g. imap.gmail.com)" value={form.imap_host}
            onChange={e => set("imap_host", e.target.value)} style={inputStyle} />
          <input placeholder="Port (993)" value={form.imap_port}
            onChange={e => set("imap_port", e.target.value)} style={{ ...inputStyle, width: 100 }} />
          <div style={{ fontSize: 11, color: t.textMuted, margin: "8px 0 6px" }}>OUTGOING (SMTP)</div>
          <input placeholder="SMTP host (e.g. smtp.gmail.com)" value={form.smtp_host}
            onChange={e => set("smtp_host", e.target.value)} style={inputStyle} />
          <input placeholder="Port (587)" value={form.smtp_port}
            onChange={e => set("smtp_port", e.target.value)} style={{ ...inputStyle, width: 100 }} />
        </>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: "8px 0", borderRadius: 8,
          border: `1px solid ${t.borderStrong}`,
          background: "transparent", color: t.textSub,
          fontSize: 13, cursor: "pointer",
        }}>Cancel</button>

        {step === 1 && (
          <button
            onClick={() => { if (form.email && form.name) setStep(2); }}
            disabled={!form.email || !form.name}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
              background: (!form.email || !form.name) ? t.border : t.accent,
              color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: (!form.email || !form.name) ? "default" : "pointer",
            }}>
            Next →
          </button>
        )}

        {step === 2 && (
          <button
            onClick={() => {
              onAdd({
                label: form.label || form.email.split("@")[1],
                name: form.name, email: form.email,
                provider: form.provider,
                color: "#636366",
                avatarInitials: form.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase(),
                imap: { host: form.imap_host, port: parseInt(form.imap_port), tls: true },
                smtp: { host: form.smtp_host, port: parseInt(form.smtp_port), tls: true },
              });
            }}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
              background: t.accent, color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
            Add Account
          </button>
        )}
      </div>
    </div>
  );
};

// ─── MAIN SETTINGS PANEL ─────────────────────────────────────────────────────

export default function ThemeSettings({
  onClose,
  dark, toggleDark,
  accentId, setAccent,
  accounts, activeAccountId,
  switchAccount, removeAccount, addAccount,
  theme: t,
  isMobile,
}) {
  const [tab, setTab] = useState("appearance"); // appearance | accounts | about
  const [showAddForm, setShowAddForm] = useState(accounts.length === 0);
  const [confirmRemove, setConfirmRemove] = useState(null); // account id to confirm

  const handleAddAccount = (config) => {
    const newAccount = addAccount(config);

    switchAccount(newAccount.id);

    setShowAddForm(false);
    onClose();
  };

  const TabBtn = ({ id, label, icon }) => (
    <button onClick={() => setTab(id)} style={{
      flex: 1, padding: "9px 0",
      border: "none",
      borderBottom: `2px solid ${tab === id ? t.accent : "transparent"}`,
      background: "transparent",
      color: tab === id ? t.accent : t.textSub,
      fontSize: 12.5, fontWeight: tab === id ? 600 : 400,
      cursor: "pointer", transition: "all .15s",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
    }}>
      <span>{icon}</span>{label}
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 80,
          background: "rgba(0,0,0,0.38)",
          animation: "fadeIn .18s ease",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed",
        zIndex: 90,
        background: t.surfaceSolid,
        border: `1px solid ${t.border}`,
        boxShadow: t.shadowLg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "scaleUp .22s cubic-bezier(.34,1.26,.64,1)",
        // mobile: bottom sheet; desktop: centered modal
        ...(isMobile ? {
          bottom: 0, left: 0, right: 0,
          borderRadius: "16px 16px 0 0",
          maxHeight: "90vh",
        } : {
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 480, borderRadius: 16,
          maxHeight: "80vh",
        }),
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px 0",
          background: t.topbarBg,
          backdropFilter: t.blur,
          borderBottom: `1px solid ${t.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: t.text }}>⚙️ Settings</span>
            <button onClick={onClose} style={{
              background: "none", border: "none", cursor: "pointer",
              color: t.textMuted, fontSize: 20, lineHeight: 1, padding: "0 2px",
            }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex" }}>
            <TabBtn id="appearance" label="Appearance" icon="🎨" />
            <TabBtn id="accounts"   label="Accounts"   icon="👤" />
            <TabBtn id="about"      label="About"      icon="ℹ️" />
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 24px" }}>

          {/* ── APPEARANCE TAB ── */}
          {tab === "appearance" && (
            <>
              <SectionHeader label="Base Theme" t={t} />

              <Row t={t} label="Dark Mode"
                description="Switches between light and dark surfaces"
                control={<Toggle on={dark} onChange={toggleDark} accent={t.accent} />}
              />

              <SectionHeader label="Accent Color" t={t} />

              {/* Current selection display */}
              <div style={{
                padding: "10px 12px",
                background: t.surfaceHover,
                borderRadius: 10,
                display: "flex", alignItems: "center", gap: 10,
                marginBottom: 12,
                border: `1px solid ${t.border}`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: t.accent,
                  boxShadow: `0 0 12px ${t.accentGlow}`,
                  flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                    {ACCENT_PALETTES.find(p => p.id === accentId)?.label || "System Blue"}
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted }}>
                    {dark ? "Dark variant" : "Light variant"} · {t.accent}
                  </div>
                </div>
              </div>

              {/* Grouped swatches */}
              {PALETTE_GROUPS.map(group => {
                const palettes = ACCENT_PALETTES.filter(p => p.group === group);
                return (
                  <div key={group} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, marginBottom: 8 }}>
                      {group}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {palettes.map(palette => (
                        <div key={palette.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <Swatch
                            palette={palette}
                            selected={accentId === palette.id}
                            onClick={setAccent}
                            dark={dark}
                          />
                          <span style={{
                            fontSize: 9, color: t.textMuted, textAlign: "center",
                            maxWidth: 40, lineHeight: 1.2,
                          }}>{palette.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <SectionHeader label="Layout" t={t} />
              <Row t={t} label="Compact density" description="Smaller email rows in the list"
                control={<Toggle on={false} onChange={()=>{}} accent={t.accent} />}
              />
              <Row t={t} label="Show preview text" description="Show message snippet in list"
                control={<Toggle on={true} onChange={()=>{}} accent={t.accent} />}
              />
              <Row t={t} label="Frosted glass sidebars" description="Translucent blur effect"
                control={<Toggle on={true} onChange={()=>{}} accent={t.accent} />}
              />
            </>
          )}

          {/* ── ACCOUNTS TAB ── */}
          {tab === "accounts" && (
            <>
              <SectionHeader label="Your Accounts" t={t} />

              {accounts.map(acc => (
                <div key={acc.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 12px",
                  background: activeAccountId === acc.id ? t.surfaceActive : t.surfaceHover,
                  borderRadius: 10, marginBottom: 6,
                  border: `1px solid ${activeAccountId === acc.id ? t.accent : t.border}`,
                  transition: "all .14s",
                }}>
                  {/* Avatar */}
                  <div style={{
                    ...accountAvatarStyle(acc, 36),
                    boxShadow: activeAccountId === acc.id ? `0 0 10px ${acc.color}66` : "none",
                  }}>
                    {acc.avatarInitials}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text, display: "flex", alignItems: "center", gap: 6 }}>
                      {acc.label}
                      {acc.connected
                        ? <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.green, display: "inline-block" }} />
                        : <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.red,   display: "inline-block" }} />
                      }
                    </div>
                    <div style={{ fontSize: 11.5, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {acc.email}
                    </div>
                    <div style={{ fontSize: 10.5, color: t.textMuted, marginTop: 1 }}>
                      {acc.storage.used} / {acc.storage.total} {acc.storage.unit} · {acc.provider}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {activeAccountId !== acc.id && (
                      <button
                        onClick={() => switchAccount(acc.id)}
                        style={{
                          padding: "5px 10px", borderRadius: 7, border: `1px solid ${t.accent}`,
                          background: "transparent", color: t.accent,
                          fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                        }}>
                        Switch
                      </button>
                    )}
                    {activeAccountId === acc.id && (
                      <span style={{ fontSize: 11, color: t.accent, fontWeight: 600, padding: "5px 2px" }}>
                        Active
                      </span>
                    )}
                    {accounts.length > 1 && (
                      confirmRemove === acc.id ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => setConfirmRemove(null)} style={{
                            padding: "5px 8px", borderRadius: 7, border: `1px solid ${t.border}`,
                            background: "transparent", color: t.textSub, fontSize: 11, cursor: "pointer",
                          }}>No</button>
                          <button onClick={() => { removeAccount(acc.id); setConfirmRemove(null); }} style={{
                            padding: "5px 8px", borderRadius: 7, border: "none",
                            background: t.red, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
                          }}>Remove</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRemove(acc.id)}
                          style={{
                            padding: "5px 8px", borderRadius: 7, border: `1px solid ${t.border}`,
                            background: "transparent", color: t.textMuted,
                            fontSize: 11, cursor: "pointer",
                          }}>
                          ✕
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}

              {/* Add account */}
              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  style={{
                    width: "100%", padding: "10px 0",
                    marginTop: 4, borderRadius: 10,
                    border: `1.5px dashed ${t.border}`,
                    background: "transparent", color: t.textSub,
                    fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "all .14s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textSub; }}
                >
                  + Add Account
                </button>
              ) : (
                <AddAccountForm
                  onAdd={handleAddAccount}
                  onCancel={() => setShowAddForm(false)}
                  t={t}
                />
              )}

              <SectionHeader label="Default Account" t={t} />
              <Row t={t} label="Send from" description="Account used when composing new mail"
                control={
                  <select
                    defaultValue={activeAccountId}
                    onChange={e => switchAccount(e.target.value)}
                    style={{
                      border: `1px solid ${t.border}`, background: t.surfaceHover,
                      borderRadius: 7, padding: "5px 8px", fontSize: 12.5,
                      color: t.text, outline: "none", cursor: "pointer",
                    }}
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.label} ({a.email})</option>
                    ))}
                  </select>
                }
              />
            </>
          )}

          {/* ── ABOUT TAB ── */}
          {tab === "about" && (
            <>
              <SectionHeader label="MailFlow" t={t} />
              <div style={{
                padding: "16px", background: t.surfaceHover,
                borderRadius: 12, marginBottom: 12, textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✉️</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>MailFlow</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 3 }}>Version 2.0.0 · Rust Backend</div>
              </div>
              <Row t={t} label="Frontend" description="React + responsive layout" control={<span style={{ fontSize:12, color:t.textMuted }}>JSX</span>} />
              <Row t={t} label="Backend" description="Tauri + Rust channel architecture" control={<span style={{ fontSize:12, color:t.textMuted }}>Rust</span>} />
              <Row t={t} label="Accent colors" description="17 palettes, light + dark variants" control={<span style={{ fontSize:12, color:t.textMuted }}>17</span>} />
              <Row t={t} label="Accounts" description="Connected email accounts" control={<span style={{ fontSize:12, color:t.accent, fontWeight:600 }}>{accounts.length}</span>} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
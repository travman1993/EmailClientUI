/**
 * accentThemes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * MailFlow color system.
 *
 * Two layers:
 *   1. BASE THEME  — light or dark (controls surfaces, text, borders)
 *   2. ACCENT      — the color that drives interactive elements
 *
 * Usage:
 *   import { buildTheme, ACCENT_PALETTES, useThemePrefs } from "./accentThemes";
 *   const theme = buildTheme(dark, accentId);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from "react";

// ─── ACCENT PALETTES ──────────────────────────────────────────────────────────
// Each palette has: id, label, group, light{main,hover,surface,glow}, dark{...}

export const ACCENT_PALETTES = [
  // ── Apple defaults
  {
    id: "blue",
    label: "System Blue",
    group: "Classic",
    emoji: "🔵",
    light: { main:"#007AFF", hover:"#0066d6", surface:"rgba(0,122,255,0.09)",  glow:"rgba(0,122,255,0.30)"  },
    dark:  { main:"#0A84FF", hover:"#3d9dff", surface:"rgba(10,132,255,0.13)", glow:"rgba(10,132,255,0.35)" },
  },
  {
    id: "purple",
    label: "System Purple",
    group: "Classic",
    emoji: "🟣",
    light: { main:"#AF52DE", hover:"#9a3bc8", surface:"rgba(175,82,222,0.09)", glow:"rgba(175,82,222,0.28)" },
    dark:  { main:"#BF5AF2", hover:"#d070ff", surface:"rgba(191,90,242,0.13)", glow:"rgba(191,90,242,0.32)" },
  },
  {
    id: "teal",
    label: "Teal",
    group: "Classic",
    emoji: "🩵",
    light: { main:"#00C7BE", hover:"#009d95", surface:"rgba(0,199,190,0.09)", glow:"rgba(0,199,190,0.28)" },
    dark:  { main:"#5AC8FA", hover:"#3ab8ee", surface:"rgba(90,200,250,0.12)", glow:"rgba(90,200,250,0.30)" },
  },
  {
    id: "pink",
    label: "Hot Pink",
    group: "Classic",
    emoji: "🩷",
    light: { main:"#FF2D55", hover:"#d9003f", surface:"rgba(255,45,85,0.09)",  glow:"rgba(255,45,85,0.28)"  },
    dark:  { main:"#FF375F", hover:"#ff6080", surface:"rgba(255,55,95,0.13)",  glow:"rgba(255,55,95,0.32)"  },
  },

  // ── Vivid / Neon
  {
    id: "lime",
    label: "Lime Green",
    group: "Vivid",
    emoji: "🍏",
    light: { main:"#32D74B", hover:"#1fb838", surface:"rgba(50,215,75,0.10)",  glow:"rgba(50,215,75,0.35)"  },
    dark:  { main:"#30D158", hover:"#58e07a", surface:"rgba(48,209,88,0.14)",  glow:"rgba(48,209,88,0.40)"  },
  },
  {
    id: "neon-green",
    label: "Neon Green",
    group: "Vivid",
    emoji: "💚",
    light: { main:"#00FF41", hover:"#00cc34", surface:"rgba(0,255,65,0.08)",   glow:"rgba(0,255,65,0.40)"   },
    dark:  { main:"#39FF14", hover:"#66ff44", surface:"rgba(57,255,20,0.12)",  glow:"rgba(57,255,20,0.45)"  },
  },
  {
    id: "neon-cyan",
    label: "Neon Cyan",
    group: "Vivid",
    emoji: "🩵",
    light: { main:"#00E5FF", hover:"#00b8cc", surface:"rgba(0,229,255,0.09)",  glow:"rgba(0,229,255,0.38)"  },
    dark:  { main:"#18FFFF", hover:"#66ffff", surface:"rgba(24,255,255,0.12)", glow:"rgba(24,255,255,0.42)" },
  },
  {
    id: "neon-pink",
    label: "Neon Pink",
    group: "Vivid",
    emoji: "💗",
    light: { main:"#FF007F", hover:"#cc0066", surface:"rgba(255,0,127,0.09)",  glow:"rgba(255,0,127,0.35)"  },
    dark:  { main:"#FF2D92", hover:"#ff66b2", surface:"rgba(255,45,146,0.13)", glow:"rgba(255,45,146,0.40)" },
  },
  {
    id: "neon-orange",
    label: "Neon Orange",
    group: "Vivid",
    emoji: "🔶",
    light: { main:"#FF6B00", hover:"#d45900", surface:"rgba(255,107,0,0.09)",  glow:"rgba(255,107,0,0.35)"  },
    dark:  { main:"#FF8C00", hover:"#ffaa33", surface:"rgba(255,140,0,0.13)",  glow:"rgba(255,140,0,0.40)"  },
  },
  {
    id: "electric-blue",
    label: "Electric Blue",
    group: "Vivid",
    emoji: "⚡",
    light: { main:"#1A6EFF", hover:"#0050d4", surface:"rgba(26,110,255,0.10)", glow:"rgba(26,110,255,0.38)" },
    dark:  { main:"#4D9DFF", hover:"#80bcff", surface:"rgba(77,157,255,0.14)", glow:"rgba(77,157,255,0.42)" },
  },

  // ── Warm / Earthy
  {
    id: "burnt-orange",
    label: "Burnt Orange",
    group: "Warm",
    emoji: "🍊",
    light: { main:"#CC5500", hover:"#a34300", surface:"rgba(204,85,0,0.09)",   glow:"rgba(204,85,0,0.28)"   },
    dark:  { main:"#E8651A", hover:"#f08040", surface:"rgba(232,101,26,0.13)", glow:"rgba(232,101,26,0.33)" },
  },
  {
    id: "candy-red",
    label: "Candy Red",
    group: "Warm",
    emoji: "🍎",
    light: { main:"#E8002A", hover:"#be0022", surface:"rgba(232,0,42,0.09)",   glow:"rgba(232,0,42,0.28)"   },
    dark:  { main:"#FF3A52", hover:"#ff6070", surface:"rgba(255,58,82,0.13)",  glow:"rgba(255,58,82,0.33)"  },
  },
  {
    id: "amber",
    label: "Amber",
    group: "Warm",
    emoji: "🌕",
    light: { main:"#FFBF00", hover:"#d49c00", surface:"rgba(255,191,0,0.10)",  glow:"rgba(255,191,0,0.30)"  },
    dark:  { main:"#FFD60A", hover:"#ffe44d", surface:"rgba(255,214,10,0.13)", glow:"rgba(255,214,10,0.36)" },
  },
  {
    id: "terracotta",
    label: "Terracotta",
    group: "Warm",
    emoji: "🪴",
    light: { main:"#C1440E", hover:"#9c3509", surface:"rgba(193,68,14,0.09)",  glow:"rgba(193,68,14,0.26)"  },
    dark:  { main:"#E05A28", hover:"#e87c52", surface:"rgba(224,90,40,0.13)",  glow:"rgba(224,90,40,0.30)"  },
  },

  // ── Cool / Muted
  {
    id: "slate",
    label: "Slate",
    group: "Muted",
    emoji: "🩶",
    light: { main:"#4A5568", hover:"#374151", surface:"rgba(74,85,104,0.09)",  glow:"rgba(74,85,104,0.22)"  },
    dark:  { main:"#8896A8", hover:"#a8b4c0", surface:"rgba(136,150,168,0.12)",glow:"rgba(136,150,168,0.26)"},
  },
  {
    id: "rose-gold",
    label: "Rose Gold",
    group: "Muted",
    emoji: "🌸",
    light: { main:"#B76E79", hover:"#9a5460", surface:"rgba(183,110,121,0.09)",glow:"rgba(183,110,121,0.26)"},
    dark:  { main:"#E8A0A8", hover:"#f0b8be", surface:"rgba(232,160,168,0.12)",glow:"rgba(232,160,168,0.30)"},
  },
  {
    id: "sage",
    label: "Sage Green",
    group: "Muted",
    emoji: "🌿",
    light: { main:"#5A7A5A", hover:"#436043", surface:"rgba(90,122,90,0.09)",  glow:"rgba(90,122,90,0.22)"  },
    dark:  { main:"#88BB88", hover:"#aaD0aa", surface:"rgba(136,187,136,0.12)",glow:"rgba(136,187,136,0.26)"},
  },
];

// Grouped for the settings UI
export const PALETTE_GROUPS = ["Classic", "Vivid", "Warm", "Muted"];

export function getPaletteById(id) {
  return ACCENT_PALETTES.find(p => p.id === id) || ACCENT_PALETTES[0];
}

// ─── BASE THEMES ──────────────────────────────────────────────────────────────

const BASE_LIGHT = {
  bg:           "#f2f2f7",
  surface:      "rgba(255,255,255,0.78)",
  surfaceSolid: "#ffffff",
  surfaceHover: "rgba(0,0,0,0.045)",
  border:       "rgba(0,0,0,0.08)",
  borderStrong: "rgba(0,0,0,0.14)",
  text:         "#1c1c1e",
  textSub:      "#636366",
  textMuted:    "#aeaeb2",
  // semantic (not accent-dependent)
  red:          "#FF3B30",
  green:        "#34C759",
  orange:       "#FF9500",
  yellow:       "#FFCC00",
  blur:         "blur(22px) saturate(180%)",
  sidebarBg:    "rgba(250,250,252,0.90)",
  topbarBg:     "rgba(255,255,255,0.80)",
  bottomNavBg:  "rgba(255,255,255,0.90)",
  shadow:       "0 2px 8px rgba(0,0,0,0.07), 0 12px 32px rgba(0,0,0,0.05)",
  shadowLg:     "0 24px 72px rgba(0,0,0,0.14)",
  isDark:       false,
};

const BASE_DARK = {
  bg:           "#1c1c1e",
  surface:      "rgba(44,44,46,0.78)",
  surfaceSolid: "#2c2c2e",
  surfaceHover: "rgba(255,255,255,0.055)",
  border:       "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  text:         "#f2f2f7",
  textSub:      "#aeaeb2",
  textMuted:    "#636366",
  red:          "#FF453A",
  green:        "#30D158",
  orange:       "#FF9F0A",
  yellow:       "#FFD60A",
  blur:         "blur(22px) saturate(150%)",
  sidebarBg:    "rgba(24,24,26,0.93)",
  topbarBg:     "rgba(36,36,38,0.87)",
  bottomNavBg:  "rgba(28,28,30,0.93)",
  shadow:       "0 2px 8px rgba(0,0,0,0.28), 0 12px 32px rgba(0,0,0,0.22)",
  shadowLg:     "0 24px 72px rgba(0,0,0,0.48)",
  isDark:       true,
};

// ─── BUILDER ──────────────────────────────────────────────────────────────────

/**
 * buildTheme(dark, accentId) → full theme token object
 *
 * @param {boolean} dark
 * @param {string}  accentId  — key from ACCENT_PALETTES
 * @returns {object}          — all design tokens for the app
 */
export function buildTheme(dark = false, accentId = "blue") {
  const base    = dark ? BASE_DARK : BASE_LIGHT;
  const palette = getPaletteById(accentId);
  const accent  = dark ? palette.dark : palette.light;

  return {
    ...base,
    accent:        accent.main,
    accentHover:   accent.hover,
    accentSurface: accent.surface,
    accentGlow:    accent.glow,
    // Derived surface-active uses accent
    surfaceActive: accent.surface,
    // Sidebar selected state
    selectedBg:    accent.surface,
    selectedText:  accent.main,
    // Badge background
    badgeBg:       accent.main,
    // Meta
    accentId,
    paletteLabel:  palette.label,
  };
}

// ─── PERSISTENCE HOOK ─────────────────────────────────────────────────────────

const STORAGE_KEY_DARK   = "mf_dark_mode";
const STORAGE_KEY_ACCENT = "mf_accent";

/**
 * useThemePrefs()
 * Reads/writes dark mode and accent from localStorage.
 * Returns { dark, accentId, theme, setDark, setAccent, toggleDark }
 */
export function useThemePrefs() {
  const [dark, setDarkState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DARK);
      if (saved !== null) return JSON.parse(saved);
      // Respect OS preference on first load
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    } catch { return false; }
  });

  const [accentId, setAccentState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY_ACCENT) || "blue"; }
    catch { return "blue"; }
  });

  const setDark = useCallback((val) => {
    const next = typeof val === "function" ? val(dark) : val;
    setDarkState(next);
    try { localStorage.setItem(STORAGE_KEY_DARK, JSON.stringify(next)); } catch {}
  }, [dark]);

  const toggleDark = useCallback(() => setDark(p => !p), [setDark]);

  const setAccent = useCallback((id) => {
    setAccentState(id);
    try { localStorage.setItem(STORAGE_KEY_ACCENT, id); } catch {}
  }, []);

  // Sync with OS preference changes
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const fn = (e) => {
      // Only auto-switch if user hasn't manually set a preference
      const saved = localStorage.getItem(STORAGE_KEY_DARK);
      if (saved === null) setDarkState(e.matches);
    };
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const theme = buildTheme(dark, accentId);

  return { dark, accentId, theme, setDark, toggleDark, setAccent };
}
/**
 * EmailClient.jsx  — v4 (production-complete)
 * ─────────────────────────────────────────────────────────────────────────────
 * All 8 production fixes applied:
 *
 *  #1  sanitize.js       — DOMPurify XSS sanitization on all email body HTML
 *  #2  ErrorBoundary.jsx — Component crash recovery, per-pane error UI
 *  #3  useMailStore.js   — Error states (loading/error/success), retry button
 *  #4  VirtualList.jsx   — Virtual scrolling for large mailboxes (50k+ emails)
 *  #5  useKeyboard.js    — Full keyboard shortcuts (j/k/e/#/r/f/c/g-i etc.)
 *  #6  useA11y.js        — ARIA labels, focus trap, live region, skip-to-main
 *  #7  ComposeModal      — Attachment upload UI wired (file picker + queue)
 *  #8  useMailStore.js   — Cursor-based pagination, loadMore(), hasMore flag
 *
 * Responsive:
 *   mobile  (< 640px)  → single-pane + bottom nav
 *   tablet  (640–1023) → two-pane + sidebar overlay
 *   desktop (≥ 1024px) → three-pane
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import {
    useState, useEffect, useCallback, useRef,
    createContext, useContext,
  } from "react";
  
  // ── Internal modules ──────────────────────────────────────────────────────────
  import { useMailStore }                             from "./useMailStore.js";
  import { useAccounts, SMART_FOLDERS, accountAvatarStyle } from "./accounts.js";
  import { useThemePrefs }                            from "./accentThemes.js";
  import ThemeSettings                                from "./ThemeSettings.jsx";
  import { sanitizeEmailBody, sanitizePreview }       from "./sanitize.js";         // Fix #1
  import { ErrorBoundary, PaneError, withErrorBoundary } from "./ErrorBoundary.jsx"; // Fix #2
  import { VirtualList, PaginationSentinel }          from "./VirtualList.jsx";      // Fix #4
  import {
    useKeyboard, KeyboardHelpOverlay, KBD,
  }                                                   from "./useKeyboard.jsx";       // Fix #5
  import {
    useLiveRegion, SkipToMain, FocusTrap,
    ScreenReaderOnly, emailItemA11y, emailListA11y,
    actionBtnA11y, useFocusVisible, injectA11yStyles,
  }                                                   from "./useA11y.jsx";           // Fix #6
  
  // ─── THEME CONTEXT ────────────────────────────────────────────────────────────
  const ThemeCtx = createContext(null);
  
  // ─── BREAKPOINTS ──────────────────────────────────────────────────────────────
  function useBreakpoint() {
    const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
    useEffect(() => {
      const fn = () => setW(window.innerWidth);
      window.addEventListener("resize", fn);
      return () => window.removeEventListener("resize", fn);
    }, []);
    return { isMobile: w < 640, isTablet: w >= 640 && w < 1024, isDesktop: w >= 1024 };
  }
  
  // ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
  const GlobalStyles = () => {
    const { t } = useContext(ThemeCtx);
    useEffect(() => {
      const s = document.createElement("style");
      s.id = "mf-global-styles";
      s.textContent = `
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html,body { height:100%; overflow:hidden; }
        body {
          font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",sans-serif;
          -webkit-font-smoothing:antialiased; touch-action:manipulation;
        }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(128,128,128,0.22); border-radius:3px; }
  
        .t-trans, .t-trans * {
          transition:background-color .22s ease,color .18s ease,
                     border-color .18s ease,box-shadow .18s ease !important;
        }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes scaleUp  { from{opacity:0;transform:scale(.95) translateY(6px)} to{opacity:1;transform:none} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes shimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes slideInL { from{transform:translateX(-100%)} to{transform:none} }
        @keyframes slideInR { from{transform:translateX(100%)}  to{transform:none} }
        @keyframes slideInU { from{transform:translateY(100%)}  to{transform:none} }
  
        .anim-fadeUp  { animation:fadeUp  .2s ease both; }
        .anim-fadeIn  { animation:fadeIn  .18s ease; }
        .anim-scaleUp { animation:scaleUp .22s cubic-bezier(.34,1.26,.64,1); }
        .anim-sil     { animation:slideInL .22s cubic-bezier(.4,0,.2,1); }
        .anim-sir     { animation:slideInR .22s cubic-bezier(.4,0,.2,1); }
        .anim-siu     { animation:slideInU .22s cubic-bezier(.4,0,.2,1); }
  
        /* Fix #6 — email body safe styles */
        .email-body p  { margin-bottom:12px; line-height:1.75; }
        .email-body ul { padding-left:20px; margin-bottom:12px; }
        .email-body li { margin-bottom:4px; line-height:1.6; }
        .email-body strong { font-weight:600; }
        .email-body a  { color:inherit; text-decoration:underline; }
  
        button,a { -webkit-tap-highlight-color:transparent; }
  
        @media(hover:hover) {
          [data-tip] { position:relative; }
          [data-tip]::after {
            content:attr(data-tip); position:absolute; bottom:calc(100%+5px); left:50%;
            transform:translateX(-50%); background:rgba(0,0,0,0.78); color:#fff;
            font-size:11px; white-space:nowrap; padding:3px 8px; border-radius:6px;
            pointer-events:none; opacity:0; transition:opacity .15s; z-index:200;
          }
          [data-tip]:hover::after { opacity:1; }
        }
  
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `;
      const existing = document.getElementById("mf-global-styles");
      if (existing) existing.remove();
      document.head.appendChild(s);
      return () => s.remove();
    }, []);
    return null;
  };
  
  // ─── HELPERS ──────────────────────────────────────────────────────────────────
  const fmtDate = d => {
    const diff = Date.now() - d;
    if (diff < 60000)    return "Just now";
    if (diff < 3600000)  return `${Math.floor(diff/60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    if (diff < 604800000)return d.toLocaleDateString([], {weekday:"short"});
    return d.toLocaleDateString([], {month:"short",day:"numeric"});
  };
  const initials  = n => n.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
  const avatarClr = n => {
    const pal = ["#007AFF","#34C759","#FF9500","#FF2D55","#AF52DE","#00C7BE","#5AC8FA"];
    let h=0; for (let c of n) h=c.charCodeAt(0)+((h<<5)-h);
    return pal[Math.abs(h)%pal.length];
  };
  const fmtBytes = bytes => {
    if (bytes < 1024)         return `${bytes} B`;
    if (bytes < 1024*1024)    return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/(1024*1024)).toFixed(1)} MB`;
  };
  
  // ─── PRIMITIVES ───────────────────────────────────────────────────────────────
  const Avatar = ({name,size=36}) => (
    <div style={{
      width:size,height:size,borderRadius:"50%",background:avatarClr(name),
      flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
      color:"#fff",fontSize:size*.38,fontWeight:700,letterSpacing:"-0.5px",userSelect:"none",
    }}>{initials(name)}</div>
  );
  
  const Skeleton = ({w="100%",h=13,r=6}) => {
    const {t,dark} = useContext(ThemeCtx);
    return <div style={{
      width:w,height:h,borderRadius:r,
      background:dark
        ?"linear-gradient(90deg,#2c2c2e 25%,#3a3a3c 50%,#2c2c2e 75%)"
        :"linear-gradient(90deg,#e8e8ed 25%,#d1d1d6 50%,#e8e8ed 75%)",
      backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite linear",
    }}/>;
  };
  
  // Fix #6 — IBtn with full ARIA support
  const IBtn = ({icon,label,onClick,active,danger,pressed,sz=34,style:ext}) => {
    const {t} = useContext(ThemeCtx);
    const isKbd = useFocusVisible();
    const [hov,setHov] = useState(false);
    return (
      <button
        data-tip={label}
        onClick={onClick}
        onMouseEnter={()=>setHov(true)}
        onMouseLeave={()=>setHov(false)}
        {...(label ? actionBtnA11y(label, pressed) : {})}
        style={{
          width:sz,height:sz,border:"none",borderRadius:8,
          background: danger&&hov?"rgba(255,59,48,0.12)":active?t.accentSurface:hov?t.surfaceHover:"transparent",
          color: danger?(hov?t.red:t.textSub):active?t.accent:t.textSub,
          cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:15,transition:"all .14s ease",flexShrink:0,
          outline: isKbd ? `2px solid ${t.accent}` : "none",
          outlineOffset: 2,
          ...ext,
        }}>{icon}</button>
    );
  };
  
  const Tag = ({tag}) => {
    const {t} = useContext(ThemeCtx);
    const map = {
      important:{bg:"rgba(255,59,48,.1)",color:t.red},
      work:{bg:"rgba(0,122,255,.1)",color:t.accent},
      draft:{bg:"rgba(255,149,0,.1)",color:t.orange},
      spam:{bg:"rgba(142,142,147,.1)",color:t.textSub},
    };
    const c = map[tag]||{bg:t.surfaceHover,color:t.textSub};
    return <span style={{background:c.bg,color:c.color,fontSize:9.5,fontWeight:700,padding:"2px 5px",borderRadius:4,textTransform:"uppercase",letterSpacing:".5px",flexShrink:0}}>{tag}</span>;
  };
  
  // ─── TOAST STACK ──────────────────────────────────────────────────────────────
  const ToastStack = ({toasts,onDismiss,onUndo}) => {
    const {t} = useContext(ThemeCtx);
    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        style={{position:"fixed",top:62,left:"50%",transform:"translateX(-50%)",zIndex:300,display:"flex",flexDirection:"column",gap:6,alignItems:"center",pointerEvents:"none"}}
      >
        {toasts.map(toast=>(
          <div key={toast.id} className="anim-scaleUp" style={{
            background:t.surfaceSolid,border:`1px solid ${t.border}`,
            borderRadius:10,padding:"9px 14px",boxShadow:t.shadowLg,
            fontSize:13,color:t.text,display:"flex",alignItems:"center",gap:10,
            whiteSpace:"nowrap",pointerEvents:"auto",
          }}>
            <span aria-hidden="true">{toast.icon||"ℹ️"}</span>
            <span>{toast.message}</span>
            {toast.undoId&&(
              <button onClick={()=>onUndo(toast)} style={{background:"none",border:"none",cursor:"pointer",color:t.accent,fontWeight:600,fontSize:13,padding:0}}>
                Undo
              </button>
            )}
            <button onClick={()=>onDismiss(toast.id)} aria-label="Dismiss notification" style={{background:"none",border:"none",cursor:"pointer",color:t.textMuted,fontSize:14,padding:0,marginLeft:2}}>✕</button>
          </div>
        ))}
      </div>
    );
  };
  
  // ─── CONTEXT MENU ─────────────────────────────────────────────────────────────
  const ContextMenu = ({x,y,items,onClose}) => {
    const {t} = useContext(ThemeCtx);
    const ref = useRef();
    useEffect(()=>{
      const fn=e=>{if(ref.current&&!ref.current.contains(e.target))onClose();};
      document.addEventListener("mousedown",fn);
      return()=>document.removeEventListener("mousedown",fn);
    },[onClose]);
    return (
      <div ref={ref} role="menu" className="anim-scaleUp" style={{
        position:"fixed",left:x,top:y,zIndex:500,
        background:t.surfaceSolid,border:`1px solid ${t.border}`,
        borderRadius:10,boxShadow:t.shadowLg,padding:"4px",minWidth:170,overflow:"hidden",
      }}>
        {items.map((item,i)=>item==="---"
          ?<div key={i} role="separator" style={{height:1,background:t.border,margin:"3px 0"}}/>
          :(
            <button key={i} role="menuitem" onClick={()=>{item.action();onClose();}} style={{
              width:"100%",display:"flex",alignItems:"center",gap:9,
              padding:"8px 10px",border:"none",background:"none",
              borderRadius:7,cursor:"pointer",fontSize:13,
              color:item.danger?t.red:t.text,textAlign:"left",transition:"background .1s",
            }}
              onMouseEnter={e=>e.currentTarget.style.background=item.danger?"rgba(255,59,48,.08)":t.surfaceHover}
              onMouseLeave={e=>e.currentTarget.style.background="none"}
            >
              <span aria-hidden="true" style={{width:16,textAlign:"center"}}>{item.icon}</span>
              {item.label}
            </button>
          )
        )}
      </div>
    );
  };
  
  // ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────
  const ConfirmDialog = ({title,message,confirmLabel,onConfirm,onCancel,dangerous}) => {
    const {t} = useContext(ThemeCtx);
    return (
      <FocusTrap onEscape={onCancel}>
        <div onClick={onCancel} style={{position:"fixed",inset:0,zIndex:800,background:"rgba(0,0,0,0.35)"}}/>
        <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-desc"
          className="anim-scaleUp" style={{
          position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
          zIndex:900,background:t.surfaceSolid,borderRadius:14,
          border:`1px solid ${t.border}`,boxShadow:t.shadowLg,
          padding:"24px 24px 18px",width:300,
        }}>
          <div id="confirm-title"  style={{fontSize:16,fontWeight:700,color:t.text,marginBottom:8}}>{title}</div>
          <div id="confirm-desc"   style={{fontSize:13.5,color:t.textSub,lineHeight:1.6,marginBottom:20}}>{message}</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onCancel}  style={{flex:1,padding:"9px 0",borderRadius:9,border:`1px solid ${t.borderStrong}`,background:"transparent",color:t.text,fontSize:13,cursor:"pointer"}}>Cancel</button>
            <button onClick={onConfirm} style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",background:dangerous?t.red:t.accent,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>{confirmLabel}</button>
          </div>
        </div>
      </FocusTrap>
    );
  };
  
  // ─── FOLDER PICKER ────────────────────────────────────────────────────────────
  const FolderPicker = ({onSelect,onClose,currentFolder,t}) => {
    const folders = ["inbox","sent","drafts","spam","trash","archive"];
    return (
      <FocusTrap onEscape={onClose}>
        <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.25)"}}/>
        <div role="dialog" aria-label="Move to folder" className="anim-scaleUp" style={{
          position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
          zIndex:410,background:t.surfaceSolid,borderRadius:12,
          border:`1px solid ${t.border}`,boxShadow:t.shadowLg,padding:"8px",minWidth:160,
        }}>
          <div style={{fontSize:11,color:t.textMuted,fontWeight:700,padding:"6px 10px 4px",letterSpacing:".5px",textTransform:"uppercase"}}>Move to…</div>
          {folders.filter(f=>f!==currentFolder).map(f=>(
            <button key={f} onClick={()=>{onSelect(f);onClose();}} style={{
              width:"100%",padding:"8px 10px",border:"none",background:"none",
              borderRadius:7,cursor:"pointer",fontSize:13,color:t.text,
              textAlign:"left",textTransform:"capitalize",transition:"background .1s",
            }}
              onMouseEnter={e=>e.currentTarget.style.background=t.surfaceHover}
              onMouseLeave={e=>e.currentTarget.style.background="none"}
            >{f}</button>
          ))}
        </div>
      </FocusTrap>
    );
  };
  
  // ─── ACCOUNT SWITCHER ─────────────────────────────────────────────────────────
  const AccountSwitcher = ({accounts,activeAccountId,switchAccount,onSettings,onClose,t}) => {
    const ref = useRef();
    useEffect(()=>{
      const fn=e=>{if(ref.current&&!ref.current.contains(e.target))onClose();};
      document.addEventListener("mousedown",fn);
      return()=>document.removeEventListener("mousedown",fn);
    },[onClose]);
    return (
      <div ref={ref} role="menu" className="anim-scaleUp" style={{
        position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:200,
        background:t.surfaceSolid,border:`1px solid ${t.border}`,
        borderRadius:12,boxShadow:t.shadowLg,padding:"6px",minWidth:240,
      }}>
        {accounts.map(acc=>(
          <button key={acc.id} role="menuitem" onClick={()=>{switchAccount(acc.id);onClose();}} style={{
            width:"100%",display:"flex",alignItems:"center",gap:10,
            padding:"9px 10px",borderRadius:9,border:"none",cursor:"pointer",
            background:activeAccountId===acc.id?t.surfaceActive:"transparent",
            transition:"background .12s",
          }}
            onMouseEnter={e=>{if(activeAccountId!==acc.id)e.currentTarget.style.background=t.surfaceHover;}}
            onMouseLeave={e=>{if(activeAccountId!==acc.id)e.currentTarget.style.background="transparent";}}
          >
            <div style={{...accountAvatarStyle(acc,30),boxShadow:activeAccountId===acc.id?`0 0 8px ${acc.color}55`:"none"}}>{acc.avatarInitials}</div>
            <div style={{flex:1,textAlign:"left",minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:t.text}}>{acc.label}</div>
              <div style={{fontSize:11,color:t.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{acc.email}</div>
            </div>
            {activeAccountId===acc.id&&<span aria-label="Active account" style={{color:t.accent,fontSize:14}}>✓</span>}
          </button>
        ))}
        <div role="separator" style={{height:1,background:t.border,margin:"4px 0"}}/>
        <button role="menuitem" onClick={()=>{onSettings();onClose();}} style={{
          width:"100%",display:"flex",alignItems:"center",gap:9,
          padding:"8px 10px",borderRadius:9,border:"none",cursor:"pointer",
          background:"transparent",color:t.textSub,fontSize:13,transition:"background .12s",
        }}
          onMouseEnter={e=>e.currentTarget.style.background=t.surfaceHover}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}
        >
          <span aria-hidden="true" style={{width:16,textAlign:"center"}}>⚙️</span>
          Settings & Accounts
        </button>
      </div>
    );
  };
  
  // ─── SIDEBAR ──────────────────────────────────────────────────────────────────
  const Sidebar = ({folders,activeFolder,onSelect,onClose,isMobile,accounts,activeAccountId,switchAccount,onSettings,unreadCounts}) => {
    const {t} = useContext(ThemeCtx);
    const [hov,setHov]       = useState(null);
    const [acctOpen,setAcctOpen] = useState(false);
    const activeAccount = accounts.find(a=>a.id===activeAccountId)||accounts[0];
  
    const FolderBtn = ({f,count}) => {
      const active = f.id===activeFolder;
      return (
        <button
          onClick={()=>{onSelect(f.id);if(isMobile)onClose?.();}}
          onMouseEnter={()=>setHov(f.id)} onMouseLeave={()=>setHov(null)}
          aria-current={active?"page":undefined}
          aria-label={`${f.label}${count>0?`, ${count} unread`:""}`}
          style={{
            width:"100%",display:"flex",alignItems:"center",gap:9,
            padding:"7px 10px",borderRadius:8,border:"none",cursor:"pointer",
            background:active?t.selectedBg:hov===f.id?t.surfaceHover:"transparent",
            color:active?t.selectedText:t.text,
            fontSize:13.5,fontWeight:active?600:400,
            textAlign:"left",transition:"all .11s ease",minHeight:36,
          }}>
          <span aria-hidden="true" style={{fontSize:14,width:20,textAlign:"center",flexShrink:0}}>{f.icon}</span>
          <span style={{flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.label}</span>
          {count>0&&<span aria-hidden="true" style={{background:active?t.accent:t.textMuted,color:"#fff",borderRadius:10,minWidth:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,padding:"0 4px",flexShrink:0}}>{count}</span>}
        </button>
      );
    };
  
    const folderCounts = unreadCounts[activeAccountId]||{};
  
    return (
      <aside
        aria-label="Mailboxes"
        style={{
          width:220,height:"100%",display:"flex",flexDirection:"column",
          background:t.sidebarBg,backdropFilter:t.blur,WebkitBackdropFilter:t.blur,
          borderRight:`1px solid ${t.border}`,flexShrink:0,overflow:"hidden",
          ...(isMobile?{position:"absolute",left:0,top:0,zIndex:50,boxShadow:t.shadowLg}:{}),
        }} className={isMobile?"anim-sil":""}>
  
        <div style={{padding:"16px 14px 12px",borderBottom:`1px solid ${t.border}`,flexShrink:0,position:"relative"}}>
          {isMobile&&<button onClick={onClose} aria-label="Close sidebar" style={{position:"absolute",right:12,top:14,background:"none",border:"none",cursor:"pointer",color:t.textMuted,fontSize:20}}>✕</button>}
          <button onClick={()=>setAcctOpen(p=>!p)} aria-expanded={acctOpen} aria-haspopup="menu" aria-label={`Switch account, currently ${activeAccount.label}`} style={{display:"flex",alignItems:"center",gap:10,background:"none",border:"none",cursor:"pointer",width:"100%",padding:0,textAlign:"left"}}>
            <div style={{...accountAvatarStyle(activeAccount,32),boxShadow:`0 0 8px ${activeAccount.color}44`}}>{activeAccount.avatarInitials}</div>
            <div style={{flex:1,overflow:"hidden",minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:t.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{activeAccount.label}</div>
              <div style={{fontSize:11,color:t.textMuted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{activeAccount.email}</div>
            </div>
            <span aria-hidden="true" style={{color:t.textMuted,fontSize:10,transform:acctOpen?"rotate(180deg)":"none",transition:"transform .14s",flexShrink:0}}>▾</span>
          </button>
          {acctOpen&&<AccountSwitcher accounts={accounts} activeAccountId={activeAccountId} switchAccount={switchAccount} onSettings={onSettings} onClose={()=>setAcctOpen(false)} t={t}/>}
        </div>
  
        <nav aria-label="Mail folders" style={{flex:1,overflowY:"auto",padding:"6px 8px"}}>
          <div role="group" aria-label="Mailboxes">
            <div aria-hidden="true" style={{fontSize:9.5,fontWeight:700,color:t.textMuted,letterSpacing:".8px",padding:"10px 8px 3px",textTransform:"uppercase"}}>Mailboxes</div>
            {(activeAccount.folders||[]).map(f=><FolderBtn key={f.id} f={f} count={folderCounts[f.id]||0}/>)}
          </div>
          <div role="group" aria-label="Smart Mailboxes" style={{marginTop:4}}>
            <div aria-hidden="true" style={{fontSize:9.5,fontWeight:700,color:t.textMuted,letterSpacing:".8px",padding:"14px 8px 3px",textTransform:"uppercase"}}>Smart Mailboxes</div>
            {SMART_FOLDERS.map(f=><FolderBtn key={f.id} f={f} count={0}/>)}
          </div>
        </nav>
  
        <div style={{padding:"10px 14px",borderTop:`1px solid ${t.border}`,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:10,color:t.textMuted}}>Storage</span>
            <span style={{fontSize:10,color:t.textMuted}}>{activeAccount.storage?.used}/{activeAccount.storage?.total} {activeAccount.storage?.unit}</span>
          </div>
          <div role="progressbar" aria-valuenow={activeAccount.storage?.used} aria-valuemin={0} aria-valuemax={activeAccount.storage?.total} aria-label="Storage usage" style={{height:3,borderRadius:2,background:t.border,overflow:"hidden",marginBottom:10}}>
            <div style={{width:`${Math.min(100,(activeAccount.storage?.used/activeAccount.storage?.total)*100)||8}%`,height:"100%",background:t.accent,borderRadius:2,boxShadow:`0 0 6px ${t.accentGlow}`}}/>
          </div>
          <button onClick={onSettings} aria-label="Open settings" style={{width:"100%",display:"flex",alignItems:"center",gap:7,padding:"6px 8px",borderRadius:8,border:`1px solid ${t.border}`,background:t.surfaceHover,cursor:"pointer",color:t.textSub,fontSize:12,transition:"all .12s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=t.accent;e.currentTarget.style.color=t.accent;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.color=t.textSub;}}
          >
            <span aria-hidden="true">⚙️</span> Settings
          </button>
        </div>
      </aside>
    );
  };
  
  // ─── TOP BAR ──────────────────────────────────────────────────────────────────
  const TopBar = ({onMenu,onCompose,onSearch,onToggleDark,dark,searchQuery,setSearchQuery,isMobile,showBack,onBack,backLabel,activeAccount,onShowHelp}) => {
    const {t} = useContext(ThemeCtx);
    const [focused,setFocused] = useState(false);
    const searchRef = useRef(null);
  
    // expose focus function for keyboard shortcut
    useEffect(()=>{
      if(onSearch?.focusRef) onSearch.focusRef.current = ()=>searchRef.current?.focus();
    },[onSearch]);
  
    return (
      <header role="banner" style={{
        height:52,flexShrink:0,
        background:t.topbarBg,backdropFilter:t.blur,WebkitBackdropFilter:t.blur,
        borderBottom:`1px solid ${t.border}`,
        display:"flex",alignItems:"center",
        padding:`0 ${isMobile?10:14}px`,gap:6,position:"relative",zIndex:20,
      }}>
        {showBack&&isMobile
          ?<button onClick={onBack} aria-label={`Back to ${backLabel}`} style={{background:"none",border:"none",cursor:"pointer",color:t.accent,fontSize:15,fontWeight:500,display:"flex",alignItems:"center",gap:3,padding:"4px 0",whiteSpace:"nowrap",flexShrink:0}}>‹ {backLabel}</button>
          :<IBtn icon="☰" label="Toggle sidebar" onClick={onMenu}/>
        }
        <div role="search" style={{
          flex:1,display:"flex",alignItems:"center",
          background:focused?t.surfaceSolid:t.surfaceHover,
          border:`1px solid ${focused?t.accent:"transparent"}`,
          borderRadius:10,padding:"0 10px",gap:6,height:30,
          maxWidth:isMobile?"100%":280,
          margin:isMobile?"0 4px":"0 10px",
          transition:"all .2s ease",
          boxShadow:focused?`0 0 0 3px ${t.accentSurface}`:"none",
        }}>
          <span aria-hidden="true" style={{color:t.textMuted,fontSize:12,flexShrink:0}}>🔍</span>
          <input
            ref={searchRef}
            role="searchbox"
            aria-label="Search mail"
            placeholder="Search mail…"
            value={searchQuery}
            onChange={e=>{setSearchQuery(e.target.value);onSearch(e.target.value);}}
            onFocus={()=>setFocused(true)}
            onBlur={()=>setFocused(false)}
            style={{border:"none",background:"transparent",outline:"none",fontSize:13,color:t.text,width:"100%"}}
          />
          {searchQuery&&<button onClick={()=>{setSearchQuery("");onSearch("");}} aria-label="Clear search" style={{background:"none",border:"none",cursor:"pointer",color:t.textMuted,fontSize:14,padding:0}}>✕</button>}
        </div>
        {!isMobile&&<IBtn icon="?" label="Keyboard shortcuts" onClick={onShowHelp}/>}
        <IBtn icon={dark?"☀️":"🌙"} label={dark?"Switch to light mode":"Switch to dark mode"} onClick={onToggleDark}/>
        <button onClick={onCompose} aria-label="Compose new email" style={{
          display:"flex",alignItems:"center",gap:5,
          background:t.accent,color:"#fff",border:"none",borderRadius:8,
          padding:isMobile?"6px 10px":"6px 14px",
          fontSize:13,fontWeight:600,cursor:"pointer",
          boxShadow:`0 2px 8px ${t.accentGlow}`,flexShrink:0,
          transition:"transform .14s ease",
        }}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03)"}
          onMouseLeave={e=>e.currentTarget.style.transform="none"}
        >
          {isMobile?"✏️":<><span aria-hidden="true" style={{fontSize:15}}>✏️</span>Compose</>}
        </button>
      </header>
    );
  };
  
  // ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
  const BottomNav = ({activeFolder,onSelect}) => {
    const {t} = useContext(ThemeCtx);
    return (
      <nav aria-label="Main navigation" style={{height:60,flexShrink:0,background:t.bottomNavBg,backdropFilter:t.blur,WebkitBackdropFilter:t.blur,borderTop:`1px solid ${t.border}`,display:"flex",alignItems:"center",paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        {[{id:"inbox",icon:"✉️",label:"Inbox"},{id:"sent",icon:"↗️",label:"Sent"},{id:"drafts",icon:"📝",label:"Drafts"},{id:"starred",icon:"★",label:"Starred"},{id:"trash",icon:"🗑️",label:"Trash"}].map(tab=>{
          const active = tab.id===activeFolder;
          return <button key={tab.id} onClick={()=>onSelect(tab.id)} aria-current={active?"page":undefined} aria-label={tab.label} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,border:"none",background:"none",cursor:"pointer",color:active?t.accent:t.textMuted,padding:"8px 0",transition:"color .14s"}}>
            <span aria-hidden="true" style={{fontSize:18,lineHeight:1}}>{tab.icon}</span>
            <span style={{fontSize:10,fontWeight:active?600:400}}>{tab.label}</span>
          </button>;
        })}
      </nav>
    );
  };
  
  // ─── BULK ACTION BAR ──────────────────────────────────────────────────────────
  const BulkBar = ({checked,allChecked,onToggleAll,onDelete,onMove,onMarkRead,onMarkUnread,onClear,folder,t}) => (
    <div role="toolbar" aria-label="Bulk actions" className="anim-fadeUp" style={{padding:"8px 14px",borderBottom:`1px solid ${t.border}`,background:t.accentSurface,display:"flex",alignItems:"center",gap:8,flexShrink:0,flexWrap:"wrap"}}>
      <input type="checkbox" checked={allChecked} onChange={onToggleAll} aria-label={allChecked?"Deselect all":"Select all"} style={{width:15,height:15,accentColor:t.accent,cursor:"pointer",flexShrink:0}}/>
      <span style={{fontSize:13,color:t.text,fontWeight:500}}>{checked.size} selected</span>
      <div style={{display:"flex",gap:4,marginLeft:"auto",flexWrap:"wrap"}}>
        {[
          {l:"Mark read",   fn:onMarkRead,   danger:false},
          {l:"Mark unread", fn:onMarkUnread, danger:false},
          {l:"Move…",       fn:onMove,       danger:false},
          {l:folder==="trash"?"Delete permanently":"Move to trash", fn:onDelete, danger:true},
          {l:"Cancel",      fn:onClear,      danger:false},
        ].map(({l,fn,danger})=>(
          <button key={l} onClick={fn} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${danger?"rgba(255,59,48,.2)":t.border}`,background:danger?"rgba(255,59,48,.1)":t.surfaceSolid,color:danger?t.red:t.text,fontSize:12,fontWeight:500,cursor:"pointer",transition:"all .12s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=danger?"rgba(255,59,48,.18)":t.surfaceHover;}}
            onMouseLeave={e=>{e.currentTarget.style.background=danger?"rgba(255,59,48,.1)":t.surfaceSolid;}}
          >{l}</button>
        ))}
      </div>
    </div>
  );
  
  // ─── EMAIL LIST ITEM ──────────────────────────────────────────────────────────
  // Fix #6 — full ARIA attributes
  const EmailItem = ({email,selected,onClick,idx,total,checked,onCheck,onStar,onContextMenu,focusedIndex}) => {
    const {t} = useContext(ThemeCtx);
    const isKbd = useFocusVisible();
    const [hov,setHov] = useState(false);
    const isFocused = focusedIndex === idx;
  
    return (
      <div
        {...emailItemA11y(email, selected, idx, total)}
        className="anim-fadeUp"
        style={{
          animationDelay:`${idx*.025}s`,padding:"11px 14px",
          borderBottom:`1px solid ${t.border}`,cursor:"pointer",
          background:selected?t.surfaceActive:checked?t.accentSurface:hov?t.surfaceHover:"transparent",
          transition:"background .1s ease",position:"relative",
          outline: isFocused&&isKbd ? `2px solid ${t.accent}` : "none",
          outlineOffset: -2,
        }}
        onClick={()=>onClick(email)}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        onContextMenu={e=>{e.preventDefault();onContextMenu(e,email);}}
      >
        {!email.read&&!checked&&(
          <div aria-hidden="true" style={{position:"absolute",left:5,top:"50%",transform:"translateY(-50%)",width:7,height:7,borderRadius:"50%",background:t.accent,boxShadow:`0 0 5px ${t.accent}88`}}/>
        )}
  
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <div style={{width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}>
            {hov||checked
              ?<input type="checkbox" checked={!!checked} onChange={e=>{e.stopPropagation();onCheck(email.id);}}
                  onClick={e=>e.stopPropagation()}
                  aria-label={`Select email: ${email.subject}`}
                  style={{width:16,height:16,accentColor:t.accent,cursor:"pointer"}}/>
              :<Avatar name={email.from.name} size={34}/>
            }
          </div>
  
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
              <span style={{fontSize:13,fontWeight:email.read?400:700,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"62%"}}>{email.from.name}</span>
              <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                {email.flagged&&<span aria-hidden="true" style={{color:t.orange,fontSize:11}}>🚩</span>}
                <time dateTime={email.date?.toISOString()} style={{fontSize:11,color:t.textMuted}}>{fmtDate(email.date)}</time>
              </div>
            </div>
            <div style={{fontSize:12.5,fontWeight:email.read?400:600,color:email.read?t.textSub:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>
              <button
                onClick={e=>{e.stopPropagation();onStar(email.id);}}
                aria-label={email.starred?"Remove star":"Add star"}
                aria-pressed={email.starred}
                style={{background:"none",border:"none",cursor:"pointer",padding:"0 3px 0 0",color:email.starred?t.yellow:t.textMuted,fontSize:13,lineHeight:1,verticalAlign:"middle"}}
              >★</button>
              {email.subject}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:11.5,color:t.textMuted,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {/* Fix #1 — sanitize preview text (strip all HTML) */}
                {sanitizePreview(email.preview)}
              </span>
              {email.tags.map(tag=><Tag key={tag} tag={tag}/>)}
              {email.attachments?.length>0&&<span aria-label="Has attachments" style={{color:t.textMuted,fontSize:11,flexShrink:0}}>📎</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // ─── EMAIL LIST PANEL ─────────────────────────────────────────────────────────
  // Fix #2 — wrapped in ErrorBoundary
  // Fix #4 — VirtualList for large mailboxes
  // Fix #3 — shows PaneError on fetch failure
  const EmailList = ({emails,selected,onSelect,loading,hasError,error,activeFolder,isMobile,store,onShowFolderPicker,focusedIndex}) => {
    const {t} = useContext(ThemeCtx);
    const [contextMenu,setContextMenu] = useState(null);
    const label = ["inbox","sent","drafts","spam","trash","archive","unread","starred","flagged"]
      .includes(activeFolder) ? activeFolder.charAt(0).toUpperCase()+activeFolder.slice(1) : activeFolder;
  
    const handleContextMenu = (e,email) => {
      setContextMenu({x:Math.min(e.clientX,window.innerWidth-180),y:Math.min(e.clientY,window.innerHeight-320),email});
    };
  
    const ctxItems = contextMenu ? [
      {icon:"↩", label:"Reply",     action:()=>{}},
      {icon:"↪", label:"Forward",   action:()=>{}},
      "---",
      {icon:contextMenu.email?.read?"●":"○", label:contextMenu.email?.read?"Mark as unread":"Mark as read", action:()=>store.markRead(contextMenu.email.id,!contextMenu.email.read)},
      {icon:"★", label:contextMenu.email?.starred?"Unstar":"Star",   action:()=>store.toggleStar(contextMenu.email.id)},
      {icon:"🚩", label:contextMenu.email?.flagged?"Unflag":"Flag",   action:()=>store.toggleFlag(contextMenu.email.id)},
      "---",
      {icon:"📁", label:"Move to…", action:()=>onShowFolderPicker(contextMenu.email.id)},
      {icon:"📦", label:"Archive",  action:()=>store.archiveEmail(contextMenu.email.id)},
      "---",
      {icon:"🗑",  label:activeFolder==="trash"?"Delete permanently":"Move to Trash",
        action:()=>store.deleteEmail(contextMenu.email.id), danger:true},
    ] : [];
  
    return (
      <ErrorBoundary name="Email List" inline>
        <div style={{
          width:isMobile?"100%":320,minWidth:isMobile?"auto":260,maxWidth:isMobile?"auto":380,
          height:"100%",display:"flex",flexDirection:"column",
          borderRight:isMobile?"none":`1px solid ${t.border}`,
          background:t.surface,backdropFilter:t.blur,WebkitBackdropFilter:t.blur,flexShrink:0,
        }}>
          {/* Header */}
          <div style={{padding:"12px 14px 8px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div>
              <h2 style={{fontSize:16,fontWeight:700,color:t.text,margin:0}}>{label}</h2>
              <div style={{fontSize:11,color:t.textMuted,marginTop:1}}>
                {loading?"Loading…":`${store.total||emails.length} message${(store.total||emails.length)!==1?"s":""}`}
                {store.unreadCount>0&&<span style={{color:t.accent,marginLeft:6,fontWeight:600}}>{store.unreadCount} unread</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:2}}>
              <IBtn icon="✓✓" label="Mark all as read" onClick={store.markAllRead} sz={30} style={{fontSize:11}}/>
              <IBtn icon="⇅"  label="Sort"             sz={30}/>
              <IBtn icon="⋯"  label="More options"     sz={30}/>
            </div>
          </div>
  
          {/* Bulk bar */}
          {store.checked.size>0&&(
            <BulkBar checked={store.checked} allChecked={store.allChecked}
              onToggleAll={store.toggleCheckAll}
              onDelete={store.bulkDelete}
              onMove={()=>onShowFolderPicker("bulk")}
              onMarkRead={()=>store.bulkMarkRead(true)}
              onMarkUnread={()=>store.bulkMarkRead(false)}
              onClear={store.clearChecked}
              folder={activeFolder} t={t}
            />
          )}
  
          {/* Fix #3 — error state */}
          {hasError && (
            <PaneError message={error?.message} onRetry={error?.retry} t={t}/>
          )}
  
          {/* Loading skeletons */}
          {loading && (
            <div style={{flex:1,overflowY:"auto"}}>
              {Array.from({length:6}).map((_,i)=>(
                <div key={i} style={{padding:"11px 14px",borderBottom:`1px solid ${t.border}`}}>
                  <div style={{display:"flex",gap:10}}>
                    <div style={{width:34,height:34,borderRadius:"50%",background:t.border,flexShrink:0}}/>
                    <div style={{flex:1,display:"flex",flexDirection:"column",gap:6,justifyContent:"center"}}>
                      <Skeleton w="55%" h={12}/><Skeleton w="80%" h={11}/><Skeleton w="65%" h={10}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
  
          {/* Fix #4 — VirtualList for large mailboxes */}
          {!loading && !hasError && emails.length === 0 && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:10,color:t.textMuted,padding:40}}>
              <span aria-hidden="true" style={{fontSize:42}}>📭</span>
              <span style={{fontSize:14}}>No messages</span>
            </div>
          )}
  
          {!loading && !hasError && emails.length > 0 && (
            // Use VirtualList only for large lists (>100 items) — below that render directly
            emails.length > 100
              ? (
                <VirtualList
                  items={emails}
                  itemHeight={72}
                  containerStyle={{flex:1}}
                  onScrollEnd={store.hasMore ? store.loadMore : undefined}
                  renderItem={(email,i)=>(
                    <EmailItem key={email.id} email={email} selected={selected?.id===email.id}
                      onClick={store.selectEmail} idx={i} total={emails.length}
                      checked={store.checked.has(email.id)}
                      onCheck={store.toggleCheck} onStar={store.toggleStar}
                      onContextMenu={handleContextMenu} focusedIndex={focusedIndex}
                    />
                  )}
                />
              )
              : (
                <div
                  {...emailListA11y(label, emails.length)}
                  style={{flex:1,overflowY:"auto"}}
                >
                  {emails.map((email,i)=>(
                    <EmailItem key={email.id} email={email} selected={selected?.id===email.id}
                      onClick={store.selectEmail} idx={i} total={emails.length}
                      checked={store.checked.has(email.id)}
                      onCheck={store.toggleCheck} onStar={store.toggleStar}
                      onContextMenu={handleContextMenu} focusedIndex={focusedIndex}
                    />
                  ))}
                  {/* Fix #8 — pagination sentinel */}
                  {store.hasMore && (
                    <PaginationSentinel onVisible={store.loadMore} loading={store.loadingMore} t={t}/>
                  )}
                </div>
              )
          )}
  
          {contextMenu&&(
            <ContextMenu x={contextMenu.x} y={contextMenu.y} items={ctxItems} onClose={()=>setContextMenu(null)}/>
          )}
        </div>
      </ErrorBoundary>
    );
  };
  
  // ─── PREVIEW PANE ─────────────────────────────────────────────────────────────
  // Fix #1 — sanitizeEmailBody wraps dangerouslySetInnerHTML
  // Fix #2 — wrapped in ErrorBoundary
  const PreviewPane = ({email,store,onReply,onForward,onClose,isMobile,onShowFolderPicker}) => {
    const {t} = useContext(ThemeCtx);
    const [details,setDetails] = useState(false);
    const inTrash = email?.folder==="trash";
  
    if(!email) return (
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:t.bg,gap:12}}>
        <span aria-hidden="true" style={{fontSize:50,opacity:.35}}>✉️</span>
        <div style={{fontSize:15,fontWeight:500,color:t.textSub}}>Select a message</div>
        <div style={{fontSize:13,color:t.textMuted}}>Choose an email to read it here</div>
      </div>
    );
  
    return (
      <ErrorBoundary name="Preview Pane" inline>
        <main id="mailflow-main" tabIndex={-1} className={isMobile?"anim-sir":"anim-fadeIn"} style={{
          flex:1,display:"flex",flexDirection:"column",
          background:t.bg,overflow:"hidden",
          ...(isMobile?{position:"absolute",inset:0,zIndex:30}:{}),
        }}>
          {/* Header */}
          <div style={{padding:`${isMobile?"12px":"18px"} ${isMobile?"14px":"24px"} ${isMobile?"10px":"14px"}`,borderBottom:`1px solid ${t.border}`,background:t.surface,backdropFilter:t.blur,WebkitBackdropFilter:t.blur,flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:isMobile?8:12}}>
              {isMobile?<button onClick={onClose} aria-label="Back to inbox" style={{background:"none",border:"none",cursor:"pointer",color:t.accent,fontSize:15,fontWeight:500,padding:0}}>‹ Back</button>:<div style={{flex:1}}/>}
              <div role="toolbar" aria-label="Email actions" style={{display:"flex",gap:2}}>
                <IBtn icon="↩"  label="Reply"         onClick={onReply}/>
                <IBtn icon="↪"  label="Forward"       onClick={onForward}/>
                <IBtn icon={email.starred?"★":"☆"} label={email.starred?"Remove star":"Add star"} onClick={()=>store.toggleStar(email.id)} active={email.starred} pressed={email.starred} style={{color:email.starred?t.yellow:undefined}}/>
                <IBtn icon="🚩" label={email.flagged?"Remove flag":"Flag email"} onClick={()=>store.toggleFlag(email.id)} active={email.flagged} pressed={email.flagged}/>
                <IBtn icon="📁" label="Move to folder" onClick={()=>onShowFolderPicker(email.id)}/>
                {inTrash
                  ?<IBtn icon="↺" label="Restore to inbox"        onClick={()=>store.restoreEmail(email.id)}/>
                  :<IBtn icon="🗑" label="Move to Trash"           onClick={()=>store.deleteEmail(email.id)} danger/>
                }
                {inTrash&&<IBtn icon="🗑" label="Delete permanently" onClick={()=>store.deleteEmail(email.id)} danger/>}
                <IBtn icon={email.read?"○":"●"} label={email.read?"Mark as unread":"Mark as read"} onClick={()=>store.markRead(email.id,!email.read)} pressed={!email.read}/>
              </div>
            </div>
  
            <h1 style={{fontSize:isMobile?16:18,fontWeight:700,color:t.text,marginBottom:10,lineHeight:1.3,margin:"0 0 10px"}}>
              {email.starred&&<span aria-hidden="true" style={{color:t.yellow,marginRight:5}}>★</span>}
              {email.flagged&&<span aria-hidden="true" style={{color:t.orange,marginRight:5}}>🚩</span>}
              {email.subject}
            </h1>
  
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Avatar name={email.from.name} size={isMobile?36:40}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:600,color:t.text}}>{email.from.name}</div>
                <button onClick={()=>setDetails(!details)} aria-expanded={details} aria-label="Toggle sender details" style={{fontSize:12,color:t.textMuted,background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:3}}>
                  {email.from.email}
                  <span aria-hidden="true" style={{fontSize:9,display:"inline-block",transition:"transform .14s",transform:details?"rotate(180deg)":"none"}}>▾</span>
                </button>
              </div>
              <time dateTime={email.date?.toISOString()} style={{fontSize:12,color:t.textMuted,flexShrink:0}}>{fmtDate(email.date)}</time>
            </div>
  
            {details&&(
              <dl className="anim-fadeUp" style={{marginTop:8,padding:"7px 12px",background:t.surfaceSolid,borderRadius:8,border:`1px solid ${t.border}`,fontSize:11.5,color:t.textSub,lineHeight:1.9}}>
                <div><dt style={{display:"inline",color:t.textMuted}}>From: </dt><dd style={{display:"inline"}}>{email.from.name} &lt;{email.from.email}&gt;</dd></div>
                <div><dt style={{display:"inline",color:t.textMuted}}>To: </dt><dd style={{display:"inline"}}>{(email.to||[]).map(r=>r.email).join(", ")||"me"}</dd></div>
                {email.cc?.length>0&&<div><dt style={{display:"inline",color:t.textMuted}}>CC: </dt><dd style={{display:"inline"}}>{email.cc.map(r=>r.email).join(", ")}</dd></div>}
                <div><dt style={{display:"inline",color:t.textMuted}}>Date: </dt><dd style={{display:"inline"}}><time dateTime={email.date?.toISOString()}>{email.date?.toLocaleString()}</time></dd></div>
              </dl>
            )}
  
            {email.attachments?.length>0&&(
              <div role="list" aria-label="Attachments" style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
                {email.attachments.map((a,i)=>(
                  <div key={i} role="listitem" style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",background:t.surfaceHover,borderRadius:8,border:`1px solid ${t.border}`,fontSize:12,color:t.text,cursor:"pointer"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=t.accent;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;}}
                  >
                    <span aria-hidden="true">📎</span>
                    <span style={{fontWeight:500}}>{a.name}</span>
                    <span style={{color:t.textMuted}}>{a.size}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
  
          {/* Fix #1 — sanitized email body */}
          <div style={{flex:1,overflowY:"auto",padding:`20px ${isMobile?16:28}px`}}>
            <article
              className="email-body"
              aria-label="Email body"
              style={{fontSize:14.5,lineHeight:1.75,color:t.text,maxWidth:660}}
              dangerouslySetInnerHTML={{__html:sanitizeEmailBody(email.body)}}
            />
          </div>
  
          <div role="toolbar" aria-label="Reply options" style={{padding:`10px ${isMobile?12:22}px`,borderTop:`1px solid ${t.border}`,background:t.surface,backdropFilter:t.blur,WebkitBackdropFilter:t.blur,display:"flex",gap:8,flexWrap:"wrap",flexShrink:0}}>
            {["Reply","Reply All","Forward"].map(a=>(
              <button key={a} onClick={a==="Reply"?onReply:a==="Forward"?onForward:undefined}
                style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${t.borderStrong}`,background:"transparent",color:t.text,fontSize:12.5,fontWeight:500,cursor:"pointer",transition:"all .12s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=t.accent;e.currentTarget.style.color=t.accent;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=t.borderStrong;e.currentTarget.style.color=t.text;}}
              >{a}</button>
            ))}
          </div>
        </main>
      </ErrorBoundary>
    );
  };
  
  // ─── COMPOSE MODAL ────────────────────────────────────────────────────────────
  // Fix #7 — attachment upload wired
  const ComposeModal = ({onClose,replyTo,isMobile,store,activeAccount}) => {
    const {t} = useContext(ThemeCtx);
    const [to,      setTo]      = useState(replyTo?.from.email??"");
    const [subject, setSubj]    = useState(replyTo?`Re: ${replyTo.subject}`:"");
    const [body,    setBody]    = useState(activeAccount?.signature??"");
    const [sending, setSending] = useState(false);
    const [sent,    setSent]    = useState(false);
    const [min,     setMin]     = useState(false);
    const [attachments, setAttachments] = useState([]); // Fix #7
    const fileInputRef = useRef(null);
  
    // Fix #7 — handle file selection
    const handleFileSelect = useCallback((e) => {
      const files = Array.from(e.target.files);
      const newAttachments = files.map(f => ({
        id:   Math.random().toString(36).slice(2),
        file: f,
        name: f.name,
        size: fmtBytes(f.size),
        type: f.type,
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
      e.target.value = ""; // reset so same file can be re-added
    }, []);
  
    const removeAttachment = useCallback((id) => {
      setAttachments(prev => prev.filter(a => a.id !== id));
    }, []);
  
    const send = async () => {
      if (!to||!subject) return;
      setSending(true);
      await store.sendEmail({
        to, subject, body,
        from:        activeAccount?.email    || "me@mailflow.app",
        fromName:    activeAccount?.name     || "Me",
        attachments: attachments.map(a => ({ name:a.name, size:a.size, file:a.file })),
        // Tauri: invoke will receive the file objects or paths
      });
      setSending(false); setSent(true);
      setTimeout(()=>{setSent(false);onClose();},1200);
    };
  
    return (
      <FocusTrap onEscape={onClose}>
        {isMobile&&<div onClick={onClose} style={{position:"fixed",inset:0,zIndex:60,background:"rgba(0,0,0,0.35)",animation:"fadeIn .18s ease"}}/>}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={replyTo?`Reply to ${replyTo.subject}`:"New Message"}
          className={isMobile?"anim-siu":"anim-scaleUp"}
          style={{
            background:t.surfaceSolid,border:`1px solid ${t.border}`,
            display:"flex",flexDirection:"column",overflow:"hidden",zIndex:61,
            ...(isMobile?{position:"fixed",inset:0,borderRadius:0}:{
              position:"fixed",bottom:20,right:20,width:520,borderRadius:14,
              height:min?48:attachments.length>0?520:460,boxShadow:t.shadowLg,
              transition:"height .2s cubic-bezier(.4,0,.2,1)",
            }),
          }}>
  
          {/* Title bar */}
          <div onClick={()=>!isMobile&&setMin(!min)} style={{
            padding:"11px 14px",background:t.topbarBg,backdropFilter:t.blur,
            borderBottom:`1px solid ${t.border}`,
            display:"flex",alignItems:"center",justifyContent:"space-between",
            cursor:isMobile?"default":"pointer",flexShrink:0,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {activeAccount&&(
                <div style={{...accountAvatarStyle(activeAccount,20),fontSize:9,fontWeight:700}} aria-hidden="true">
                  {activeAccount.avatarInitials}
                </div>
              )}
              <span style={{fontSize:13,fontWeight:600,color:t.text}}>
                {replyTo?`Re: ${replyTo.subject}`:"New Message"}
              </span>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {!isMobile&&<button onClick={e=>{e.stopPropagation();setMin(!min);}} aria-label={min?"Expand compose window":"Minimize compose window"} style={{width:13,height:13,borderRadius:"50%",background:t.yellow,border:"none",cursor:"pointer"}}/>}
              <button onClick={e=>{e.stopPropagation();onClose();}} aria-label="Close compose window" style={{width:13,height:13,borderRadius:"50%",background:t.red,border:"none",cursor:"pointer"}}/>
            </div>
          </div>
  
          {(!min||isMobile)&&<>
            {/* Fields */}
            {[
              {label:"To",      val:to,      set:setTo,   ph:"recipient@example.com", type:"email"},
              {label:"Subject", val:subject, set:setSubj, ph:"Subject",               type:"text"},
            ].map(f=>(
              <div key={f.label} style={{display:"flex",alignItems:"center",padding:"7px 14px",borderBottom:`1px solid ${t.border}`,gap:8}}>
                <label htmlFor={`compose-${f.label.toLowerCase()}`} style={{fontSize:12,color:t.textMuted,width:48,flexShrink:0}}>{f.label}:</label>
                <input
                  id={`compose-${f.label.toLowerCase()}`}
                  type={f.type}
                  value={f.val}
                  onChange={e=>f.set(e.target.value)}
                  placeholder={f.ph}
                  style={{flex:1,border:"none",background:"transparent",outline:"none",fontSize:13,color:t.text}}
                />
              </div>
            ))}
  
            <label htmlFor="compose-body" style={{position:"absolute",width:1,height:1,overflow:"hidden",clip:"rect(0,0,0,0)"}}>Message body</label>
            <textarea
              id="compose-body"
              value={body}
              onChange={e=>setBody(e.target.value)}
              placeholder="Write your message here…"
              style={{flex:1,border:"none",outline:"none",resize:"none",padding:"12px 14px",fontSize:13.5,lineHeight:1.7,color:t.text,background:"transparent",fontFamily:"inherit",minHeight:isMobile?180:0}}
            />
  
            {/* Fix #7 — Attachment queue display */}
            {attachments.length>0&&(
              <div role="list" aria-label="Attachments to send" style={{padding:"6px 14px",borderTop:`1px solid ${t.border}`,display:"flex",flexWrap:"wrap",gap:6,flexShrink:0}}>
                {attachments.map(a=>(
                  <div key={a.id} role="listitem" style={{display:"flex",alignItems:"center",gap:5,padding:"4px 8px",background:t.surfaceHover,borderRadius:6,border:`1px solid ${t.border}`,fontSize:11.5}}>
                    <span aria-hidden="true">📎</span>
                    <span style={{color:t.text,fontWeight:500,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</span>
                    <span style={{color:t.textMuted}}>{a.size}</span>
                    <button onClick={()=>removeAttachment(a.id)} aria-label={`Remove attachment ${a.name}`} style={{background:"none",border:"none",cursor:"pointer",color:t.textMuted,fontSize:13,padding:0,marginLeft:2,lineHeight:1}}>✕</button>
                  </div>
                ))}
              </div>
            )}
  
            {/* Toolbar */}
            <div style={{padding:"9px 14px",borderTop:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <div style={{display:"flex",gap:3,alignItems:"center"}}>
                {/* Fix #7 — real file attachment trigger */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  aria-label="Attach files"
                  style={{position:"absolute",width:1,height:1,overflow:"hidden",clip:"rect(0,0,0,0)"}}
                />
                {["B","I","U","🔗"].map(f=>(
                  <button key={f} aria-label={f==="B"?"Bold":f==="I"?"Italic":f==="U"?"Underline":"Insert link"} style={{background:"transparent",border:"none",cursor:"pointer",color:t.textSub,fontSize:f.length>1?13:12,padding:"3px 5px",borderRadius:4}}
                    onMouseEnter={e=>e.currentTarget.style.background=t.surfaceHover}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                  >{f}</button>
                ))}
                <button
                  onClick={()=>fileInputRef.current?.click()}
                  aria-label="Attach file"
                  style={{background:"transparent",border:"none",cursor:"pointer",color:t.textSub,fontSize:13,padding:"3px 5px",borderRadius:4,position:"relative"}}
                  onMouseEnter={e=>e.currentTarget.style.background=t.surfaceHover}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                >
                  📎
                  {attachments.length>0&&(
                    <span aria-label={`${attachments.length} attachments`} style={{position:"absolute",top:0,right:0,width:14,height:14,borderRadius:"50%",background:t.accent,color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {attachments.length}
                    </span>
                  )}
                </button>
              </div>
  
              <button
                onClick={send}
                disabled={sending||sent||!to||!subject}
                aria-label={sending?"Sending…":sent?"Email sent":"Send email"}
                aria-busy={sending}
                style={{
                  padding:"7px 18px",borderRadius:8,border:"none",
                  background:sent?t.green:sending?`${t.accent}88`:t.accent,
                  color:"#fff",fontSize:13,fontWeight:600,
                  cursor:sending||sent?"default":"pointer",
                  opacity:(!to||!subject)&&!sending?.5:1,
                  display:"flex",alignItems:"center",gap:5,
                  transition:"all .18s",
                  boxShadow:`0 2px 8px ${t.accentGlow}`,
                }}>
                {sending?<><span aria-hidden="true" style={{animation:"spin .8s linear infinite",display:"inline-block"}}>⟳</span>Sending…</>:sent?"✓ Sent!":"Send ↑"}
              </button>
            </div>
          </>}
        </div>
      </FocusTrap>
    );
  };
  
  // ─── STATUS BAR ───────────────────────────────────────────────────────────────
  const StatusBar = ({lastSync,accountCount}) => {
    const {t} = useContext(ThemeCtx);
    return (
      <div role="contentinfo" style={{height:22,flexShrink:0,background:t.sidebarBg,backdropFilter:t.blur,WebkitBackdropFilter:t.blur,borderTop:`1px solid ${t.border}`,display:"flex",alignItems:"center",padding:"0 16px",gap:14}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div aria-hidden="true" style={{width:6,height:6,borderRadius:"50%",background:t.green,boxShadow:`0 0 4px ${t.green}`}}/>
          <span style={{fontSize:10,color:t.textMuted}}>Connected · {accountCount} account{accountCount!==1?"s":""}</span>
        </div>
        {lastSync&&<time dateTime={lastSync.toISOString()} style={{fontSize:10,color:t.textMuted}}>Synced {fmtDate(lastSync)}</time>}
        <div style={{flex:1}}/>
        <span style={{fontSize:10,color:t.textMuted}}>MailFlow v4.0 · Rust backend</span>
      </div>
    );
  };
  
  // ─── ROOT APP ─────────────────────────────────────────────────────────────────
  export default function App() {
    const { dark, accentId, theme: t, toggleDark, setAccent } = useThemePrefs();
    const { isMobile, isTablet, isDesktop } = useBreakpoint();
    const {
      accounts, activeAccount, activeAccountId,
      switchAccount, addAccount, removeAccount, updateAccount,
      getUnreadCounts,
    } = useAccounts();
  
    const [activeFolder, setActiveFolder] = useState("inbox");
    const [sidebarOpen,  setSidebarOpen]  = useState(false);
    const [composing,    setComposing]    = useState(false);
    const [replyTo,      setReplyTo]      = useState(null);
    const [searchQuery,  setSearchQuery]  = useState("");
    const [mobileView,   setMobileView]   = useState("list");
    const [showSettings, setShowSettings] = useState(false);
    const [toasts,       setToasts]       = useState([]);
    const [folderPicker, setFolderPicker] = useState(null);
    const [confirm,      setConfirm]      = useState(null);
    const [showHelp,     setShowHelp]     = useState(false); // Fix #5
  
    const searchFocusRef = useRef(null); // Fix #5 — keyboard / focus search
  
    const store        = useMailStore(activeAccountId, activeFolder);
    const { announce } = useLiveRegion();                                // Fix #6
    const unreadCounts = getUnreadCounts([]);
  
    // Fix #6 — inject a11y styles whenever accent changes
    useEffect(() => { injectA11yStyles(t.accent); }, [t.accent]);
  
    // ── Toast helpers ──────────────────────────────────────────────────────
    const addToast = useCallback((message, icon="ℹ️", undoId=null) => {
      const id = Date.now();
      setToasts(p => [...p.slice(-3), { id, message, icon, undoId }]);
      announce(message); // Fix #6 — announce to screen readers
      setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)), 4000);
    }, [announce]);
  
    const dismissToast = useCallback((id) => setToasts(p=>p.filter(t=>t.id!==id)), []);
  
    const handleUndo = useCallback(async (toast) => {
      if (toast.undoId) {
        await store.restoreEmail(toast.undoId);
        addToast("Message restored", "↺");
      }
      dismissToast(toast.id);
    }, [store, addToast, dismissToast]);
  
    // ── Wired actions ──────────────────────────────────────────────────────
    const handleDelete = useCallback(async (id) => {
      await store.deleteEmail(id);
      const permanent = activeFolder==="trash";
      addToast(permanent?"Message deleted permanently":"Moved to Trash", "🗑", permanent?null:id);
      if (isMobile) setMobileView("list");
    }, [store, activeFolder, addToast, isMobile]);
  
    const handleMove = useCallback(async (targetFolder) => {
      if (folderPicker==="bulk") {
        const count = await store.bulkMove(targetFolder);
        addToast(`${count} message${count!==1?"s":""} moved to ${targetFolder}`, "📁");
      } else if (folderPicker) {
        await store.moveToFolder(folderPicker, targetFolder);
        addToast(`Moved to ${targetFolder}`, "📁");
      }
      setFolderPicker(null);
    }, [store, folderPicker, addToast]);
  
    const handleSelect = useCallback(async (email) => {
      await store.selectEmail(email);
      if (isMobile) setMobileView("preview");
    }, [store, isMobile]);
  
    const handleFolderSelect = useCallback((f) => {
      setActiveFolder(f); setSidebarOpen(false); setMobileView("list");
    }, []);
  
    const handleSearch = useCallback((q) => { store.search(q); }, [store]);
  
    // Fix #5 — keyboard shortcuts
    const { focusedIndex, setShowHelp: kbSetShowHelp } = useKeyboard({
      emails:          store.emails,
      selected:        store.selected,
      onSelect:        handleSelect,
      onDelete:        handleDelete,
      onArchive:       (id) => store.archiveEmail(id),
      onReply:         (email) => { setReplyTo(email); setComposing(true); },
      onForward:       () => { setReplyTo(null); setComposing(true); },
      onCompose:       () => { setReplyTo(null); setComposing(true); },
      onToggleStar:    store.toggleStar,
      onToggleRead:    store.markRead,
      onFolderSelect:  handleFolderSelect,
      onSearch:        () => searchFocusRef.current?.(),
      onClose:         () => { if(isMobile&&mobileView==="preview") setMobileView("list"); },
      enabled:         !composing && !showSettings && !showHelp,
    });
  
    const currentFolderLabel = activeFolder.charAt(0).toUpperCase()+activeFolder.slice(1);
  
    return (
      <ErrorBoundary name="MailFlow App">
        <ThemeCtx.Provider value={{ t, dark, accentId }}>
          <GlobalStyles />
          <SkipToMain t={t} />
    
          {/* ========================= */}
          {/* MAIN SCREEN SWITCH */}
          {/* ========================= */}
          {!activeAccount ? (
    
            // =========================
            // 👇 ONBOARDING SCREEN
            // =========================
            <div style={{
              width: "100vw",
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 12,
              background: t.bg,
              color: t.text
            }}>
              <h2 style={{ fontSize: 40 }}>Welcome to MailFlow</h2>
    
              <p style={{ fontSize: 23, margin: 22,color: t.textMuted }}>
                Connect your email to get started
              </p>
    
              <button
                onClick={() => setShowSettings(true)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: t.accent,
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Connect Email
              </button>
            </div>
    
          ) : (
    
            // =========================
            // 👇 FULL APP
            // =========================
            <div className="t-trans" style={{
              width:"100vw",
              height:"100vh",
              background:t.bg,
              display:"flex",
              flexDirection:"column",
              overflow:"hidden",
              fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif",
            }}>
    
              {/* TOP BAR */}
              <TopBar
                onMenu={()=>setSidebarOpen(true)}
                onCompose={()=>{setReplyTo(null);setComposing(true);}}
                onSearch={handleSearch}
                onToggleDark={toggleDark}
                dark={dark}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isMobile={isMobile}
                showBack={isMobile&&mobileView==="preview"}
                onBack={()=>setMobileView("list")}
                backLabel={currentFolderLabel}
                activeAccount={activeAccount}
                onShowHelp={()=>setShowHelp(true)}
              />
    
              {/* MAIN */}
              <div style={{flex:1,display:"flex",overflow:"hidden",position:"relative"}}>
    
                {isDesktop
                  ? <Sidebar
                      folders={activeAccount?.folders||[]}
                      activeFolder={activeFolder}
                      onSelect={handleFolderSelect}
                      isMobile={false}
                      accounts={accounts}
                      activeAccountId={activeAccountId}
                      switchAccount={switchAccount}
                      onSettings={()=>setShowSettings(true)}
                      unreadCounts={unreadCounts}
                    />
                  : sidebarOpen && (
                    <>
                      <div
                        onClick={()=>setSidebarOpen(false)}
                        style={{
                          position:"absolute",
                          inset:0,
                          zIndex:40,
                          background:"rgba(0,0,0,0.35)"
                        }}
                      />
                      <Sidebar
                        folders={activeAccount?.folders||[]}
                        activeFolder={activeFolder}
                        onSelect={handleFolderSelect}
                        onClose={()=>setSidebarOpen(false)}
                        isMobile={true}
                        accounts={accounts}
                        activeAccountId={activeAccountId}
                        switchAccount={switchAccount}
                        onSettings={()=>{setShowSettings(true);setSidebarOpen(false);}}
                        unreadCounts={unreadCounts}
                      />
                    </>
                  )
                }
    
                {(isDesktop||isTablet)&&(
                  <>
                    <EmailList
                      emails={store.emails}
                      selected={store.selected}
                      onSelect={handleSelect}
                      loading={store.loading}
                      hasError={store.hasError}
                      error={store.error}
                      activeFolder={activeFolder}
                      isMobile={false}
                      store={store}
                      onShowFolderPicker={setFolderPicker}
                      focusedIndex={focusedIndex}
                    />
    
                    <PreviewPane
                      email={store.selected}
                      store={store}
                      onReply={()=>{setReplyTo(store.selected);setComposing(true);}}
                      onForward={()=>{setReplyTo(null);setComposing(true);}}
                      isMobile={false}
                      onShowFolderPicker={setFolderPicker}
                    />
                  </>
                )}
    
                {isMobile && (
                  mobileView==="list"
                    ? <EmailList
                        emails={store.emails}
                        selected={store.selected}
                        onSelect={handleSelect}
                        loading={store.loading}
                        hasError={store.hasError}
                        error={store.error}
                        activeFolder={activeFolder}
                        isMobile={true}
                        store={store}
                        onShowFolderPicker={setFolderPicker}
                        focusedIndex={focusedIndex}
                      />
                    : store.selected && (
                        <PreviewPane
                          email={store.selected}
                          store={store}
                          onReply={()=>{setReplyTo(store.selected);setComposing(true);}}
                          onForward={()=>{setReplyTo(null);setComposing(true);}}
                          onClose={()=>setMobileView("list")}
                          isMobile={true}
                          onShowFolderPicker={setFolderPicker}
                        />
                      )
                )}
    
              </div>
    
              {isMobile && <BottomNav activeFolder={activeFolder} onSelect={handleFolderSelect}/>}
              {isDesktop && <StatusBar lastSync={store.lastSync} accountCount={accounts.length}/>}
    
              {composing && (
                <ComposeModal
                  onClose={()=>{setComposing(false);setReplyTo(null);}}
                  replyTo={replyTo}
                  isMobile={isMobile}
                  store={store}
                  activeAccount={activeAccount}
                />
              )}
    
            </div>
    
          )}
    
          {/* ========================= */}
          {/* GLOBAL MODALS (ALWAYS OUTSIDE) */}
          {/* ========================= */}
          {showSettings && (
            <FocusTrap onEscape={()=>setShowSettings(false)}>
              <ThemeSettings
                onClose={()=>setShowSettings(false)}
                dark={dark}
                toggleDark={toggleDark}
                accentId={accentId}
                setAccent={setAccent}
                accounts={accounts}
                activeAccountId={activeAccountId}
                switchAccount={switchAccount}
                removeAccount={removeAccount}
                addAccount={addAccount}
                theme={t}
                isMobile={isMobile}
              />
            </FocusTrap>
          )}
    
          {folderPicker && (
            <FolderPicker
              onSelect={handleMove}
              onClose={()=>setFolderPicker(null)}
              currentFolder={activeFolder}
              t={t}
            />
          )}
    
          {confirm && (
            <ConfirmDialog {...confirm} onCancel={()=>setConfirm(null)} />
          )}
    
          {showHelp && (
            <KeyboardHelpOverlay onClose={()=>setShowHelp(false)} t={t} />
          )}
    
          <ToastStack toasts={toasts} onDismiss={dismissToast} onUndo={handleUndo} />
    
        </ThemeCtx.Provider>
      </ErrorBoundary>
    );
  }
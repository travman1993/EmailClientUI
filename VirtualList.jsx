/**
 * VirtualList.jsx  — Fix #4: Virtual Scrolling for Large Mailboxes
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders only the email rows visible in the viewport + a small overscan buffer.
 * Without this: 5,000 emails = 5,000 DOM nodes = sluggish scroll + janky render.
 * With this:    5,000 emails = ~20 DOM nodes at any time = instant.
 *
 * Zero dependencies — pure React + DOM measurement.
 * Drop-in replacement for the email list <div> scroll container.
 *
 * Usage:
 *   <VirtualList
 *     items={emails}           // array of any items
 *     itemHeight={68}          // fixed row height in px (or estimatedHeight for variable)
 *     renderItem={(item, index, style) => (
 *       <EmailItem key={item.id} email={item} style={style} ... />
 *     )}
 *     containerStyle={{ flex: 1, overflowY: "auto" }}
 *   />
 *
 * Variable height usage:
 *   <VirtualList
 *     items={emails}
 *     estimatedHeight={72}      // used before measurement
 *     getItemKey={item => item.id}
 *     renderItem={...}
 *   />
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── FIXED-HEIGHT VIRTUAL LIST ────────────────────────────────────────────────
// Fast path: all rows are the same height. No measurement needed.

export function VirtualList({
  items,
  itemHeight = 72,
  renderItem,
  containerStyle = {},
  overscan = 5,          // extra rows to render above/below viewport
  onScrollEnd,           // called when user scrolls to bottom (for pagination)
  scrollEndThreshold = 200, // px from bottom to trigger onScrollEnd
}) {
  const containerRef  = useRef(null);
  const [scrollTop,  setScrollTop]  = useState(0);
  const [viewHeight, setViewHeight] = useState(600);

  // Measure container height on mount and resize
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setViewHeight(e.contentRect.height);
      }
    });
    ro.observe(containerRef.current);
    setViewHeight(containerRef.current.clientHeight);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback((e) => {
    const st = e.currentTarget.scrollTop;
    setScrollTop(st);

    // Trigger pagination load when near bottom
    if (onScrollEnd) {
      const { scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - st - clientHeight < scrollEndThreshold) {
        onScrollEnd();
      }
    }
  }, [onScrollEnd, scrollEndThreshold]);

  // Calculate which items to render
  const { startIndex, endIndex, offsetY, totalHeight } = useMemo(() => {
    const total      = items.length * itemHeight;
    const rawStart   = Math.floor(scrollTop / itemHeight);
    const start      = Math.max(0, rawStart - overscan);
    const visible    = Math.ceil(viewHeight / itemHeight);
    const end        = Math.min(items.length - 1, rawStart + visible + overscan);
    return {
      startIndex:  start,
      endIndex:    end,
      offsetY:     start * itemHeight,
      totalHeight: total,
    };
  }, [scrollTop, viewHeight, itemHeight, items.length, overscan]);

  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        overflowY: "auto",
        position:  "relative",
        ...containerStyle,
      }}
    >
      {/* Spacer that gives the scrollbar the correct total height */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {/* Visible rows, absolutely positioned */}
        <div style={{ position: "absolute", top: offsetY, left: 0, right: 0 }}>
          {visibleItems.map((item, i) => {
            const absoluteIndex = startIndex + i;
            return renderItem(item, absoluteIndex, {
              // Pass style so rows can use it if needed (height locking)
              height:   itemHeight,
              overflow: "hidden",
            });
          })}
        </div>
      </div>
    </div>
  );
}

// ─── VARIABLE-HEIGHT VIRTUAL LIST ─────────────────────────────────────────────
// For rows with different heights. Measures each row after first render.
// Falls back to estimatedHeight until measured.

export function VariableVirtualList({
  items,
  estimatedHeight = 72,
  getItemKey,
  renderItem,
  containerStyle = {},
  overscan = 5,
  onScrollEnd,
  scrollEndThreshold = 200,
}) {
  const containerRef  = useRef(null);
  const itemRefs      = useRef({});        // key → measured height
  const heightCache   = useRef({});        // key → height
  const [scrollTop,  setScrollTop]  = useState(0);
  const [viewHeight, setViewHeight] = useState(600);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setViewHeight(e.contentRect.height);
    });
    ro.observe(containerRef.current);
    setViewHeight(containerRef.current.clientHeight);
    return () => ro.disconnect();
  }, []);

  // Build cumulative offsets
  const { offsets, totalHeight } = useMemo(() => {
    const offs  = new Array(items.length + 1).fill(0);
    for (let i = 0; i < items.length; i++) {
      const key = getItemKey ? getItemKey(items[i]) : i;
      const h   = heightCache.current[key] ?? estimatedHeight;
      offs[i + 1] = offs[i] + h;
    }
    return { offsets: offs, totalHeight: offs[items.length] };
  }, [items, estimatedHeight, getItemKey]);

  // Binary search for first visible item
  const findStartIndex = useCallback((st) => {
    let lo = 0, hi = items.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (offsets[mid + 1] < st) lo = mid + 1;
      else hi = mid;
    }
    return Math.max(0, lo - overscan);
  }, [offsets, items.length, overscan]);

  const startIndex = findStartIndex(scrollTop);
  const endIndex   = useMemo(() => {
    let i = startIndex;
    while (i < items.length && offsets[i] < scrollTop + viewHeight + overscan * estimatedHeight) i++;
    return Math.min(items.length - 1, i + overscan);
  }, [startIndex, scrollTop, viewHeight, items.length, offsets, overscan, estimatedHeight]);

  const handleScroll = useCallback((e) => {
    const st = e.currentTarget.scrollTop;
    setScrollTop(st);
    if (onScrollEnd) {
      const { scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - st - clientHeight < scrollEndThreshold) onScrollEnd();
    }
  }, [onScrollEnd, scrollEndThreshold]);

  // Measure item heights after render
  const measureItem = useCallback((el, key) => {
    if (!el) return;
    const h = el.getBoundingClientRect().height;
    if (h > 0 && heightCache.current[key] !== h) {
      heightCache.current[key] = h;
      forceUpdate(n => n + 1); // re-calculate offsets
    }
  }, []);

  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ overflowY: "auto", position: "relative", ...containerStyle }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map((item, i) => {
          const absoluteIndex = startIndex + i;
          const key           = getItemKey ? getItemKey(item) : absoluteIndex;
          const top           = offsets[absoluteIndex];
          return (
            <div
              key={key}
              ref={el => measureItem(el, key)}
              style={{ position: "absolute", top, left: 0, right: 0 }}
            >
              {renderItem(item, absoluteIndex, {})}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PAGINATION SENTINEL ──────────────────────────────────────────────────────
// Invisible element at the bottom of a list.
// When it enters the viewport, calls onVisible (for infinite scroll pagination).

export function PaginationSentinel({ onVisible, loading, t }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !onVisible) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && !loading) onVisible(); },
      { threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onVisible, loading]);

  return (
    <div ref={ref} style={{
      height: 48,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 16, height: 16,
            border: `2px solid ${t?.border || "rgba(0,0,0,0.1)"}`,
            borderTopColor: t?.accent || "#007AFF",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            display: "inline-block",
          }} />
          <span style={{ fontSize: 12, color: t?.textMuted || "#aeaeb2" }}>
            Loading more…
          </span>
        </div>
      )}
    </div>
  );
}
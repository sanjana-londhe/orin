"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

const D = {
  surface:       "#ffffff",
  surfacePage:   "#fcfdfc",
  stone100:      "#f8f9f5",
  stone200:      "#f1f3ef",
  stone400:      "#dde4de",
  stone500:      "#c4cbc2",
  accent:        "#059669",
  accentSubtle:  "#f2fdec",
  limeInk:       "#082d1d",
  textSecondary: "#3d5a4a",
  textTertiary:  "#4a6d47",
  textMuted:     "#b9d3c4",
};

const DAYS   = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getToday()    { return new Date().toISOString().slice(0, 10); }
function getTomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
function shortFmt(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MiniCalendar({ selected, onSelect, fullWidth }: { selected: string; onSelect: (iso: string) => void; fullWidth?: boolean }) {
  const today = getToday();
  const [view, setView] = useState(() => {
    const d = selected ? new Date(selected + "T12:00:00") : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const { year, month } = view;
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function isoOf(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return (
    <div style={{
      background: D.surface,
      border: `1.5px solid ${D.stone400}`,
      borderRadius: 4,
      padding: "12px 14px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.09)",
      width: fullWidth ? "100%" : 248,
      userSelect: "none",
      boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button
          onClick={() => setView(v => { const d = new Date(v.year, v.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: D.textTertiary, display: "flex", alignItems: "center" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = D.stone200}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
        ><ChevronLeft size={14} /></button>

        <span style={{ fontSize: 12.5, fontWeight: 600, color: D.limeInk }}>
          {MONTHS[month]} {year}
        </span>

        <button
          onClick={() => setView(v => { const d = new Date(v.year, v.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: D.textTertiary, display: "flex", alignItems: "center" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = D.stone200}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
        ><ChevronRight size={14} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: D.textMuted, padding: "2px 0" }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iso        = isoOf(day);
          const isSelected = iso === selected;
          const isToday    = iso === today;
          const isPast     = iso < today;
          return (
            <button key={i} onClick={() => !isPast && onSelect(iso)} style={{
              width: "100%", aspectRatio: "1",
              borderRadius: 6,
              border: isToday && !isSelected ? `1.5px solid ${D.accent}` : "none",
              background: isSelected ? D.accent : "transparent",
              color: isSelected ? "#fff" : isPast ? D.textMuted : D.limeInk,
              fontSize: 12.5,
              fontWeight: isSelected || isToday ? 700 : 400,
              cursor: isPast ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.1s", minHeight: 30,
            }}
              onMouseEnter={e => { if (!isSelected && !isPast) (e.currentTarget as HTMLElement).style.background = D.accentSubtle; }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >{day}</button>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  calendarOnly?: boolean;
  dropUp?: boolean;
}

export function DatePickerField({ value, onChange, label = "Due date", calendarOnly = false, dropUp }: Props) {
  const today    = getToday();
  const tomorrow = getTomorrow();
  const [open, setOpen]       = useState(false);
  const [showCal, setShowCal] = useState(false);
  const [fixedPos, setFixedPos] = useState({ top: 0, left: 0 });
  const isMobile = useIsMobile();
  const ref       = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setShowCal(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleOpen() {
    if (!isMobile && buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setFixedPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(o => !o);
    setShowCal(calendarOnly);
  }

  function select(val: string) { onChange(val); setOpen(false); setShowCal(false); }

  const displayText =
    value === today    ? "Today" :
    value === tomorrow ? "Tomorrow" :
    value              ? shortFmt(value) : "Pick a date";

  // Mobile: full-width panel anchored above tab bar
  const mobileDropdownStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 68,
    left: 16,
    right: 16,
    zIndex: 300,
    maxHeight: "70vh",
    overflowY: "auto",
  };

  // Desktop: fixed to escape overflow:hidden ancestors, positioned below trigger
  const desktopPositionStyle: React.CSSProperties = {
    position: "fixed",
    top: fixedPos.top,
    left: fixedPos.left,
    display: "flex", gap: 8, zIndex: 300,
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {label && (
        <p style={{ fontSize: 11, fontWeight: 600, color: D.textTertiary, margin: "0 0 6px" }}>{label}</p>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", height: 38, borderRadius: 8,
          border: `1.5px solid ${open ? D.accent : D.stone400}`,
          background: D.surfacePage,
          cursor: "pointer", fontFamily: "inherit",
          transition: "border-color 0.14s",
          boxSizing: "border-box", outline: "none",
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.borderColor = D.stone500; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.borderColor = D.stone400; }}
      >
        <span style={{ fontSize: 13.5, color: value ? D.limeInk : D.textMuted }}>
          {displayText}
        </span>
        <ChevronDown
          size={13} color={D.textTertiary}
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.14s" }}
        />
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          {isMobile && (
            <div
              onClick={() => { setOpen(false); setShowCal(false); }}
              style={{ position: "fixed", inset: 0, zIndex: 299, background: "rgba(8,45,29,0.15)" }}
            />
          )}

          {isMobile ? (
            /* Mobile: stacked panel fixed above bottom nav */
            <div style={{
              ...mobileDropdownStyle,
              background: D.surface, border: `1.5px solid ${D.stone400}`,
              borderRadius: 4, padding: "8px 0",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.1)",
            }}>
              {/* Quick picks */}
              {!showCal && (
                <>
                  {[
                    { val: today,    label: "Today",    sub: shortFmt(today) },
                    { val: tomorrow, label: "Tomorrow", sub: shortFmt(tomorrow) },
                  ].map(opt => (
                    <button key={opt.val} type="button" onClick={() => select(opt.val)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "12px 16px",
                      background: value === opt.val ? D.accentSubtle : "none",
                      border: "none", cursor: "pointer", fontFamily: "inherit",
                    }}>
                      <span style={{ fontSize: 14, color: D.limeInk, fontWeight: value === opt.val ? 600 : 400 }}>{opt.label}</span>
                      <span style={{ fontSize: 12, color: D.textMuted, fontFamily: "var(--font-mono), monospace" }}>{opt.sub}</span>
                    </button>
                  ))}
                  <div style={{ height: 1, background: D.stone400, margin: "4px 0" }} />
                  <button type="button" onClick={() => setShowCal(true)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "12px 16px",
                    background: showCal ? D.accentSubtle : "none",
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                  }}>
                    <span style={{ fontSize: 14, color: D.limeInk }}>Custom date</span>
                    <ChevronRight size={14} color={D.textMuted} />
                  </button>
                </>
              )}
              {showCal && (
                <div style={{ padding: "8px 8px 0" }}>
                  <button type="button" onClick={() => setShowCal(false)} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "4px 8px 10px",
                    background: "none", border: "none", cursor: "pointer", color: D.textTertiary,
                    fontSize: 12.5, fontFamily: "inherit",
                  }}>
                    <ChevronLeft size={13} /> Back
                  </button>
                  <MiniCalendar selected={value} onSelect={iso => select(iso)} fullWidth />
                </div>
              )}
            </div>
          ) : (
            /* Desktop: side-by-side panels */
            <div style={desktopPositionStyle}>
              {calendarOnly ? (
                <MiniCalendar selected={value} onSelect={iso => select(iso)} />
              ) : (
                <>
                  <div style={{
                    background: D.surface, border: `1.5px solid ${D.stone400}`,
                    borderRadius: 4, padding: "4px 0",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.09)", minWidth: 200,
                  }}>
                    {[
                      { val: today,    label: "Today",    sub: shortFmt(today) },
                      { val: tomorrow, label: "Tomorrow", sub: shortFmt(tomorrow) },
                    ].map(opt => (
                      <button key={opt.val} type="button" onClick={() => select(opt.val)} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "9px 14px",
                        background: value === opt.val ? D.accentSubtle : "none",
                        border: "none", cursor: "pointer", fontFamily: "inherit",
                      }}
                        onMouseEnter={e => { if (value !== opt.val) (e.currentTarget as HTMLElement).style.background = D.stone200; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = value === opt.val ? D.accentSubtle : "none"; }}
                      >
                        <span style={{ fontSize: 13.5, color: D.limeInk, fontWeight: value === opt.val ? 600 : 400 }}>{opt.label}</span>
                        <span style={{ fontSize: 11, color: D.textMuted, fontFamily: "var(--font-mono), monospace" }}>{opt.sub}</span>
                      </button>
                    ))}
                    <div style={{ height: 1, background: D.stone400, margin: "4px 0" }} />
                    <button type="button" onClick={() => setShowCal(true)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "9px 14px",
                      background: showCal ? D.accentSubtle : "none",
                      border: "none", cursor: "pointer", fontFamily: "inherit",
                    }}
                      onMouseEnter={e => { if (!showCal) (e.currentTarget as HTMLElement).style.background = D.stone200; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = showCal ? D.accentSubtle : "none"; }}
                    >
                      <span style={{ fontSize: 13.5, color: D.limeInk, fontWeight: showCal ? 600 : 400 }}>Custom date</span>
                      <ChevronRight size={13} color={showCal ? D.accent : D.textMuted} />
                    </button>
                  </div>
                  {showCal && <MiniCalendar selected={value} onSelect={iso => select(iso)} />}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

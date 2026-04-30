"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

// ── Design tokens (design.md) ─────────────────────────────────────
const D = {
  surface:       "#ffffff",
  surfacePage:   "#fafbf7",
  surfaceMuted:  "#f1f3ef",
  border:        "#dde4de",
  borderHover:   "#c4cbc2",
  accent:        "#059669",
  accentSubtle:  "#f2fdec",
  lime:          "#59d10b",
  textPrimary:   "#082d1d",
  textSecondary: "#3d5a4a",
  textTertiary:  "#4a6d47",
  textMuted:     "#b9d3c4",
};

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getToday()    { return new Date().toISOString().slice(0, 10); }
function getTomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
function shortFmt(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Mini Calendar ─────────────────────────────────────────────────
function MiniCalendar({ selected, onSelect }: { selected: string; onSelect: (iso: string) => void }) {
  const today = getToday();
  const [view, setView] = useState(() => {
    const d = selected ? new Date(selected + "T12:00:00") : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const { year, month } = view;
  const firstDay = new Date(year, month, 1).getDay();
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
      background: D.surface, border: `1.5px solid ${D.border}`,
      borderRadius: 12, padding: "12px 14px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.09)",
      width: 240, userSelect: "none",
    }}>
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={() => setView(v => { const d = new Date(v.year, v.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: D.textTertiary, display: "flex", alignItems: "center" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = D.surfaceMuted}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: D.textPrimary }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={() => setView(v => { const d = new Date(v.year, v.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: D.textTertiary, display: "flex", alignItems: "center" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = D.surfaceMuted}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: D.textMuted, padding: "2px 0" }}>{d}</div>
        ))}
      </div>

      {/* Date grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iso = isoOf(day);
          const isSelected = iso === selected;
          const isToday = iso === today;
          const isPast = iso < today;
          return (
            <button key={i} onClick={() => !isPast && onSelect(iso)} style={{
              width: "100%", aspectRatio: "1", borderRadius: 6,
              border: isToday && !isSelected ? `1.5px solid ${D.accent}` : "none",
              background: isSelected ? D.accent : "transparent",
              color: isSelected ? "#fff" : isPast ? D.textMuted : D.textPrimary,
              fontSize: 12, fontWeight: isSelected || isToday ? 700 : 400,
              cursor: isPast ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.1s",
            }}
              onMouseEnter={e => { if (!isSelected && !isPast) (e.currentTarget as HTMLElement).style.background = D.accentSubtle; }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── DatePickerField ───────────────────────────────────────────────
interface Props {
  value: string;
  onChange: (date: string) => void;
  label?: string;
}

export function DatePickerField({ value, onChange, label = "Due date" }: Props) {
  const today    = getToday();
  const tomorrow = getTomorrow();
  const [open, setOpen]       = useState(false);
  const [showCal, setShowCal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setShowCal(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(val: string) {
    onChange(val); setOpen(false); setShowCal(false);
  }

  const displayText =
    value === today    ? "Today" :
    value === tomorrow ? "Tomorrow" :
    value              ? shortFmt(value) : "Pick a date";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {label && (
        <p style={{ fontSize: 11, fontWeight: 600, color: D.textTertiary, margin: "0 0 6px 0" }}>{label}</p>
      )}

      {/* Trigger */}
      <button type="button" onClick={() => { setOpen(o => !o); setShowCal(false); }} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 12px", height: 38, borderRadius: 8,
        border: `1px solid ${open ? D.accent : D.border}`,
        background: D.surfacePage, cursor: "pointer",
        fontFamily: "inherit", transition: "border-color 0.14s", boxSizing: "border-box", outline: "none",
      }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.borderColor = D.borderHover; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.borderColor = D.border; }}>
        <span style={{ fontSize: 13, color: D.textPrimary }}>{displayText}</span>
        <ChevronDown size={13} color={D.textTertiary}
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.14s" }} />
      </button>

      {/* Dropdown options */}
      {open && !showCal && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: D.surface, border: `1.5px solid ${D.border}`,
          borderRadius: 10, padding: "4px 0",
          boxShadow: "0 4px 16px rgba(0,0,0,0.09)", zIndex: 200,
        }}>
          {[
            { val: today,    label: "Today",     sub: shortFmt(today) },
            { val: tomorrow, label: "Tomorrow",  sub: shortFmt(tomorrow) },
          ].map(opt => (
            <button key={opt.val} type="button" onClick={() => select(opt.val)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "9px 14px",
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "inherit", textAlign: "left",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = D.surfaceMuted}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}>
              <span style={{ fontSize: 13, color: D.textPrimary }}>{opt.label}</span>
              <span style={{ fontSize: 11, color: D.textMuted }}>{opt.sub}</span>
            </button>
          ))}
          <div style={{ height: 1, background: D.border, margin: "4px 0" }} />
          <button type="button" onClick={() => setShowCal(true)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", padding: "9px 14px",
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "inherit", textAlign: "left",
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = D.surfaceMuted}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}>
            <span style={{ fontSize: 13, color: D.textPrimary }}>Pick a date</span>
            <ChevronRight size={13} color={D.textMuted} />
          </button>
        </div>
      )}

      {/* Calendar — opens to the right */}
      {open && showCal && (
        <div style={{
          position: "absolute", top: 0, left: "calc(100% + 10px)",
          zIndex: 200,
        }}>
          <MiniCalendar
            selected={value}
            onSelect={iso => select(iso)}
          />
        </div>
      )}
    </div>
  );
}

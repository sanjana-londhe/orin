"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";

// ── Design tokens (design.md) ─────────────────────────────────────
const D = {
  surface:       "#ffffff",
  surfacePage:   "#fafbf7",
  surfaceMuted:  "#f1f3ef",
  accentSubtle:  "#f2fdec",
  border:        "#dde4de",
  borderHover:   "#c4cbc2",
  accent:        "#059669",
  textPrimary:   "#082d1d",
  textSecondary: "#3d5a4a",
  textTertiary:  "#4a6d47",
  textMuted:     "#b9d3c4",
};

const QUICK_TIMES = [
  { label: "Morning",   time: "09:00", sub: "9:00 AM" },
  { label: "Noon",      time: "12:00", sub: "12:00 PM" },
  { label: "Afternoon", time: "15:00", sub: "3:00 PM" },
  { label: "Evening",   time: "18:00", sub: "6:00 PM" },
  { label: "Night",     time: "21:00", sub: "9:00 PM" },
];

function fmt24to12(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

interface Props {
  value: string;         // "HH:MM"
  onChange: (t: string) => void;
  label?: string;
}

export function TimePickerField({ value, onChange, label = "Due time" }: Props) {
  const [open, setOpen]           = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setShowCustom(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(time: string) {
    onChange(time); setOpen(false); setShowCustom(false);
  }

  const display = value ? fmt24to12(value) : "Set time";
  const isQuick = QUICK_TIMES.some(q => q.time === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {label && (
        <p style={{ fontSize: 11, fontWeight: 600, color: D.textTertiary, margin: "0 0 6px 0" }}>
          {label}
        </p>
      )}

      {/* Trigger — identical to DatePickerField */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setShowCustom(false); }}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", height: 38, borderRadius: 8,
          border: `1px solid ${open ? D.accent : D.border}`,
          background: D.surfacePage,
          cursor: "pointer", fontFamily: "inherit",
          transition: "border-color 0.14s", boxSizing: "border-box", outline: "none",
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.borderColor = D.borderHover; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.borderColor = D.border; }}
      >
        <span style={{ fontSize: 13, color: value ? D.textPrimary : D.textMuted }}>
          {display}
        </span>
        <ChevronDown size={13} color={D.textTertiary}
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.14s" }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          display: "flex", gap: 8, zIndex: 200,
        }}>
          {/* Quick options */}
          <div style={{
            background: D.surface, border: `1.5px solid ${D.border}`,
            borderRadius: 10, padding: "4px 0",
            boxShadow: "0 4px 16px rgba(0,0,0,0.09)", minWidth: 180,
          }}>
            {QUICK_TIMES.map(opt => (
              <button key={opt.time} type="button" onClick={() => select(opt.time)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "9px 14px",
                background: value === opt.time ? D.accentSubtle : "none",
                border: "none", cursor: "pointer", fontFamily: "inherit",
              }}
                onMouseEnter={e => { if (value !== opt.time) (e.currentTarget as HTMLElement).style.background = D.surfaceMuted; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = value === opt.time ? D.accentSubtle : "none"; }}>
                <span style={{ fontSize: 13, color: D.textPrimary }}>{opt.label}</span>
                <span style={{ fontSize: 11, color: D.textMuted }}>{opt.sub}</span>
              </button>
            ))}

            <div style={{ height: 1, background: D.border, margin: "4px 0" }} />

            {/* Custom time */}
            <button type="button" onClick={() => setShowCustom(s => !s)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "9px 14px",
              background: showCustom || (!isQuick && value) ? D.accentSubtle : "none",
              border: "none", cursor: "pointer", fontFamily: "inherit",
            }}
              onMouseEnter={e => { if (!showCustom) (e.currentTarget as HTMLElement).style.background = D.surfaceMuted; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = showCustom || (!isQuick && value) ? D.accentSubtle : "none"; }}>
              <span style={{ fontSize: 13, color: D.textPrimary }}>Custom time</span>
              <ChevronRight size={13} color={showCustom ? D.accent : D.textMuted} />
            </button>
          </div>

          {/* Custom time input — opens to the right */}
          {showCustom && (
            <div style={{
              background: D.surface, border: `1.5px solid ${D.border}`,
              borderRadius: 10, padding: "14px 16px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.09)",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={14} color={D.textTertiary} />
                <p style={{ fontSize: 12, fontWeight: 600, color: D.textTertiary, margin: 0 }}>
                  Pick a time
                </p>
              </div>
              <input
                type="time"
                value={value}
                onChange={e => onChange(e.target.value)}
                autoFocus
                style={{
                  padding: "9px 12px", borderRadius: 8,
                  border: `1.5px solid ${D.accent}`,
                  background: D.accentSubtle,
                  fontSize: 14, fontWeight: 500, color: D.textPrimary,
                  fontFamily: "inherit", outline: "none",
                  cursor: "pointer", width: 140,
                }}
              />
              <button type="button" onClick={() => { setOpen(false); setShowCustom(false); }} style={{
                padding: "7px 16px", borderRadius: 8,
                background: D.accent, border: "none", color: "#fff",
                fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>
                Confirm
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

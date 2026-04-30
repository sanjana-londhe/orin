"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

// ── Design tokens (design.md) ────────────────────────────────────────
const D = {
  border:        "#dde4de",   // stone-400
  borderHover:   "#c4cbc2",   // stone-500
  accent:        "#059669",
  accentSubtle:  "#f2fdec",   // lime-50
  textPrimary:   "#082d1d",
  textSecondary: "#3d5a4a",
  textMuted:     "#b9d3c4",
  surface:       "#ffffff",
  surfacePage:   "#fafbf7",   // stone-100-ish
  surfaceMuted:  "#f1f3ef",   // stone-200
};

function getToday()    { return new Date().toISOString().slice(0, 10); }
function getTomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
function fmt(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

type Option = { value: string; label: string; sub?: string };

interface Props {
  value: string;
  onChange: (date: string) => void;
  label?: string;
}

export function DatePickerField({ value, onChange, label = "Due date" }: Props) {
  const today    = getToday();
  const tomorrow = getTomorrow();

  const [open, setOpen]             = useState(false);
  const [showCalendar, setShowCalendar] = useState(value !== today && value !== tomorrow);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const OPTIONS: Option[] = [
    { value: today,    label: "Today",    sub: fmt(today) },
    { value: tomorrow, label: "Tomorrow", sub: fmt(tomorrow) },
    { value: "custom", label: "Custom date", sub: "Pick from calendar" },
  ];

  const isCustom = value !== today && value !== tomorrow;
  const selected = isCustom
    ? { label: fmt(value) || "Custom date", sub: "Custom" }
    : OPTIONS.find(o => o.value === value) ?? OPTIONS[0];

  function selectOption(opt: Option) {
    setOpen(false);
    if (opt.value === "custom") {
      setShowCalendar(true);
    } else {
      setShowCalendar(false);
      onChange(opt.value);
    }
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {label && (
        <p style={{ fontSize: 12, fontWeight: 600, color: D.textPrimary, marginBottom: 8 }}>
          {label}
        </p>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 12px", borderRadius: 8,
          border: `1.5px solid ${open ? D.accent : D.border}`,
          background: open ? D.accentSubtle : D.surface,
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.14s",
          boxSizing: "border-box",
        }}
        onMouseEnter={e => {
          if (!open) (e.currentTarget as HTMLElement).style.borderColor = D.borderHover;
        }}
        onMouseLeave={e => {
          if (!open) (e.currentTarget as HTMLElement).style.borderColor = D.border;
        }}
      >
        <div style={{ textAlign: "left" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: D.textPrimary, lineHeight: 1.3, margin: 0 }}>
            {selected.label}
          </p>
          {selected.sub && (
            <p style={{ fontSize: 10.5, color: D.textMuted, margin: 0, marginTop: 1 }}>{selected.sub}</p>
          )}
        </div>
        <ChevronDown
          size={14}
          color={D.textSecondary}
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.14s" }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: D.surface, border: `1.5px solid ${D.border}`,
          borderRadius: 10, padding: "4px 0",
          boxShadow: "0 4px 16px rgba(0,0,0,0.09)",
          zIndex: 200,
        }}>
          {OPTIONS.map(opt => {
            const isActive = opt.value === "custom" ? isCustom : opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => selectOption(opt)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "10px 14px",
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "inherit", transition: "background 0.1s", textAlign: "left",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = D.surfaceMuted}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: D.textPrimary, margin: 0 }}>
                    {opt.label}
                  </p>
                  <p style={{ fontSize: 10.5, color: D.textMuted, margin: 0, marginTop: 1 }}>{opt.sub}</p>
                </div>
                {isActive && <Check size={14} color={D.accent} style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Calendar input — shown when Custom is selected */}
      {(showCalendar || isCustom) && (
        <input
          type="date"
          value={isCustom ? value : ""}
          min={today}
          onChange={e => { onChange(e.target.value); setShowCalendar(false); setOpen(false); }}
          autoFocus
          style={{
            width: "100%", marginTop: 8,
            padding: "10px 12px",
            border: `1.5px solid ${D.accent}`,
            borderRadius: 8,
            fontSize: 13, color: D.textPrimary,
            background: D.accentSubtle,
            fontFamily: "inherit", outline: "none",
            boxSizing: "border-box",
          }}
        />
      )}
    </div>
  );
}

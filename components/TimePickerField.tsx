"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

// ── Grid-based custom time picker ─────────────────────────────────────

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES_5 = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, ..., 55

function fmtDisplay(h12: number, m: number, ampm: "AM" | "PM") {
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function WheelTimePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [h24, m] = value
    ? value.split(":").map(Number) as [number, number]
    : [9, 0];
  const hour12 = ((h24 + 11) % 12) + 1;
  const ampm: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  // Snap displayed minute to nearest 5
  const minute5 = Math.round(m / 5) * 5 % 60;

  function update(nextHour12: number, nextMinute: number, nextAmpm: "AM" | "PM") {
    let h = nextHour12 === 12 ? 0 : nextHour12;
    if (nextAmpm === "PM") h += 12;
    onChange(`${String(h).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`);
  }

  const cellBase: React.CSSProperties = {
    height: 30, borderRadius: 6, border: "1px solid #dde4de",
    background: "#fff", color: "#082d1d", fontSize: 12.5, fontWeight: 500,
    cursor: "pointer", fontFamily: "inherit",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontVariantNumeric: "tabular-nums",
    transition: "background 0.12s, color 0.12s, border-color 0.12s",
  };
  const cellActive: React.CSSProperties = {
    background: "#059669", color: "#fff", borderColor: "#059669", fontWeight: 700,
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: "#4a6d47",
    textTransform: "uppercase", letterSpacing: "0.06em",
    fontFamily: "var(--font-mono), monospace",
    margin: "0 0 6px",
  };

  return (
    <div style={{ width: 220, userSelect: "none", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Big display */}
      <div style={{
        background: "#f2fdec", border: "1px solid #c8f7ae",
        borderRadius: 8, padding: "8px 12px", textAlign: "center",
      }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#082d1d", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
          {fmtDisplay(hour12, minute5, ampm)}
        </span>
      </div>

      {/* AM/PM segment */}
      <div style={{ display: "flex", gap: 4, background: "#f8f9f5", border: "1px solid #dde4de", borderRadius: 8, padding: 3 }}>
        {(["AM", "PM"] as const).map(p => {
          const active = ampm === p;
          return (
            <button key={p} onClick={() => update(hour12, minute5, p)}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 6,
                border: active ? "1px solid #dde4de" : "1px solid transparent",
                background: active ? "#fff" : "transparent",
                color: active ? "#082d1d" : "#4a6d47",
                fontSize: 12.5, fontWeight: active ? 700 : 500,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.12s",
              }}>
              {p}
            </button>
          );
        })}
      </div>

      {/* Hour grid */}
      <div>
        <p style={sectionLabel}>Hour</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
          {HOURS_12.map(h => {
            const active = h === hour12;
            return (
              <button key={h} onClick={() => update(h, minute5, ampm)}
                style={active ? { ...cellBase, ...cellActive } : cellBase}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f2fdec"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                {h}
              </button>
            );
          })}
        </div>
      </div>

      {/* Minute grid */}
      <div>
        <p style={sectionLabel}>Minute</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
          {MINUTES_5.map(min => {
            const active = min === minute5;
            return (
              <button key={min} onClick={() => update(hour12, min, ampm)}
                style={active ? { ...cellBase, ...cellActive } : cellBase}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f2fdec"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                :{String(min).padStart(2, "0")}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
  value: string;
  onChange: (t: string) => void;
  label?: string;
  selectedDate?: string;
  dropUp?: boolean;
}

export function TimePickerField({ value, onChange, label = "Due time", selectedDate, dropUp }: Props) {
  const [open, setOpen]             = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [fixedPos, setFixedPos]     = useState({ top: 0, left: 0 });
  const isMobile = useIsMobile();

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
  const nowHHMM = `${String(new Date().getHours()).padStart(2,"0")}:${String(new Date().getMinutes()).padStart(2,"0")}`;
  const ref       = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setShowCustom(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(time: string) { onChange(time); setOpen(false); setShowCustom(false); }

  function handleOpen() {
    if (!isMobile && buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setFixedPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(o => !o);
    setShowCustom(false);
  }

  const display = value ? fmt24to12(value) : "Set time";
  const isQuick = QUICK_TIMES.some(q => q.time === value);

  const mobileDropdownStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 68,
    left: 16,
    right: 16,
    zIndex: 300,
    maxHeight: "60vh",
    overflowY: "auto",
  };

  const desktopPositionStyle: React.CSSProperties = {
    position: "fixed",
    top: fixedPos.top,
    left: fixedPos.left,
    display: "flex", gap: 8, zIndex: 300,
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {label && (
        <p style={{ fontSize: 11, fontWeight: 600, color: D.textTertiary, margin: "0 0 6px 0" }}>
          {label}
        </p>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", height: 38, borderRadius: 8,
          border: `1.5px solid ${open ? D.accent : D.border}`,
          background: D.surfacePage,
          cursor: "pointer", fontFamily: "inherit",
          transition: "border-color 0.14s", boxSizing: "border-box", outline: "none",
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.borderColor = D.borderHover; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.borderColor = D.border; }}
      >
        <span style={{ fontSize: 13, color: value ? D.textPrimary : D.textMuted }}>{display}</span>
        <ChevronDown size={13} color={D.textTertiary}
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.14s" }} />
      </button>

      {open && (
        <>
          {isMobile && (
            <div
              onClick={() => { setOpen(false); setShowCustom(false); }}
              style={{ position: "fixed", inset: 0, zIndex: 299, background: "rgba(8,45,29,0.15)" }}
            />
          )}

          {isMobile ? (
            /* Mobile: stacked panel fixed above bottom nav */
            <div style={{
              ...mobileDropdownStyle,
              background: D.surface, border: `1.5px solid ${D.border}`,
              borderRadius: 12, padding: "4px 0",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.1)",
            }}>
              {QUICK_TIMES.map(opt => {
                const isPast = isToday && opt.time <= nowHHMM;
                return (
                  <button key={opt.time} type="button"
                    onClick={() => !isPast && select(opt.time)}
                    disabled={isPast}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "12px 16px",
                      background: value === opt.time ? D.accentSubtle : "none",
                      border: "none", cursor: isPast ? "not-allowed" : "pointer", fontFamily: "inherit",
                      opacity: isPast ? 0.4 : 1,
                    }}
                  >
                    <span style={{ fontSize: 14, color: D.textPrimary }}>{opt.label}</span>
                    <span style={{ fontSize: 12, color: D.textMuted }}>{isPast ? "past" : opt.sub}</span>
                  </button>
                );
              })}
              <div style={{ height: 1, background: D.border, margin: "4px 0" }} />
              <div style={{ padding: "10px 16px" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: D.textTertiary, margin: "0 0 8px" }}>Custom time</p>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <WheelTimePicker value={value || "09:00"} onChange={onChange} />
                </div>
              </div>
              <div style={{ padding: "0 16px 10px" }}>
                <button type="button" onClick={() => setOpen(false)} style={{
                  width: "100%", padding: "10px", borderRadius: 8,
                  background: D.accent, border: "none", color: "#fff",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}>
                  Confirm
                </button>
              </div>
            </div>
          ) : (
            /* Desktop: side-by-side panels */
            <div style={desktopPositionStyle}>
              <div style={{
                background: D.surface, border: `1.5px solid ${D.border}`,
                borderRadius: 10, padding: "4px 0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.09)", minWidth: 180,
              }}>
                {QUICK_TIMES.map(opt => {
                  const isPast = isToday && opt.time <= nowHHMM;
                  return (
                    <button key={opt.time} type="button"
                      onClick={() => !isPast && select(opt.time)}
                      disabled={isPast}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "9px 14px",
                        background: value === opt.time ? D.accentSubtle : "none",
                        border: "none", cursor: isPast ? "not-allowed" : "pointer", fontFamily: "inherit",
                        opacity: isPast ? 0.4 : 1,
                      }}
                      onMouseEnter={e => { if (value !== opt.time && !isPast) (e.currentTarget as HTMLElement).style.background = D.surfaceMuted; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = value === opt.time ? D.accentSubtle : "none"; }}>
                      <span style={{ fontSize: 13, color: D.textPrimary }}>{opt.label}</span>
                      <span style={{ fontSize: 11, color: D.textMuted }}>{isPast ? "past" : opt.sub}</span>
                    </button>
                  );
                })}

                <div style={{ height: 1, background: D.border, margin: "4px 0" }} />
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

              {showCustom && (
                <div style={{
                  background: D.surface, border: `1.5px solid ${D.border}`,
                  borderRadius: 10, padding: "14px 16px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.09)",
                  display: "flex", flexDirection: "column", gap: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Clock size={14} color={D.textTertiary} />
                    <p style={{ fontSize: 12, fontWeight: 600, color: D.textTertiary, margin: 0 }}>Pick a time</p>
                  </div>
                  <WheelTimePicker value={value || "09:00"} onChange={onChange} />
                  <button type="button" onClick={() => { setOpen(false); setShowCustom(false); }} style={{
                    padding: "7px 16px", borderRadius: 8,
                    background: D.accent, border: "none", color: "#fff",
                    fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>Confirm</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

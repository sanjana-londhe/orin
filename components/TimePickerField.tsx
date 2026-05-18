"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

// ── iOS-style wheel time picker ───────────────────────────────────────

const WHEEL_ITEM_H = 36;
const WHEEL_VISIBLE_ROWS = 5; // odd; center row is selection
const WHEEL_HEIGHT = WHEEL_ITEM_H * WHEEL_VISIBLE_ROWS;
const WHEEL_PAD = (WHEEL_HEIGHT - WHEEL_ITEM_H) / 2;

function WheelColumn<T extends string | number>({
  items, value, onChange, format,
}: {
  items: T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  // Sync external value → scroll position (programmatic, don't trigger onChange)
  useEffect(() => {
    if (!ref.current) return;
    const idx = items.indexOf(value);
    if (idx < 0) return;
    const target = idx * WHEEL_ITEM_H;
    if (Math.abs(ref.current.scrollTop - target) > 2) {
      isProgrammaticScroll.current = true;
      ref.current.scrollTop = target;
      setTimeout(() => { isProgrammaticScroll.current = false; }, 100);
    }
  }, [value, items]);

  // Fire onChange on every scroll event so the latest value is committed
  // even if the popover closes mid-scroll (no debounce).
  const handleScroll = useCallback(() => {
    if (!ref.current || isProgrammaticScroll.current) return;
    const idx = Math.round(ref.current.scrollTop / WHEEL_ITEM_H);
    const next = items[Math.max(0, Math.min(items.length - 1, idx))];
    if (next !== undefined && next !== value) onChange(next);
  }, [items, value, onChange]);

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      style={{
        flex: 1, height: WHEEL_HEIGHT,
        overflowY: "auto",
        scrollSnapType: "y mandatory",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
      className="wheel-col"
    >
      <div style={{ paddingTop: WHEEL_PAD, paddingBottom: WHEEL_PAD }}>
        {items.map((item, i) => {
          const active = item === value;
          return (
            <div
              key={i}
              onClick={() => {
                if (ref.current) {
                  isProgrammaticScroll.current = true;
                  ref.current.scrollTop = i * WHEEL_ITEM_H;
                  setTimeout(() => { isProgrammaticScroll.current = false; }, 100);
                }
                onChange(item);
              }}
              style={{
                height: WHEEL_ITEM_H, scrollSnapAlign: "center",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: active ? 19 : 16,
                fontWeight: active ? 700 : 400,
                fontVariantNumeric: "tabular-nums",
                color: active ? "#082d1d" : "#888780",
                cursor: "pointer",
                transition: "font-size 0.15s, color 0.15s",
                userSelect: "none",
              }}
            >
              {format(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const AMPMS = ["AM", "PM"] as const;

export function WheelTimePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [h24, m] = value
    ? value.split(":").map(Number) as [number, number]
    : [9, 0];
  const hour12 = ((h24 + 11) % 12) + 1;
  const ampm: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";

  function update(nextHour12: number, nextMinute: number, nextAmpm: "AM" | "PM") {
    let h = nextHour12 === 12 ? 0 : nextHour12;
    if (nextAmpm === "PM") h += 12;
    onChange(`${String(h).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`);
  }

  return (
    <div style={{ position: "relative", width: 240, height: WHEEL_HEIGHT, userSelect: "none" }}>
      {/* Center selection band — hairlines only so centered text is visible */}
      <div style={{
        position: "absolute", top: WHEEL_PAD, left: 0, right: 0, height: WHEEL_ITEM_H,
        borderTop: "1px solid rgba(5,150,105,0.18)",
        borderBottom: "1px solid rgba(5,150,105,0.18)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Top/bottom fade gradients */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: WHEEL_PAD,
        background: "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0) 100%)",
        pointerEvents: "none", zIndex: 2,
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: WHEEL_PAD,
        background: "linear-gradient(0deg, #ffffff 0%, rgba(255,255,255,0) 100%)",
        pointerEvents: "none", zIndex: 2,
      }} />

      <style>{`.wheel-col::-webkit-scrollbar { display: none; }`}</style>

      <div style={{ display: "flex", height: "100%", gap: 4 }}>
        <WheelColumn items={HOURS_12} value={hour12} onChange={v => update(v, m, ampm)} format={v => String(v)} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: WHEEL_HEIGHT, width: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#082d1d" }}>:</span>
        </div>
        <WheelColumn items={MINUTES} value={m} onChange={v => update(hour12, v, ampm)} format={v => String(v).padStart(2, "0")} />
        <WheelColumn items={[...AMPMS]} value={ampm} onChange={v => update(hour12, m, v)} format={v => v} />
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
  /** Render the trigger as a chip (matches inline create-form chip style). */
  compact?: boolean;
  /** On mobile, anchor the dropdown under the trigger (like the create-form
   *  chip pickers) instead of docking to the bottom nav. */
  inlinePopup?: boolean;
}

export function TimePickerField({ value, onChange, label = "Due time", selectedDate, dropUp, compact, inlinePopup }: Props) {
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
    if (buttonRef.current && (!isMobile || inlinePopup)) {
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
  // Mobile inline-popup: positioned right below the chip, like the create form.
  const mobileInlineStyle: React.CSSProperties = {
    position: "fixed",
    top: fixedPos.top,
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
        style={compact ? {
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "4px 9px", borderRadius: 6,
          background: "#f8f9f5",
          border: "0.5px solid rgba(0,0,0,0.08)",
          color: value ? "#3d5a4a" : "#b9d3c4",
          fontSize: 11, fontWeight: 500,
          cursor: "pointer", fontFamily: "inherit",
        } : {
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", height: 38, borderRadius: 8,
          border: `1.5px solid ${open ? D.accent : D.border}`,
          background: D.surfacePage,
          cursor: "pointer", fontFamily: "inherit",
          transition: "border-color 0.14s", boxSizing: "border-box", outline: "none",
        }}
        onMouseEnter={e => { if (!compact && !open) (e.currentTarget as HTMLElement).style.borderColor = D.borderHover; }}
        onMouseLeave={e => { if (!compact && !open) (e.currentTarget as HTMLElement).style.borderColor = D.border; }}
      >
        <span style={{ fontSize: compact ? 11 : 12, color: compact ? "inherit" : (value ? D.textPrimary : D.textMuted) }}>🕐 {display}</span>
        {!compact && <ChevronDown size={13} color={D.textTertiary}
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.14s" }} />}
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
            /* Mobile: stacked panel — bottom-anchored by default, or below the
               trigger when inlinePopup is set (matches create-form pickers). */
            <div style={{
              ...(inlinePopup ? mobileInlineStyle : mobileDropdownStyle),
              background: D.surface, border: `1.5px solid ${D.border}`,
              borderRadius: 4, padding: "4px 0",
              boxShadow: inlinePopup ? "0 4px 20px rgba(0,0,0,0.1)" : "0 -4px 24px rgba(0,0,0,0.1)",
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
                    <span style={{ fontSize: 12, color: D.textPrimary }}>{opt.label}</span>
                    <span style={{ fontSize: 11, color: D.textMuted }}>{isPast ? "past" : opt.sub}</span>
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
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
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
                borderRadius: 4, padding: "4px 0",
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
                      <span style={{ fontSize: 12, color: D.textPrimary }}>{opt.label}</span>
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
                  <span style={{ fontSize: 12, color: D.textPrimary }}>Custom time</span>
                  <ChevronRight size={13} color={showCustom ? D.accent : D.textMuted} />
                </button>
              </div>

              {showCustom && (
                <div style={{
                  background: D.surface, border: `1.5px solid ${D.border}`,
                  borderRadius: 4, padding: "14px 16px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.09)",
                  display: "flex", flexDirection: "column", gap: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Clock size={14} color={D.textTertiary} />
                    <p style={{ fontSize: 11, fontWeight: 600, color: D.textTertiary, margin: 0 }}>Pick a time</p>
                  </div>
                  <WheelTimePicker value={value || "09:00"} onChange={onChange} />
                  <button type="button" onClick={() => { setOpen(false); setShowCustom(false); }} style={{
                    padding: "7px 16px", borderRadius: 8,
                    background: D.accent, border: "none", color: "#fff",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
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

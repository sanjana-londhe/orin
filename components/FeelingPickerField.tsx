"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

const D = {
  surface:      "#ffffff",
  surfacePage:  "#fafafc",
  surfaceMuted: "#f5f5f7",
  accentSubtle: "#f5f5f7",
  border:       "#e0e0e0",
  borderHover:  "#d2d2d7",
  accent:       "#0066cc",
  textPrimary:  "#1d1d1f",
  textTertiary: "#86868b",
  textMuted:    "#c7c7cc",
};

const FEELINGS = [
  { value: "DREADING", label: "Dreading", emoji: "😮‍💨", bg: "#fdf0f0", fg: "#d70015" },
  { value: "ANXIOUS",  label: "Anxious",  emoji: "😟",   bg: "#fdf4ec", fg: "#b25000" },
  { value: "NEUTRAL",  label: "Neutral",  emoji: "😐",   bg: "#f5f5f7", fg: "#6e6e73" },
  { value: "WILLING",  label: "Willing",  emoji: "🙂",   bg: "#eef6fa", fg: "#0071a4" },
  { value: "EXCITED",  label: "Excited",  emoji: "🤩",   bg: "#eef7f1", fg: "#248a3d" },
] as const;

export type Feeling = typeof FEELINGS[number]["value"] | "";

interface Props {
  value: Feeling;
  onChange: (v: Feeling) => void;
  label?: string;
  dropUp?: boolean;
  /** Render the trigger as a chip (matches inline create-form chip style). */
  compact?: boolean;
}

export function FeelingPickerField({ value, onChange, label = "Feeling", dropUp, compact }: Props) {
  const [open, setOpen]         = useState(false);
  const [fixedPos, setFixedPos] = useState({ top: 0, left: 0 });
  const isMobile  = useIsMobile();
  const ref       = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = FEELINGS.find(f => f.value === value);
  const displayText = selected ? `${selected.emoji} ${selected.label}` : "How are you feeling?";

  function handleOpen() {
    if (!isMobile && buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setFixedPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(o => !o);
  }

  // Mobile: full-width panel anchored above tab bar
  const mobileDropdownStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 68,
    left: 16,
    right: 16,
    zIndex: 300,
    maxHeight: "60vh",
    overflowY: "auto",
  };

  // Desktop: fixed to escape overflow:hidden ancestors
  const desktopDropdownStyle: React.CSSProperties = {
    position: "fixed",
    top: fixedPos.top,
    left: fixedPos.left,
    zIndex: 300,
    minWidth: 190,
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
        style={compact ? {
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "4px 9px", borderRadius: 8,
          background: selected?.bg ?? D.surfacePage,
          border: `0.5px solid ${selected ? selected.fg + "33" : "rgba(0,0,0,0.08)"}`,
          color: selected?.fg ?? D.textTertiary,
          fontSize: 11, fontWeight: 500,
          cursor: "pointer", fontFamily: "inherit",
        } : {
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", height: 38, borderRadius: 8,
          border: `1px solid ${open ? D.accent : D.border}`,
          background: D.surfacePage,
          cursor: "pointer", fontFamily: "inherit",
          transition: "border-color 0.14s", boxSizing: "border-box", outline: "none",
        }}
        onMouseEnter={e => { if (!compact && !open) (e.currentTarget as HTMLElement).style.borderColor = D.borderHover; }}
        onMouseLeave={e => { if (!compact && !open) (e.currentTarget as HTMLElement).style.borderColor = D.border; }}
      >
        <span style={{ fontSize: compact ? 11 : 12, color: compact ? "inherit" : (value ? D.textPrimary : D.textMuted) }}>
          {displayText}
        </span>
        {!compact && (
          <ChevronDown
            size={13} color={D.textTertiary}
            style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.14s" }}
          />
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          {isMobile && (
            <div
              onClick={() => setOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 299, background: "rgba(29, 29, 31,0.15)" }}
            />
          )}
          <div style={{
            ...(isMobile ? mobileDropdownStyle : desktopDropdownStyle),
            background: D.surface, border: `1px solid ${D.border}`,
            borderRadius: 11, padding: "4px 0",
            boxShadow: "0 4px 16px rgba(0,0,0,0.09)",
          }}>
            {FEELINGS.map(f => (
              <button key={f.value} type="button"
                onClick={() => { onChange(f.value); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: isMobile ? "12px 16px" : "9px 14px",
                  background: value === f.value ? D.accentSubtle : "none",
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                }}
                onMouseEnter={e => { if (value !== f.value) (e.currentTarget as HTMLElement).style.background = D.surfaceMuted; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = value === f.value ? D.accentSubtle : "none"; }}
              >
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 28, height: 28, borderRadius: 8,
                  background: f.bg, fontSize: 14, flexShrink: 0,
                }}>{f.emoji}</span>
                <span style={{ fontSize: 12, color: D.textPrimary, fontWeight: value === f.value ? 600 : 400 }}>
                  {f.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

const D = {
  surface:      "#ffffff",
  surfacePage:  "#fafbf7",
  surfaceMuted: "#f1f3ef",
  accentSubtle: "#f2fdec",
  border:       "#dde4de",
  borderHover:  "#c4cbc2",
  accent:       "#059669",
  textPrimary:  "#082d1d",
  textTertiary: "#4a6d47",
  textMuted:    "#b9d3c4",
};

const FEELINGS = [
  { value: "DREADING", label: "Dreading", emoji: "😮‍💨", bg: "#FFF0EC", fg: "#D14626" },
  { value: "ANXIOUS",  label: "Anxious",  emoji: "😟",   bg: "#FFF8E8", fg: "#B07A10" },
  { value: "NEUTRAL",  label: "Neutral",  emoji: "😐",   bg: "#F3F2F0", fg: "#7A756E" },
  { value: "WILLING",  label: "Willing",  emoji: "🙂",   bg: "#EEF9F7", fg: "#0E8A7D" },
  { value: "EXCITED",  label: "Excited",  emoji: "🤩",   bg: "#EEFAF1", fg: "#1A9444" },
] as const;

export type Feeling = typeof FEELINGS[number]["value"] | "";

interface Props {
  value: Feeling;
  onChange: (v: Feeling) => void;
  label?: string;
  dropUp?: boolean;
}

export function FeelingPickerField({ value, onChange, label = "Feeling", dropUp }: Props) {
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
        <span style={{ fontSize: 12, color: value ? D.textPrimary : D.textMuted }}>
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
              onClick={() => setOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 299, background: "rgba(8,45,29,0.15)" }}
            />
          )}
          <div style={{
            ...(isMobile ? mobileDropdownStyle : desktopDropdownStyle),
            background: D.surface, border: `1.5px solid ${D.border}`,
            borderRadius: 4, padding: "4px 0",
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
                  width: 28, height: 28, borderRadius: 6,
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

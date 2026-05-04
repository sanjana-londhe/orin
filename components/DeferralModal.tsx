"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import type { Task } from "@prisma/client";
import { useIsMobile } from "@/hooks/useIsMobile";

// ── helpers ───────────────────────────────────────────────────────────

function addHours(base: Date, h: number): Date {
  return new Date(base.getTime() + h * 60 * 60 * 1000);
}

function nextWeekday(day: number, hour = 9): Date {
  const now = new Date();
  const result = new Date(now);
  result.setHours(hour, 0, 0, 0);
  const diff = (day - now.getDay() + 7) % 7 || 7;
  result.setDate(now.getDate() + diff);
  return result;
}

function tomorrow9am(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

function formatPreview(d: Date): string {
  return (
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

const HOUR_OPTIONS = [
  { label: "+1h",  hours: 1 },
  { label: "+2h",  hours: 2 },
  { label: "+4h",  hours: 4 },
  { label: "+8h",  hours: 8 },
];

const RESCHEDULE_OPTIONS = [
  { label: "Tomorrow",     fn: () => tomorrow9am() },
  { label: "This weekend", fn: () => nextWeekday(6, 10) },
  { label: "Next Monday",  fn: () => nextWeekday(1, 9) },
];

type Tab = "defer" | "reschedule";
type Selection =
  | { kind: "hours"; hours: number }
  | { kind: "reschedule"; fn: () => Date }
  | { kind: "custom-hours"; hours: number }
  | { kind: "custom-date"; date: string; time: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onConfirm: (newDueAt: Date) => void;
  defaultTab?: Tab;
}

const T = {
  surface:       "#ffffff",
  stone100:      "#f8f9f5",
  stone200:      "#f1f3ef",
  border:        "#dde4de",
  accent:        "#059669",
  accentHover:   "#047857",
  accentSubtle:  "#f2fdec",
  accentRing:    "rgba(5,150,105,0.07)",
  lime100:       "#e3ffd1",
  lime200:       "#c8f7ae",
  textPrimary:   "#082d1d",
  textSecondary: "#3d5a4a",
  textTertiary:  "#4a6d47",
  textMuted:     "#b9d3c4",
};

export function DeferralModal({ open, onOpenChange, task, onConfirm, defaultTab = "defer" }: Props) {
  const [tab, setTab]               = useState<Tab>(defaultTab);
  const [selected, setSelected]     = useState<Selection | null>(null);
  const [customHours, setCustomHours] = useState("");
  const [customDate, setCustomDate]   = useState("");
  const [customTime, setCustomTime]   = useState("09:00");
  const isMobile = useIsMobile();

  const base = new Date();

  const preview = useMemo<Date | null>(() => {
    if (!selected) return null;
    if (selected.kind === "hours")        return addHours(base, selected.hours);
    if (selected.kind === "reschedule")   return selected.fn();
    if (selected.kind === "custom-hours") return isNaN(selected.hours) ? null : addHours(base, selected.hours);
    if (selected.kind === "custom-date" && selected.date)
      return new Date(`${selected.date}T${selected.time || "09:00"}`);
    return null;
  }, [selected, base]);

  function handleConfirm() {
    if (!preview) return;
    onConfirm(preview);
    onOpenChange(false);
    reset();
  }

  function reset() {
    setTab(defaultTab); setSelected(null);
    setCustomHours(""); setCustomDate(""); setCustomTime("09:00");
  }

  function handleClose() { onOpenChange(false); reset(); }

  if (!open) return null;

  // active option button — accent border + subtle bg (matches picker active style)
  function optionStyle(active: boolean): React.CSSProperties {
    return {
      flex: 1, padding: "10px 8px", borderRadius: 8,
      border: `1.5px solid ${active ? T.accent : T.border}`,
      background: active ? T.accentSubtle : T.stone100,
      color: active ? T.accent : T.textPrimary,
      fontSize: 13, fontWeight: 700,
      cursor: "pointer", fontFamily: "inherit",
      transition: "all 0.12s ease",
    };
  }

  // native input style matching DatePickerField trigger
  const nativeInputStyle: React.CSSProperties = {
    height: 38, padding: "0 12px", borderRadius: 8,
    border: `1.5px solid ${T.border}`, background: T.stone100,
    fontSize: 13, color: T.textPrimary, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.14s",
    width: "100%",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex",
      alignItems: isMobile ? "flex-end" : "center",
      justifyContent: "center",
      padding: isMobile ? 0 : "0 20px",
    }}>
      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(8,45,29,0.25)", backdropFilter: "blur(2px)",
      }} />

      {/* Card — matches TaskCreateModal style */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: isMobile ? "100%" : 460,
        background: T.surface,
        borderRadius: isMobile ? "16px 16px 0 0" : 12,
        border: `1.5px solid ${T.accent}`,
        boxShadow: isMobile
          ? "0 -4px 24px rgba(0,0,0,0.08)"
          : `0 0 0 3px ${T.accentRing}, 0 8px 24px rgba(0,0,0,0.08)`,
        overflow: "hidden",
        paddingBottom: isMobile ? 24 : 0,
      }}>

        {/* Title row — same as TaskCreateModal title row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              border: `1.5px solid ${T.accent}`, flexShrink: 0,
            }} />
            <div>
              <p style={{
                fontFamily: "monospace", fontSize: 10, fontWeight: 700,
                color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em",
                margin: "0 0 1px",
              }}>
                {task.dueAt ? `Currently ${formatPreview(new Date(task.dueAt))}` : "No due date"}
              </p>
              <h2 style={{
                fontSize: 14, fontWeight: 600, color: T.textPrimary,
                margin: 0, letterSpacing: "-0.01em",
              }}>
                Give yourself more time
              </h2>
            </div>
          </div>
          <button onClick={handleClose} style={{
            width: 28, height: 28, borderRadius: 8,
            border: `1.5px solid ${T.border}`, background: T.stone100,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: T.textTertiary, flexShrink: 0,
          }}>
            <X size={13} />
          </button>
        </div>

        {/* Tab switcher — same stone-100 toggle as other forms */}
        <div style={{ padding: "12px 18px 0", borderBottom: `1px solid ${T.border}` }}>
          <div style={{
            display: "flex", gap: 4,
            background: T.stone100, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: 3, marginBottom: 12,
          }}>
            {(["defer", "reschedule"] as Tab[]).map(t => (
              <button key={t} onClick={() => { setTab(t); setSelected(null); }} style={{
                flex: 1, padding: "6px 0", borderRadius: 6,
                border: tab === t ? `1px solid ${T.border}` : "1px solid transparent",
                background: tab === t ? T.surface : "transparent",
                color: tab === t ? T.textPrimary : T.textTertiary,
                fontSize: 12.5, fontWeight: tab === t ? 600 : 450,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}>
                {t === "defer" ? "A bit more time" : "Pick a new day"}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${T.border}` }}>

          {/* Defer */}
          {tab === "defer" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {HOUR_OPTIONS.map(opt => {
                  const active = selected?.kind === "hours" && (selected as { hours: number }).hours === opt.hours;
                  return (
                    <button key={opt.hours} onClick={() => setSelected({ kind: "hours", hours: opt.hours })}
                      style={optionStyle(active)}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="number" min="1" max="168" placeholder="Custom hours…"
                  value={customHours}
                  onChange={e => {
                    setCustomHours(e.target.value);
                    const h = parseFloat(e.target.value);
                    setSelected(!isNaN(h) && h > 0 ? { kind: "custom-hours", hours: h } : null);
                  }}
                  style={nativeInputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = T.accent)}
                  onBlur={e => (e.currentTarget.style.borderColor = T.border)}
                />
                <span style={{ fontSize: 12.5, color: T.textTertiary, whiteSpace: "nowrap" }}>hours</span>
              </div>
            </div>
          )}

          {/* Reschedule */}
          {tab === "reschedule" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {RESCHEDULE_OPTIONS.map(opt => {
                  const active = selected?.kind === "reschedule" && preview && formatPreview(preview) === formatPreview(opt.fn());
                  return (
                    <button key={opt.label} onClick={() => setSelected({ kind: "reschedule", fn: opt.fn })}
                      style={optionStyle(!!active)}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{
                  fontFamily: "monospace", fontSize: 10, fontWeight: 600,
                  color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0,
                }}>Pick a date</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input type="date" value={customDate}
                    onChange={e => { setCustomDate(e.target.value); setSelected({ kind: "custom-date", date: e.target.value, time: customTime }); }}
                    style={nativeInputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = T.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = T.border)}
                  />
                  <input type="time" value={customTime} disabled={!customDate}
                    onChange={e => { setCustomTime(e.target.value); if (customDate) setSelected({ kind: "custom-date", date: customDate, time: e.target.value }); }}
                    style={{ ...nativeInputStyle, background: customDate ? T.stone100 : T.stone200, opacity: customDate ? 1 : 0.5 }}
                    onFocus={e => (e.currentTarget.style.borderColor = T.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = T.border)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview — lime callout matching insight panel style */}
        {preview && (
          <div style={{ padding: "10px 18px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{
              background: T.lime100, border: `1px solid ${T.lime200}`,
              borderRadius: 8, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>⏰</span>
              <div>
                <p style={{
                  fontFamily: "monospace", fontSize: 10, fontWeight: 600,
                  color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 1px",
                }}>Giving yourself until</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, margin: 0 }}>
                  {formatPreview(preview)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions — same as TaskCreateModal actions row */}
        <div style={{
          padding: "10px 18px",
          display: "flex", justifyContent: "flex-end", gap: 8,
        }}>
          <button onClick={handleClose} style={{
            padding: "6px 14px", borderRadius: 6,
            border: `1px solid ${T.border}`, background: T.surface,
            color: T.textSecondary, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
          }}>Not now</button>
          <AddTimeButton disabled={!preview} onClick={handleConfirm} />
        </div>
      </div>
    </div>
  );
}

function AddTimeButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: "6px 16px", borderRadius: 6, border: "none",
        background: disabled ? "#c4cbc2" : hov ? "#047857" : "#059669",
        color: "#fff", fontSize: 12.5, fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit", transition: "background 0.12s",
      }}
    >
      Take this time
    </button>
  );
}

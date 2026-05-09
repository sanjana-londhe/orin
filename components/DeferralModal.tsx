"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { X, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "@prisma/client";
import { useIsMobile } from "@/hooks/useIsMobile";
import { TimePickerField } from "@/components/TimePickerField";

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

function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }
function getToday(): string { return new Date().toISOString().slice(0, 10); }

function formatPreview(d: Date): string {
  return (
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
    " at " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const HOUR_OPTIONS = [
  { label: "+1h", hours: 1 },
  { label: "+2h", hours: 2 },
  { label: "+4h", hours: 4 },
  { label: "+8h", hours: 8 },
];

type Tab = "defer" | "reschedule";
type RescheduleKey = "tomorrow" | "weekend" | "next-weekday" | "custom";
type Selection =
  | { kind: "hours"; hours: number }
  | { kind: "custom-hours"; hours: number }
  | { kind: "date"; date: string; time: string };

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
  borderHover:   "#c4cbc2",
  accent:        "#059669",
  accentHover:   "#047857",
  accentSubtle:  "#f2fdec",
  lime100:       "#e3ffd1",
  lime200:       "#c8f7ae",
  textPrimary:   "#082d1d",
  textSecondary: "#3d5a4a",
  textTertiary:  "#4a6d47",
  textMuted:     "#b9d3c4",
};

// ── Mini Calendar ─────────────────────────────────────────────────────

function MiniCalendar({ selected, onSelect }: { selected: string; onSelect: (iso: string) => void }) {
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
      background: T.surface, border: `1.5px solid ${T.border}`,
      borderRadius: 12, padding: "12px 14px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.09)",
      width: 248, userSelect: "none", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button
          onClick={() => setView(v => { const d = new Date(v.year, v.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: T.textTertiary, display: "flex", alignItems: "center" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.stone200}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
        ><ChevronLeft size={14} /></button>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary }}>{MONTHS[month]} {year}</span>
        <button
          onClick={() => setView(v => { const d = new Date(v.year, v.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: T.textTertiary, display: "flex", alignItems: "center" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.stone200}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
        ><ChevronRight size={14} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: T.textMuted, padding: "2px 0" }}>{d}</div>
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
              width: "100%", aspectRatio: "1", borderRadius: 6,
              border: isToday && !isSelected ? `1.5px solid ${T.accent}` : "none",
              background: isSelected ? T.accent : "transparent",
              color: isSelected ? "#fff" : isPast ? T.textMuted : T.textPrimary,
              fontSize: 12.5, fontWeight: isSelected || isToday ? 700 : 400,
              cursor: isPast ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.1s", minHeight: 28,
            }}
              onMouseEnter={e => { if (!isSelected && !isPast) (e.currentTarget as HTMLElement).style.background = T.accentSubtle; }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >{day}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export function DeferralModal({ open, onOpenChange, task, onConfirm, defaultTab = "defer" }: Props) {
  const isMobile = useIsMobile();

  const taskDueDay    = task.dueAt ? new Date(task.dueAt).getDay() : 3;
  const nextSameLabel = `Next ${DAY_NAMES[taskDueDay]}`;

  function buildOptions() {
    return [
      { key: "tomorrow"     as RescheduleKey, label: "Tomorrow",       sub: shortDate(tomorrow()),              date: isoDate(tomorrow()) },
      { key: "weekend"      as RescheduleKey, label: "This weekend",   sub: shortDate(nextWeekday(6, 10)),      date: isoDate(nextWeekday(6, 10)) },
      { key: "next-weekday" as RescheduleKey, label: nextSameLabel,    sub: shortDate(nextWeekday(taskDueDay)), date: isoDate(nextWeekday(taskDueDay)) },
      { key: "custom"       as RescheduleKey, label: "Custom date",    sub: "",                                  date: "" },
    ];
  }

  // ── State ──

  const [tab, setTab]               = useState<Tab>(defaultTab);
  const [selected, setSelected]     = useState<Selection | null>(
    defaultTab === "reschedule"
      ? { kind: "date", date: isoDate(tomorrow()), time: "09:00" }
      : null
  );
  const [customHours, setCustomHours] = useState("");

  // Reschedule state
  const [rescheduleKey, setRescheduleKey]   = useState<RescheduleKey>("tomorrow");
  const [rescheduleDate, setRescheduleDate] = useState(isoDate(tomorrow()));
  const [rescheduleTime, setRescheduleTime] = useState("09:00");
  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [calendarDate, setCalendarDate]     = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const base = new Date();

  const preview = useMemo<Date | null>(() => {
    if (!selected) return null;
    if (selected.kind === "hours")        return addHours(base, selected.hours);
    if (selected.kind === "custom-hours") return isNaN(selected.hours) ? null : addHours(base, selected.hours);
    if (selected.kind === "date" && selected.date)
      return new Date(`${selected.date}T${selected.time || "09:00"}`);
    return null;
  }, [selected, base]);

  function switchToReschedule() {
    const opts = buildOptions();
    const tomorrowOpt = opts[0];
    setRescheduleKey("tomorrow");
    setRescheduleDate(tomorrowOpt.date);
    setRescheduleTime("09:00");
    setCalendarDate("");
    setSelected({ kind: "date", date: tomorrowOpt.date, time: "09:00" });
  }

  function pickRescheduleKey(key: RescheduleKey) {
    const opts = buildOptions();
    const opt  = opts.find(o => o.key === key)!;
    setRescheduleKey(key);
    if (key !== "custom") {
      setRescheduleDate(opt.date);
      setSelected({ kind: "date", date: opt.date, time: rescheduleTime });
      setDropdownOpen(false);
    }
    // "custom" keeps dropdown open so user can pick from the calendar
  }

  function handleCalendarSelect(iso: string) {
    setCalendarDate(iso);
    setRescheduleDate(iso);
    setSelected({ kind: "date", date: iso, time: rescheduleTime });
    setDropdownOpen(false);
  }

  function handleTimeChange(time: string) {
    setRescheduleTime(time);
    if (rescheduleDate) setSelected({ kind: "date", date: rescheduleDate, time });
  }

  function handleConfirm() {
    if (!preview) return;
    onConfirm(preview); onOpenChange(false); reset();
  }

  function reset() {
    setTab(defaultTab); setSelected(null);
    setCustomHours(""); setRescheduleKey("tomorrow");
    setRescheduleDate(isoDate(tomorrow())); setRescheduleTime("09:00");
    setDropdownOpen(false); setCalendarDate("");
  }

  function handleClose() { onOpenChange(false); reset(); }

  if (!open) return null;

  const opts = buildOptions();
  const currentOpt = opts.find(o => o.key === rescheduleKey)!;
  const triggerLabel = rescheduleKey === "custom" && calendarDate
    ? shortDate(new Date(calendarDate + "T12:00:00"))
    : currentOpt.label;

  function optionStyle(active: boolean): React.CSSProperties {
    return {
      flex: 1, padding: "10px 8px", borderRadius: 8,
      border: `1.5px solid ${active ? T.accent : T.border}`,
      background: active ? T.accentSubtle : T.stone100,
      color: active ? T.accent : T.textSecondary,
      fontSize: 13, fontWeight: active ? 600 : 400,
      cursor: "pointer", fontFamily: "inherit",
      transition: "all 0.12s ease",
    };
  }

  const nativeInputStyle: React.CSSProperties = {
    height: 38, padding: "0 12px", borderRadius: 8,
    border: `1.5px solid ${T.border}`, background: T.stone100,
    fontSize: 13, color: T.textPrimary, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.14s", width: "100%",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex",
      alignItems: isMobile ? "flex-end" : "center",
      justifyContent: "center",
      padding: isMobile ? 0 : "0 20px",
    }}>
      <div onClick={handleClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(8,45,29,0.25)", backdropFilter: "blur(2px)",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: isMobile ? "100%" : 460,
        background: T.surface,
        borderRadius: isMobile ? "16px 16px 0 0" : 12,
        border: `1.5px solid ${T.border}`,
        boxShadow: isMobile ? "0 -4px 24px rgba(0,0,0,0.08)" : "0 8px 24px rgba(0,0,0,0.08)",
        paddingBottom: isMobile ? 24 : 0,
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderBottom: `1px solid ${T.border}`,
        }}>
          <div>
            <p style={{
              fontFamily: "monospace", fontSize: 10, fontWeight: 600,
              color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 1px",
            }}>
              {task.dueAt ? `Currently ${formatPreview(new Date(task.dueAt))}` : "No due date"}
            </p>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, margin: 0, letterSpacing: "-0.01em" }}>
              Give yourself more time
            </h2>
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

        {/* Tab switcher */}
        <div style={{ padding: "12px 18px 0", borderBottom: `1px solid ${T.border}` }}>
          <div style={{
            display: "flex", gap: 4,
            background: T.stone100, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: 3, marginBottom: 12,
          }}>
            {(["defer", "reschedule"] as Tab[]).map(t => (
              <button key={t} onClick={() => {
                setTab(t);
                if (t === "reschedule") switchToReschedule();
                else setSelected(null);
              }} style={{
                flex: 1, padding: "6px 0", borderRadius: 6,
                border: tab === t ? `1px solid ${T.border}` : "1px solid transparent",
                background: tab === t ? T.surface : "transparent",
                color: tab === t ? T.textPrimary : T.textTertiary,
                fontSize: 12.5, fontWeight: tab === t ? 600 : 400,
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

          {/* Defer tab */}
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

          {/* Reschedule tab */}
          {tab === "reschedule" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              {/* Date dropdown — left panel + calendar panel beside it (same as DatePickerField) */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, margin: "0 0 6px" }}>Due date</p>
                <div ref={dropdownRef} style={{ position: "relative" }}>

                  {/* Trigger */}
                  <button
                    onClick={() => setDropdownOpen(o => !o)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "9px 12px", height: 38, borderRadius: 8,
                      border: `1.5px solid ${dropdownOpen ? T.accent : T.border}`,
                      background: T.stone100, cursor: "pointer", fontFamily: "inherit",
                      transition: "border-color 0.14s", boxSizing: "border-box", outline: "none",
                    }}
                    onMouseEnter={e => { if (!dropdownOpen) (e.currentTarget as HTMLElement).style.borderColor = T.borderHover; }}
                    onMouseLeave={e => { if (!dropdownOpen) (e.currentTarget as HTMLElement).style.borderColor = T.border; }}
                  >
                    <span style={{ fontSize: 13.5, color: T.textPrimary }}>{triggerLabel}</span>
                    <ChevronDown
                      size={13} color={T.textTertiary}
                      style={{ flexShrink: 0, transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.14s" }}
                    />
                  </button>

                  {/* Dropdown: options list + calendar side-by-side (mirrors DatePickerField) */}
                  {dropdownOpen && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 6px)", left: 0,
                      display: "flex", gap: 8, zIndex: 20,
                    }}>
                      {/* Options list */}
                      <div style={{
                        background: T.surface, border: `1.5px solid ${T.border}`,
                        borderRadius: 10, padding: "4px 0",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.09)", minWidth: 200,
                      }}>
                        {opts.map(opt => {
                          const active = rescheduleKey === opt.key;
                          return (
                            <button key={opt.key} onClick={() => pickRescheduleKey(opt.key)} style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              width: "100%", padding: "9px 14px",
                              background: active ? T.accentSubtle : "none",
                              border: "none", cursor: "pointer", fontFamily: "inherit",
                            }}
                              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = T.stone100; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? T.accentSubtle : "none"; }}
                            >
                              <span style={{ fontSize: 13.5, color: T.textPrimary, fontWeight: active ? 600 : 400 }}>
                                {opt.label}
                              </span>
                              {opt.sub ? (
                                <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "monospace" }}>{opt.sub}</span>
                              ) : (
                                <ChevronRight size={13} color={active ? T.accent : T.textMuted} />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Calendar panel — appears beside options when Custom is active */}
                      {rescheduleKey === "custom" && (
                        <MiniCalendar
                          selected={calendarDate}
                          onSelect={handleCalendarSelect}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Time picker — same component as task creation */}
              <TimePickerField
                value={rescheduleTime}
                onChange={handleTimeChange}
                label="Due time (optional)"
                selectedDate={rescheduleDate}
                dropUp={isMobile}
              />
            </div>
          )}
        </div>

        {/* Preview callout */}
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

        {/* Actions */}
        <div style={{ padding: "10px 18px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
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
    >Take this time</button>
  );
}

"use client";

import { useState } from "react";

interface Props {
  value: string; // ISO date YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}
function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function formatDisplay(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Mode = "today" | "tomorrow" | "custom";

function isoToMode(iso: string): Mode {
  if (iso === getToday()) return "today";
  if (iso === getTomorrow()) return "tomorrow";
  return "custom";
}

export function DatePickerField({ value, onChange, label = "Due date" }: Props) {
  const today = getToday();
  const tomorrow = getTomorrow();
  const [mode, setMode] = useState<Mode>(isoToMode(value || today));
  const [showCalendar, setShowCalendar] = useState(false);

  function handleModeChange(newMode: Mode) {
    setMode(newMode);
    setShowCalendar(false);
    if (newMode === "today") onChange(today);
    else if (newMode === "tomorrow") onChange(tomorrow);
    else setShowCalendar(true); // open calendar immediately
  }

  const displayLabel = mode === "today" ? "Today" : mode === "tomorrow" ? "Tomorrow" : value ? formatDisplay(value) : "Pick a date";

  return (
    <div>
      {label && <p style={{ fontSize: 12, fontWeight: 600, color: "#082d1d", marginBottom: 8 }}>{label}</p>}

      {/* Dropdown */}
      <div style={{ position: "relative" }}>
        <select
          value={mode}
          onChange={e => handleModeChange(e.target.value as Mode)}
          style={{
            width: "100%", padding: "10px 36px 10px 12px",
            border: "1px solid #dde4de", borderRadius: 8,
            fontSize: 13, color: "#082d1d", background: "#fafbf7",
            fontFamily: "inherit", outline: "none",
            appearance: "none", cursor: "pointer",
            boxSizing: "border-box",
          }}
        >
          <option value="today">Today — {formatDisplay(today)}</option>
          <option value="tomorrow">Tomorrow — {formatDisplay(tomorrow)}</option>
          <option value="custom">{mode === "custom" && value ? `Custom — ${formatDisplay(value)}` : "Custom date..."}</option>
        </select>
        {/* Chevron */}
        <span style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          pointerEvents: "none", color: "#4a6d47", fontSize: 12,
        }}>▾</span>
      </div>

      {/* Calendar — shown when custom is selected */}
      {mode === "custom" && (
        <input
          type="date"
          value={value}
          min={today}
          onChange={e => onChange(e.target.value)}
          autoFocus
          style={{
            width: "100%", marginTop: 8,
            padding: "10px 12px",
            border: "1.5px solid #059669", borderRadius: 8,
            fontSize: 13, color: "#082d1d", background: "#f2fdec",
            fontFamily: "inherit", outline: "none",
            boxSizing: "border-box",
          }}
        />
      )}
    </div>
  );
}

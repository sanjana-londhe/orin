"use client";

import { useState, useEffect, useRef } from "react";
import { MiniCalendar } from "@/components/DatePickerField";
import { WheelTimePicker } from "@/components/TimePickerField";
import { ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

const INLINE_FEELINGS = [
  { value: "DREADING", label: "Dreading", emoji: "😮‍💨", bg: "#FFF0EC", fg: "#D14626" },
  { value: "ANXIOUS",  label: "Anxious",  emoji: "😟",   bg: "#FFF8E8", fg: "#B07A10" },
  { value: "NEUTRAL",  label: "Neutral",  emoji: "😐",   bg: "#F3F2F0", fg: "#7A756E" },
  { value: "WILLING",  label: "Willing",  emoji: "🙂",   bg: "#EEF9F7", fg: "#0E8A7D" },
  { value: "EXCITED",  label: "Excited",  emoji: "🤩",   bg: "#EEFAF1", fg: "#1A9444" },
] as const;

export type InlineEmotion = typeof INLINE_FEELINGS[number]["value"] | "";

function fmtDateLbl(iso: string) {
  if (!iso) return "Date";
  const today = new Date().toISOString().slice(0, 10);
  const tmrw  = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (iso === today) return "Today";
  if (iso === tmrw)  return "Tomorrow";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtTimeLbl(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function getDatePresets() {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return [
    { label: "Today",     sub: fmt(t),                                value: t.toISOString().slice(0, 10) },
    { label: "Tomorrow",  sub: fmt(new Date(t.getTime() + 86400000)), value: new Date(t.getTime() + 86400000).toISOString().slice(0, 10) },
    { label: "In 2 days", sub: fmt(new Date(t.getTime() + 172800000)), value: new Date(t.getTime() + 172800000).toISOString().slice(0, 10) },
    { label: "Next week", sub: fmt(new Date(t.getTime() + 604800000)), value: new Date(t.getTime() + 604800000).toISOString().slice(0, 10) },
  ];
}
function getTimeSlots(isToday: boolean, nowTime: string) {
  if (!isToday) {
    return [
      { label: "Morning",   value: "09:00" },
      { label: "Noon",      value: "12:00" },
      { label: "Afternoon", value: "14:00" },
      { label: "Evening",   value: "18:00" },
      { label: "Night",     value: "21:00" },
    ];
  }
  const now = new Date();
  const slots: { label: string; value: string }[] = [];
  [30, 60, 120, 180].forEach(mins => {
    const t = new Date(now.getTime() + mins * 60000);
    const h = t.getHours(), rawM = t.getMinutes();
    const rM = Math.ceil(rawM / 15) * 15;
    const fH = rM >= 60 ? h + 1 : h, fM = rM >= 60 ? 0 : rM;
    if (fH < 24) {
      const value = `${String(fH).padStart(2, "0")}:${String(fM).padStart(2, "0")}`;
      slots.push({ label: mins < 60 ? `In ${mins} min` : `In ${mins / 60} hr${mins > 60 ? "s" : ""}`, value });
    }
  });
  [{ label: "Afternoon", value: "14:00" }, { label: "Evening", value: "18:00" }, { label: "Night", value: "21:00" }]
    .filter(s => s.value > nowTime)
    .forEach(s => { if (!slots.find(x => x.value === s.value)) slots.push(s); });
  return slots;
}

interface Props {
  emotion: InlineEmotion;
  setEmotion: (v: InlineEmotion) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  dueTime: string;
  setDueTime: (v: string) => void;
  /** Rendered at the end of the chip bar (e.g., desktop "Add" button). */
  trailing?: React.ReactNode;
}

/** Inline chip bar used by both task creation and task editing — feeling,
 *  due date (with presets + custom calendar), and time (with smart presets
 *  + custom wheel + remove) all behave identically wherever it is used. */
export function InlineChipBar({ emotion, setEmotion, dueDate, setDueDate, dueTime, setDueTime, trailing }: Props) {
  const isMobile = useIsMobile();
  const [showEmoPicker, setShowEmoPicker]   = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [chipBarBottom, setChipBarBottom]   = useState(0);
  // Per-chip trigger rect for position:fixed dropdowns — required so the
  // panels render above ancestors with overflow: auto (e.g. the calendar
  // popup) instead of being clipped.
  const [emoAnchor,  setEmoAnchor]  = useState({ top: 0, left: 0 });
  const [dateAnchor, setDateAnchor] = useState({ top: 0, left: 0 });
  const [timeAnchor, setTimeAnchor] = useState({ top: 0, left: 0 });
  const chipBarRef = useRef<HTMLDivElement>(null);
  const emoBtnRef  = useRef<HTMLButtonElement>(null);
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const timeBtnRef = useRef<HTMLButtonElement>(null);

  function anchorOf(btn: HTMLButtonElement | null) {
    if (!btn) return { top: 0, left: 0 };
    const r = btn.getBoundingClientRect();
    return { top: r.bottom + 6, left: r.left };
  }
  function captureChipBarBottom() {
    if (chipBarRef.current) setChipBarBottom(chipBarRef.current.getBoundingClientRect().bottom);
  }

  useEffect(() => {
    function handler(ev: MouseEvent) {
      if (chipBarRef.current && !chipBarRef.current.contains(ev.target as Node)) {
        setShowEmoPicker(false); setShowDatePicker(false); setShowTimePicker(false);
        setShowCustomDate(false); setShowCustomTime(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const em = INLINE_FEELINGS.find(f => f.value === (emotion || "NEUTRAL")) ?? INLINE_FEELINGS[2];
  const dateLabel = fmtDateLbl(dueDate);

  const chipStyle = (fg?: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "4px 9px", borderRadius: 6,
    background: "#f8f9f5",
    border: `0.5px solid ${fg ? fg + "33" : "rgba(0,0,0,0.08)"}`,
    color: fg ?? "#5f5e5a",
    fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
    position: "relative", overflow: "hidden",
  });

  return (
    <div
      ref={chipBarRef}
      style={{
        display: "flex", gap: 5,
        flexWrap: "wrap", position: "relative", alignItems: "center",
      }}
    >
      {/* Feeling chip */}
      <div style={{ position: "relative" }}>
        <button
          ref={emoBtnRef}
          type="button"
          onClick={() => {
            setEmoAnchor(anchorOf(emoBtnRef.current));
            setShowEmoPicker(o => !o);
            setShowDatePicker(false); setShowCustomDate(false);
            setShowTimePicker(false); setShowCustomTime(false);
          }}
          style={{ ...chipStyle(em.fg), background: em.bg }}
        >
          <span style={{ fontSize: 10 }}>{em.emoji}</span> {em.label}
        </button>
        {showEmoPicker && (
          <div style={{
            position: "fixed", top: emoAnchor.top, left: emoAnchor.left, zIndex: 300,
            background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 4,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)", minWidth: 150,
            padding: "4px 0", overflow: "hidden",
          }}>
            {INLINE_FEELINGS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => { setEmotion(f.value); setShowEmoPicker(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "8px 14px",
                  background: emotion === f.value ? f.bg : "none",
                  border: "none", cursor: "pointer",
                  fontSize: 12, color: emotion === f.value ? f.fg : "#082d1d",
                  fontFamily: "inherit",
                }}
              >
                {f.emoji} {f.label}
                {emotion === f.value && <span style={{ marginLeft: "auto", fontSize: 11 }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date chip */}
      <div style={{ position: "relative" }}>
        <button
          ref={dateBtnRef}
          type="button"
          onClick={() => {
            setDateAnchor(anchorOf(dateBtnRef.current));
            setShowDatePicker(o => !o);
            setShowCustomDate(false); setShowTimePicker(false);
            setShowCustomTime(false); setShowEmoPicker(false);
          }}
          style={chipStyle("#059669")}
        >
          <span style={{ fontSize: 10 }}>📅</span> {dateLabel}
        </button>
        {showDatePicker && (
          <div style={
            isMobile && showCustomDate
              ? { position: "fixed", top: chipBarBottom + 6, left: 16, right: 16, zIndex: 300, display: "flex", justifyContent: "center" }
              : { position: "fixed", top: dateAnchor.top, left: dateAnchor.left, zIndex: 300, display: "flex", gap: 8 }
          }>
            {!(isMobile && showCustomDate) && (
              <div style={{
                background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 4,
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                minWidth: 200,
                padding: "4px 0", overflow: "hidden",
              }}>
                {getDatePresets().map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setDueDate(opt.value); setShowDatePicker(false); setShowCustomDate(false); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "8px 14px",
                      background: dueDate === opt.value ? "#f2fdec" : "none",
                      border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 12, color: dueDate === opt.value ? "#059669" : "#082d1d", fontWeight: dueDate === opt.value ? 500 : 400 }}>{opt.label}</span>
                    <span style={{ fontSize: 11, color: dueDate === opt.value ? "#059669" : "#888780" }}>{opt.sub}{dueDate === opt.value ? " ✓" : ""}</span>
                  </button>
                ))}
                <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }} />
                <button
                  type="button"
                  onClick={() => { if (isMobile) captureChipBarBottom(); setShowCustomDate(s => !s); setShowTimePicker(false); setShowCustomTime(false); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "8px 14px",
                    background: showCustomDate ? "#f2fdec" : "none",
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#082d1d", fontWeight: showCustomDate ? 500 : 400 }}>Custom date</span>
                  <ChevronRight size={13} color={showCustomDate ? "#059669" : "#888780"} />
                </button>
              </div>
            )}
            {showCustomDate && (
              <MiniCalendar
                selected={dueDate}
                onSelect={iso => { setDueDate(iso); setShowDatePicker(false); setShowCustomDate(false); }}
                fullWidth={isMobile}
              />
            )}
          </div>
        )}
      </div>

      {/* Time chip */}
      <div style={{ position: "relative" }}>
        <button
          ref={timeBtnRef}
          type="button"
          onClick={() => {
            setTimeAnchor(anchorOf(timeBtnRef.current));
            setShowTimePicker(o => !o);
            setShowCustomTime(false); setShowDatePicker(false);
            setShowCustomDate(false); setShowEmoPicker(false);
          }}
          style={chipStyle(dueTime ? "#5f5e5a" : undefined)}
        >
          <span style={{ fontSize: 10 }}>🕐</span> {dueTime ? fmtTimeLbl(dueTime) : "Add time"}
        </button>
        {showTimePicker && (() => {
          const now = new Date();
          const todayStr = now.toISOString().slice(0, 10);
          const isToday = dueDate === todayStr;
          const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          const slots = getTimeSlots(isToday, nowTime);
          return (
            <div style={
              isMobile && showCustomTime
                ? { position: "fixed", top: chipBarBottom + 6, left: 16, right: 16, zIndex: 300, display: "flex", justifyContent: "center" }
                : { position: "fixed", top: timeAnchor.top, left: timeAnchor.left, zIndex: 300, display: "flex", gap: 8 }
            }>
              {!(isMobile && showCustomTime) && (
                <div style={{
                  background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 4,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  minWidth: 190,
                  padding: "4px 0", overflow: "hidden",
                }}>
                  {slots.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setDueTime(opt.value); setShowTimePicker(false); setShowCustomTime(false); }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "8px 14px",
                        background: dueTime === opt.value ? "#f2fdec" : "none",
                        border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 12, color: dueTime === opt.value ? "#059669" : "#082d1d", fontWeight: dueTime === opt.value ? 500 : 400 }}>{opt.label}</span>
                      <span style={{ fontSize: 11, color: dueTime === opt.value ? "#059669" : "#888780" }}>{fmtTimeLbl(opt.value)}{dueTime === opt.value ? " ✓" : ""}</span>
                    </button>
                  ))}
                  <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }} />
                  <button
                    type="button"
                    onClick={() => {
                      const opening = !showCustomTime;
                      if (isMobile && opening) captureChipBarBottom();
                      setShowCustomTime(opening);
                      setShowDatePicker(false); setShowCustomDate(false);
                      if (opening && !dueTime) setDueTime("09:00");
                    }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "8px 14px",
                      background: showCustomTime ? "#f2fdec" : "none",
                      border: "none", cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#082d1d", fontWeight: showCustomTime ? 500 : 400 }}>Custom time</span>
                    <ChevronRight size={13} color={showCustomTime ? "#059669" : "#888780"} />
                  </button>
                  {dueTime && (
                    <button
                      type="button"
                      onClick={() => { setDueTime(""); setShowTimePicker(false); setShowCustomTime(false); }}
                      style={{
                        display: "block", width: "100%", padding: "7px 14px",
                        background: "none", border: "none",
                        borderTop: "0.5px solid rgba(0,0,0,0.06)",
                        cursor: "pointer", fontSize: 11, color: "#D14626",
                        fontFamily: "inherit", textAlign: "left",
                      }}
                    >
                      Remove time
                    </button>
                  )}
                </div>
              )}
              {showCustomTime && (
                <div style={{
                  background: "#fff", border: "1.5px solid #dde4de", borderRadius: 4,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.09)", padding: "12px 14px",
                }}>
                  <WheelTimePicker value={dueTime || "09:00"} onChange={t => setDueTime(t)} />
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {trailing}
    </div>
  );
}

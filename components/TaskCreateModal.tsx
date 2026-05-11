"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

type Emotion = typeof INLINE_FEELINGS[number]["value"] | "";

const FEELING_KW: Record<string, Emotion> = {
  dreading:"DREADING", dread:"DREADING", anxious:"ANXIOUS", anxiety:"ANXIOUS",
  nervous:"ANXIOUS", worried:"ANXIOUS", neutral:"NEUTRAL", okay:"NEUTRAL",
  willing:"WILLING", ready:"WILLING", excited:"EXCITED", happy:"EXCITED",
};
function detectEmotion(text: string): Emotion | null {
  const l = text.toLowerCase();
  for (const [k, v] of Object.entries(FEELING_KW)) if (l.includes(k)) return v;
  return null;
}
function fmtDateLbl(iso: string) {
  const today = new Date().toISOString().slice(0,10);
  const tmrw  = new Date(Date.now()+86400000).toISOString().slice(0,10);
  if (iso === today) return "Today";
  if (iso === tmrw)  return "Tomorrow";
  return new Date(iso+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
}
function fmtTimeLbl(t: string) {
  if (!t) return "";
  const [h,m] = t.split(":").map(Number);
  return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;
}
function getDatePresets() {
  const t = new Date(); t.setHours(0,0,0,0);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return [
    { label: "Today",     sub: fmt(t),                                          value: t.toISOString().slice(0,10) },
    { label: "Tomorrow",  sub: fmt(new Date(t.getTime()+86400000)),              value: new Date(t.getTime()+86400000).toISOString().slice(0,10) },
    { label: "In 2 days", sub: fmt(new Date(t.getTime()+172800000)),             value: new Date(t.getTime()+172800000).toISOString().slice(0,10) },
    { label: "Next week", sub: fmt(new Date(t.getTime()+604800000)),             value: new Date(t.getTime()+604800000).toISOString().slice(0,10) },
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
      const value = `${String(fH).padStart(2,"0")}:${String(fM).padStart(2,"0")}`;
      slots.push({ label: mins < 60 ? `In ${mins} min` : `In ${mins/60} hr${mins > 60 ? "s" : ""}`, value });
    }
  });
  [{ label: "Afternoon", value: "14:00" }, { label: "Evening", value: "18:00" }, { label: "Night", value: "21:00" }]
    .filter(s => s.value > nowTime)
    .forEach(s => { if (!slots.find(x => x.value === s.value)) slots.push(s); });
  return slots;
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  defaultTitle?: string;
}

export function TaskCreateModal({ open, onOpenChange, defaultDate, defaultTitle }: Props) {
  const [openCount, setOpenCount] = useState(0);
  const isMobile = useIsMobile();
  useEffect(() => { if (open) setOpenCount(c => c + 1); }, [open]);
  if (!open) return null;

  return (
    <div
      onClick={() => onOpenChange(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(8,45,29,0.25)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: isMobile ? "60px 16px 0" : "80px 24px 0",
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520 }}>
        <InlineCreateForm
          key={openCount}
          defaultDate={defaultDate}
          defaultTitle={defaultTitle}
          onClose={() => onOpenChange(false)}
        />
      </div>
    </div>
  );
}

function InlineCreateForm({
  defaultDate,
  defaultTitle,
  onClose,
}: {
  defaultDate?: string;
  defaultTitle?: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle]           = useState(defaultTitle ?? "");
  const [emotion, setEmotion]       = useState<Emotion>("NEUTRAL");
  const [dueDate, setDueDate]       = useState(defaultDate ?? todayString());
  const [dueTime, setDueTime]       = useState("");
  const [note, setNote]             = useState("");
  const [titleError, setTitleError] = useState(false);
  const [showEmoPicker, setShowEmoPicker]   = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [noteOpen, setNoteOpen]             = useState(false);
  const titleRef   = useRef<HTMLInputElement>(null);
  const chipBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTimeout(() => titleRef.current?.focus(), 20); }, []);

  // Close pickers when clicking outside the chip bar
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (chipBarRef.current && !chipBarRef.current.contains(e.target as Node)) {
        setShowEmoPicker(false); setShowDatePicker(false); setShowTimePicker(false);
        setShowCustomDate(false); setShowCustomTime(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { mutate, isPending } = useMutation({
    mutationFn: async (vars: { title: string; dueAt: string | null; emotion: string; note?: string }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: vars.title, dueAt: vars.dueAt, emotionalState: vars.emotion || null }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      const task = await res.json();
      if (vars.note?.trim()) {
        try { localStorage.setItem(`orin_note_${task.id}`, vars.note.trim()); } catch {}
      }
      return task;
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = queryClient.getQueriesData({ queryKey: ["tasks"] });
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        userId: "", title: vars.title,
        dueAt: vars.dueAt ? new Date(vars.dueAt) : null,
        emotionalState: vars.emotion || "NEUTRAL",
        isCompleted: false, deferredCount: 0, sortOrder: 99999,
        lastTouchedAt: new Date(), recurrenceRule: null, parentTaskId: null,
        createdAt: new Date(), updatedAt: new Date(), subtasks: [],
      };
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: unknown) =>
        Array.isArray(old) ? [...old, optimistic] : old
      );
      onClose();
      return { snap };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snap.forEach(([key, data]: [unknown, unknown]) =>
        queryClient.setQueryData(key as Parameters<typeof queryClient.setQueryData>[0], data)
      );
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); },
  });

  function submit() {
    if (!title.trim()) { setTitleError(true); titleRef.current?.focus(); return; }
    if (isPending) return;
    setTitleError(false);
    const dueAt = dueDate
      ? (dueTime ? new Date(`${dueDate}T${dueTime}`).toISOString() : `${dueDate}T00:00:00.000Z`)
      : null;
    mutate({ title: title.trim(), dueAt, emotion, note });
  }

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
    <div style={{
      border: "1px solid #059669", borderRadius: 4, background: "#fff",
      boxShadow: "0 4px 24px rgba(5,150,105,0.10)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px 4px 16px" }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px dashed #c4cbc2", flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <style>{`.task-name-input.is-error::placeholder { color: #c23934; opacity: 1; }`}</style>
          <input
            ref={titleRef} value={title} autoFocus
            className={`task-name-input${titleError ? " is-error" : ""}`}
            onChange={e => {
              setTitle(e.target.value);
              if (titleError && e.target.value.trim()) setTitleError(false);
              const d = detectEmotion(e.target.value);
              if (d) setEmotion(d);
            }}
            onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
            placeholder="Task name"
            style={{
              width: "100%", border: "none", outline: "none", fontFamily: "inherit",
              fontSize: 12, letterSpacing: "-0.01em", color: "#082d1d",
              background: "transparent", marginBottom: 2,
            }}
          />
          {noteOpen ? (
            <textarea
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="Notes" rows={2}
              style={{
                width: "100%", border: "none", outline: "none", fontFamily: "inherit",
                fontSize: 11, color: "#3d5a4a", background: "transparent",
                resize: "none", lineHeight: 1.5, padding: 0,
              }}
            />
          ) : (
            <div onClick={() => setNoteOpen(true)} style={{ fontSize: 11, color: "#b9d3c4", cursor: "text" }}>
              {note.trim() || "Notes"}
            </div>
          )}
        </div>
      </div>

      <div
        ref={chipBarRef}
        style={{
          display: "flex", gap: 5, padding: "6px 16px 10px",
          borderTop: "0.5px solid rgba(0,0,0,0.05)", marginTop: 6,
          flexWrap: "wrap", position: "relative", alignItems: "center",
        }}
      >
        {/* Feeling chip */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => {
              setShowEmoPicker(o => !o);
              setShowDatePicker(false); setShowCustomDate(false);
              setShowTimePicker(false); setShowCustomTime(false);
            }}
            style={chipStyle(em.fg)}
          >
            <span style={{ fontSize: 10 }}>{em.emoji}</span> {em.label}
          </button>
          {showEmoPicker && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
              background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 4,
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)", minWidth: 150,
              padding: "4px 0", overflow: "hidden",
            }}>
              {INLINE_FEELINGS.map(f => (
                <button
                  key={f.value}
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
            onClick={() => {
              setShowDatePicker(o => !o);
              setShowCustomDate(false); setShowTimePicker(false);
              setShowCustomTime(false); setShowEmoPicker(false);
            }}
            style={chipStyle("#059669")}
          >
            <span style={{ fontSize: 10 }}>📅</span> {dateLabel}
          </button>
          {showDatePicker && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, display: "flex", gap: 8 }}>
              <div style={{
                background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 4,
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)", minWidth: 200,
                padding: "4px 0", overflow: "hidden",
              }}>
                {getDatePresets().map(opt => (
                  <button
                    key={opt.value}
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
                  onClick={() => { setShowCustomDate(s => !s); setShowTimePicker(false); setShowCustomTime(false); }}
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
              {showCustomDate && (
                <MiniCalendar
                  selected={dueDate}
                  onSelect={iso => { setDueDate(iso); setShowDatePicker(false); setShowCustomDate(false); }}
                />
              )}
            </div>
          )}
        </div>

        {/* Time chip */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => {
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
            const nowTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
            const slots = getTimeSlots(isToday, nowTime);
            return (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, display: "flex", gap: 8 }}>
                <div style={{
                  background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 4,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)", minWidth: 190,
                  padding: "4px 0", overflow: "hidden",
                }}>
                  {slots.map(opt => (
                    <button
                      key={opt.value}
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
                    onClick={() => {
                      const opening = !showCustomTime;
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

        <div style={{ flex: 1 }} />
        <button
          onClick={submit} disabled={isPending}
          style={{
            padding: "5px 14px", borderRadius: 6, border: "none",
            background: "#059669", color: "#fff",
            fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {isPending ? "…" : "Add"}
        </button>
      </div>
    </div>
  );
}

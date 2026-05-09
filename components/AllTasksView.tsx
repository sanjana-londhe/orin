"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TaskGrid } from "@/components/TaskGrid";
import { SkeletonTaskList } from "@/components/Skeleton";
import { DatePickerField, MiniCalendar } from "@/components/DatePickerField";
import { TimePickerField, WheelTimePicker } from "@/components/TimePickerField";
import { ChevronRight } from "lucide-react";
import { FeelingPickerField } from "@/components/FeelingPickerField";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useUIStore } from "@/store/ui";
import type { TaskWithSubtasks } from "@/lib/types";

const T = {
  bg:           "#fcfdfc",
  surface:      "#ffffff",
  textPrimary:  "#082d1d",
  textSecondary:"#3d5a4a",
  textTertiary: "#4a6d47",
  textMuted:    "#b9d3c4",
  border:       "#dde4de",
  borderStrong: "#c4cbc2",
  accent:       "#059669",
  accentHover:  "#047857",
  stone100:     "#f8f9f5",
  stone200:     "#f1f3ef",
};

type Emotion = "DREADING" | "ANXIOUS" | "NEUTRAL" | "WILLING" | "EXCITED" | "";

const INLINE_FEELINGS = [
  { value: "DREADING", label: "Dreading", emoji: "😮‍💨", bg: "#FFF0EC", fg: "#D14626" },
  { value: "ANXIOUS",  label: "Anxious",  emoji: "😟",   bg: "#FFF8E8", fg: "#B07A10" },
  { value: "NEUTRAL",  label: "Neutral",  emoji: "😐",   bg: "#F3F2F0", fg: "#7A756E" },
  { value: "WILLING",  label: "Willing",  emoji: "🙂",   bg: "#EEF9F7", fg: "#0E8A7D" },
  { value: "EXCITED",  label: "Excited",  emoji: "🤩",   bg: "#EEFAF1", fg: "#1A9444" },
] as const;

const FEELING_KW: Record<string, string> = {
  dreading:"DREADING", dread:"DREADING", anxious:"ANXIOUS", anxiety:"ANXIOUS",
  nervous:"ANXIOUS", worried:"ANXIOUS", neutral:"NEUTRAL", okay:"NEUTRAL",
  willing:"WILLING", ready:"WILLING", excited:"EXCITED", happy:"EXCITED",
};
function detectEmotion(text: string): string | null {
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

function parseTimeInput(raw: string): string | null {
  const s = raw.trim().toUpperCase();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!m) return null;
  let h = parseInt(m[1]); const min = parseInt(m[2] ?? "0");
  if (isNaN(h) || isNaN(min) || min > 59) return null;
  if (m[3] === "PM" && h < 12) h += 12;
  if (m[3] === "AM" && h === 12) h = 0;
  if (h > 23) return null;
  return `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
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

function getTimeSlots(isToday: boolean, nowTime: string, fmt: (t: string) => string) {
  if (!isToday) {
    return [
      { label: "Morning",   value: "09:00" },
      { label: "Noon",      value: "12:00" },
      { label: "Afternoon", value: "14:00" },
      { label: "Evening",   value: "18:00" },
      { label: "Night",     value: "21:00" },
    ].map(s => ({ ...s, past: false }));
  }
  const now = new Date();
  const slots: { label: string; value: string; past: boolean }[] = [];
  // Dynamic: In 30min, 1hr, 2hr, 3hr
  [30, 60, 120, 180].forEach(mins => {
    const t = new Date(now.getTime() + mins * 60000);
    const h = t.getHours(), rawM = t.getMinutes();
    const rM = Math.ceil(rawM / 15) * 15;
    const fH = rM >= 60 ? h + 1 : h, fM = rM >= 60 ? 0 : rM;
    if (fH < 24) {
      const value = `${String(fH).padStart(2,"0")}:${String(fM).padStart(2,"0")}`;
      slots.push({ label: mins < 60 ? `In ${mins} min` : `In ${mins/60} hr${mins > 60 ? "s" : ""}`, value, past: false });
    }
  });
  // Named future slots
  [{ label: "Afternoon", value: "14:00" }, { label: "Evening", value: "18:00" }, { label: "Night", value: "21:00" }]
    .filter(s => s.value > nowTime)
    .forEach(s => { if (!slots.find(x => x.value === s.value)) slots.push({ ...s, past: false }); });
  return slots;
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function defaultTimeString() {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AllTasksView() {
  const pathname    = usePathname();
  const isAllPage   = pathname === "/all";
  const queryClient = useQueryClient();
  const isMobile    = useIsMobile();
  const { editingTaskId, setEditingTaskId } = useUIStore();
  const pendingCreateTask     = useUIStore(s => s.pendingCreateTask);
  const consumeCreateTaskRequest = useUIStore(s => s.consumeCreateTaskRequest);

  // completedOpen removed — completed tasks are always shown at bottom
  const [formOpen, setFormOpen]     = useState(false);
  const [title, setTitle]           = useState("");
  const [emotion, setEmotion]       = useState<Emotion>("NEUTRAL");
  const [dueDate, setDueDate]       = useState(todayString);
  const [dueTime, setDueTime]       = useState("");
  const [note, setNote]             = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [showEmoPicker, setShowEmoPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const chipBarRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Only listen for outside clicks when the create form (or one of its
  // pickers) is actually open. Avoids a permanent doc-level handler firing
  // on every click site-wide.
  useEffect(() => {
    if (!formOpen) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      // Close pickers on outside click
      if (chipBarRef.current && !chipBarRef.current.contains(target)) {
        setShowEmoPicker(false); setShowDatePicker(false); setShowTimePicker(false);
      }
      // Close entire form on outside click
      if (formRef.current && !formRef.current.contains(target)) {
        setFormOpen(false);
        setTitle(""); setNote(""); setNoteOpen(false);
        setShowEmoPicker(false); setShowDatePicker(false); setShowTimePicker(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [formOpen]);

  const activeFilter    = isAllPage ? "all"             : "today-active";
  const completedFilter = isAllPage ? "completed"       : "today-completed";

  const { data: allTasks = [], isLoading } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", activeFilter],
    queryFn: () => fetch(`/api/tasks?filter=${activeFilter}`).then(r => r.json()),
    retry: 1,
  });

  const { data: completedTasks = [] } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", completedFilter],
    queryFn: () => fetch(`/api/tasks?filter=${completedFilter}`).then(r => r.json()),
    retry: 1,
  });

  // Close create form if a task edit opens
  useEffect(() => {
    if (editingTaskId !== null && formOpen) resetForm();
  }, [editingTaskId]);

  // Sidebar / mobile FAB requested a new task — open the inline form
  useEffect(() => {
    if (pendingCreateTask) {
      openForm();
      consumeCreateTaskRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCreateTask]);

  function openForm() {
    setEditingTaskId(null); // close any open task edit
    setFormOpen(true);
    setTimeout(() => titleRef.current?.focus(), 20);
  }

  function resetForm() {
    setTitle(""); setEmotion("NEUTRAL");
    setDueDate(todayString()); setDueTime(""); setNote("");
    setFormOpen(false);
  }

  async function handleCreate() {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    const dueAt = dueDate
      ? (dueTime ? new Date(`${dueDate}T${dueTime}`).toISOString() : `${dueDate}T00:00:00.000Z`)
      : null;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: TaskWithSubtasks = {
      id: optimisticId, userId: "",
      title: title.trim(),
      dueAt: dueAt ? new Date(dueAt) : null,
      emotionalState: (emotion as TaskWithSubtasks["emotionalState"]) || "NEUTRAL",
      isCompleted: false, deferredCount: 0, sortOrder: 0,
      lastTouchedAt: new Date(), recurrenceRule: null, parentTaskId: null,
      createdAt: new Date(), updatedAt: new Date(), subtasks: [],
    };
    const snap = queryClient.getQueryData<TaskWithSubtasks[]>(["tasks", activeFilter]);
    queryClient.setQueryData<TaskWithSubtasks[]>(["tasks", activeFilter], old => [optimistic, ...(old ?? [])]);
    resetForm();

    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: optimistic.title, emotionalState: emotion || null, dueAt }),
      });
      queryClient.invalidateQueries({ queryKey: ["tasks", activeFilter] });
      queryClient.invalidateQueries({ queryKey: ["tasks", completedFilter] });
    } catch {
      queryClient.setQueryData(["tasks", activeFilter], snap);
    } finally {
      setSubmitting(false);
    }
  }

  const pad = isMobile ? "16px 14px 0" : "24px 28px 0";
  const stickyBottom = isMobile ? 68 : 0;

  // Stable list reference — without this, every chip toggle / keystroke produces
  // a new array, busting TaskGrid's memo and re-rendering every TaskCard.
  const gridTasks = useMemo(
    () => [...allTasks.filter(t => !t.isCompleted), ...completedTasks],
    [allTasks, completedTasks],
  );

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
    <div style={{
      maxWidth: 860, margin: "0 auto",
      display: "flex", flexDirection: "column", minHeight: "100%",
      padding: pad,
    }}>

      {/* Header */}
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <p style={{ fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: T.textTertiary, margin: "0 0 4px" }}>
          {isAllPage
            ? "Workspace · All Tasks"
            : new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 500, letterSpacing: "-0.03em", color: T.textPrimary, margin: 0, lineHeight: 1 }}>
          {isAllPage ? "All Tasks" : "Today"}
        </h1>
      </div>

      {/* Tasks (N) label */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.textSecondary }}>Tasks</span>
        <span style={{ fontSize: 12, color: T.textMuted }}>
          ({allTasks.filter(t => !t.isCompleted).length})
        </span>
      </div>

      {/* ── Inline task creation — top of list ── */}
      {(() => {
        const em = INLINE_FEELINGS.find(f => f.value === (emotion || "NEUTRAL")) ?? INLINE_FEELINGS[2];
        const dateLabel = fmtDateLbl(dueDate);
        const chip = (active: boolean, fg?: string): React.CSSProperties => ({
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "4px 9px", borderRadius: 6,
          background: active ? "#f1f3ef" : "#f8f9f5",
          border: `0.5px solid ${active && fg ? fg + "44" : "rgba(0,0,0,0.08)"}`,
          color: active && fg ? fg : "#5f5e5a",
          fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
        });
        const EMOTIONS_CYCLE: Emotion[] = ["DREADING","ANXIOUS","NEUTRAL","WILLING","EXCITED"];
        function cycleEmotion() {
          const idx = EMOTIONS_CYCLE.indexOf(emotion as Emotion);
          setEmotion(EMOTIONS_CYCLE[(idx + 1) % EMOTIONS_CYCLE.length]);
        }
        function submit() {
          if (!title.trim()) { setTitleError(true); titleRef.current?.focus(); return; }
          if (submitting) return;
          setTitleError(false);
          handleCreate();
          setTitle(""); setNote(""); setNoteOpen(false);
          setTimeout(() => titleRef.current?.focus(), 50);
        }
        const chipStyle = (fg?: string): React.CSSProperties => ({
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "4px 9px", borderRadius: 6,
          background: "#f8f9f5",
          border: `0.5px solid ${fg ? fg + "33" : "rgba(0,0,0,0.08)"}`,
          color: fg ?? "#5f5e5a",
          fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          position: "relative", overflow: "hidden",
        });
        return (
          <div style={{ marginBottom: 8 }}>
            {!formOpen ? (
              <div onClick={openForm} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px 8px 14px", cursor: "pointer", borderRadius: 8, width: "fit-content" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f8f9f5"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px solid #059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 1v8M1 5h8" stroke="#059669" strokeWidth="1.75" strokeLinecap="round"/>
                  </svg>
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#059669" }}>New task</span>
              </div>
            ) : (
              <div ref={formRef} style={{ border: "1px solid #059669", borderRadius: 0, background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px 4px 16px" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px dashed #c4cbc2", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <style>{`.task-name-input.is-error::placeholder { color: #c23934; opacity: 1; }`}</style>
                    <input ref={titleRef} value={title} autoFocus
                      className={`task-name-input${titleError ? " is-error" : ""}`}
                      onChange={e => { setTitle(e.target.value); if (titleError && e.target.value.trim()) setTitleError(false); const d = detectEmotion(e.target.value); if (d) setEmotion(d as Emotion); }}
                      onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") resetForm(); }}
                      placeholder="Task name"
                      style={{ width: "100%", border: "none", outline: "none", fontFamily: "inherit", fontSize: 14, letterSpacing: "-0.01em", color: T.textPrimary, background: "transparent", marginBottom: 2 }} />
                    {noteOpen ? (
                      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Notes" rows={2}
                        style={{ width: "100%", border: "none", outline: "none", fontFamily: "inherit", fontSize: 12, color: "#5f5e5a", background: "transparent", resize: "none", lineHeight: 1.5, padding: 0 }} />
                    ) : (
                      <div onClick={() => setNoteOpen(true)} style={{ fontSize: 12, color: "#b9d3c4", cursor: "text" }}>{note.trim() || "Notes"}</div>
                    )}
                  </div>
                </div>
                <div ref={chipBarRef} style={{ display: "flex", gap: 5, padding: "6px 16px 10px", borderTop: "0.5px solid rgba(0,0,0,0.05)", marginTop: 6, flexWrap: "wrap", position: "relative" }}>

                  {/* Feeling chip + dropdown */}
                  <div style={{ position: "relative" }}>
                    <button onClick={() => { setShowEmoPicker(o => !o); setShowDatePicker(false); setShowCustomDate(false); setShowTimePicker(false); setShowCustomTime(false); }}
                      style={{ ...chipStyle(em.fg), background: em.bg }}>
                      <span style={{ fontSize: 10 }}>{em.emoji}</span> {em.label}
                    </button>
                    {showEmoPicker && (
                      <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", minWidth: 150, padding: "4px 0", overflow: "hidden" }}>
                        {INLINE_FEELINGS.map(f => (
                          <button key={f.value} onClick={() => { setEmotion(f.value as Emotion); setShowEmoPicker(false); }}
                            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", background: emotion === f.value ? f.bg : "none", border: "none", cursor: "pointer", fontSize: 13, color: emotion === f.value ? f.fg : "#082d1d", fontFamily: "inherit" }}>
                            {f.emoji} {f.label}
                            {emotion === f.value && <span style={{ marginLeft: "auto", fontSize: 11 }}>✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Date chip + dropdown */}
                  <div style={{ position: "relative" }}>
                    <button onClick={() => { setShowDatePicker(o => !o); setShowCustomDate(false); setShowTimePicker(false); setShowCustomTime(false); setShowEmoPicker(false); }}
                      style={chipStyle("#059669")}>
                      <span style={{ fontSize: 10 }}>📅</span> {dateLabel}
                    </button>
                    {showDatePicker && (
                      <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, display: "flex", gap: 8 }}>
                        <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", minWidth: 200, padding: "4px 0", overflow: "hidden" }}>
                          {getDatePresets().map(opt => (
                            <button key={opt.value} onClick={() => { setDueDate(opt.value); setShowDatePicker(false); setShowCustomDate(false); }}
                              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 14px", background: dueDate === opt.value ? "#f2fdec" : "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                              <span style={{ fontSize: 13, color: dueDate === opt.value ? "#059669" : "#082d1d", fontWeight: dueDate === opt.value ? 500 : 400 }}>{opt.label}</span>
                              <span style={{ fontSize: 11, color: dueDate === opt.value ? "#059669" : "#888780" }}>{opt.sub}{dueDate === opt.value ? " ✓" : ""}</span>
                            </button>
                          ))}
                          <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }} />
                          <button onClick={() => { setShowCustomDate(s => !s); setShowTimePicker(false); setShowCustomTime(false); }}
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 14px", background: showCustomDate ? "#f2fdec" : "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                            <span style={{ fontSize: 13, color: "#082d1d", fontWeight: showCustomDate ? 500 : 400 }}>Custom date</span>
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

                  {/* Time chip + dropdown */}
                  <div style={{ position: "relative" }}>
                    <button onClick={() => { setShowTimePicker(o => !o); setShowCustomTime(false); setShowDatePicker(false); setShowCustomDate(false); setShowEmoPicker(false); }}
                      style={chipStyle(dueTime ? "#5f5e5a" : undefined)}>
                      <span style={{ fontSize: 10 }}>🕐</span> {dueTime ? fmtTimeLbl(dueTime) : "Add time"}
                    </button>
                    {showTimePicker && (() => {
                      const now = new Date();
                      const todayStr = now.toISOString().slice(0, 10);
                      const isToday = dueDate === todayStr;
                      const nowTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
                      const slots = getTimeSlots(isToday, nowTime, fmtTimeLbl);
                      return (
                        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, display: "flex", gap: 8 }}>
                          <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", minWidth: 190, padding: "4px 0", overflow: "hidden" }}>
                            {slots.map(opt => (
                              <button key={opt.value}
                                onClick={() => { setDueTime(opt.value); setShowTimePicker(false); setShowCustomTime(false); }}
                                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 14px", background: dueTime === opt.value ? "#f2fdec" : "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                                <span style={{ fontSize: 13, color: dueTime === opt.value ? "#059669" : "#082d1d", fontWeight: dueTime === opt.value ? 500 : 400 }}>{opt.label}</span>
                                <span style={{ fontSize: 11, color: dueTime === opt.value ? "#059669" : "#888780" }}>{fmtTimeLbl(opt.value)}{dueTime === opt.value ? " ✓" : ""}</span>
                              </button>
                            ))}
                            <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)" }} />
                            <button onClick={() => {
                              const opening = !showCustomTime;
                              setShowCustomTime(opening);
                              setShowDatePicker(false); setShowCustomDate(false);
                              if (opening && !dueTime) setDueTime("09:00");
                            }}
                              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 14px", background: showCustomTime ? "#f2fdec" : "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                              <span style={{ fontSize: 13, color: "#082d1d", fontWeight: showCustomTime ? 500 : 400 }}>Custom time</span>
                              <ChevronRight size={13} color={showCustomTime ? "#059669" : "#888780"} />
                            </button>
                            {dueTime && (
                              <button onClick={() => { setDueTime(""); setShowTimePicker(false); setShowCustomTime(false); }}
                                style={{ display: "block", width: "100%", padding: "7px 14px", background: "none", border: "none", borderTop: "0.5px solid rgba(0,0,0,0.06)", cursor: "pointer", fontSize: 12, color: "#c23934", fontFamily: "inherit", textAlign: "left" }}>
                                Remove time
                              </button>
                            )}
                          </div>
                          {showCustomTime && (
                            <div style={{ background: "#fff", border: "1.5px solid #dde4de", borderRadius: 0, boxShadow: "0 4px 16px rgba(0,0,0,0.09)", padding: "12px 14px" }}>
                              <WheelTimePicker value={dueTime || "09:00"} onChange={t => setDueTime(t)} />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ flex: 1 }} />
                  <button onClick={submit} disabled={submitting}
                    style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#059669", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    {submitting ? "…" : "Add"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* All tasks — active first, completed at bottom, one list */}
      <div style={{ marginBottom: 10 }}>
        {isLoading ? (
          <SkeletonTaskList count={4} />
        ) : (
          <TaskGrid
            tasks={gridTasks}
            isLoading={false}
            emptyState={
              <div style={{ padding: "40px 0", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>
                <p style={{ fontSize: 13, color: T.textMuted }}>No tasks yet — add one above</p>
              </div>
            }
          />
        )}
      </div>

      <div style={{ flex: 1 }} />
    </div>
    </div>
  );
}

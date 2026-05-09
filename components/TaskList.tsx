"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableTaskCard } from "@/components/SortableTaskCard";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { DatePickerField, MiniCalendar } from "@/components/DatePickerField";
import { TimePickerField, WheelTimePicker } from "@/components/TimePickerField";
import { SkeletonTaskList } from "@/components/Skeleton";
import { Plus, ChevronRight } from "lucide-react";
import type { TaskWithSubtasks } from "@/lib/types";

type Emotion = "DREADING" | "ANXIOUS" | "NEUTRAL" | "WILLING" | "EXCITED";

const INLINE_FEELINGS = [
  { value: "DREADING", label: "Dreading", emoji: "😮‍💨", bg: "#FFF0EC", fg: "#D14626" },
  { value: "ANXIOUS",  label: "Anxious",  emoji: "😟",   bg: "#FFF8E8", fg: "#B07A10" },
  { value: "NEUTRAL",  label: "Neutral",  emoji: "😐",   bg: "#F3F2F0", fg: "#7A756E" },
  { value: "WILLING",  label: "Willing",  emoji: "🙂",   bg: "#EEF9F7", fg: "#0E8A7D" },
  { value: "EXCITED",  label: "Excited",  emoji: "🤩",   bg: "#EEFAF1", fg: "#1A9444" },
] as const;

function fmtDateLabel(iso: string) {
  const today = new Date().toISOString().slice(0, 10);
  const tmrw  = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (iso === today) return "Today";
  if (iso === tmrw)  return "Tomorrow";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtTimeLabel(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

const FEELING_KEYWORDS: Record<string, Emotion> = {
  dreading: "DREADING", dread: "DREADING",
  anxious: "ANXIOUS", anxiety: "ANXIOUS", nervous: "ANXIOUS", worried: "ANXIOUS", stress: "ANXIOUS",
  neutral: "NEUTRAL", okay: "NEUTRAL", fine: "NEUTRAL", meh: "NEUTRAL",
  willing: "WILLING", ready: "WILLING", open: "WILLING", sure: "WILLING",
  excited: "EXCITED", happy: "EXCITED", eager: "EXCITED", pumped: "EXCITED", love: "EXCITED",
};

function getDatePresets() {
  const t = new Date(); t.setHours(0,0,0,0);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return [
    { label: "Today",     sub: fmt(t),                                     value: t.toISOString().slice(0,10) },
    { label: "Tomorrow",  sub: fmt(new Date(t.getTime()+86400000)),         value: new Date(t.getTime()+86400000).toISOString().slice(0,10) },
    { label: "In 2 days", sub: fmt(new Date(t.getTime()+172800000)),        value: new Date(t.getTime()+172800000).toISOString().slice(0,10) },
    { label: "Next week", sub: fmt(new Date(t.getTime()+604800000)),        value: new Date(t.getTime()+604800000).toISOString().slice(0,10) },
  ];
}
function getTimeSlots(isToday: boolean, nowTime: string) {
  if (!isToday) return [
    { label: "Morning", value: "09:00" }, { label: "Noon", value: "12:00" },
    { label: "Afternoon", value: "14:00" }, { label: "Evening", value: "18:00" }, { label: "Night", value: "21:00" },
  ];
  const now = new Date();
  const slots: { label: string; value: string }[] = [];
  [30, 60, 120, 180].forEach(mins => {
    const t = new Date(now.getTime() + mins * 60000);
    const h = t.getHours(), rawM = t.getMinutes();
    const rM = Math.ceil(rawM / 15) * 15, fH = rM >= 60 ? h + 1 : h, fM = rM >= 60 ? 0 : rM;
    if (fH < 24) slots.push({ label: mins < 60 ? `In ${mins} min` : `In ${mins/60} hr${mins > 60 ? "s" : ""}`, value: `${String(fH).padStart(2,"0")}:${String(fM).padStart(2,"0")}` });
  });
  [{ label: "Afternoon", value: "14:00" }, { label: "Evening", value: "18:00" }, { label: "Night", value: "21:00" }]
    .filter(s => s.value > nowTime)
    .forEach(s => { if (!slots.find(x => x.value === s.value)) slots.push(s); });
  return slots;
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

function detectFeeling(text: string): Emotion | null {
  const lower = text.toLowerCase();
  for (const [kw, emotion] of Object.entries(FEELING_KEYWORDS)) {
    if (lower.includes(kw)) return emotion;
  }
  return null;
}

export function TaskList({ userName = "there", timeGreeting = "morning" }: { userName?: string; timeGreeting?: string }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const m = useTaskMutations();

  // Date navigation
  const todayISO = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const isToday = selectedDate === todayISO;

  function shiftDay(delta: number) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  }

  function dateLabelFor(iso: string): string {
    const d = new Date(iso + "T12:00:00");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (iso === today.toISOString().slice(0, 10)) return "Today";
    if (iso === yesterday.toISOString().slice(0, 10)) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data: tasks = [], isLoading } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", selectedDate],
    queryFn: async () => {
      const url = isToday
        ? "/api/tasks?filter=today"
        : `/api/tasks?date=${selectedDate}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    retry: 1,
  });

  // Sync manualOrder when tasks change
  useEffect(() => {
    setManualOrder(tasks.map((t) => t.id));
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayTasks = useMemo(() => {
    if (manualOrder.length === 0) return tasks;
    const map = new Map(tasks.map((t) => [t.id, t]));
    return manualOrder.map((id) => map.get(id)).filter(Boolean) as TaskWithSubtasks[];
  }, [tasks, manualOrder]);

  const { mutate: reorderTasks } = useMutation({
    mutationFn: async (ordered_ids: string[]) => {
      const res = await fetch("/api/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordered_ids }),
      });
      if (!res.ok) throw new Error("Failed to reorder");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = manualOrder.indexOf(active.id as string);
    const newIndex = manualOrder.indexOf(over.id as string);
    const newOrder = arrayMove(manualOrder, oldIndex, newIndex);

    setManualOrder(newOrder);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => reorderTasks(newOrder), 500);
  }

  const { markDone, uncompleteTask, updateTask, deferTask, deleteTask } = m;

  function pushTaskUp(id: string) {
    const idx = manualOrder.indexOf(id);
    if (idx <= 0) return;
    const newOrder = [...manualOrder];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setManualOrder(newOrder);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => reorderTasks(newOrder), 400);
  }

  const overdue = tasks.filter(t => t.dueAt && new Date(t.dueAt) < new Date()).length;
  const totalDeferred = tasks.reduce((s, t) => s + (t.deferredCount ?? 0), 0);

  // Inline task creation state — always expanded
  const inputRef = useRef<HTMLInputElement>(null);
  const [inlineDraft, setInlineDraft] = useState("");
  const [inlineDueDate, setInlineDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [inlineDueTime, setInlineDueTime] = useState("");
  const [inlineEmotion, setInlineEmotion] = useState<Emotion>("NEUTRAL");
  const [inlineNote, setInlineNote] = useState("");
  const [showEmotionPicker, setShowEmotionPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const chipBarRef = useRef<HTMLDivElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [formFocused, setFormFocused] = useState(false);

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (chipBarRef.current && !chipBarRef.current.contains(target)) {
        setShowEmotionPicker(false); setShowDatePicker(false); setShowTimePicker(false);
      }
      if (formContainerRef.current && !formContainerRef.current.contains(target)) {
        setFormFocused(false);
        setInlineDraft(""); setInlineNote(""); setNoteOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { mutate: createInline, isPending: creatingInline } = useMutation({
    mutationFn: async (vars: { title: string; dueAt: string | null; emotion: typeof inlineEmotion; note?: string }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: vars.title, dueAt: vars.dueAt, emotionalState: vars.emotion }),
      });
      if (!res.ok) throw new Error("Failed");
      const task = await res.json();
      // Save note to localStorage after we have the real task ID
      if (vars.note?.trim()) {
        try { localStorage.setItem(`orin_note_${task.id}`, vars.note.trim()); } catch {}
      }
      return task;
    },
    onMutate: async (vars) => {
      // Cancel in-flight refetches so they don't overwrite the optimistic update
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = queryClient.getQueriesData<TaskWithSubtasks[]>({ queryKey: ["tasks"] });

      // Build an optimistic task that looks like the real thing
      const optimistic: TaskWithSubtasks = {
        id: `optimistic-${Date.now()}`,
        userId: "",
        title: vars.title,
        dueAt: vars.dueAt ? new Date(vars.dueAt) : null,
        emotionalState: vars.emotion as TaskWithSubtasks["emotionalState"],
        isCompleted: false,
        deferredCount: 0,
        sortOrder: 99999,
        lastTouchedAt: new Date(),
        recurrenceRule: null,
        parentTaskId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        subtasks: [],
      };

      queryClient.setQueryData(["tasks", selectedDate], (old: TaskWithSubtasks[] = []) => [...old, optimistic]);

      // Reset form immediately — user sees instant feedback
      setInlineDraft(""); setInlineNote("");

      return { snap };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snap.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return (
    <>
      {/* ── Sticky task creation — always expanded ── */}
      {(() => {
        const em = INLINE_FEELINGS.find(f => f.value === inlineEmotion) ?? INLINE_FEELINGS[2];
        const dateLabel = inlineDueTime
          ? `${fmtDateLabel(inlineDueDate)} · ${fmtTimeLabel(inlineDueTime)}`
          : fmtDateLabel(inlineDueDate);

        function submitForm() {
          if (!inlineDraft.trim() || creatingInline) return;
          createInline({
            title: inlineDraft.trim(),
            dueAt: new Date(`${inlineDueDate}T${inlineDueTime || "00:00"}`).toISOString(),
            emotion: inlineEmotion,
            note: inlineNote,
          });
          // Clear title + note, keep emotion/date so user can keep adding
          setInlineDraft("");
          setInlineNote("");
          setNoteOpen(false);
          setShowEmotionPicker(false);
          setShowDatePicker(false);
          setTimeout(() => inputRef.current?.focus(), 50);
        }

        const chip = (active: boolean, fg?: string) => ({
          display: "inline-flex" as const, alignItems: "center" as const, gap: 5,
          padding: "5px 10px", borderRadius: 7,
          background: active ? "#f1f3ef" : "#f8f9f5",
          border: `0.5px solid ${active && fg ? fg + "44" : "rgba(0,0,0,0.08)"}`,
          color: active && fg ? fg : "#5f5e5a",
          fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          transition: "all 0.1s",
        });

        return (
          <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#f8f9f5", paddingBottom: 16 }}>
            <div ref={formContainerRef} onFocus={() => setFormFocused(true)} style={{ border: `1px solid ${formFocused ? "#059669" : "rgba(0,0,0,0.09)"}`, borderRadius: 10, transition: "border-color 0.15s", background: "#fff" }}>

              {/* Top: circle + title + Add */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 14px 6px" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px dashed #c4cbc2", flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    ref={inputRef}
                    id="inline-task-input"
                    value={inlineDraft}
                    onChange={e => {
                      const val = e.target.value;
                      setInlineDraft(val);
                      const detected = detectFeeling(val);
                      if (detected) setInlineEmotion(detected);
                    }}
                    onKeyDown={e => { if (e.key === "Enter") submitForm(); }}
                    placeholder="Task name"
                    style={{ width: "100%", border: "none", outline: "none", fontFamily: "inherit", fontSize: 14, letterSpacing: "-0.01em", color: "#082d1d", background: "transparent", marginBottom: 4 }}
                  />
                  {/* Note inline */}
                  {noteOpen ? (
                    <textarea
                      autoFocus
                      value={inlineNote}
                      onChange={e => setInlineNote(e.target.value)}
                      placeholder="Notes"
                      rows={2}
                      style={{ width: "100%", border: "none", outline: "none", fontFamily: "inherit", fontSize: 12, color: "#5f5e5a", background: "transparent", resize: "none", lineHeight: 1.5, display: "block", padding: 0 }}
                    />
                  ) : (
                    <div onClick={() => setNoteOpen(true)} style={{ fontSize: 12, color: "#b9d3c4", cursor: "text", marginBottom: 2 }}>
                      {inlineNote.trim() || "Notes"}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom chip bar */}
              <div ref={chipBarRef} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderTop: "0.5px solid rgba(0,0,0,0.06)", flexWrap: "wrap", position: "relative" }}>

                {/* Feeling chip + dropdown */}
                <div style={{ position: "relative" }}>
                  <button onClick={() => { setShowEmotionPicker(o => !o); setShowDatePicker(false); setShowCustomDate(false); setShowTimePicker(false); setShowCustomTime(false); }}
                    style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 9px", borderRadius:6, background:em.bg, border:`0.5px solid ${em.fg}33`, color:em.fg, fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
                    <span style={{ fontSize: 10 }}>{em.emoji}</span> {em.label}
                  </button>
                  {showEmotionPicker && (
                    <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:50, background:"#fff", border:"0.5px solid rgba(0,0,0,0.12)", borderRadius:10, boxShadow:"0 4px 20px rgba(0,0,0,0.1)", minWidth:150, padding:"4px 0", overflow:"hidden" }}>
                      {INLINE_FEELINGS.map(f => (
                        <button key={f.value} onClick={() => { setInlineEmotion(f.value as Emotion); setShowEmotionPicker(false); }}
                          style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 14px", background:inlineEmotion===f.value?f.bg:"none", border:"none", cursor:"pointer", fontSize:13, color:inlineEmotion===f.value?f.fg:"#082d1d", fontFamily:"inherit" }}>
                          {f.emoji} {f.label}
                          {inlineEmotion===f.value && <span style={{ marginLeft:"auto", fontSize:11 }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date chip + dropdown */}
                <div style={{ position: "relative" }}>
                  <button onClick={() => { setShowDatePicker(o => !o); setShowCustomDate(false); setShowTimePicker(false); setShowCustomTime(false); setShowEmotionPicker(false); }}
                    style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 9px", borderRadius:6, background:"#f8f9f5", border:"0.5px solid rgba(5,150,105,0.25)", color:"#059669", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
                    <span style={{ fontSize: 10 }}>📅</span> {dateLabel}
                  </button>
                  {showDatePicker && (
                    <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:50, display:"flex", gap:8 }}>
                      <div style={{ background:"#fff", border:"0.5px solid rgba(0,0,0,0.12)", borderRadius:10, boxShadow:"0 4px 20px rgba(0,0,0,0.1)", minWidth:200, padding:"4px 0", overflow:"hidden" }}>
                        {getDatePresets().map(opt => (
                          <button key={opt.value} onClick={() => { setInlineDueDate(opt.value); setShowDatePicker(false); setShowCustomDate(false); }}
                            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"8px 14px", background:inlineDueDate===opt.value?"#f2fdec":"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                            <span style={{ fontSize:13, color:inlineDueDate===opt.value?"#059669":"#082d1d", fontWeight:inlineDueDate===opt.value?500:400 }}>{opt.label}</span>
                            <span style={{ fontSize:11, color:inlineDueDate===opt.value?"#059669":"#888780" }}>{opt.sub}{inlineDueDate===opt.value?" ✓":""}</span>
                          </button>
                        ))}
                        <div style={{ borderTop:"0.5px solid rgba(0,0,0,0.06)" }} />
                        <button onClick={() => { setShowCustomDate(s => !s); setShowTimePicker(false); setShowCustomTime(false); }}
                          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"8px 14px", background:showCustomDate?"#f2fdec":"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                          <span style={{ fontSize:13, color:"#082d1d", fontWeight:showCustomDate?500:400 }}>Custom date</span>
                          <ChevronRight size={13} color={showCustomDate ? "#059669" : "#888780"} />
                        </button>
                      </div>
                      {showCustomDate && (
                        <MiniCalendar
                          selected={inlineDueDate}
                          onSelect={iso => { setInlineDueDate(iso); setShowDatePicker(false); setShowCustomDate(false); }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Time chip + dropdown */}
                <div style={{ position: "relative" }}>
                  <button onClick={() => { setShowTimePicker(o => !o); setShowCustomTime(false); setShowDatePicker(false); setShowCustomDate(false); setShowEmotionPicker(false); }}
                    style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 9px", borderRadius:6, background:"#f8f9f5", border:"0.5px solid rgba(0,0,0,0.08)", color:"#5f5e5a", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
                    <span style={{ fontSize: 10 }}>🕐</span> {inlineDueTime ? fmtTimeLabel(inlineDueTime) : "Add time"}
                  </button>
                  {showTimePicker && (() => {
                    const now = new Date();
                    const todayStr = now.toISOString().slice(0,10);
                    const isToday = inlineDueDate === todayStr;
                    const nowTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
                    const slots = getTimeSlots(isToday, nowTime);
                    return (
                      <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:50, display:"flex", gap:8 }}>
                        <div style={{ background:"#fff", border:"0.5px solid rgba(0,0,0,0.12)", borderRadius:10, boxShadow:"0 4px 20px rgba(0,0,0,0.1)", minWidth:190, padding:"4px 0", overflow:"hidden" }}>
                          {slots.map(opt => (
                            <button key={opt.value}
                              onClick={() => { setInlineDueTime(opt.value); setShowTimePicker(false); setShowCustomTime(false); }}
                              style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"8px 14px", background:inlineDueTime===opt.value?"#f2fdec":"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                              <span style={{ fontSize:13, color:inlineDueTime===opt.value?"#059669":"#082d1d", fontWeight:inlineDueTime===opt.value?500:400 }}>{opt.label}</span>
                              <span style={{ fontSize:11, color:inlineDueTime===opt.value?"#059669":"#888780" }}>{fmtTimeLabel(opt.value)}{inlineDueTime===opt.value?" ✓":""}</span>
                            </button>
                          ))}
                          <div style={{ borderTop:"0.5px solid rgba(0,0,0,0.06)" }} />
                          <button onClick={() => {
                            const opening = !showCustomTime;
                            setShowCustomTime(opening);
                            setShowDatePicker(false); setShowCustomDate(false);
                            if (opening && !inlineDueTime) setInlineDueTime("09:00");
                          }}
                            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"8px 14px", background:showCustomTime?"#f2fdec":"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                            <span style={{ fontSize:13, color:"#082d1d", fontWeight:showCustomTime?500:400 }}>Custom time</span>
                            <ChevronRight size={13} color={showCustomTime ? "#059669" : "#888780"} />
                          </button>
                          {inlineDueTime && (
                            <button onClick={() => { setInlineDueTime(""); setShowTimePicker(false); setShowCustomTime(false); }}
                              style={{ display:"block", width:"100%", padding:"7px 14px", background:"none", border:"none", borderTop:"0.5px solid rgba(0,0,0,0.06)", cursor:"pointer", fontSize:12, color:"#c23934", fontFamily:"inherit", textAlign:"left" }}>
                              Remove time
                            </button>
                          )}
                        </div>
                        {showCustomTime && (
                          <div style={{ background:"#fff", border:"0.5px solid rgba(0,0,0,0.12)", borderRadius:10, boxShadow:"0 4px 20px rgba(0,0,0,0.1)", padding:"12px 14px" }}>
                            <WheelTimePicker value={inlineDueTime || "09:00"} onChange={t => setInlineDueTime(t)} />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                <div style={{ flex: 1 }} />
                <button onClick={submitForm} disabled={creatingInline}
                  style={{ padding:"5px 14px", borderRadius:6, border:"none", background:"#059669", color:"#fff", fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  {creatingInline ? "…" : "Add"}
                </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Page header ── */}
      <div style={{ marginBottom: 16, marginTop: 8 }}>
        <p style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4a6d47", margin: "0 0 4px" }}>Workspace · Today</p>
        <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.03em", color: "#082d1d", lineHeight: 1, margin: 0 }}>Today</h1>
      </div>

      {/* ── Cards ── */}
      {isLoading ? (
        <SkeletonTaskList count={5} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
              {displayTasks.map((t, idx) => (
                <SortableTaskCard
                  key={t.id}
                  task={t}
                  dragActive={true}
                  canPushUp={idx > 0}
                  onPushUp={pushTaskUp}
                  onMarkDone={markDone}
                  onUncomplete={uncompleteTask}
                  onDefer={deferTask}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <TaskCreateModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

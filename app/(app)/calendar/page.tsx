"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { TaskWithSubtasks } from "@/lib/types";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

const EMOTION_COLOUR: Record<string, string> = {
  DREADING: "#c23934", ANXIOUS: "#886a00", NEUTRAL: "#c4cbc2",
  WILLING: "#2b6b5e", EXCITED: "#59d10b",
};
const EMOTION_EMOJI: Record<string, string> = {
  DREADING: "😮‍💨", ANXIOUS: "😟", NEUTRAL: "😐", WILLING: "🙂", EXCITED: "🤩",
};
const EMOTION_LABEL: Record<string, string> = {
  DREADING: "Dreading", ANXIOUS: "Anxious", NEUTRAL: "Neutral",
  WILLING: "Willing", EXCITED: "Excited",
};

const DAY_NAMES   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function fmtTime(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const iso = new Date(dueAt).toISOString();
  if (iso.slice(11) === "00:00:00.000Z") return null;
  return new Date(dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function loadNote(id: string) {
  try { return localStorage.getItem(`orin_note_${id}`) ?? ""; } catch { return ""; }
}

function isOverdue(task: TaskWithSubtasks): boolean {
  if (task.isCompleted || !task.dueAt) return false;
  const iso = new Date(task.dueAt).toISOString();
  // date-only sentinel: compare dates
  if (iso.slice(11) === "00:00:00.000Z") {
    return iso.slice(0, 10) < new Date().toISOString().slice(0, 10);
  }
  return new Date(task.dueAt) < new Date();
}

function pillStyle(task: TaskWithSubtasks): React.CSSProperties {
  if (task.isCompleted) return { background: "#F3F2F0", color: "#7A756E" }; // Neutral
  if (isOverdue(task))  return { background: "#FFF0EC", color: "#D14626" }; // Dreading
  return { background: "#EEFAF1", color: "#1A9444" };                        // Excited
}

// ── Task Detail Modal — matches TaskCard todo design ─────────────────

function TaskDetailModal({ task, onClose, onMarkDone, onMarkUndone }: {
  task: TaskWithSubtasks; onClose: () => void;
  onMarkDone: (id: string) => void; onMarkUndone: (id: string) => void;
}) {
  const isMobile = useIsMobile();
  const time     = fmtTime(task.dueAt);
  const note     = loadNote(task.id);
  const colour   = EMOTION_COLOUR[task.emotionalState] ?? "#c4cbc2";
  const isDone   = task.isCompleted;
  const overdue  = isOverdue(task);

  // date label matching TaskCard's fmtDue logic
  const taskIso  = task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const tmrwIso  = (() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); })();
  const dateLabel = !taskIso ? null
    : taskIso === todayIso ? "Today"
    : taskIso === tmrwIso  ? "Tomorrow"
    : new Date(taskIso + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const cardStyle: React.CSSProperties = isMobile ? {
    position: "fixed", bottom: 60, left: 0, right: 0, zIndex: 70,
    background: "#fff", borderRadius: "16px 16px 0 0",
    border: "1.5px solid #dde4de", borderBottom: "none",
    boxShadow: "0 -4px 24px rgba(0,0,0,0.1)", overflow: "hidden",
  } : {
    position: "fixed", top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 70, width: 400,
    background: "#fff", borderRadius: 12,
    border: "1px solid #dde4de",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)", overflow: "hidden",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(8,45,29,0.2)", backdropFilter: "blur(2px)" }} />
      <div style={cardStyle}>
        {/* Title row — same layout as TaskCard */}
        <div style={{ display: "flex", alignItems: "flex-start", padding: "14px 16px", borderBottom: "1px solid #e9ede9" }}>
          {/* Checkbox — click to toggle done/undone directly */}
          <div
            onClick={() => { if (isDone) onMarkUndone(task.id); else onMarkDone(task.id); onClose(); }}
            style={{
              width: 20, height: 20, borderRadius: "50%",
              border: `1.5px solid ${isDone ? "#059669" : "#dde4de"}`,
              background: isDone ? "#059669" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: 2, marginRight: 12, cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {isDone && (
              <svg width="10" height="7" viewBox="0 0 11 8" fill="none">
                <path d="M1 4l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <p style={{ fontSize: 14, fontWeight: 450, color: isDone ? "#b9d3c4" : "#082d1d", margin: 0, flex: 1, lineHeight: 1.4, textDecoration: isDone ? "line-through" : "none" }}>
            {task.title}
          </p>
          <button onClick={onClose} style={{ width: 26, height: 26, border: "1.5px solid #dde4de", borderRadius: 7, background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a6d47", flexShrink: 0, marginLeft: 10 }}>
            <X size={12} />
          </button>
        </div>

        {/* Date + emotion — same chips as TaskCard row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "10px 16px", borderBottom: note ? "1px solid #e9ede9" : "none" }}>
          {dateLabel && (
            <span style={{ fontSize: 12, fontWeight: 500, color: overdue ? "#c23934" : isDone ? "#b9d3c4" : "#059669" }}>
              {overdue && "⚠ "}{dateLabel}{time ? ` · ${time}` : ""}
            </span>
          )}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 999,
            background: colour + "22", color: colour,
          }}>
            {EMOTION_EMOJI[task.emotionalState]} {EMOTION_LABEL[task.emotionalState]}
          </span>
          {task.deferredCount > 0 && (
            <span style={{ fontSize: 11, color: "#c23934" }}>deferred {task.deferredCount}×</span>
          )}
        </div>

        {/* Note */}
        {note && (
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #e9ede9" }}>
            <p style={{ fontSize: 12, color: "#b9d3c4", margin: 0, lineHeight: 1.5 }}>{note}</p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px" }}>
          <p style={{ fontSize: 11, color: "#b9d3c4", margin: 0 }}>
            {isDone ? "Tap circle to mark incomplete" : "Tap circle to mark done"}
          </p>
          <button onClick={onClose} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #dde4de", background: "#fff", color: "#3d5a4a", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}

// ── Day Task List Modal — TaskCard-style rows ────────────────────────

function DayTaskListModal({ date, tasks, onClose, onTaskClick }: {
  date: string; tasks: TaskWithSubtasks[];
  onClose: () => void; onTaskClick: (t: TaskWithSubtasks) => void;
}) {
  const isMobile = useIsMobile();
  const cardStyle: React.CSSProperties = isMobile ? {
    position: "fixed", bottom: 60, left: 0, right: 0, zIndex: 70,
    background: "#fff", borderRadius: "16px 16px 0 0",
    border: "1.5px solid #dde4de", borderBottom: "none",
    boxShadow: "0 -4px 24px rgba(0,0,0,0.1)", maxHeight: "60vh", overflowY: "auto",
  } : {
    position: "fixed", top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 70, width: 420,
    background: "#fff", borderRadius: 12,
    border: "1px solid #dde4de",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)", maxHeight: "70vh", overflowY: "auto",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(8,45,29,0.2)", backdropFilter: "blur(2px)" }} />
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #e9ede9", position: "sticky", top: 0, background: "#fff" }}>
          <div>
            <p style={{ fontFamily: "monospace", fontSize: 10, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>All tasks</p>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: "#082d1d", margin: 0 }}>{fmtDate(date)}</p>
          </div>
          <button onClick={onClose} style={{ width: 26, height: 26, border: "1.5px solid #dde4de", borderRadius: 7, background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a6d47" }}>
            <X size={12} />
          </button>
        </div>

        {/* Task rows — match TaskCard layout */}
        {tasks.map((task, idx) => {
          const colour  = EMOTION_COLOUR[task.emotionalState] ?? "#c4cbc2";
          const time    = fmtTime(task.dueAt);
          const isDone  = task.isCompleted;
          const overdue = isOverdue(task);
          return (
            <button
              key={task.id}
              onClick={() => { onClose(); onTaskClick(task); }}
              style={{
                display: "flex", alignItems: "flex-start",
                width: "100%", padding: "12px 16px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "inherit", textAlign: "left",
                borderBottom: idx < tasks.length - 1 ? "1px solid #f1f3ef" : "none",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8f9f5"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
            >
              {/* Checkbox */}
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                border: `1.5px solid ${isDone ? "#059669" : "#dde4de"}`,
                background: isDone ? "#059669" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: 2, marginRight: 10,
              }}>
                {isDone && (
                  <svg width="8" height="6" viewBox="0 0 11 8" fill="none">
                    <path d="M1 4l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Title */}
                <p style={{ fontSize: 13.5, fontWeight: 450, color: isDone ? "#b9d3c4" : "#082d1d", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isDone ? "line-through" : "none" }}>
                  {task.title}
                </p>
                {/* Date + emotion chip */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {time && (
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: overdue ? "#c23934" : isDone ? "#b9d3c4" : "#4a6d47" }}>
                      {overdue && "⚠ "}{time}
                    </span>
                  )}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: colour + "22", color: colour }}>
                    {EMOTION_EMOJI[task.emotionalState]} {EMOTION_LABEL[task.emotionalState]}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ── Mobile month picker ──────────────────────────────────────────────

function MonthPicker({ year, month, onSelect, onClose }: { year: number; month: number; onSelect: (y: number, m: number) => void; onClose: () => void }) {
  const [pickerYear, setPickerYear] = useState(year);
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(8,45,29,0.15)" }} />
      <div style={{ position: "fixed", top: 52, left: 12, right: 12, zIndex: 90, background: "#fff", borderRadius: 12, border: "1.5px solid #dde4de", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "12px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
          <button onClick={() => setPickerYear(y => y - 1)} style={{ width: 32, height: 32, border: "1px solid #dde4de", borderRadius: 8, background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronLeft size={14} color="#4a6d47" /></button>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#082d1d" }}>{pickerYear}</span>
          <button onClick={() => setPickerYear(y => y + 1)} style={{ width: 32, height: 32, border: "1px solid #dde4de", borderRadius: 8, background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={14} color="#4a6d47" /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {MONTH_SHORT.map((m, i) => {
            const isActive = pickerYear === year && i === month;
            return (
              <button key={m} onClick={() => { onSelect(pickerYear, i); onClose(); }} style={{ padding: "10px 0", borderRadius: 8, border: isActive ? "1.5px solid #059669" : "1.5px solid transparent", background: isActive ? "#f2fdec" : "transparent", color: isActive ? "#059669" : "#082d1d", fontSize: 13, fontWeight: isActive ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>{m}</button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Mobile agenda view ───────────────────────────────────────────────

function MobileCalendar({
  viewDate, setViewDate, tasksByDate, today,
  onAddTask, onTaskTap, onDayOverflow,
}: {
  viewDate: Date; setViewDate: (d: Date) => void;
  tasksByDate: Map<string, TaskWithSubtasks[]>; today: Date;
  onAddTask: (date: string) => void;
  onTaskTap: (task: TaskWithSubtasks) => void;
  onDayOverflow: (date: string, tasks: TaskWithSubtasks[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysArr = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => new Date(year, month, i + 1));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Month header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid #dde4de", flexShrink: 0, background: "#fff" }}>
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ width: 36, height: 36, border: "1.5px solid #dde4de", borderRadius: 8, background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronLeft size={16} color="#4a6d47" /></button>
        <button onClick={() => setPickerOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 17, fontWeight: 800, color: "#082d1d", letterSpacing: "-0.02em", fontFamily: "inherit" }}>
          {MONTH_NAMES[month]} {year}
          <ChevronRight size={14} color="#059669" style={{ transform: pickerOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
        </button>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ width: 36, height: 36, border: "1.5px solid #dde4de", borderRadius: 8, background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={16} color="#4a6d47" /></button>
      </div>

      {pickerOpen && <MonthPicker year={year} month={month} onSelect={(y, m) => setViewDate(new Date(y, m, 1))} onClose={() => setPickerOpen(false)} />}

      {/* Day rows */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {daysArr.map(day => {
          const key      = isoDate(day);
          const dayTasks = tasksByDate.get(key) ?? [];
          const isToday  = key === isoDate(today);
          const dow      = DAY_NAMES[day.getDay()];
          const MAX      = 2;
          const visible  = dayTasks.slice(0, MAX);
          const overflow = dayTasks.length - MAX;

          return (
            <div key={key} style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid #f1f3ef", minHeight: 56, background: isToday ? "#f2fdec" : "#fff" }}>
              {/* Left: day + date */}
              <div style={{ width: 56, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: "10px 0", borderRight: `2px solid ${isToday ? "#059669" : "#e9ede9"}` }}>
                <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.04em", color: isToday ? "#059669" : "#b9d3c4", textTransform: "uppercase" }}>{dow}</span>
                <span style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: isToday ? 800 : 500, background: isToday ? "#059669" : "transparent", color: isToday ? "#fff" : "#082d1d" }}>{day.getDate()}</span>
              </div>

              {/* Right: tasks + add */}
              <div style={{ flex: 1, padding: "8px 12px 8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                {visible.map(task => (
                  <div key={task.id} onClick={e => { e.stopPropagation(); onTaskTap(task); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, background: EMOTION_COLOUR[task.emotionalState] + "18", borderLeft: `3px solid ${EMOTION_COLOUR[task.emotionalState]}`, cursor: "pointer" }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#082d1d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textDecoration: task.isCompleted ? "line-through" : "none" }}>
                      {fmtTime(task.dueAt) && <span style={{ color: "#b9d3c4", marginRight: 4, fontSize: 11, fontFamily: "monospace" }}>{fmtTime(task.dueAt)}</span>}
                      {task.title}
                    </span>
                    {task.isCompleted && <span style={{ fontSize: 10, color: "#059669" }}>✓</span>}
                  </div>
                ))}
                {overflow > 0 && (
                  <button onClick={e => { e.stopPropagation(); onDayOverflow(key, dayTasks); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#059669", fontWeight: 600, textAlign: "left", padding: "2px 4px", fontFamily: "inherit" }}>
                    +{overflow} more
                  </button>
                )}
                {dayTasks.length === 0 && (
                  <button onClick={() => onAddTask(key)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#dde4de", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit", padding: 0 }}>
                    <Plus size={12} /> Add task
                  </button>
                )}
                {dayTasks.length > 0 && (
                  <button onClick={() => onAddTask(key)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#b9d3c4", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit", padding: "1px 0" }}>
                    <Plus size={11} /> Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function CalendarPage() {
  const queryClient  = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const today        = new Date();
  const isMobile     = useIsMobile();

  const [viewDate, setViewDate]     = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithSubtasks | null>(null);
  const [dayTaskList, setDayTaskList]   = useState<{ date: string; tasks: TaskWithSubtasks[] } | null>(null);

  // Fetch only the ±1 month window around the current view — much smaller payload
  const viewYear  = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const rangeFrom = new Date(viewYear, viewMonth - 1, 1).toISOString().slice(0, 10);
  const rangeTo   = new Date(viewYear, viewMonth + 2, 0).toISOString().slice(0, 10);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", "calendar", rangeFrom, rangeTo],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?filter=calendar&from=${rangeFrom}&to=${rangeTo}`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 2 * 60 * 1000, // serve from cache for 2 min when navigating back
    retry: 1,
  });

  const { mutate: markDone } = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const { mutate: markUndone } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isCompleted: false }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskWithSubtasks[]>();
    for (const t of tasks) {
      if (!t.dueAt) continue;
      const key = isoDate(new Date(t.dueAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks]);

  const { days, month, year } = useMemo(() => {
    const year     = viewDate.getFullYear();
    const month    = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
    ];
    while (days.length % 7 !== 0) days.push(null);
    return { days, month, year };
  }, [viewDate]);

  // ── Mobile render ─────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <MobileCalendar
          viewDate={viewDate} setViewDate={setViewDate}
          tasksByDate={tasksByDate} today={today}
          onAddTask={date => setCreateDate(date)}
          onTaskTap={task => setSelectedTask(task)}
          onDayOverflow={(date, tasks) => setDayTaskList({ date, tasks })}
        />

        {selectedTask && (
          <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} onMarkDone={id => { markDone(id); setSelectedTask(null); }} onMarkUndone={id => { markUndone(id); setSelectedTask(null); }} />
        )}
        {dayTaskList && (
          <DayTaskListModal date={dayTaskList.date} tasks={dayTaskList.tasks} onClose={() => setDayTaskList(null)} onTaskClick={t => setSelectedTask(t)} />
        )}
        <TaskCreateModal open={!!createDate} onOpenChange={open => { if (!open) setCreateDate(null); }} defaultDate={createDate ?? undefined} />
      </div>
    );
  }

  // ── Desktop render ────────────────────────────────────────────────
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px 16px", borderBottom: "1px solid #dde4de", flexShrink: 0 }}>
        <div>
          <p style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#b9d3c4", marginBottom: 6 }}>Schedule</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #dde4de", background: "#fff", cursor: "pointer", fontSize: 15, color: "#4a6d47", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: "#082d1d", lineHeight: 1, margin: 0 }}>
              {new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h1>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #dde4de", background: "#fff", cursor: "pointer", fontSize: 15, color: "#4a6d47", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          </div>
        </div>
        <div />
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #dde4de", flexShrink: 0 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ padding: "8px 0", textAlign: "center", fontFamily: "monospace", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#b9d3c4" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div ref={containerRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {days.map((day, i) => {
            if (!day) return (
              <div key={`empty-${i}`} style={{ height: 130, borderRight: i % 7 !== 6 ? "1px solid #dde4de" : "none", borderBottom: "1px solid #dde4de", background: "#fafbf7" }} />
            );

            const key          = isoDate(day);
            const dayTasks     = tasksByDate.get(key) ?? [];
            const isToday      = key === isoDate(today);
            const isOtherMonth = day.getMonth() !== month;
            const MAX_VISIBLE  = 3;
            const visible      = dayTasks.slice(0, MAX_VISIBLE);
            const overflow     = dayTasks.length - MAX_VISIBLE;

            return (
              <div key={key}
                onClick={() => setCreateDate(key)}
                style={{
                  height: 130, overflow: "hidden",
                  borderRight: i % 7 !== 6 ? "1px solid #dde4de" : "none",
                  borderBottom: "1px solid #dde4de",
                  borderTop: isToday ? "2px solid #059669" : "none",
                  padding: "6px 6px 4px",
                  background: isOtherMonth ? "#fafbf7" : "#fff",
                  cursor: "pointer", transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!isOtherMonth) (e.currentTarget as HTMLElement).style.background = "#f2fdec"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isOtherMonth ? "#fafbf7" : "#fff"; }}
              >
                {/* Date number */}
                <div style={{ marginBottom: 4, display: "flex", justifyContent: "center" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: isToday ? 700 : 400, background: isToday ? "#059669" : "transparent", color: isToday ? "#fff" : isOtherMonth ? "#c4cbc2" : "#082d1d" }}>
                    {day.getDate()}
                  </span>
                </div>

                {/* Task pills */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {visible.map(task => {
                    const ps = pillStyle(task);
                    return (
                      <div key={task.id}
                        onClick={e => { e.stopPropagation(); setSelectedTask(task); }}
                        style={{ display: "flex", alignItems: "center", padding: "2px 6px", borderRadius: 4, background: ps.background, cursor: "pointer", overflow: "hidden" }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: ps.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textDecoration: task.isCompleted ? "line-through" : "none" }}>
                          {fmtTime(task.dueAt) && <>{fmtTime(task.dueAt)} </>}{task.title}
                        </span>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); setDayTaskList({ date: key, tasks: dayTasks }); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#059669", fontWeight: 600, padding: "0 4px", textAlign: "left", fontFamily: "inherit" }}>
                      +{overflow} more
                    </button>
                  )}
                  {dayTasks.length === 0 && (
                    <div style={{ textAlign: "center", marginTop: 4, fontSize: 18, color: "#dde4de", lineHeight: 1 }}>+</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} onMarkDone={id => { markDone(id); setSelectedTask(null); }} onMarkUndone={id => { markUndone(id); setSelectedTask(null); }} />
      )}
      {dayTaskList && (
        <DayTaskListModal date={dayTaskList.date} tasks={dayTaskList.tasks} onClose={() => setDayTaskList(null)} onTaskClick={t => setSelectedTask(t)} />
      )}
      <TaskCreateModal open={!!createDate} onOpenChange={open => { if (!open) setCreateDate(null); }} defaultDate={createDate ?? undefined} />
    </div>
  );
}

"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { FeelingPickerField, type Feeling } from "@/components/FeelingPickerField";
import { DatePickerField } from "@/components/DatePickerField";
import { TimePickerField } from "@/components/TimePickerField";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { TaskWithSubtasks } from "@/lib/types";
import { EMOTION_MAP } from "@/lib/emotions";
import { ChevronLeft, ChevronRight, Plus, X, Pencil, Trash2 } from "lucide-react";

function em(key: string) {
  return EMOTION_MAP[key as keyof typeof EMOTION_MAP] ?? EMOTION_MAP.NEUTRAL;
}

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

function taskDayState(task: TaskWithSubtasks): "overdue" | "today" | "future" | "none" {
  if (!task.dueAt) return "none";
  const iso = new Date(task.dueAt).toISOString();
  const taskDate = iso.slice(11) === "00:00:00.000Z"
    ? iso.slice(0, 10)
    : (() => { const d = new Date(task.dueAt as string | Date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  const todayIso = new Date().toISOString().slice(0, 10);
  if (taskDate < todayIso) return "overdue";
  if (taskDate === todayIso) return "today";
  return "future";
}

function pillStyle(task: TaskWithSubtasks): React.CSSProperties {
  if (task.isCompleted) return { background: "#F3F2F0", color: "#7A756E" }; // grey
  const state = taskDayState(task);
  if (state === "overdue") return { background: "#FFF0EC", color: "#D14626" }; // red
  if (state === "today")   return { background: "#EEFAF1", color: "#1A9444" }; // green
  return { background: "#F3F2F0", color: "#7A756E" };                          // future / no date → grey
}

// ── Task Detail Modal — matches TaskCard todo design ─────────────────

function TaskDetailModal({ task, onClose, onMarkDone, onMarkUndone }: {
  task: TaskWithSubtasks; onClose: () => void;
  onMarkDone: (id: string) => void; onMarkUndone: (id: string) => void;
}) {
  const isMobile = useIsMobile();
  const time     = fmtTime(task.dueAt);
  const note     = loadNote(task.id);
  const e = em(task.emotionalState); const colour = e.strip;
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
            background: e.pillBg, color: e.pillText,
          }}>
            {em(task.emotionalState).emoji} {em(task.emotionalState).label}
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

// ── Day Task List Modal — inline checkbox toggle, no second popup ─────

function DayTaskListModal({ date, tasks, onClose, onMarkDone, onMarkUndone }: {
  date: string; tasks: TaskWithSubtasks[];
  onClose: () => void;
  onMarkDone: (id: string) => void;
  onMarkUndone: (id: string) => void;
}) {
  const isMobile = useIsMobile();
  const cardStyle: React.CSSProperties = isMobile ? {
    position: "fixed", bottom: 60, left: 0, right: 0, zIndex: 70,
    background: "#fff", borderRadius: "16px 16px 0 0",
    border: "1.5px solid #dde4de", borderBottom: "none",
    boxShadow: "0 -4px 24px rgba(0,0,0,0.1)", maxHeight: "65vh", overflowY: "auto",
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

        {/* Task rows — checkbox toggles directly, no second modal */}
        {tasks.map((task, idx) => {
          const e = em(task.emotionalState); const colour = e.strip;
          const time    = fmtTime(task.dueAt);
          const isDone  = task.isCompleted;
          const overdue = isOverdue(task);
          return (
            <div
              key={task.id}
              style={{
                display: "flex", alignItems: "flex-start",
                padding: "12px 16px",
                borderBottom: idx < tasks.length - 1 ? "1px solid #f1f3ef" : "none",
                background: "#fff", transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8f9f5"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#fff"}
            >
              {/* Clickable checkbox */}
              <div
                onClick={() => isDone ? onMarkUndone(task.id) : onMarkDone(task.id)}
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

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 450, color: isDone ? "#b9d3c4" : "#082d1d", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isDone ? "line-through" : "none" }}>
                  {task.title}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {time && (
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: overdue ? "#c23934" : isDone ? "#b9d3c4" : "#4a6d47" }}>
                      {overdue && "⚠ "}{time}
                    </span>
                  )}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: e.pillBg, color: e.pillText }}>
                    {em(task.emotionalState).emoji} {em(task.emotionalState).label}
                  </span>
                </div>
              </div>
            </div>
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

// ── Skeleton loaders ─────────────────────────────────────────────────

function CalendarSkeleton() {
  const pulse: React.CSSProperties = { background: "linear-gradient(90deg, #f1f3ef 25%, #e9ede9 50%, #f1f3ef 75%)", backgroundSize: "200% 100%", animation: "pulse 1.4s ease infinite", borderRadius: 4 };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid #dde4de", flexShrink: 0 }}>
        <div style={{ ...pulse, height: 10, width: 70, marginBottom: 10 }} />
        <div style={{ ...pulse, height: 28, width: 200 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #dde4de", flexShrink: 0 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ padding: "8px 0", display: "flex", justifyContent: "center" }}>
            <div style={{ ...pulse, height: 10, width: 24 }} />
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} style={{ height: 130, borderRight: (i + 1) % 7 !== 0 ? "1px solid #dde4de" : "none", borderBottom: "1px solid #dde4de", padding: "8px 6px" }}>
            <div style={{ ...pulse, width: 22, height: 22, borderRadius: "50%", margin: "0 auto 6px" }} />
            {i % 3 === 0 && <div style={{ ...pulse, height: 15, marginBottom: 3 }} />}
            {i % 5 === 0 && <div style={{ ...pulse, height: 15, width: "70%" }} />}
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{background-position:200% 0} 50%{background-position:0 0} }`}</style>
    </div>
  );
}

function MobileCalendarSkeleton() {
  const pulse: React.CSSProperties = { background: "linear-gradient(90deg, #f1f3ef 25%, #e9ede9 50%, #f1f3ef 75%)", backgroundSize: "200% 100%", animation: "pulse 1.4s ease infinite", borderRadius: 4 };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #dde4de", display: "flex", justifyContent: "center" }}>
        <div style={{ ...pulse, height: 22, width: 160 }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid #f1f3ef", minHeight: 56 }}>
            <div style={{ width: 56, borderRight: "2px solid #e9ede9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 4, padding: "12px 0 8px" }}>
              <div style={{ ...pulse, height: 10, width: 20 }} />
              <div style={{ ...pulse, height: 24, width: 24, borderRadius: "50%" }} />
            </div>
            <div style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
              {i % 2 === 0 && <div style={{ ...pulse, height: 20, width: "65%" }} />}
              {i % 3 === 1 && <div style={{ ...pulse, height: 20, width: "45%" }} />}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{background-position:200% 0} 50%{background-position:0 0} }`}</style>
    </div>
  );
}

// ── Desktop right-side task panel ────────────────────────────────────

function DesktopTaskPanel({ task, onClose, onMarkDone, onMarkUndone, onDelete, onUpdate }: {
  task: TaskWithSubtasks; onClose: () => void;
  onMarkDone: (id: string) => void; onMarkUndone: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: { title?: string; emotionalState?: string; dueAt?: string | null }) => void;
}) {
  const isDone  = task.isCompleted;
  const overdue = isOverdue(task);
  const e = em(task.emotionalState); const colour = e.strip;
  const time    = fmtTime(task.dueAt);
  const note    = loadNote(task.id);

  const taskIso  = task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const tmrwIso  = (() => { const d = new Date(); d.setDate(d.getDate()+1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  const dateLabel = !taskIso ? null : taskIso === todayIso ? "Today" : taskIso === tmrwIso ? "Tomorrow" : new Date(taskIso + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const [editing, setEditing]           = useState(false);
  const [confirmDel, setConfirmDel]     = useState(false);
  const [editTitle, setEditTitle]       = useState(task.title);
  const [editEmotion, setEditEmotion]   = useState<Feeling>(task.emotionalState as Feeling);
  const [editDate, setEditDate]         = useState(taskIso ?? "");
  const [editTime, setEditTime]         = useState(() => {
    if (!task.dueAt) return "";
    const iso = new Date(task.dueAt).toISOString();
    return iso.slice(11) === "00:00:00.000Z" ? "" : iso.slice(11, 16);
  });

  useEffect(() => {
    setEditTitle(task.title);
    setEditEmotion(task.emotionalState as Feeling);
    setEditDate(taskIso ?? "");
    setEditTime(() => {
      if (!task.dueAt) return "";
      const iso = new Date(task.dueAt).toISOString();
      return iso.slice(11) === "00:00:00.000Z" ? "" : iso.slice(11, 16);
    });
    setEditing(false);
    setConfirmDel(false);
  }, [task.id]);

  function saveEdit() {
    const dueAt = editDate
      ? (editTime ? new Date(`${editDate}T${editTime}`).toISOString() : `${editDate}T00:00:00.000Z`)
      : null;
    onUpdate(task.id, { title: editTitle.trim() || task.title, emotionalState: editEmotion, dueAt: dueAt ?? undefined });
    setEditing(false);
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 49, background: "rgba(8,45,29,0.08)" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 320, zIndex: 50, background: "#fff", borderLeft: "1px solid #dde4de", boxShadow: "-4px 0 20px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column" }}>

        {/* Header: circle + title + icons */}
        <div style={{ padding: "16px", borderBottom: "1px solid #e9ede9", display: "flex", alignItems: "flex-start", gap: 10 }}>
          {/* Complete circle */}
          <div
            onClick={() => isDone ? onMarkUndone(task.id) : onMarkDone(task.id)}
            style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${isDone ? "#059669" : "#dde4de"}`, background: isDone ? "#059669" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, cursor: "pointer", transition: "all 0.15s" }}
          >
            {isDone && <svg width="10" height="7" viewBox="0 0 11 8" fill="none"><path d="M1 4l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>

          <p style={{ flex: 1, fontSize: 14, fontWeight: 600, color: isDone ? "#b9d3c4" : "#082d1d", margin: 0, lineHeight: 1.4, textDecoration: isDone ? "line-through" : "none", paddingTop: 1 }}>{task.title}</p>

          {/* Edit + Delete + Close */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button onClick={() => { setEditing(e => !e); setConfirmDel(false); }} title="Edit" style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${editing ? "#059669" : "#dde4de"}`, background: editing ? "#f2fdec" : "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: editing ? "#059669" : "#4a6d47" }}>
              <Pencil size={12} />
            </button>
            {!confirmDel
              ? <button onClick={() => setConfirmDel(true)} title="Delete" style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #dde4de", background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a6d47" }}><Trash2 size={12} /></button>
              : <button onClick={() => onDelete(task.id)} title="Confirm delete" style={{ height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid #c23934", background: "#FFF0EC", cursor: "pointer", color: "#D14626", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>Delete?</button>
            }
            <button onClick={onClose} title="Close" style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #dde4de", background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a6d47" }}><X size={12} /></button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {editing ? (
            /* Edit form */
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", margin: "0 0 6px" }}>Title</p>
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #dde4de", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.14s" }} onFocus={e => (e.currentTarget.style.borderColor = "#059669")} onBlur={e => (e.currentTarget.style.borderColor = "#dde4de")} />
              </div>
              <FeelingPickerField value={editEmotion} onChange={v => setEditEmotion(v as Feeling)} label="Feeling" />
              <DatePickerField value={editDate} onChange={setEditDate} label="Due date" />
              <TimePickerField value={editTime} onChange={setEditTime} label="Due time (optional)" selectedDate={editDate} />
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={() => setEditing(false)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "1px solid #dde4de", background: "#fff", color: "#3d5a4a", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button onClick={saveEdit} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", background: "#059669", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
              </div>
            </div>
          ) : (
            /* Task info */
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ height: 3, background: colour, borderRadius: 2 }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: e.pillBg, color: e.pillText }}>
                  {em(task.emotionalState).emoji} {em(task.emotionalState).label}
                </span>
                {dateLabel && (
                  <span style={{ fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 999, background: "#f8f9f5", color: overdue ? "#c23934" : isDone ? "#b9d3c4" : "#4a6d47" }}>
                    {overdue && "⚠ "}{dateLabel}{time ? ` · ${time}` : ""}
                  </span>
                )}
                {task.deferredCount > 0 && <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: "#FFF0EC", color: "#D14626" }}>Deferred {task.deferredCount}×</span>}
              </div>
              {note && (
                <div style={{ background: "#f8f9f5", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", margin: "0 0 4px" }}>Note</p>
                  <p style={{ fontSize: 12.5, color: "#3d5a4a", margin: 0, lineHeight: 1.5 }}>{note}</p>
                </div>
              )}
              <p style={{ fontSize: 11, color: "#b9d3c4", margin: 0 }}>
                {isDone ? "Click circle to mark incomplete" : "Click circle to mark done"}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Mobile full-screen task info — creation UI style + inline edit ───

function MobileTaskInfoPage({ task, onClose, onMarkDone, onMarkUndone, onUpdate }: {
  task: TaskWithSubtasks; onClose: () => void;
  onMarkDone: (id: string) => void; onMarkUndone: (id: string) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
}) {
  const isDone  = task.isCompleted;
  const overdue = isOverdue(task);
  const e = em(task.emotionalState); const colour = e.strip;
  const time    = fmtTime(task.dueAt);
  const taskIso = task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const tmrIso   = (() => { const d = new Date(); d.setDate(d.getDate()+1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  const dateLabel = !taskIso ? null : taskIso === todayIso ? "Today" : taskIso === tmrIso ? "Tomorrow" : new Date(taskIso + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const note = (() => { try { return localStorage.getItem(`orin_note_${task.id}`) ?? ""; } catch { return ""; } })();

  // Edit state
  const [editing, setEditing]         = useState(false);
  const [editTitle, setEditTitle]     = useState(task.title);
  const [editEmotion, setEditEmotion] = useState<Feeling>(task.emotionalState as Feeling);
  const [editDate, setEditDate]       = useState(taskIso ?? "");
  const [editTime, setEditTime]       = useState(() => {
    if (!task.dueAt) return "";
    const iso = new Date(task.dueAt).toISOString();
    return iso.slice(11) === "00:00:00.000Z" ? "" : iso.slice(11, 16);
  });
  const [editNote, setEditNote]       = useState(note);

  function saveEdit() {
    const dueAt = editDate
      ? (editTime ? new Date(`${editDate}T${editTime}`).toISOString() : `${editDate}T00:00:00.000Z`)
      : null;
    onUpdate(task.id, { title: editTitle.trim() || task.title, emotionalState: editEmotion, dueAt: dueAt ?? undefined });
    if (editNote !== note) {
      try { editNote.trim() ? localStorage.setItem(`orin_note_${task.id}`, editNote) : localStorage.removeItem(`orin_note_${task.id}`); } catch {}
    }
    setEditing(false);
  }

  // ── Edit mode ──
  if (editing) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "#fff", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e9ede9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px solid #059669", flexShrink: 0 }} />
            <input
              autoFocus
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              style={{ border: "none", outline: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#082d1d", background: "transparent", flex: 1 }}
            />
          </div>
          <button onClick={() => setEditing(false)} style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid #dde4de", background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a6d47", flexShrink: 0, marginLeft: 8 }}>
            <X size={13} />
          </button>
        </div>

        {/* Pickers */}
        <div style={{ borderBottom: "1px solid #e9ede9", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <FeelingPickerField value={editEmotion} onChange={v => setEditEmotion(v as Feeling)} label="Feeling" />
          <DatePickerField value={editDate} onChange={setEditDate} label="Due date" />
          <TimePickerField value={editTime} onChange={setEditTime} label="Due time (optional)" selectedDate={editDate} />
        </div>

        {/* Note */}
        <div style={{ padding: "12px 18px", flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", margin: "0 0 8px" }}>Note</p>
          <textarea
            value={editNote}
            onChange={e => setEditNote(e.target.value)}
            placeholder="Add a note…"
            rows={4}
            style={{ width: "100%", fontSize: 14, color: "#082d1d", background: "#f8f9f5", border: "1.5px solid #dde4de", borderRadius: 8, padding: "10px 12px", outline: "none", fontFamily: "inherit", resize: "none", lineHeight: 1.5, boxSizing: "border-box", transition: "border-color 0.14s" }}
            onFocus={e => (e.currentTarget.style.borderColor = "#059669")}
            onBlur={e => (e.currentTarget.style.borderColor = "#dde4de")}
          />
        </div>

        {/* Save */}
        <div style={{ padding: "12px 18px 28px", borderTop: "1px solid #e9ede9", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={saveEdit} style={{ padding: "10px 28px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Save
          </button>
        </div>
      </div>
    );
  }

  // ── Info mode ──
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "#fff", display: "flex", flexDirection: "column" }}>
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e9ede9" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#082d1d", opacity: isDone ? 0.9 : 1, margin: 0, flex: 1, textDecoration: isDone ? "line-through" : "none", paddingRight: 12 }}>{task.title}</p>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid #dde4de", background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a6d47", flexShrink: 0 }}>
          <X size={13} />
        </button>
      </div>

      {/* Fields section */}
      <div style={{ borderBottom: "1px solid #e9ede9", padding: "12px 18px", display: "flex", flexWrap: "wrap", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: e.pillBg, color: e.pillText }}>
          {em(task.emotionalState).emoji} {em(task.emotionalState).label}
        </span>
        {dateLabel && (
          <span style={{ fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 999, background: "#f8f9f5", color: overdue ? "#c23934" : isDone ? "#b9d3c4" : "#4a6d47" }}>
            {overdue && "⚠ "}{dateLabel}{time ? ` · ${time}` : ""}
          </span>
        )}
        {task.deferredCount > 0 && <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: "#FFF0EC", color: "#D14626" }}>Deferred {task.deferredCount}×</span>}
      </div>

      {/* Note */}
      {note && (
        <div style={{ borderBottom: "1px solid #e9ede9", padding: "12px 18px" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", margin: "0 0 6px" }}>Note</p>
          <p style={{ fontSize: 13, color: "#3d5a4a", margin: 0, lineHeight: 1.5 }}>{note}</p>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* CTA row: Edit | Mark as done */}
      <div style={{ padding: "12px 18px 28px", borderTop: "1px solid #e9ede9", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          onClick={() => setEditing(true)}
          style={{ padding: "10px 20px", borderRadius: 8, border: "1.5px solid #dde4de", background: "#fff", color: "#3d5a4a", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          Edit
        </button>
        <button
          onClick={() => { if (isDone) onMarkUndone(task.id); else onMarkDone(task.id); onClose(); }}
          style={{
            padding: "10px 24px", borderRadius: 8, border: "none",
            background: "#059669", color: "#fff",
            fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            transition: "background 0.12s",
          }}
        >
          {isDone ? "Mark as incomplete" : "Mark as done"}
        </button>
      </div>
    </div>
  );
}

// ── Mobile agenda view ───────────────────────────────────────────────

function MobileCalendar({
  viewDate, setViewDate, tasksByDate, today,
  onAddTask, onTaskTap,
}: {
  viewDate: Date; setViewDate: (d: Date) => void;
  tasksByDate: Map<string, TaskWithSubtasks[]>; today: Date;
  onAddTask: (date: string) => void;
  onTaskTap: (task: TaskWithSubtasks) => void;
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

      {/* Day rows — all tasks shown, inline checkbox toggle */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {daysArr.map(day => {
          const key      = isoDate(day);
          const dayTasks = tasksByDate.get(key) ?? [];
          const isToday  = key === isoDate(today);
          const dow      = DAY_NAMES[day.getDay()];

          return (
            <div key={key} style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid #f1f3ef", minHeight: 56, background: isToday ? "#f2fdec" : "#fff" }}>
              {/* Left: day + date — top-aligned when there are multiple tasks */}
              <div style={{ width: 56, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 2, padding: "12px 0 8px", borderRight: `2px solid ${isToday ? "#059669" : "#e9ede9"}` }}>
                <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.04em", color: isToday ? "#059669" : "#b9d3c4", textTransform: "uppercase" }}>{dow}</span>
                <span style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: isToday ? 800 : 500, background: isToday ? "#059669" : "transparent", color: isToday ? "#fff" : "#082d1d" }}>{day.getDate()}</span>
              </div>

              {/* Right: colored pill per task, no checkboxes */}
              <div style={{ flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
                {dayTasks.map(task => {
                  const ps = pillStyle(task);
                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskTap(task)}
                      style={{
                        padding: "4px 10px", borderRadius: 6,
                        background: ps.background, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6, overflow: "hidden",
                      }}
                    >
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: ps.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textDecoration: task.isCompleted ? "line-through" : "none" }}>
                        {fmtTime(task.dueAt) && <span style={{ fontFamily: "monospace", marginRight: 4, opacity: 0.8 }}>{fmtTime(task.dueAt)}</span>}
                        {task.title}
                      </span>
                    </div>
                  );
                })}
                <button onClick={() => onAddTask(key)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: dayTasks.length === 0 ? "#dde4de" : "#b9d3c4", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit", padding: "2px 0", alignSelf: "flex-start" }}>
                  <Plus size={11} /> {dayTasks.length === 0 ? "Add task" : "Add"}
                </button>
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
  const [dayTaskList, setDayTaskList]   = useState<string | null>(null); // just the date — tasks come from live tasksByDate

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

  // Optimistic toggle helper — updates all calendar cache entries instantly
  function optimisticToggle(id: string, isCompleted: boolean) {
    queryClient.setQueriesData<TaskWithSubtasks[]>(
      { queryKey: ["tasks", "calendar"], exact: false },
      old => old ? old.map(t => t.id === id ? { ...t, isCompleted } : t) : []
    );
  }

  const { mutate: markDone } = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    onMutate: (id) => optimisticToggle(id, true),
    onError:  (_e, id) => optimisticToggle(id, false),        // rollback
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] }),
  });

  const { mutate: markUndone } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isCompleted: false }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: (id) => optimisticToggle(id, false),
    onError:  (_e, id) => optimisticToggle(id, true),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] }),
  });

  const { mutate: deleteTask } = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    onMutate: (id) => {
      queryClient.setQueriesData<TaskWithSubtasks[]>({ queryKey: ["tasks", "calendar"], exact: false }, old => old ? old.filter(t => t.id !== id) : []);
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] }); setSelectedTask(null); },
  });

  const { mutate: updateTask } = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: ({ id, patch }) => {
      queryClient.setQueriesData<TaskWithSubtasks[]>({ queryKey: ["tasks", "calendar"], exact: false }, old => old ? old.map(t => t.id === id ? { ...t, ...patch } : t) : []);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] }),
  });

  const todayIso = isoDate(today);

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
    if (tasksLoading) return <MobileCalendarSkeleton />;
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <MobileCalendar
          viewDate={viewDate} setViewDate={setViewDate}
          tasksByDate={tasksByDate} today={today}
          onAddTask={date => { if (date < todayIso) return; setCreateDate(date); }}
          onTaskTap={task => setSelectedTask(task)}
        />

        {/* Mobile: full-screen task info page */}
        {selectedTask && (
          <MobileTaskInfoPage task={selectedTask} onClose={() => setSelectedTask(null)} onMarkDone={id => { markDone(id); setSelectedTask(null); }} onMarkUndone={id => { markUndone(id); setSelectedTask(null); }} onUpdate={(id, patch) => updateTask({ id, patch })} />
        )}
        {dayTaskList && (
          <DayTaskListModal date={dayTaskList} tasks={tasksByDate.get(dayTaskList) ?? []} onClose={() => setDayTaskList(null)} onMarkDone={id => markDone(id)} onMarkUndone={id => markUndone(id)} />
        )}
        <TaskCreateModal open={!!createDate} onOpenChange={open => { if (!open) setCreateDate(null); }} defaultDate={createDate ?? undefined} />
      </div>
    );
  }

  // ── Desktop render ────────────────────────────────────────────────
  if (tasksLoading) return <CalendarSkeleton />;

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

            const isPast = key < todayIso;

            return (
              <div key={key}
                onClick={() => { if (!isPast) setCreateDate(key); }}
                style={{
                  height: 130, overflow: "hidden",
                  borderRight: i % 7 !== 6 ? "1px solid #dde4de" : "none",
                  borderBottom: "1px solid #dde4de",
                  borderTop: isToday ? "2px solid #059669" : "none",
                  padding: "6px 6px 4px",
                  background: isOtherMonth || isPast ? "#fafbf7" : "#fff",
                  cursor: isPast ? "default" : "pointer", transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!isOtherMonth && !isPast) (e.currentTarget as HTMLElement).style.background = "#f2fdec"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isOtherMonth || isPast ? "#fafbf7" : "#fff"; }}
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
                        onClick={e => { e.stopPropagation(); setDayTaskList(key); }}
                        style={{ display: "flex", alignItems: "center", padding: "2px 6px", borderRadius: 4, background: ps.background, cursor: "pointer", overflow: "hidden" }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 500, color: ps.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textDecoration: task.isCompleted ? "line-through" : "none" }}>
                          {fmtTime(task.dueAt) && <>{fmtTime(task.dueAt)} </>}{task.title}
                        </span>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); setDayTaskList(key); }}
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

      {/* Desktop: right-side task panel */}
      {selectedTask && (
        <DesktopTaskPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onMarkDone={id => { markDone(id); }}
          onMarkUndone={id => { markUndone(id); }}
          onDelete={id => { deleteTask(id); }}
          onUpdate={(id, patch) => updateTask({ id, patch })}
        />
      )}
      {dayTaskList && (
        <DayTaskListModal date={dayTaskList} tasks={tasksByDate.get(dayTaskList) ?? []} onClose={() => setDayTaskList(null)} onMarkDone={id => markDone(id)} onMarkUndone={id => markUndone(id)} />
      )}
      <TaskCreateModal open={!!createDate} onOpenChange={open => { if (!open) setCreateDate(null); }} defaultDate={createDate ?? undefined} />
    </div>
  );
}

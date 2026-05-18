"use client";

import { useState } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { type Feeling } from "@/components/FeelingPickerField";
import { InlineChipBar, type InlineEmotion } from "@/components/InlineChipBar";
import type { TaskWithSubtasks } from "@/lib/types";
import { em, fmtTime, isOverdue, persistNote } from "../_lib/calendar-helpers";

interface Props {
  task: TaskWithSubtasks;
  onClose: () => void;
  onMarkDone: (id: string) => void;
  onMarkUndone: (id: string) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}

/**
 * Mobile focused single-task popup. Opens when a task pill is tapped on
 * mweb. Mirrors TaskCreateModal sizing and exposes Done / Edit / Delete
 * as primary CTAs rather than buried hover icons.
 */
export function TaskFocusPopup({ task, onClose, onMarkDone, onMarkUndone, onUpdate, onDelete }: Props) {
  const isMobile = useIsMobile();
  const isDone   = task.isCompleted;
  const overdue  = isOverdue(task);
  const e = em(task.emotionalState);
  const time = fmtTime(task.dueAt);

  const taskIso  = task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const tmrwIso  = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const dateLabel = !taskIso ? null
    : taskIso === todayIso ? "Today"
    : taskIso === tmrwIso  ? "Tomorrow"
    : new Date(taskIso + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const initialNote = (() => { try { return localStorage.getItem(`orin_note_${task.id}`) ?? ""; } catch { return ""; } })();

  const [editing, setEditing]         = useState(false);
  const [confirmDel, setConfirmDel]   = useState(false);
  const [editTitle, setEditTitle]     = useState(task.title);
  const [editEmotion, setEditEmotion] = useState<Feeling>(task.emotionalState as Feeling);
  const [editDate, setEditDate]       = useState(taskIso ?? "");
  const [editTime, setEditTime]       = useState(() => {
    if (!task.dueAt) return "";
    const iso = new Date(task.dueAt).toISOString();
    return iso.slice(11) === "00:00:00.000Z" ? "" : iso.slice(11, 16);
  });
  const [editNote, setEditNote]   = useState(initialNote);
  const [noteOpen, setNoteOpen]   = useState(initialNote.trim().length > 0);

  function saveEdit() {
    const dueAt = editDate
      ? (editTime ? new Date(`${editDate}T${editTime}`).toISOString() : `${editDate}T00:00:00.000Z`)
      : null;
    onUpdate(task.id, { title: editTitle.trim() || task.title, emotionalState: editEmotion, dueAt: dueAt ?? undefined });
    persistNote(task.id, editNote);
    setEditing(false);
  }

  const mobileWrapperStyle: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 70,
    display: "flex", alignItems: "flex-start", justifyContent: "center",
    padding: "60px 16px 0",
    pointerEvents: "none",
  };
  const mobileCardStyle: React.CSSProperties = {
    width: "100%", maxWidth: 520,
    background: "#fff", borderRadius: 4,
    border: "1px solid #dde4de",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    maxHeight: "calc(100vh - 120px)", overflowY: "auto",
    pointerEvents: "auto",
  };
  const desktopWrapperStyle: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 70,
    display: "flex", alignItems: "center", justifyContent: "center",
    pointerEvents: "none",
  };
  const desktopCardStyle: React.CSSProperties = {
    width: 420, background: "#fff", borderRadius: 4,
    border: "1px solid #dde4de",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    maxHeight: "70vh", overflowY: "auto",
    pointerEvents: "auto",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(8,45,29,0.2)", backdropFilter: "blur(2px)" }} />
      <div style={isMobile ? mobileWrapperStyle : desktopWrapperStyle}>
        <div style={isMobile ? mobileCardStyle : desktopCardStyle} onClick={ev => ev.stopPropagation()}>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #e9ede9" }}>
            <p style={{ fontFamily: "inherit", fontSize: 10, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
              {editing ? "Edit task" : "Task"}
            </p>
            <button onClick={onClose} style={{ width: 28, height: 28, border: "1.5px solid #dde4de", borderRadius: 8, background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a6d47" }}>
              <X size={13} />
            </button>
          </div>

          {editing ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px 4px" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px dashed #c4cbc2", flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={ev => setEditTitle(ev.target.value)}
                    onKeyDown={ev => {
                      if (ev.key === "Enter") saveEdit();
                      if (ev.key === "Escape") setEditing(false);
                    }}
                    placeholder="Task name"
                    style={{
                      width: "100%", border: "none", outline: "none", fontFamily: "inherit",
                      fontSize: 14, fontWeight: 500, color: "#082d1d",
                      background: "transparent", marginBottom: 4,
                    }}
                  />
                  {noteOpen ? (
                    <textarea
                      value={editNote}
                      onChange={ev => setEditNote(ev.target.value)}
                      placeholder="Notes"
                      rows={2}
                      style={{
                        width: "100%", border: "none", outline: "none", fontFamily: "inherit",
                        fontSize: 12, color: "#3d5a4a", background: "transparent",
                        resize: "none", lineHeight: 1.5, padding: 0,
                      }}
                    />
                  ) : (
                    <div onClick={() => setNoteOpen(true)} style={{ fontSize: 12, color: "#b9d3c4", cursor: "text" }}>
                      {editNote.trim() || "+ Add note"}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: "8px 16px 12px", borderTop: "0.5px solid rgba(0,0,0,0.05)" }}>
                <InlineChipBar
                  emotion={editEmotion as InlineEmotion}
                  setEmotion={v => setEditEmotion(v as Feeling)}
                  dueDate={editDate} setDueDate={setEditDate}
                  dueTime={editTime} setDueTime={setEditTime}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 18px 14px" }}>
                {isMobile && (
                  <button
                    onClick={() => setEditing(false)}
                    style={{
                      padding: "7px 16px", borderRadius: 8,
                      border: "1.5px solid #dde4de", background: "#fff",
                      color: "#3d5a4a", fontSize: 12, fontWeight: 500,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >Cancel</button>
                )}
                <button
                  onClick={saveEdit}
                  style={{
                    padding: "7px 20px", borderRadius: 8, border: "none",
                    background: "#059669", color: "#fff",
                    fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >Save</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px 6px" }}>
                <div
                  onClick={() => isDone ? onMarkUndone(task.id) : onMarkDone(task.id)}
                  style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${isDone ? "#059669" : "#dde4de"}`, background: isDone ? "#059669" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, cursor: "pointer", transition: "all 0.15s" }}
                >
                  {isDone && <svg width="10" height="7" viewBox="0 0 11 8" fill="none"><path d="M1 4l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <p style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#082d1d", margin: 0, lineHeight: 1.4, textDecoration: isDone ? "line-through" : "none" }}>{task.title}</p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "4px 16px 14px" }}>
                <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 4, background: e.pillBg, color: e.pillText }}>
                  {e.emoji} {e.label}
                </span>
                {dateLabel && (
                  <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 4, background: "#f8f9f5", color: overdue ? "#D14626" : "#4a6d47" }}>
                    {overdue && "⚠ "}{dateLabel}{time ? ` · ${time}` : ""}
                  </span>
                )}
                {task.deferredCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 4, background: "#FFF0EC", color: "#D14626" }}>
                    Deferred {task.deferredCount}×
                  </span>
                )}
              </div>

              {initialNote && (
                <div style={{ borderTop: "1px solid #f1f3ef", padding: "10px 16px" }}>
                  <p style={{ fontSize: 12, color: "#3d5a4a", margin: 0, lineHeight: 1.5 }}>{initialNote}</p>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, padding: "12px 16px 16px", borderTop: "1px solid #f1f3ef" }}>
                {!confirmDel ? (
                  <>
                    <button
                      onClick={() => setConfirmDel(true)}
                      style={{ flex: 1, padding: "10px 8px", borderRadius: 6, border: "1px solid #e9c3c1", background: "#FFF0EC", color: "#D14626", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                    <button
                      onClick={() => setEditing(true)}
                      style={{ flex: 1, padding: "10px 8px", borderRadius: 6, border: "1px solid #dde4de", background: "#f8f9f5", color: "#3d5a4a", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => { if (isDone) onMarkUndone(task.id); else onMarkDone(task.id); onClose(); }}
                      style={{ flex: 1.3, padding: "10px 8px", borderRadius: 6, border: "none", background: "#059669", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      {isDone ? "Mark undone" : "Mark done"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setConfirmDel(false)}
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 6, border: "1px solid #dde4de", background: "#f8f9f5", color: "#3d5a4a", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                    >Cancel</button>
                    <button
                      onClick={() => onDelete(task.id)}
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 6, border: "none", background: "#D14626", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                    >Confirm delete</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { InlineChipBar, type InlineEmotion } from "@/components/InlineChipBar";
import type { TaskWithSubtasks } from "@/lib/types";
import { em, fmtDate, fmtTime, isOverdue, loadNote, persistNote } from "../_lib/calendar-helpers";

interface Props {
  date: string;
  tasks: TaskWithSubtasks[];
  onClose: () => void;
  onMarkDone: (id: string) => void;
  onMarkUndone: (id: string) => void;
  onUpdate: (id: string, patch: Partial<{
    title: string;
    emotionalState: TaskWithSubtasks["emotionalState"];
    dueAt: Date | null;
  }>) => void;
  onDelete: (id: string) => void;
}

export function DayTaskListModal({ date, tasks, onClose, onMarkDone, onMarkUndone, onUpdate, onDelete }: Props) {
  const isMobile   = useIsMobile();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle]     = useState("");
  const [editEmotion, setEditEmotion] = useState<TaskWithSubtasks["emotionalState"]>("NEUTRAL");
  const [editDate, setEditDate]       = useState("");
  const [editTime, setEditTime]       = useState("");
  const [editNote, setEditNote]       = useState("");
  const [editNoteOpen, setEditNoteOpen] = useState(false);

  function startEdit(t: TaskWithSubtasks) {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditEmotion(t.emotionalState);
    if (t.dueAt) {
      const iso = new Date(t.dueAt).toISOString();
      setEditDate(iso.slice(0, 10));
      setEditTime(iso.slice(11) === "00:00:00.000Z" ? "" : iso.slice(11, 16));
    } else {
      setEditDate("");
      setEditTime("");
    }
    const existing = loadNote(t.id);
    setEditNote(existing);
    setEditNoteOpen(existing.trim().length > 0);
  }

  function saveEdit(t: TaskWithSubtasks) {
    const dueAt = editDate
      ? (editTime ? new Date(`${editDate}T${editTime}`) : new Date(`${editDate}T00:00:00.000Z`))
      : null;
    onUpdate(t.id, {
      title: editTitle.trim() || t.title,
      emotionalState: editEmotion,
      dueAt,
    });
    persistNote(t.id, editNote);
    setEditingId(null);
  }

  // Mobile: top-aligned popup matching TaskCreateModal mweb dimensions.
  const mobileWrapperStyle: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 70,
    display: "flex", alignItems: "flex-start", justifyContent: "center",
    padding: "60px 16px 0",
    pointerEvents: "none",
  };
  const mobileCardStyle: React.CSSProperties = {
    width: "100%", maxWidth: 520,
    background: "#fff", borderRadius: 11,
    border: "1px solid #e0e0e0",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    maxHeight: "calc(100vh - 120px)", overflowY: "auto",
    pointerEvents: "auto",
  };
  // Desktop: flex wrapper centers the card. NO transform on the card itself —
  // transforms create a containing block which traps `position: fixed` children
  // (the pickers' dropdowns), making them appear inside the modal scroll area.
  const desktopWrapperStyle: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 70,
    display: "flex", alignItems: "center", justifyContent: "center",
    pointerEvents: "none",
  };
  const desktopCardStyle: React.CSSProperties = {
    width: 420, background: "#fff", borderRadius: 11,
    border: "1px solid #e0e0e0",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    maxHeight: "70vh", overflowY: "auto",
    pointerEvents: "auto",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(29, 29, 31,0.2)", backdropFilter: "blur(2px)" }} />
      <div style={isMobile ? mobileWrapperStyle : desktopWrapperStyle}>
      <div style={isMobile ? mobileCardStyle : desktopCardStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, background: "#fff" }}>
          <div>
            <p style={{ fontFamily: "inherit", fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>All tasks</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>{fmtDate(date)}</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, border: "1px solid #e0e0e0", borderRadius: 8, background: "#f5f5f7", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#86868b" }}>
            <X size={13} />
          </button>
        </div>

        {tasks.map((task, idx) => {
          const e = em(task.emotionalState);
          const time    = fmtTime(task.dueAt);
          const isDone  = task.isCompleted;
          const overdue = isOverdue(task);
          const isEditing = editingId === task.id;

          if (isEditing) {
            return (
              <div key={task.id} style={{
                padding: "8px 12px",
                borderBottom: idx < tasks.length - 1 ? "1px solid #f5f5f7" : "none",
                background: "#fff",
              }}>
                <div style={{ border: "1px solid #0066cc", borderRadius: 11, background: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px 6px" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: "1px solid #0066cc", flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <textarea
                        autoFocus
                        value={editTitle}
                        onChange={ev => {
                          setEditTitle(ev.target.value);
                          const t = ev.currentTarget;
                          t.style.height = "auto";
                          t.style.height = t.scrollHeight + "px";
                        }}
                        onKeyDown={ev => {
                          if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) saveEdit(task);
                          if (ev.key === "Escape") setEditingId(null);
                        }}
                        rows={1}
                        ref={el => {
                          if (el) {
                            requestAnimationFrame(() => {
                              el.style.height = "auto";
                              el.style.height = el.scrollHeight + "px";
                            });
                          }
                        }}
                        style={{
                          width: "100%", border: "none", outline: "none", fontFamily: "inherit",
                          fontSize: 12, fontWeight: 400, letterSpacing: "-0.01em",
                          color: "#1d1d1f", background: "transparent",
                          resize: "none", lineHeight: 1.5, padding: 0, display: "block",
                          marginBottom: 2, overflow: "hidden",
                        }}
                      />
                      {editNoteOpen ? (
                        <textarea
                          value={editNote}
                          onChange={ev => {
                            setEditNote(ev.target.value);
                            const t = ev.currentTarget;
                            t.style.height = "auto";
                            t.style.height = t.scrollHeight + "px";
                          }}
                          placeholder="Notes"
                          rows={2}
                          ref={el => {
                            if (el) {
                              requestAnimationFrame(() => {
                                el.style.height = "auto";
                                el.style.height = el.scrollHeight + "px";
                              });
                            }
                          }}
                          style={{
                            width: "100%", border: "none", outline: "none", fontFamily: "inherit",
                            fontSize: 11, color: "#333333", background: "transparent",
                            resize: "none", lineHeight: 1.5, padding: 0, display: "block",
                            overflow: "hidden",
                          }}
                        />
                      ) : (
                        <div
                          onClick={() => setEditNoteOpen(true)}
                          style={{ fontSize: 11, color: "#c7c7cc", cursor: "text" }}
                        >
                          {editNote.trim() || "+ Add note"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{
                    padding: "6px 14px 10px",
                    borderTop: "0.5px solid rgba(0,0,0,0.05)",
                  }}>
                    <InlineChipBar
                      emotion={editEmotion as InlineEmotion}
                      setEmotion={v => setEditEmotion(v as TaskWithSubtasks["emotionalState"])}
                      dueDate={editDate} setDueDate={setEditDate}
                      dueTime={editTime} setDueTime={setEditTime}
                      trailing={!isMobile && (
                        <>
                          <div style={{ flex: 1 }} />
                          <button
                            onClick={() => saveEdit(task)}
                            style={{
                              padding: "5px 14px", borderRadius: 8, border: "none",
                              background: "#0066cc", color: "#fff",
                              fontSize: 11, fontWeight: 600,
                              cursor: "pointer", fontFamily: "inherit",
                            }}
                          >Save</button>
                        </>
                      )}
                    />
                  </div>

                  {isMobile && (
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 18px 14px" }}>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          padding: "7px 16px", borderRadius: 8,
                          border: "1px solid #e0e0e0", background: "#fff",
                          color: "#333333", fontSize: 12, fontWeight: 500,
                          cursor: "pointer", fontFamily: "inherit",
                        }}
                      >Cancel</button>
                      <button
                        onClick={() => saveEdit(task)}
                        style={{
                          padding: "7px 20px", borderRadius: 8, border: "none",
                          background: "#0066cc", color: "#fff",
                          fontSize: 12, fontWeight: 700,
                          cursor: "pointer", fontFamily: "inherit",
                        }}
                      >Save</button>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              key={task.id}
              style={{
                padding: "12px 16px",
                borderBottom: idx < tasks.length - 1 ? "1px solid #f5f5f7" : "none",
                background: hoveredId === task.id ? "#f5f5f7" : "#fff", transition: "background 0.1s",
              }}
              onMouseEnter={() => setHoveredId(task.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div
                  onClick={() => isDone ? onMarkUndone(task.id) : onMarkDone(task.id)}
                  style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: `1px solid ${isDone ? "#0066cc" : "#e0e0e0"}`,
                    background: isDone ? "#0066cc" : "transparent",
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
                  <p style={{ fontSize: 12, fontWeight: 400, color: "#1d1d1f", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isDone ? "line-through" : "none" }}>
                    {task.title}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {time && (
                      <span style={{ fontSize: 11, fontWeight: 500, color: overdue ? "#d70015" : "#86868b" }}>
                        {overdue && "⚠ "}{time}
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 6px", borderRadius: 8, background: e.pillBg, color: e.pillText }}>
                      {em(task.emotionalState).emoji} {em(task.emotionalState).label}
                    </span>
                  </div>
                </div>

                {!isMobile && (
                  <div style={{
                    display: "flex", gap: 4, flexShrink: 0, marginLeft: 8,
                    opacity: hoveredId === task.id ? 1 : 0, transition: "opacity 0.15s",
                  }}>
                    <button
                      onClick={ev => { ev.stopPropagation(); startEdit(task); }}
                      title="Edit"
                      style={{ width: 26, height: 26, border: "1px solid #e0e0e0", borderRadius: 8, background: "#f5f5f7", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#86868b" }}
                      onMouseEnter={e2 => { (e2.currentTarget as HTMLElement).style.background = "#f5f5f7"; (e2.currentTarget as HTMLElement).style.color = "#333333"; }}
                      onMouseLeave={e2 => { (e2.currentTarget as HTMLElement).style.background = "#f5f5f7"; (e2.currentTarget as HTMLElement).style.color = "#86868b"; }}
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={ev => { ev.stopPropagation(); onDelete(task.id); }}
                      title="Delete"
                      style={{ width: 26, height: 26, border: "1px solid #e0e0e0", borderRadius: 8, background: "#f5f5f7", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#86868b" }}
                      onMouseEnter={e2 => { (e2.currentTarget as HTMLElement).style.background = "#fdf0f0"; (e2.currentTarget as HTMLElement).style.color = "#d70015"; (e2.currentTarget as HTMLElement).style.borderColor = "#f0c9c9"; }}
                      onMouseLeave={e2 => { (e2.currentTarget as HTMLElement).style.background = "#f5f5f7"; (e2.currentTarget as HTMLElement).style.color = "#86868b"; (e2.currentTarget as HTMLElement).style.borderColor = "#e0e0e0"; }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>

              {isMobile && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, marginLeft: 32 }}>
                  <button
                    onClick={ev => { ev.stopPropagation(); startEdit(task); }}
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 8,
                      border: "1px solid #e0e0e0", background: "#f5f5f7",
                      color: "#333333", fontSize: 12, fontWeight: 500,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={ev => { ev.stopPropagation(); onDelete(task.id); }}
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 8,
                      border: "1px solid #f0c9c9", background: "#fdf0f0",
                      color: "#d70015", fontSize: 12, fontWeight: 500,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </>
  );
}

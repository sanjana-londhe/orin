"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { EmotionalStatePicker, type EmotionalState } from "@/components/EmotionalStatePicker";
import { DeferralModal } from "@/components/DeferralModal";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { getEmotion } from "@/lib/emotions";
import { ArrowUp, Pencil, Trash2, Check, Plus, X } from "lucide-react";

function formatDue(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  const now = new Date();
  const overdue = d < now;
  const isToday = d.toDateString() === now.toDateString();
  const dateStr = isToday ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return { label: `${dateStr} · ${timeStr}`, overdue };
}

interface Props {
  task: TaskWithSubtasks;
  featured?: boolean;
  isLocallyCompleted?: boolean;
  canPushUp?: boolean;
  onPushUp?: (id: string) => void;
  onMarkDone?: (id: string) => void;
  onDefer?: (id: string, newDueAt: Date) => void;
  onUpdate?: (id: string, patch: Partial<Pick<Task, "title" | "dueAt" | "emotionalState">>) => void;
  onDelete?: (id: string) => void;
  onAddSubtask?: (parentId: string, title: string) => void;
  onCompleteSubtask?: (id: string) => void;
  onDeleteSubtask?: (id: string) => void;
}

function TaskCardInner({
  task, isLocallyCompleted = false, canPushUp, onPushUp,
  onMarkDone, onDefer, onUpdate, onDelete,
  onAddSubtask, onCompleteSubtask, onDeleteSubtask,
}: Props) {
  const { nudgedTaskIds } = useUIStore();
  const isNudged = nudgedTaskIds.has(task.id);
  const em = getEmotion(task.emotionalState);
  const due = formatDue(task.dueAt);
  const completedSubs = task.subtasks.filter(s => s.isCompleted).length;
  const totalSubs = task.subtasks.length;
  const progress = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;

  const [deferOpen, setDeferOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [editingEmotion, setEditingEmotion] = useState(false);
  const [subInput, setSubInput] = useState("");
  const [showSubInput, setShowSubInput] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const subRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) titleRef.current?.focus(); }, [editing]);
  useEffect(() => { if (showSubInput) subRef.current?.focus(); }, [showSubInput]);

  function commitTitle() {
    const t = titleDraft.trim();
    if (t && t !== task.title) onUpdate?.(task.id, { title: t });
    else setTitleDraft(task.title);
    setEditing(false);
  }

  function addSubtask() {
    const t = subInput.trim();
    if (t) onAddSubtask?.(task.id, t);
    setSubInput(""); setShowSubInput(false);
  }

  return (
    <>
      <div style={{
        background: isLocallyCompleted ? "#fafcfa" : "#fff",
        borderRadius: 12,
        border: `1.5px solid ${isLocallyCompleted ? "#e8f5f0" : "#eaeaea"}`,
        overflow: "hidden",
        opacity: isLocallyCompleted ? 0.65 : 1,
        boxShadow: isLocallyCompleted ? "none" : "0 1px 4px rgba(0,0,0,0.05)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Emotion colour strip */}
        <div style={{ height: 3, background: isLocallyCompleted ? "#c8f7ae" : em.strip, flexShrink: 0 }} />

        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* ── Row 1: complete circle + title + actions ── */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>

            {/* Complete / completed circle */}
            <button
              onClick={() => !isLocallyCompleted && onMarkDone?.(task.id)}
              style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${isLocallyCompleted ? "#16a34a" : "#d1d5db"}`,
                background: isLocallyCompleted ? "#16a34a" : "#fff",
                cursor: isLocallyCompleted ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s", marginTop: 1,
              }}
              onMouseEnter={e => { if (!isLocallyCompleted) { (e.currentTarget as HTMLElement).style.borderColor = "#16a34a"; (e.currentTarget as HTMLElement).style.background = "#dcfce7"; } }}
              onMouseLeave={e => { if (!isLocallyCompleted) { (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"; (e.currentTarget as HTMLElement).style.background = "#fff"; } }}
            >
              {isLocallyCompleted && <Check size={11} color="#fff" strokeWidth={3} />}
            </button>

            {/* Title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {editing && !isLocallyCompleted ? (
                <input ref={titleRef} value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleDraft(task.title); setEditing(false); } }}
                  style={{ width: "100%", fontSize: 14, fontWeight: 700, color: "#0a2010", border: "none", borderBottom: "1.5px solid #16a34a", background: "transparent", outline: "none", fontFamily: "inherit" }}
                />
              ) : (
                <p onClick={() => !isLocallyCompleted && setEditing(true)} style={{
                  fontSize: 14, fontWeight: 700,
                  color: isLocallyCompleted ? "#9ca3af" : "#0a2010",
                  margin: 0, lineHeight: 1.35,
                  cursor: isLocallyCompleted ? "default" : "text",
                  textDecoration: isLocallyCompleted ? "line-through" : "none",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {task.title}
                </p>
              )}

              {/* Meta row */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                {!isLocallyCompleted && (
                  editingEmotion ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <EmotionalStatePicker value={task.emotionalState as EmotionalState} compact
                        onChange={v => { if (v !== task.emotionalState) onUpdate?.(task.id, { emotionalState: v }); setEditingEmotion(false); }} />
                      <button onClick={() => setEditingEmotion(false)} style={{ fontSize: 10, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingEmotion(true)} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 7px", borderRadius: 999, background: em.pillBg, color: em.pillText, border: "none", fontSize: 10.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      {em.emoji} {em.label}
                    </button>
                  )
                )}
                {due && (
                  <span style={{ fontSize: 10.5, color: due.overdue ? "#ef4444" : "#9ca3af", fontWeight: 500 }}>
                    {due.overdue ? "⚑ " : ""}{due.label}
                  </span>
                )}
                {task.deferredCount > 0 && !isLocallyCompleted && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: "#FFF0EC", color: "#D14626" }}>×{task.deferredCount}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isLocallyCompleted && (
              <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                {canPushUp && (
                  <button onClick={() => onPushUp?.(task.id)} title="Move up" style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", transition: "all 0.12s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f0fdf4"; (e.currentTarget as HTMLElement).style.borderColor = "#86efac"; (e.currentTarget as HTMLElement).style.color = "#16a34a"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}
                  ><ArrowUp size={13} strokeWidth={2} /></button>
                )}
                <button onClick={() => setEditing(true)} title="Edit" style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", transition: "all 0.12s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; (e.currentTarget as HTMLElement).style.color = "#374151"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}
                ><Pencil size={12} strokeWidth={2} /></button>
                {confirmDelete ? (
                  <>
                    <button onClick={() => onDelete?.(task.id)} style={{ padding: "0 8px", height: 26, borderRadius: 7, border: "none", background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Yes</button>
                    <button onClick={() => setConfirmDelete(false)} style={{ padding: "0 8px", height: 26, borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", color: "#9ca3af", fontSize: 11, cursor: "pointer" }}>No</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} title="Delete" style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #fecaca", background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", transition: "all 0.12s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fee2e2"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#fff5f5"}
                  ><Trash2 size={12} strokeWidth={2} /></button>
                )}
              </div>
            )}
          </div>

          {/* ── Progress bar (always visible when subtasks exist) ── */}
          {totalSubs > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10.5, color: "#9ca3af", fontWeight: 500 }}>{progress}% done</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: progress === 100 ? "#16a34a" : "#6b7280" }}>{completedSubs}/{totalSubs}</span>
              </div>
              <div style={{ height: 5, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 999,
                  background: progress === 100 ? "#16a34a" : progress >= 50 ? "#059669" : "#6ee7b7",
                  width: `${progress}%`,
                  transition: "width 0.35s ease, background 0.3s",
                }} />
              </div>
            </div>
          )}

          {/* ── Subtasks ── always rendered when they exist ── */}
          {task.subtasks.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {task.subtasks.map(sub => (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)}
                    style={{
                      width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                      cursor: sub.isCompleted ? "default" : "pointer",
                      background: sub.isCompleted ? "#16a34a" : "#fff",
                      border: `2px solid ${sub.isCompleted ? "#16a34a" : "#d1d5db"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (!sub.isCompleted) (e.currentTarget as HTMLElement).style.borderColor = "#16a34a"; }}
                    onMouseLeave={e => { if (!sub.isCompleted) (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"; }}
                  >
                    {sub.isCompleted && <Check size={8} color="#fff" strokeWidth={3} />}
                  </button>
                  <span
                    onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)}
                    style={{ flex: 1, fontSize: 12.5, color: sub.isCompleted ? "#9ca3af" : "#374151", textDecoration: sub.isCompleted ? "line-through" : "none", lineHeight: 1.3, cursor: sub.isCompleted ? "default" : "pointer" }}
                  >
                    {sub.title}
                  </span>
                  {!isLocallyCompleted && (
                    <button onClick={() => onDeleteSubtask?.(sub.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e5e7eb", padding: 0, display: "flex" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ef4444"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#e5e7eb"}
                    ><X size={11} /></button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Add subtask ── */}
          {!isLocallyCompleted && (
            showSubInput ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px dashed #d1d5db", flexShrink: 0 }} />
                <input ref={subRef} value={subInput} onChange={e => setSubInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addSubtask(); if (e.key === "Escape") { setSubInput(""); setShowSubInput(false); } }}
                  onBlur={() => { if (!subInput.trim()) setShowSubInput(false); else addSubtask(); }}
                  placeholder="Subtask…"
                  style={{ flex: 1, fontSize: 12.5, color: "#0a2010", background: "transparent", border: "none", borderBottom: "1px solid #16a34a", outline: "none", fontFamily: "inherit" }}
                />
              </div>
            ) : (
              <button onClick={() => setShowSubInput(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#c4cbc2", fontFamily: "inherit", padding: 0, alignSelf: "flex-start" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#16a34a"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#c4cbc2"}
              >
                <Plus size={12} strokeWidth={2.5} /> Add subtask
              </button>
            )
          )}

          {/* Nudge */}
          {isNudged && !isLocallyCompleted && (
            <NudgeBanner task={task} onDefer={onDefer ? d => onDefer(task.id, d) : undefined} onMarkDone={() => onMarkDone?.(task.id)} />
          )}
        </div>
      </div>

      {onDefer && <DeferralModal open={deferOpen} onOpenChange={setDeferOpen} task={task} onConfirm={d => onDefer(task.id, d)} />}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

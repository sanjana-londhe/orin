"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { EmotionalStatePicker, type EmotionalState } from "@/components/EmotionalStatePicker";
import { DeferralModal } from "@/components/DeferralModal";
import { TaskEditModal } from "@/components/TaskEditModal";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { getEmotion } from "@/lib/emotions";
import { ArrowUp, Pencil, Trash2, Check, Plus, X, Clock } from "lucide-react";

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
  const [editOpen, setEditOpen]   = useState(false);
  const [subInput, setSubInput]   = useState("");
  const [showSubInput, setShowSubInput] = useState(false);
  const subRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (showSubInput) subRef.current?.focus(); }, [showSubInput]);

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
        opacity: isLocallyCompleted ? 0.6 : 1,
        boxShadow: isLocallyCompleted ? "none" : "0 1px 4px rgba(0,0,0,0.05)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Emotion colour strip */}
        <div style={{ height: 3, background: isLocallyCompleted ? "#c8f7ae" : em.strip, flexShrink: 0 }} />

        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* ── Row 1: complete circle + title + actions ── */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>

            {/* Complete circle */}
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
              <p onClick={() => !isLocallyCompleted && setEditOpen(true)} style={{
                fontSize: 14, fontWeight: 700,
                color: isLocallyCompleted ? "#9ca3af" : "#0a2010",
                margin: 0, lineHeight: 1.35,
                cursor: isLocallyCompleted ? "default" : "pointer",
                textDecoration: isLocallyCompleted ? "line-through" : "none",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {task.title}
              </p>

              {/* Meta */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                {!isLocallyCompleted && (
                  <button onClick={() => setEditOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 7px", borderRadius: 999, background: em.pillBg, color: em.pillText, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    {em.emoji} {em.label}
                  </button>
                )}
                {due && (
                  <span style={{ fontSize: 11, color: due.overdue ? "#ef4444" : "#6b7280", fontWeight: 500 }}>
                    {due.overdue ? "⚑ " : ""}{due.label}
                  </span>
                )}
                {task.deferredCount > 0 && !isLocallyCompleted && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: "#FFF0EC", color: "#D14626" }}>×{task.deferredCount}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isLocallyCompleted && (
              <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                {onDefer && (
                  <button onClick={() => setDeferOpen(true)} title="Defer" style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", transition: "all 0.12s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; (e.currentTarget as HTMLElement).style.color = "#111827"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#4b5563"; }}
                  ><Clock size={12} strokeWidth={2} /></button>
                )}
                <button onClick={() => setEditOpen(true)} title="Edit" style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", transition: "all 0.12s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; (e.currentTarget as HTMLElement).style.color = "#111827"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#4b5563"; }}
                ><Pencil size={12} strokeWidth={2} /></button>
                <button onClick={() => onDelete?.(task.id)} title="Delete" style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #fecaca", background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", transition: "all 0.12s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fee2e2"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#fff5f5"}
                ><Trash2 size={12} strokeWidth={2} /></button>
              </div>
            )}
          </div>

          {/* ── Progress bar ── */}
          {totalSubs > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>{progress}% done</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: progress === 100 ? "#16a34a" : "#6b7280" }}>{completedSubs}/{totalSubs}</span>
              </div>
              <div style={{ height: 5, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 999,
                  background: progress === 100 ? "#16a34a" : progress >= 50 ? "#059669" : "#6ee7b7",
                  width: `${progress}%`, transition: "width 0.35s ease, background 0.3s",
                }} />
              </div>
            </div>
          )}

          {/* ── Subtasks ── */}
          {task.subtasks.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {task.subtasks.map(sub => (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)} style={{
                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                    cursor: sub.isCompleted ? "default" : "pointer",
                    background: sub.isCompleted ? "#16a34a" : "#fff",
                    border: `2px solid ${sub.isCompleted ? "#16a34a" : "#d1d5db"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                  }}
                    onMouseEnter={e => { if (!sub.isCompleted) (e.currentTarget as HTMLElement).style.borderColor = "#16a34a"; }}
                    onMouseLeave={e => { if (!sub.isCompleted) (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"; }}
                  >
                    {sub.isCompleted && <Check size={8} color="#fff" strokeWidth={3} />}
                  </button>
                  <span onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)} style={{ flex: 1, fontSize: 12.5, color: sub.isCompleted ? "#9ca3af" : "#374151", textDecoration: sub.isCompleted ? "line-through" : "none", lineHeight: 1.3, cursor: sub.isCompleted ? "default" : "pointer" }}>
                    {sub.title}
                  </span>
                  {!isLocallyCompleted && (
                    <button onClick={() => onDeleteSubtask?.(sub.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: 0, display: "flex" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#dc2626"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#d1d5db"}
                    ><X size={11} /></button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add subtask */}
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
              <button onClick={() => setShowSubInput(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#9ca3af", fontFamily: "inherit", padding: 0, alignSelf: "flex-start" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#16a34a"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9ca3af"}
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

      {onDefer && (
        <DeferralModal open={deferOpen} onOpenChange={setDeferOpen} task={task} onConfirm={d => onDefer(task.id, d)} />
      )}

      {editOpen && onUpdate && (
        <TaskEditModal
          task={task}
          onClose={() => setEditOpen(false)}
          onUpdate={onUpdate}
          onAddSubtask={onAddSubtask ?? (() => {})}
          onDeleteSubtask={onDeleteSubtask ?? (() => {})}
          onCompleteSubtask={onCompleteSubtask ?? (() => {})}
        />
      )}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

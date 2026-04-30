"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { EmotionalStatePicker, type EmotionalState } from "@/components/EmotionalStatePicker";
import { DeferralModal } from "@/components/DeferralModal";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { getEmotion } from "@/lib/emotions";

function formatTime(dueAt: Date | string | null) {
  if (!dueAt) return { label: "No deadline", overdue: false, isoDate: "", isoTime: "" };
  const d = new Date(dueAt);
  return {
    label: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    overdue: d < new Date(),
    isoDate: d.toISOString().slice(0, 10),
    isoTime: d.toISOString().slice(11, 16),
  };
}

function recurrenceLabel(rule: string | null) {
  if (!rule) return null;
  if (rule.includes("BYDAY=MO,TU,WE,TH,FR")) return "↺ weekdays";
  if (rule.includes("INTERVAL=2")) return "↺ biweekly";
  if (rule.includes("WEEKLY")) return "↺ weekly";
  if (rule.includes("DAILY")) return "↺ daily";
  return "↺ recurring";
}

interface Props {
  task: TaskWithSubtasks;
  featured?: boolean; // full-width urgent card with ink border always
  onMarkDone?: (id: string) => void;
  onDefer?: (id: string, newDueAt: Date) => void;
  onUpdate?: (id: string, patch: Partial<Pick<Task, "title" | "dueAt" | "emotionalState">>) => void;
  onDelete?: (id: string) => void;
  onAddSubtask?: (parentId: string, title: string) => void;
  onCompleteSubtask?: (id: string) => void;
  onDeleteSubtask?: (id: string) => void;
}

function TaskCardInner({
  task, featured = false, onMarkDone, onDefer, onUpdate, onDelete,
  onAddSubtask, onCompleteSubtask, onDeleteSubtask,
}: Props) {
  const { nudgedTaskIds } = useUIStore();
  const isNudged = nudgedTaskIds.has(task.id);
  const em = getEmotion(task.emotionalState);
  const { label: timeLabel, overdue, isoDate, isoTime } = formatTime(task.dueAt);
  const recur = recurrenceLabel(task.recurrenceRule);
  const completedSubs = task.subtasks.filter(s => s.isCompleted).length;
  const totalSubs = task.subtasks.length;

  const [done, setDone] = useState(false);
  const [deferOpen, setDeferOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [editingState, setEditingState] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingDue, setEditingDue] = useState(false);
  const [dateDraft, setDateDraft] = useState(isoDate);
  const [timeDraft, setTimeDraft] = useState(isoTime);
  const titleRef = useRef<HTMLInputElement>(null);
  const subtaskRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);
  useEffect(() => { if (addingSubtask) subtaskRef.current?.focus(); }, [addingSubtask]);

  function commitTitle() {
    const t = titleDraft.trim();
    if (t && t !== task.title) onUpdate?.(task.id, { title: t });
    else setTitleDraft(task.title);
    setEditingTitle(false);
  }

  function commitDue() {
    const dueAt = dateDraft ? new Date(`${dateDraft}T${timeDraft || "00:00"}`).toISOString() : null;
    onUpdate?.(task.id, { dueAt: dueAt as unknown as Date });
    setEditingDue(false);
  }

  function submitSubtask() {
    const t = subtaskDraft.trim();
    if (t) onAddSubtask?.(task.id, t);
    setSubtaskDraft(""); setAddingSubtask(false);
  }

  function handleMarkDone() { setDone(true); onMarkDone?.(task.id); }

  if (done) return null;

  return (
    <>
      <div style={{
        marginBottom: 6,
        background: "#fff",
        borderRadius: 10,
        border: "1px solid #e9ede9",
        display: "flex",
        overflow: "hidden",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#c4cbc2"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e9ede9"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
      >
        {/* Left colour strip */}
        <div style={{ width: 4, flexShrink: 0, background: em.strip }} />

        {/* Main content */}
        <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>

          {/* Top row: title + meta + actions */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>

            {/* Title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {editingTitle ? (
                <input ref={titleRef} value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); } }}
                  style={{ width: "100%", fontSize: 14, fontWeight: 600, color: "#082d1d", border: "none", borderBottom: "1.5px solid #059669", background: "transparent", outline: "none", fontFamily: "inherit" }} />
              ) : (
                <p onClick={() => setEditingTitle(true)} style={{
                  fontSize: 14, fontWeight: 600, color: "#082d1d",
                  lineHeight: 1.4, letterSpacing: "-0.01em",
                  cursor: "text", margin: 0, whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {task.title}
                </p>
              )}

              {/* Meta row: time · state · deferred */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                <button onClick={() => setEditingDue(true)} style={{ fontFamily: "monospace", fontSize: 10.5, background: "none", border: "none", cursor: "pointer", color: overdue ? "#E05230" : "#b9d3c4", padding: 0 }}>
                  {overdue && "⚑ "}{task.dueAt ? (overdue ? `${timeLabel} · overdue` : timeLabel) : "No deadline"}
                </button>

                {editingState ? (
                  <>
                    <EmotionalStatePicker value={task.emotionalState as EmotionalState} compact
                      onChange={v => { if (v !== task.emotionalState) onUpdate?.(task.id, { emotionalState: v }); setEditingState(false); }} />
                    <button onClick={() => setEditingState(false)} style={{ fontSize: 10, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                  </>
                ) : (
                  <button onClick={() => setEditingState(true)} style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    fontSize: 10.5, fontWeight: 600, padding: "1px 7px", borderRadius: 6,
                    background: em.pillBg, color: em.pillText, border: "none", cursor: "pointer",
                  }}>
                    {em.emoji} {em.label}
                  </button>
                )}
                {recur && <span style={{ background: "#F0F0FF", color: "#5555CC", fontWeight: 600, fontSize: 10, padding: "1px 6px", borderRadius: 5 }}>{recur}</span>}
                {task.deferredCount > 0 && <span style={{ background: "#FFF0EC", color: "#D14626", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 5 }}>deferred {task.deferredCount}×</span>}
                {totalSubs > 0 && <span style={{ fontSize: 10, color: "#b9d3c4", fontFamily: "monospace" }}>{completedSubs}/{totalSubs} done</span>}
              </div>
            </div>

            {/* Actions — always visible */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <button onClick={handleMarkDone} title="Mark done" style={{
                padding: "4px 10px", borderRadius: 6, border: "1px solid #dde4de",
                background: "#fff", color: "#059669", fontSize: 11.5, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#059669"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#059669"; }}>
                ✓
              </button>
              {onDefer && (
                <button onClick={() => setDeferOpen(true)} title="Push this" style={{
                  padding: "4px 10px", borderRadius: 6, border: "1px solid #dde4de",
                  background: "#fff", color: "#4a6d47", fontSize: 11.5,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f2fdec"; (e.currentTarget as HTMLElement).style.borderColor = "#c8f7ae"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "#dde4de"; }}>
                  →
                </button>
              )}
              {confirmDelete ? (
                <>
                  <button onClick={() => onDelete?.(task.id)} style={{ fontSize: 11, fontWeight: 700, color: "#E05230", background: "none", border: "none", cursor: "pointer" }}>Yes</button>
                  <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 11, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>No</button>
                </>
              ) : (
                <button onClick={() => setConfirmDelete(true)} style={{ fontSize: 12, color: "#dde4de", background: "none", border: "none", cursor: "pointer", padding: "4px 2px" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#E05230"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#dde4de"}>
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Due date edit */}
          {editingDue && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              <input type="date" value={dateDraft} onChange={e => setDateDraft(e.target.value)}
                style={{ fontFamily: "monospace", fontSize: 10, border: "1px solid #dde4de", borderRadius: 4, padding: "2px 6px", outline: "none" }} />
              <input type="time" value={timeDraft} onChange={e => setTimeDraft(e.target.value)} disabled={!dateDraft}
                style={{ fontFamily: "monospace", fontSize: 10, border: "1px solid #dde4de", borderRadius: 4, padding: "2px 6px", outline: "none" }} />
              <button onClick={commitDue} style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "none", border: "none", cursor: "pointer" }}>Save</button>
              <button onClick={() => { setDateDraft(isoDate); setTimeDraft(isoTime); setEditingDue(false); }} style={{ fontSize: 10, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
            </div>
          )}

          {/* Nudge */}
          {isNudged && (
            <div style={{ marginTop: 8 }}>
              <NudgeBanner task={task} onDefer={onDefer ? d => onDefer(task.id, d) : undefined} onMarkDone={onMarkDone ? handleMarkDone : undefined} />
            </div>
          )}

          {/* Subtasks */}
          {totalSubs > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f1f3ef" }}>
              {task.subtasks.map(sub => (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "2px 0" }}>
                  <button onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)} style={{ width: 11, height: 11, borderRadius: 3, flexShrink: 0, cursor: "pointer", background: sub.isCompleted ? "#059669" : "#fff", border: `1.5px solid ${sub.isCompleted ? "#059669" : "#D8D0C8"}` }} />
                  <span style={{ fontSize: 12, color: sub.isCompleted ? "#c4cbc2" : "#4a6d47", textDecoration: sub.isCompleted ? "line-through" : "none", flex: 1 }}>{sub.title}</span>
                  <button onClick={() => onDeleteSubtask?.(sub.id)} style={{ fontSize: 10, color: "#D8D0C8", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Add subtask */}
          {addingSubtask ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <div style={{ width: 11, height: 11, borderRadius: 3, border: "1.5px dashed #D8D0C8", flexShrink: 0 }} />
              <input ref={subtaskRef} value={subtaskDraft} onChange={e => setSubtaskDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitSubtask(); if (e.key === "Escape") { setSubtaskDraft(""); setAddingSubtask(false); } }}
                onBlur={() => { if (!subtaskDraft.trim()) setAddingSubtask(false); else submitSubtask(); }}
                placeholder="Add action item…"
                style={{ flex: 1, fontSize: 12, color: "#082d1d", background: "transparent", border: "none", borderBottom: "1px solid #059669", outline: "none", fontFamily: "inherit" }} />
            </div>
          ) : (
            <button onClick={() => setAddingSubtask(true)} style={{ fontSize: 11, color: "#D8D0C8", background: "none", border: "none", cursor: "pointer", marginTop: 6, padding: 0, fontFamily: "inherit" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#4a6d47"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#D8D0C8"}>
              + action item
            </button>
          )}
        </div>
      </div>

      {onDefer && (
        <DeferralModal open={deferOpen} onOpenChange={setDeferOpen} task={task}
          onConfirm={d => onDefer(task.id, d)} />
      )}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

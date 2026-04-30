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
  onMarkDone?: (id: string) => void;
  onDefer?: (id: string, newDueAt: Date) => void;
  onUpdate?: (id: string, patch: Partial<Pick<Task, "title" | "dueAt" | "emotionalState">>) => void;
  onDelete?: (id: string) => void;
  onAddSubtask?: (parentId: string, title: string) => void;
  onCompleteSubtask?: (id: string) => void;
  onDeleteSubtask?: (id: string) => void;
}

function TaskCardInner({
  task, onMarkDone, onDefer, onUpdate, onDelete,
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
      <div
        style={{
          breakInside: "avoid", marginBottom: 14,
          background: "#FFFEFB", borderRadius: 16, overflow: "hidden",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 18px rgba(0,0,0,0.07)",
          transition: "transform 0.22s cubic-bezier(.34,1.2,.64,1), box-shadow 0.22s ease",
          border: "1px solid rgba(0,0,0,0.04)",
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(-3px)";
          el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.05), 0 16px 44px rgba(0,0,0,0.11)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04), 0 4px 18px rgba(0,0,0,0.07)";
        }}
      >
        {/* Colour strip */}
        <div style={{ height: 4, background: em.strip }} />

        <div style={{ padding: "16px 18px 12px" }}>

          {/* Timestamp row */}
          <div style={{ fontFamily: "monospace", fontSize: 10.5, color: overdue ? "#E05230" : "#C0B8AE", marginBottom: 7, display: "flex", alignItems: "center", gap: 6 }}>
            {editingDue ? (
              <>
                <input type="date" value={dateDraft} onChange={e => setDateDraft(e.target.value)}
                  style={{ fontFamily: "monospace", fontSize: 10, border: "1px solid #dde4de", borderRadius: 4, padding: "1px 4px", outline: "none" }} />
                <input type="time" value={timeDraft} onChange={e => setTimeDraft(e.target.value)} disabled={!dateDraft}
                  style={{ fontFamily: "monospace", fontSize: 10, border: "1px solid #dde4de", borderRadius: 4, padding: "1px 4px", outline: "none" }} />
                <button onClick={commitDue} style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "none", border: "none", cursor: "pointer" }}>Save</button>
                <button onClick={() => { setDateDraft(isoDate); setTimeDraft(isoTime); setEditingDue(false); }}
                  style={{ fontSize: 10, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </>
            ) : (
              <button onClick={() => setEditingDue(true)}
                style={{ fontFamily: "monospace", fontSize: 10.5, background: "none", border: "none", cursor: "pointer", color: overdue ? "#E05230" : "#C0B8AE", padding: 0 }}>
                {overdue && "⚑ "}{task.dueAt ? (overdue ? `${timeLabel} · overdue` : timeLabel) : "No deadline"}
                {totalSubs > 0 && <span style={{ color: "#c4cbc2" }}> · {completedSubs} of {totalSubs} done</span>}
              </button>
            )}
            {recur && (
              <span style={{ background: "#F0F0FF", color: "#5555CC", fontWeight: 600, fontSize: 10, padding: "1px 6px", borderRadius: 5 }}>{recur}</span>
            )}
          </div>

          {/* Title */}
          {editingTitle ? (
            <input ref={titleRef} value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); } }}
              style={{ width: "100%", fontSize: 15, fontWeight: 700, color: "#1A1612", letterSpacing: "-0.02em", border: "none", borderBottom: "2px solid #059669", background: "transparent", outline: "none", marginBottom: 10, fontFamily: "inherit" }}
            />
          ) : (
            <p onClick={() => setEditingTitle(true)}
              style={{ fontSize: task.emotionalState === "DREADING" ? 17 : 15, fontWeight: 700, color: "#1A1612", lineHeight: 1.42, letterSpacing: "-0.02em", marginBottom: 10, cursor: "text" }}>
              {task.title}
            </p>
          )}

          {/* Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            {editingState ? (
              <>
                <EmotionalStatePicker value={task.emotionalState as EmotionalState} compact
                  onChange={v => { if (v !== task.emotionalState) onUpdate?.(task.id, { emotionalState: v }); setEditingState(false); }} />
                <button onClick={() => setEditingState(false)} style={{ fontSize: 10, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
              </>
            ) : (
              <button onClick={() => setEditingState(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 7, background: em.pillBg, color: em.pillText, border: "none", cursor: "pointer" }}>
                {em.emoji} {em.label}
              </button>
            )}
            {task.deferredCount > 0 && (
              <span style={{ background: "#FFF0EC", color: "#D14626", fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 6 }}>
                deferred {task.deferredCount}×
              </span>
            )}
          </div>

          {/* Nudge */}
          {isNudged && (
            <div style={{ marginTop: 10 }}>
              <NudgeBanner task={task}
                onDefer={onDefer ? d => onDefer(task.id, d) : undefined}
                onMarkDone={onMarkDone ? handleMarkDone : undefined} />
            </div>
          )}

          {/* Subtasks */}
          {totalSubs > 0 && (
            <div style={{ borderTop: "1px solid #F2EEE8", marginTop: 10, paddingTop: 8 }}>
              {task.subtasks.map(sub => (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                  <button onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)} style={{ width: 12, height: 12, borderRadius: 3, flexShrink: 0, cursor: "pointer", background: sub.isCompleted ? "#1A1612" : "#fff", border: `1.5px solid ${sub.isCompleted ? "#1A1612" : "#D8D0C8"}` }} />
                  <span style={{ fontSize: 12, color: sub.isCompleted ? "#c4cbc2" : "#7A756E", textDecoration: sub.isCompleted ? "line-through" : "none", flex: 1 }}>{sub.title}</span>
                  <button onClick={() => onDeleteSubtask?.(sub.id)} style={{ fontSize: 10, color: "#D8D0C8", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Add subtask inline */}
          {addingSubtask ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, border: "1.5px dashed #D8D0C8", flexShrink: 0 }} />
              <input ref={subtaskRef} value={subtaskDraft} onChange={e => setSubtaskDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitSubtask(); if (e.key === "Escape") { setSubtaskDraft(""); setAddingSubtask(false); } }}
                onBlur={() => { if (!subtaskDraft.trim()) setAddingSubtask(false); else submitSubtask(); }}
                placeholder="Add action item…"
                style={{ flex: 1, fontSize: 12, color: "#1A1612", background: "transparent", border: "none", borderBottom: "1px solid #059669", outline: "none", fontFamily: "inherit" }} />
            </div>
          ) : (
            <button onClick={() => setAddingSubtask(true)}
              style={{ fontSize: 11, color: "#C8C0B8", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, marginTop: 8, padding: 0, fontFamily: "inherit" }}>
              + action item
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px 14px", borderTop: "1px solid #F2EEE8" }}>
          <button onClick={handleMarkDone} aria-label="Mark complete"
            style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px solid #D8D0C8", background: "transparent", flexShrink: 0, cursor: "pointer", transition: "border-color 0.14s" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#059669"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#D8D0C8"}
          />
          <span style={{ fontSize: 11.5, color: "#B0A89E" }}>Mark complete</span>

          {onDefer && (
            <button onClick={() => setDeferOpen(true)}
              style={{ fontSize: 11.5, fontWeight: 500, padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(0,0,0,0.1)", background: "none", cursor: "pointer", color: "#9C9389", fontFamily: "inherit", marginLeft: "auto" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f5f0e8"; (e.currentTarget as HTMLElement).style.color = "#1A1612"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "#9C9389"; }}>
              Push this →
            </button>
          )}

          {confirmDelete ? (
            <span style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: onDefer ? 4 : "auto" }}>
              <span style={{ fontSize: 11, color: "#E05230" }}>Delete?</span>
              <button onClick={() => onDelete?.(task.id)} style={{ fontSize: 11, fontWeight: 700, color: "#E05230", background: "none", border: "none", cursor: "pointer" }}>Yes</button>
              <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 11, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>No</button>
            </span>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              style={{ fontSize: 11, color: "#D8D0C8", background: "none", border: "none", cursor: "pointer", marginLeft: onDefer ? 4 : "auto", padding: "0 2px" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#E05230"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#D8D0C8"}>
              ✕
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

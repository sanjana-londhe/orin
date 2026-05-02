"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { EmotionalStatePicker, type EmotionalState } from "@/components/EmotionalStatePicker";
import { DeferralModal } from "@/components/DeferralModal";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { getEmotion } from "@/lib/emotions";
import { CalendarClock, Clock, Pencil, Trash2, Check } from "lucide-react";

function formatDue(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const d   = new Date(dueAt);
  const now = new Date();
  const overdue    = d < now;
  const isToday    = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const dateStr = isToday ? "Today"
    : isTomorrow ? "Tomorrow"
    : d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return { label: `${dateStr}, ${timeStr}`, overdue, isoDate: d.toISOString().slice(0, 10), isoTime: d.toISOString().slice(11, 16) };
}

interface Props {
  task: TaskWithSubtasks;
  featured?: boolean;
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
  const isNudged      = nudgedTaskIds.has(task.id);
  const em            = getEmotion(task.emotionalState);
  const due           = formatDue(task.dueAt);
  const completedSubs = task.subtasks.filter(s => s.isCompleted).length;
  const totalSubs     = task.subtasks.length;

  const [done, setDone]                     = useState(false);
  const [deferOpen, setDeferOpen]           = useState(false);
  const [editingTitle, setEditingTitle]     = useState(false);
  const [titleDraft, setTitleDraft]         = useState(task.title);
  const [editingEmotion, setEditingEmotion] = useState(false);
  const [editingDue, setEditingDue]         = useState(false);
  const [dateDraft, setDateDraft]           = useState(due?.isoDate ?? "");
  const [timeDraft, setTimeDraft]           = useState(due?.isoTime ?? "");
  const [subInput, setSubInput]             = useState("");
  const [showSubInput, setShowSubInput]     = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const subRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);
  useEffect(() => { if (showSubInput) subRef.current?.focus(); }, [showSubInput]);

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

  function addSubtask() {
    const t = subInput.trim();
    if (t) onAddSubtask?.(task.id, t);
    setSubInput(""); setShowSubInput(false);
  }

  function handleDone() { setDone(true); onMarkDone?.(task.id); }
  if (done) return null;

  return (
    <>
      <div style={{
        background: "#ffffff",
        borderRadius: 20,
        border: "1px solid #eaeaea",
        padding: "20px 20px 16px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.2s, transform 0.2s",
        display: "flex", flexDirection: "column",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
      >
        {/* ── Title + counter badge ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingTitle ? (
              <input ref={titleRef} value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); } }}
                style={{ width: "100%", fontSize: 22, fontWeight: 800, color: "#0a2010", border: "none", borderBottom: "2px solid #16a34a", background: "transparent", outline: "none", fontFamily: "inherit", letterSpacing: "-0.02em", lineHeight: 1.2 }}
              />
            ) : (
              <h3 onClick={() => setEditingTitle(true)} style={{ fontSize: 22, fontWeight: 800, color: "#0a2010", margin: 0, lineHeight: 1.25, cursor: "text", letterSpacing: "-0.02em" }}>
                {task.title}
              </h3>
            )}

            {/* Emotion + deferred badges */}
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {editingEmotion ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <EmotionalStatePicker value={task.emotionalState as EmotionalState} compact
                    onChange={v => { if (v !== task.emotionalState) onUpdate?.(task.id, { emotionalState: v }); setEditingEmotion(false); }} />
                  <button onClick={() => setEditingEmotion(false)} style={{ fontSize: 10, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setEditingEmotion(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, background: em.pillBg, color: em.pillText, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {em.emoji} {em.label}
                </button>
              )}
              {task.deferredCount > 0 && (
                <span style={{ padding: "3px 10px", borderRadius: 999, background: "#FFF0EC", color: "#D14626", fontSize: 12, fontWeight: 600 }}>
                  Deferred {task.deferredCount}×
                </span>
              )}
            </div>
          </div>

          {totalSubs > 0 && (
            <span style={{ flexShrink: 0, padding: "5px 13px", borderRadius: 999, background: "#dcfce7", color: "#16a34a", fontSize: 13, fontWeight: 700 }}>
              {completedSubs}/{totalSubs}
            </span>
          )}
        </div>

        {/* Nudge */}
        {isNudged && (
          <div style={{ marginBottom: 14 }}>
            <NudgeBanner task={task} onDefer={onDefer ? d => onDefer(task.id, d) : undefined} onMarkDone={onMarkDone ? handleDone : undefined} />
          </div>
        )}

        {/* ── Subtasks ── */}
        {totalSubs > 0 && (
          <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {task.subtasks.map(sub => (
              <li key={sub.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)}
                  style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                    cursor: sub.isCompleted ? "default" : "pointer",
                    background: sub.isCompleted ? "#16a34a" : "#fff",
                    border: `2.5px solid ${sub.isCompleted ? "#16a34a" : "#d1d5db"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                >
                  {sub.isCompleted && <Check size={13} color="#fff" strokeWidth={3} />}
                </button>
                <span
                  onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)}
                  style={{ flex: 1, fontSize: 15, lineHeight: 1.4, color: sub.isCompleted ? "#9ca3af" : "#1a2e1a", textDecoration: sub.isCompleted ? "line-through" : "none", cursor: sub.isCompleted ? "default" : "pointer" }}
                >
                  {sub.title}
                </span>
                <button onClick={() => onDeleteSubtask?.(sub.id)}
                  style={{ width: 20, height: 20, borderRadius: 5, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#d1d5db", transition: "color 0.12s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ef4444"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#d1d5db"}
                ><Trash2 size={12} /></button>
              </li>
            ))}
          </ul>
        )}

        {/* Add subtask */}
        {showSubInput ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", border: "2.5px dashed #d1d5db", flexShrink: 0 }} />
            <input ref={subRef} value={subInput}
              onChange={e => setSubInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addSubtask(); if (e.key === "Escape") { setSubInput(""); setShowSubInput(false); } }}
              onBlur={() => { if (!subInput.trim()) setShowSubInput(false); else addSubtask(); }}
              placeholder="Add subtask…"
              style={{ flex: 1, fontSize: 15, color: "#1a2e1a", background: "transparent", border: "none", borderBottom: "1.5px solid #16a34a", outline: "none", fontFamily: "inherit" }}
            />
          </div>
        ) : (
          <button onClick={() => setShowSubInput(true)} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#9ca3af", fontFamily: "inherit", padding: 0 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#16a34a"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9ca3af"}
          >
            <div style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#9ca3af" }}>+</div>
            Add subtask
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* ── Divider ── */}
        <div style={{ height: 1, background: "#f0f0f0", margin: "4px 0 14px" }} />

        {/* ── Footer: date + icon buttons ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          {editingDue ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="date" value={dateDraft} onChange={e => setDateDraft(e.target.value)}
                style={{ fontSize: 12, border: "1px solid #d1d5db", borderRadius: 6, padding: "3px 7px", outline: "none", fontFamily: "inherit" }} />
              <input type="time" value={timeDraft} onChange={e => setTimeDraft(e.target.value)} disabled={!dateDraft}
                style={{ fontSize: 12, border: "1px solid #d1d5db", borderRadius: 6, padding: "3px 7px", outline: "none", fontFamily: "inherit" }} />
              <button onClick={commitDue} style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", background: "none", border: "none", cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditingDue(false)} style={{ fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setEditingDue(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", color: due?.overdue ? "#ef4444" : "#6b7280", fontSize: 14, fontWeight: 500, padding: 0 }}>
              <CalendarClock size={17} color={due?.overdue ? "#ef4444" : "#9ca3af"} />
              {due ? due.label : <span style={{ color: "#d1d5db" }}>Set due date</span>}
            </button>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setDeferOpen(true)} title="Defer" style={{ width: 38, height: 38, borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", transition: "all 0.12s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; (e.currentTarget as HTMLElement).style.color = "#374151"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}
            ><Clock size={17} strokeWidth={2} /></button>

            <button onClick={() => setEditingTitle(true)} title="Edit" style={{ width: 38, height: 38, borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", transition: "all 0.12s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; (e.currentTarget as HTMLElement).style.color = "#374151"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}
            ><Pencil size={16} strokeWidth={2} /></button>

            <button onClick={() => onDelete?.(task.id)} title="Delete" style={{ width: 38, height: 38, borderRadius: 10, border: "1.5px solid #fecaca", background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", transition: "all 0.12s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fee2e2"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#fff5f5"}
            ><Trash2 size={16} strokeWidth={2} /></button>
          </div>
        </div>

        {/* ── Complete task button ── */}
        <button onClick={handleDone} style={{ width: "100%", padding: "13px 0", borderRadius: 999, border: "2px solid #16a34a", background: "#fff", color: "#16a34a", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s", letterSpacing: "-0.01em" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#16a34a"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#16a34a"; }}
        >
          <Check size={17} strokeWidth={2.5} />
          Complete task
        </button>
      </div>

      {onDefer && (
        <DeferralModal open={deferOpen} onOpenChange={setDeferOpen} task={task} onConfirm={d => onDefer(task.id, d)} />
      )}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

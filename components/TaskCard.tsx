"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { EmotionalStatePicker, type EmotionalState } from "@/components/EmotionalStatePicker";
import { DeferralModal } from "@/components/DeferralModal";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { getEmotion } from "@/lib/emotions";
import { CalendarClock, Clock, Pencil, Trash2, Check, Plus } from "lucide-react";

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
  const isNudged = nudgedTaskIds.has(task.id);
  const em  = getEmotion(task.emotionalState);
  const due = formatDue(task.dueAt);
  const completedSubs = task.subtasks.filter(s => s.isCompleted).length;
  const totalSubs     = task.subtasks.length;

  const [done, setDone]               = useState(false);
  const [deferOpen, setDeferOpen]     = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft]   = useState(task.title);
  const [editingEmotion, setEditingEmotion] = useState(false);
  const [editingDue, setEditingDue]   = useState(false);
  const [dateDraft, setDateDraft]     = useState(due?.isoDate ?? "");
  const [timeDraft, setTimeDraft]     = useState(due?.isoTime ?? "");
  const [subInput, setSubInput]       = useState("");
  const [showSubInput, setShowSubInput] = useState(false);
  const [hovered, setHovered]         = useState(false);

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
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", flexDirection: "column",
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #e8ece8",
          padding: 24,
          boxShadow: hovered
            ? "0 12px 32px rgba(0,0,0,0.10)"
            : "0 2px 8px rgba(0,0,0,0.06)",
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
          transition: "all 0.25s ease",
          marginBottom: 0,
        }}
      >
        {/* ── Header: title + count badge ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingTitle ? (
              <input
                ref={titleRef}
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); } }}
                style={{
                  width: "100%", fontSize: 18, fontWeight: 700, color: "#0f1f14",
                  border: "none", borderBottom: "2px solid #059669",
                  background: "transparent", outline: "none", fontFamily: "inherit",
                  lineHeight: 1.35,
                }}
              />
            ) : (
              <h3
                onClick={() => setEditingTitle(true)}
                style={{
                  fontSize: 18, fontWeight: 700, color: "#0f1f14",
                  margin: 0, lineHeight: 1.35, cursor: "text",
                }}
              >
                {task.title}
              </h3>
            )}

            {/* Emotion badge below title */}
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {editingEmotion ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <EmotionalStatePicker value={task.emotionalState as EmotionalState} compact
                    onChange={v => { if (v !== task.emotionalState) onUpdate?.(task.id, { emotionalState: v }); setEditingEmotion(false); }} />
                  <button onClick={() => setEditingEmotion(false)} style={{ fontSize: 10, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setEditingEmotion(true)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: 999,
                  background: em.pillBg, color: em.pillText,
                  border: "none", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
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

          {/* x/y count badge */}
          {totalSubs > 0 && (
            <span style={{
              flexShrink: 0, padding: "2px 10px", borderRadius: 999,
              background: "#f2fdec", color: "#059669",
              fontSize: 12, fontWeight: 700,
              border: "1px solid #c8f7ae",
            }}>
              {completedSubs}/{totalSubs}
            </span>
          )}
        </div>

        {/* Nudge */}
        {isNudged && (
          <div style={{ marginBottom: 12 }}>
            <NudgeBanner task={task} onDefer={onDefer ? d => onDefer(task.id, d) : undefined} onMarkDone={onMarkDone ? handleDone : undefined} />
          </div>
        )}

        {/* ── Subtask list ── */}
        {totalSubs > 0 && (
          <ul style={{ listStyle: "none", margin: "0 0 4px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {task.subtasks.map(sub => (
              <li key={sub.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <button
                  onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)}
                  style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    cursor: sub.isCompleted ? "default" : "pointer",
                    background: sub.isCompleted ? "#059669" : "#fff",
                    border: `2px solid ${sub.isCompleted ? "#059669" : "#c8d5cc"}`,
                    display: "grid", placeContent: "center",
                    transition: "all 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                  }}
                >
                  {sub.isCompleted && <Check size={10} color="#fff" strokeWidth={3} />}
                </button>
                <label
                  onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)}
                  style={{
                    flex: 1, cursor: sub.isCompleted ? "default" : "pointer",
                    color: sub.isCompleted ? "#a0b0a8" : "rgba(15,31,20,0.85)",
                    textDecoration: sub.isCompleted ? "line-through" : "none",
                    fontSize: 14, lineHeight: 1.4,
                  }}
                >
                  {sub.title}
                </label>
                <button
                  onClick={() => onDeleteSubtask?.(sub.id)}
                  style={{
                    opacity: 0, width: 24, height: 24, borderRadius: 6,
                    border: "1px solid transparent", background: "none",
                    cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", color: "#c23934", transition: "opacity 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                  onFocus={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                  onBlur={e => (e.currentTarget as HTMLElement).style.opacity = "0"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "0"}
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add subtask */}
        {showSubInput ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 4 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: "2px dashed #c8d5cc", flexShrink: 0 }} />
            <input
              ref={subRef}
              value={subInput}
              onChange={e => setSubInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addSubtask(); if (e.key === "Escape") { setSubInput(""); setShowSubInput(false); } }}
              onBlur={() => { if (!subInput.trim()) setShowSubInput(false); else addSubtask(); }}
              placeholder="Enter subtask…"
              style={{
                flex: 1, fontSize: 14, color: "#0f1f14", background: "transparent",
                border: "none", borderBottom: "1px solid #059669", outline: "none", fontFamily: "inherit",
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowSubInput(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, marginTop: 8,
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, color: "#a0b0a8", fontFamily: "inherit", padding: 0,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#059669"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#a0b0a8"}
          >
            <Plus size={13} strokeWidth={2} /> Add subtask
          </button>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* ── Footer: date + icon actions ── */}
        <div style={{
          marginTop: 20, paddingTop: 16,
          borderTop: "1px solid #e8ece8",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {/* Due date */}
          {editingDue ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <input type="date" value={dateDraft} onChange={e => setDateDraft(e.target.value)}
                style={{ fontSize: 11, border: "1px solid #dde4de", borderRadius: 5, padding: "2px 6px", outline: "none", fontFamily: "inherit" }} />
              <input type="time" value={timeDraft} onChange={e => setTimeDraft(e.target.value)} disabled={!dateDraft}
                style={{ fontSize: 11, border: "1px solid #dde4de", borderRadius: 5, padding: "2px 6px", outline: "none", fontFamily: "inherit" }} />
              <button onClick={commitDue} style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "none", border: "none", cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditingDue(false)} style={{ fontSize: 11, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
          ) : (
            <button
              onClick={() => setEditingDue(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "inherit", padding: 0,
                color: due?.overdue ? "#D14626" : "#7a9a87",
                fontSize: 13, fontWeight: 500,
              }}
            >
              <CalendarClock size={15} />
              {due ? due.label : "Set due date"}
            </button>
          )}

          {/* Icon actions */}
          <div style={{ display: "flex", gap: 4 }}>
            {/* Defer */}
            <button
              onClick={() => setDeferOpen(true)}
              title="Defer 1 day"
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: "1px solid #e8ece8", background: "#fff",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", color: "#7a9a87", transition: "all 0.12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f1f3ef"; (e.currentTarget as HTMLElement).style.color = "#0f1f14"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#7a9a87"; }}
            >
              <Clock size={15} strokeWidth={2} />
            </button>

            {/* Edit title */}
            <button
              onClick={() => setEditingTitle(true)}
              title="Edit"
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: "1px solid #e8ece8", background: "#fff",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", color: "#7a9a87", transition: "all 0.12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f1f3ef"; (e.currentTarget as HTMLElement).style.color = "#0f1f14"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#7a9a87"; }}
            >
              <Pencil size={14} strokeWidth={2} />
            </button>

            {/* Delete */}
            <button
              onClick={() => onDelete?.(task.id)}
              title="Delete"
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: "1px solid rgba(194,57,52,0.2)", background: "#fff",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", color: "#c23934", transition: "all 0.12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fff0f0"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Full-width Complete button ── */}
        <button
          onClick={handleDone}
          style={{
            marginTop: 16, width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "9px 0", borderRadius: 10,
            border: "1.5px solid #059669", background: "#fff",
            color: "#059669", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#059669"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#059669"; }}
        >
          <Check size={16} strokeWidth={2.5} />
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

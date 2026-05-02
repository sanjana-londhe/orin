"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { EmotionalStatePicker, type EmotionalState } from "@/components/EmotionalStatePicker";
import { DeferralModal } from "@/components/DeferralModal";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { getEmotion } from "@/lib/emotions";
import { CalendarClock, Clock, Pencil, Trash2, Check, ChevronDown, ChevronRight } from "lucide-react";

function formatDue(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  const now = new Date();
  const overdue = d < now;
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const dateStr = isToday ? "Today" : isTomorrow ? "Tomorrow" : d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
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

function TaskCardInner({ task, onMarkDone, onDefer, onUpdate, onDelete, onAddSubtask, onCompleteSubtask, onDeleteSubtask }: Props) {
  const { nudgedTaskIds } = useUIStore();
  const isNudged = nudgedTaskIds.has(task.id);
  const em = getEmotion(task.emotionalState);
  const due = formatDue(task.dueAt);
  const completedSubs = task.subtasks.filter(s => s.isCompleted).length;
  const totalSubs = task.subtasks.length;

  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deferOpen, setDeferOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [editingEmotion, setEditingEmotion] = useState(false);
  const [editingDue, setEditingDue] = useState(false);
  const [dateDraft, setDateDraft] = useState(due?.isoDate ?? "");
  const [timeDraft, setTimeDraft] = useState(due?.isoTime ?? "");
  const [subInput, setSubInput] = useState("");
  const [showSubInput, setShowSubInput] = useState(false);
  const [hovered, setHovered] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const subRef = useRef<HTMLInputElement>(null);

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
          background: hovered ? "#fafcfa" : "#fff",
          borderRadius: 10,
          border: "1px solid #eaeaea",
          marginBottom: 4,
          transition: "background 0.1s",
          overflow: "hidden",
        }}
      >
        {/* Main row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>

          {/* Circular complete button */}
          <button onClick={handleDone} title="Complete task" style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
            border: `2px solid ${hovered ? "#16a34a" : "#d1d5db"}`,
            background: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#16a34a"; (e.currentTarget as HTMLElement).style.borderColor = "#16a34a"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = hovered ? "#16a34a" : "#d1d5db"; }}
          >
            {hovered && <Check size={11} color="#fff" strokeWidth={3} />}
          </button>

          {/* Subtask expand toggle */}
          {totalSubs > 0 && (
            <button onClick={() => setExpanded(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#9ca3af", display: "flex", alignItems: "center", flexShrink: 0 }}>
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingTitle ? (
              <input ref={titleRef} value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); } }}
                style={{ width: "100%", fontSize: 14, fontWeight: 600, color: "#0a2010", border: "none", borderBottom: "1.5px solid #16a34a", background: "transparent", outline: "none", fontFamily: "inherit" }}
              />
            ) : (
              <span onClick={() => setEditingTitle(true)} style={{ fontSize: 14, fontWeight: 600, color: "#0a2010", cursor: "text", lineHeight: 1.4, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {task.title}
              </span>
            )}
          </div>

          {/* Subtask count */}
          {totalSubs > 0 && (
            <span style={{ flexShrink: 0, padding: "2px 8px", borderRadius: 999, background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 700 }}>
              {completedSubs}/{totalSubs}
            </span>
          )}

          {/* Emotion badge */}
          {editingEmotion ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <EmotionalStatePicker value={task.emotionalState as EmotionalState} compact onChange={v => { if (v !== task.emotionalState) onUpdate?.(task.id, { emotionalState: v }); setEditingEmotion(false); }} />
              <button onClick={() => setEditingEmotion(false)} style={{ fontSize: 10, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setEditingEmotion(true)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: em.pillBg, color: em.pillText, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
              {em.emoji} {em.label}
            </button>
          )}

          {/* Due date */}
          {editingDue ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <input type="date" value={dateDraft} onChange={e => setDateDraft(e.target.value)} style={{ fontSize: 11, border: "1px solid #d1d5db", borderRadius: 5, padding: "2px 6px", outline: "none", fontFamily: "inherit" }} />
              <input type="time" value={timeDraft} onChange={e => setTimeDraft(e.target.value)} disabled={!dateDraft} style={{ fontSize: 11, border: "1px solid #d1d5db", borderRadius: 5, padding: "2px 6px", outline: "none", fontFamily: "inherit" }} />
              <button onClick={commitDue} style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", background: "none", border: "none", cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditingDue(false)} style={{ fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setEditingDue(true)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500, padding: 0, flexShrink: 0, color: due?.overdue ? "#ef4444" : "#9ca3af" }}>
              <CalendarClock size={13} />
              {due ? <span style={{ color: due.overdue ? "#ef4444" : "#6b7280" }}>{due.label}</span> : <span style={{ color: "#d1d5db" }}>Date</span>}
            </button>
          )}

          {/* Action buttons — show on hover */}
          <div style={{ display: "flex", gap: 3, flexShrink: 0, opacity: hovered ? 1 : 0, transition: "opacity 0.15s" }}>
            <button onClick={() => setDeferOpen(true)} title="Defer" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; (e.currentTarget as HTMLElement).style.color = "#374151"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}
            ><Clock size={13} strokeWidth={2} /></button>
            <button onClick={() => setEditingTitle(true)} title="Edit" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; (e.currentTarget as HTMLElement).style.color = "#374151"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}
            ><Pencil size={13} strokeWidth={2} /></button>
            <button onClick={() => onDelete?.(task.id)} title="Delete" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #fecaca", background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fee2e2"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#fff5f5"}
            ><Trash2 size={13} strokeWidth={2} /></button>
          </div>
        </div>

        {/* Nudge / deferred badge */}
        {(isNudged || task.deferredCount > 0) && (
          <div style={{ padding: "0 14px 8px 46px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {task.deferredCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "#FFF0EC", color: "#D14626" }}>Deferred {task.deferredCount}×</span>
            )}
            {isNudged && <NudgeBanner task={task} onDefer={onDefer ? d => onDefer(task.id, d) : undefined} onMarkDone={onMarkDone ? handleDone : undefined} />}
          </div>
        )}

        {/* Expanded subtasks */}
        {expanded && (
          <div style={{ padding: "4px 14px 12px 46px", borderTop: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {task.subtasks.map(sub => (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)} style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    cursor: sub.isCompleted ? "default" : "pointer",
                    background: sub.isCompleted ? "#16a34a" : "#fff",
                    border: `2px solid ${sub.isCompleted ? "#16a34a" : "#d1d5db"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s",
                  }}>
                    {sub.isCompleted && <Check size={9} color="#fff" strokeWidth={3} />}
                  </button>
                  <span onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)} style={{ flex: 1, fontSize: 13, color: sub.isCompleted ? "#9ca3af" : "#374151", textDecoration: sub.isCompleted ? "line-through" : "none", cursor: sub.isCompleted ? "default" : "pointer" }}>
                    {sub.title}
                  </span>
                  <button onClick={() => onDeleteSubtask?.(sub.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: 0 }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ef4444"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#d1d5db"}
                  ><Trash2 size={11} /></button>
                </div>
              ))}
            </div>
            {showSubInput ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px dashed #d1d5db", flexShrink: 0 }} />
                <input ref={subRef} value={subInput} onChange={e => setSubInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addSubtask(); if (e.key === "Escape") { setSubInput(""); setShowSubInput(false); } }}
                  onBlur={() => { if (!subInput.trim()) setShowSubInput(false); else addSubtask(); }}
                  placeholder="Add subtask…"
                  style={{ flex: 1, fontSize: 13, color: "#0a2010", background: "transparent", border: "none", borderBottom: "1px solid #16a34a", outline: "none", fontFamily: "inherit" }}
                />
              </div>
            ) : (
              <button onClick={() => setShowSubInput(true)} style={{ marginTop: 8, fontSize: 12, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, display: "flex", alignItems: "center", gap: 6 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#16a34a"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9ca3af"}
              >+ Add subtask</button>
            )}
          </div>
        )}
      </div>

      {onDefer && <DeferralModal open={deferOpen} onOpenChange={setDeferOpen} task={task} onConfirm={d => onDefer(task.id, d)} />}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

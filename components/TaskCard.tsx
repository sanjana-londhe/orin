"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { DeferralModal } from "@/components/DeferralModal";
import { DatePickerField } from "@/components/DatePickerField";
import { TimePickerField } from "@/components/TimePickerField";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { getEmotion } from "@/lib/emotions";
import { Pencil, Trash2, Check, Plus, X, CalendarDays } from "lucide-react";

function formatDue(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  const now = new Date();
  const overdue = d < now;
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const label = isToday ? "Today"
    : isTomorrow ? "Tomorrow"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return { label, overdue, isoDate: d.toISOString().slice(0, 10), isoTime: d.toISOString().slice(11, 16) };
}

const EMOTIONS = [
  { value: "DREADING", label: "Dreading", emoji: "😮‍💨", bg: "#FFF0EC", fg: "#D14626", activeBg: "#D14626" },
  { value: "ANXIOUS",  label: "Anxious",  emoji: "😟",   bg: "#FFF8E8", fg: "#B07A10", activeBg: "#B07A10" },
  { value: "NEUTRAL",  label: "Neutral",  emoji: "😐",   bg: "#F3F2F0", fg: "#7A756E", activeBg: "#3a3a3a" },
  { value: "WILLING",  label: "Willing",  emoji: "🙂",   bg: "#EEF9F7", fg: "#0E8A7D", activeBg: "#0E8A7D" },
  { value: "EXCITED",  label: "Excited",  emoji: "🤩",   bg: "#EEFAF1", fg: "#1A9444", activeBg: "#1A9444" },
] as const;

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
  task, isLocallyCompleted = false, onMarkDone, onDefer, onUpdate, onDelete,
  onAddSubtask, onCompleteSubtask, onDeleteSubtask,
}: Props) {
  const { nudgedTaskIds } = useUIStore();
  const isNudged      = nudgedTaskIds.has(task.id);
  const em            = getEmotion(task.emotionalState);
  const due           = formatDue(task.dueAt);
  const completedSubs = task.subtasks.filter(s => s.isCompleted).length;
  const totalSubs     = task.subtasks.length;
  const progress      = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;

  const [deferOpen, setDeferOpen]       = useState(false);
  const [editing, setEditing]           = useState(false);
  const [subInput, setSubInput]         = useState("");
  const [showSubInput, setShowSubInput] = useState(false);
  const [subsExpanded, setSubsExpanded] = useState(true);
  const subRef = useRef<HTMLInputElement>(null);

  const [editTitle, setEditTitle]     = useState(task.title);
  const [editDate, setEditDate]       = useState(due?.isoDate ?? "");
  const [editTime, setEditTime]       = useState(due?.isoTime ?? "");
  const [editEmotion, setEditEmotion] = useState(task.emotionalState as typeof EMOTIONS[number]["value"]);
  const [newSub, setNewSub]           = useState("");
  const editTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (showSubInput) subRef.current?.focus(); }, [showSubInput]);
  useEffect(() => { if (editing) editTitleRef.current?.focus(); }, [editing]);

  function openEdit() {
    setEditTitle(task.title);
    setEditDate(due?.isoDate ?? "");
    setEditTime(due?.isoTime ?? "");
    setEditEmotion(task.emotionalState as typeof EMOTIONS[number]["value"]);
    setNewSub(""); setEditing(true);
  }

  function saveEdit() {
    if (!editTitle.trim()) return;
    const dueAt = editDate ? new Date(`${editDate}T${editTime || "00:00"}`).toISOString() : null;
    onUpdate?.(task.id, { title: editTitle.trim(), dueAt: dueAt as unknown as Date, emotionalState: editEmotion as Task["emotionalState"] });
    setEditing(false);
  }

  function addSubtask() {
    const t = subInput.trim();
    if (t) onAddSubtask?.(task.id, t);
    setSubInput(""); setShowSubInput(false);
  }

  function addNewSub() {
    const t = newSub.trim();
    if (t) onAddSubtask?.(task.id, t);
    setNewSub("");
  }

  // ── Inline edit form ──────────────────────────────────────────────
  if (editing) {
    return (
      <div>
        <div style={{ padding: "14px 0", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fcfdfc", border: "1.5px solid #059669", borderRadius: 10 }}>
            <span style={{ fontSize: 14, color: "#b9d3c4", flexShrink: 0 }}>✦</span>
            <input ref={editTitleRef} value={editTitle} onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
              style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#082d1d", background: "transparent" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DatePickerField value={editDate} onChange={setEditDate} label="Due date" />
            <TimePickerField value={editTime} onChange={setEditTime} label="Due time" />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", marginBottom: 8 }}>How do you feel about it?</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {EMOTIONS.map(s => {
                const active = editEmotion === s.value;
                return (
                  <button key={s.value} onClick={() => setEditEmotion(s.value)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600, background: active ? s.activeBg : s.bg, color: active ? "#fff" : s.fg, border: `1px solid ${s.fg}30`, cursor: "pointer", fontFamily: "inherit" }}>
                    {s.emoji} {s.label}
                  </button>
                );
              })}
            </div>
          </div>
          {task.subtasks.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", marginBottom: 8 }}>Action items</p>
              {task.subtasks.map(sub => (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <button onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)} style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, border: `1.5px solid ${sub.isCompleted ? "#059669" : "#dde4de"}`, background: sub.isCompleted ? "#059669" : "#fff", cursor: sub.isCompleted ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {sub.isCompleted && <Check size={8} color="#fff" strokeWidth={3} />}
                  </button>
                  <span style={{ flex: 1, fontSize: 12.5, color: sub.isCompleted ? "#b9d3c4" : "#082d1d", textDecoration: sub.isCompleted ? "line-through" : "none" }}>{sub.title}</span>
                  <button onClick={() => onDeleteSubtask?.(sub.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dde4de", padding: 0 }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#c23934"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#dde4de"}
                  ><X size={11} /></button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, border: "1.5px dashed #dde4de", flexShrink: 0 }} />
            <input value={newSub} onChange={e => setNewSub(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && newSub.trim()) addNewSub(); }}
              placeholder="Add action item…"
              style={{ flex: 1, border: "none", borderBottom: "1px solid #dde4de", outline: "none", fontSize: 12.5, color: "#082d1d", background: "transparent", fontFamily: "inherit", paddingBottom: 2 }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setEditing(false)} style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid #dde4de", background: "#fff", color: "#4a6d47", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={saveEdit} disabled={!editTitle.trim()} style={{ padding: "7px 20px", borderRadius: 8, border: "none", background: editTitle.trim() ? "#059669" : "#c4cbc2", color: "#fff", fontSize: 13, fontWeight: 600, cursor: editTitle.trim() ? "pointer" : "default", fontFamily: "inherit" }}
              onMouseEnter={e => { if (editTitle.trim()) (e.currentTarget as HTMLElement).style.background = "#047857"; }}
              onMouseLeave={e => { if (editTitle.trim()) (e.currentTarget as HTMLElement).style.background = "#059669"; }}
            >Save changes</button>
          </div>
        </div>
        <div style={{ height: 1, background: "#e8ece8" }} />
      </div>
    );
  }

  // ── Plain list row ────────────────────────────────────────────────
  return (
    <>
      <div style={{ padding: "12px 0", opacity: isLocallyCompleted ? 0.65 : 1 }}>

        {/* Row: checkbox + title + actions */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>

          {/* Square checkbox */}
          <button onClick={() => onMarkDone?.(task.id)}
            title={isLocallyCompleted ? "Mark as active" : "Complete"}
            style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2,
              border: `2px solid ${isLocallyCompleted ? "#16a34a" : "#d1d5db"}`,
              background: isLocallyCompleted ? "#16a34a" : "#fff",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { isLocallyCompleted
              ? ((e.currentTarget as HTMLElement).style.background = "#dc2626", (e.currentTarget as HTMLElement).style.borderColor = "#dc2626")
              : ((e.currentTarget as HTMLElement).style.borderColor = "#16a34a", (e.currentTarget as HTMLElement).style.background = "#dcfce7"); }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isLocallyCompleted ? "#16a34a" : "#fff"; (e.currentTarget as HTMLElement).style.borderColor = isLocallyCompleted ? "#16a34a" : "#d1d5db"; }}
          >
            {isLocallyCompleted && <Check size={10} color="#fff" strokeWidth={3} />}
          </button>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 14, fontWeight: 600,
              color: isLocallyCompleted ? "#9ca3af" : "#111827",
              margin: 0, lineHeight: 1.4,
              textDecoration: isLocallyCompleted ? "line-through" : "none",
            }}>{task.title}</p>

            {/* Meta row */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
              {!isLocallyCompleted && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: em.pillBg, color: em.pillText, fontSize: 12, fontWeight: 600 }}>
                  {em.emoji} {em.label}
                </span>
              )}
              {(due || (!isLocallyCompleted && onDefer)) && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 8, background: "#f3f4f6" }}>
                  <CalendarDays size={12} color={due?.overdue ? "#dc2626" : "#6b7280"} />
                  {due && <span style={{ fontSize: 12, color: due.overdue ? "#dc2626" : "#374151", fontWeight: 500 }}>{due.label}</span>}
                  {!isLocallyCompleted && onDefer && (
                    <button onClick={() => setDeferOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#059669", padding: 0, fontFamily: "inherit" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#047857"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#059669"}
                    >· Defer</button>
                  )}
                </div>
              )}
              {task.deferredCount > 0 && !isLocallyCompleted && (
                <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "#FFF0EC", color: "#D14626" }}>×{task.deferredCount}</span>
              )}
            </div>

            {/* Segmented progress bar */}
            {totalSubs > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex", flex: 1, gap: 3 }}>
                    {task.subtasks.map((sub, i) => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: sub.isCompleted ? em.strip : "#e5e7eb", transition: "background 0.2s" }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: em.pillText, flexShrink: 0 }}>{completedSubs}/{totalSubs}</span>
                  {totalSubs > 1 && (
                    <button onClick={() => setSubsExpanded(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#9ca3af", padding: 0, fontFamily: "inherit", flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#374151"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9ca3af"}
                    >{subsExpanded ? "Hide" : "Show"}</button>
                  )}
                </div>
              </div>
            )}

            {/* Subtask list */}
            {task.subtasks.length > 0 && subsExpanded && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
                {task.subtasks.map(sub => (
                  <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)} style={{
                      width: 15, height: 15, borderRadius: 3, flexShrink: 0,
                      cursor: sub.isCompleted ? "default" : "pointer",
                      background: sub.isCompleted ? em.strip : "#fff",
                      border: `1.5px solid ${sub.isCompleted ? em.strip : "#d1d5db"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s",
                    }}>
                      {sub.isCompleted && <Check size={8} color="#fff" strokeWidth={3} />}
                    </button>
                    <span style={{ flex: 1, fontSize: 13, color: sub.isCompleted ? "#9ca3af" : "#374151", textDecoration: sub.isCompleted ? "line-through" : "none" }}>{sub.title}</span>
                    {!isLocallyCompleted && (
                      <button onClick={() => onDeleteSubtask?.(sub.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e5e7eb", padding: 0, display: "flex" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#dc2626"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#e5e7eb"}
                      ><X size={11} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add subtask */}
            {!isLocallyCompleted && (
              showSubInput ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <div style={{ width: 15, height: 15, borderRadius: 3, border: "1.5px dashed #d1d5db", flexShrink: 0 }} />
                  <input ref={subRef} value={subInput} onChange={e => setSubInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addSubtask(); if (e.key === "Escape") { setSubInput(""); setShowSubInput(false); } }}
                    onBlur={() => { if (!subInput.trim()) setShowSubInput(false); else addSubtask(); }}
                    placeholder="Subtask…"
                    style={{ flex: 1, fontSize: 13, color: "#082d1d", background: "transparent", border: "none", borderBottom: "1px solid #059669", outline: "none", fontFamily: "inherit" }}
                  />
                </div>
              ) : (
                <button onClick={() => setShowSubInput(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#c4cbc2", fontFamily: "inherit", padding: 0 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#059669"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#c4cbc2"}
                ><Plus size={12} strokeWidth={2.5} /> Add subtask</button>
              )
            )}

            {isNudged && !isLocallyCompleted && (
              <div style={{ marginTop: 8 }}>
                <NudgeBanner task={task} onDefer={onDefer ? d => onDefer(task.id, d) : undefined} onMarkDone={() => onMarkDone?.(task.id)} />
              </div>
            )}
          </div>

          {/* Edit + Delete */}
          {!isLocallyCompleted && (
            <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
              <button onClick={openEdit} title="Edit" style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", transition: "color 0.12s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#111827"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9ca3af"}
              ><Pencil size={14} strokeWidth={2} /></button>
              <button onClick={() => onDelete?.(task.id)} title="Delete" style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", transition: "color 0.12s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#dc2626"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9ca3af"}
              ><Trash2 size={14} strokeWidth={2} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#e8ece8" }} />

      {onDefer && <DeferralModal open={deferOpen} onOpenChange={setDeferOpen} task={task} onConfirm={d => onDefer(task.id, d)} />}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

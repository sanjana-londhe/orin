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
import { Pencil, Trash2, Check, Plus, X } from "lucide-react";

function formatDue(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  const now = new Date();
  const overdue = d < now;
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const label = isToday ? "Today"
    : isTomorrow ? "Tomorrow"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return { label: (isToday || isTomorrow) ? `${label} · ${time}` : label, overdue, isoDate: d.toISOString().slice(0, 10), isoTime: d.toISOString().slice(11, 16) };
}

const EMOTIONS = [
  { value: "DREADING", label: "Dreading", emoji: "😰", bg: "#FFF0EC", fg: "#D14626", strip: "#c23934", activeBg: "#D14626" },
  { value: "ANXIOUS",  label: "Anxious",  emoji: "😟", bg: "#FFF8E8", fg: "#B07A10", strip: "#886a00", activeBg: "#B07A10" },
  { value: "NEUTRAL",  label: "Neutral",  emoji: "😐", bg: "#F3F2F0", fg: "#7A756E", strip: "#c4cbc2", activeBg: "#3a3a3a" },
  { value: "WILLING",  label: "Willing",  emoji: "🙂", bg: "#EEF9F7", fg: "#0E8A7D", strip: "#2b6b5e", activeBg: "#0E8A7D" },
  { value: "EXCITED",  label: "Excited",  emoji: "🤩", bg: "#EEFAF1", fg: "#1A9444", strip: "#59d10b", activeBg: "#1A9444" },
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
  const em            = EMOTIONS.find(e => e.value === task.emotionalState) ?? EMOTIONS[2];
  const due           = formatDue(task.dueAt);
  const completedSubs = task.subtasks.filter(s => s.isCompleted).length;
  const totalSubs     = task.subtasks.length;

  const [deferOpen, setDeferOpen]       = useState(false);
  const [editing, setEditing]           = useState(false);
  const [subInput, setSubInput]         = useState("");
  const [showSubInput, setShowSubInput] = useState(false);
  const [subsExpanded, setSubsExpanded] = useState(true);
  const [hovered, setHovered]           = useState(false);
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
    setEditTitle(task.title); setEditDate(due?.isoDate ?? "");
    setEditTime(due?.isoTime ?? ""); setNewSub("");
    setEditEmotion(task.emotionalState as typeof EMOTIONS[number]["value"]);
    setEditing(true);
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

  // ── Inline edit (creation form aesthetic) ────────────────────────
  if (editing) {
    return (
      <div style={{ background: "#fff", border: "1.5px solid #059669", borderRadius: 12, padding: "14px 18px", boxShadow: "0 0 0 3px rgba(5,150,105,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ color: "#059669", fontSize: 14, flexShrink: 0 }}>✦</span>
          <input ref={editTitleRef} value={editTitle} onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
            style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#082d1d", background: "transparent" }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <DatePickerField value={editDate} onChange={setEditDate} label="Due date" />
          <TimePickerField value={editTime} onChange={setEditTime} label="Due time" />
        </div>
        <div style={{ marginBottom: 14 }}>
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
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", marginBottom: 8 }}>Action items</p>
            {task.subtasks.map(sub => (
              <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <button onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)} style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, border: `1.5px solid ${sub.isCompleted ? "#059669" : "#dde4de"}`, background: sub.isCompleted ? "#059669" : "#fff", cursor: sub.isCompleted ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {sub.isCompleted && <Check size={7} color="#fff" strokeWidth={3} />}
                </button>
                <span style={{ flex: 1, fontSize: 12.5, color: sub.isCompleted ? "#b9d3c4" : "#3d5a4a", textDecoration: sub.isCompleted ? "line-through" : "none" }}>{sub.title}</span>
                <button onClick={() => onDeleteSubtask?.(sub.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dde4de", padding: 0 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#c23934"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#dde4de"}
                ><X size={11} /></button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
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
    );
  }

  // ── 11.html Structured card ───────────────────────────────────────
  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "#fff",
          border: "1px solid #e8ece8",
          borderRadius: 14,
          overflow: "hidden",
          opacity: isLocallyCompleted ? 0.65 : 1,
          boxShadow: hovered && !isLocallyCompleted ? "0 4px 12px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.05)",
          transition: "box-shadow 0.18s, opacity 0.18s",
        }}
      >

        {/* ── Zone Top: emotion + deferred + actions ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", background: "#fafcfa", borderBottom: "1px solid #f0f0f0" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px 3px 8px", borderRadius: 20,
            background: em.bg, color: em.fg,
            fontSize: 11, fontWeight: 600,
          }}>
            {em.emoji} {em.label}
          </span>

          {task.deferredCount > 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 20,
              background: "#f3f4f6", border: "1px solid #e5e7eb",
              fontSize: 10.5, fontWeight: 600, color: "#3d5a4a",
            }}>
              ↩ {task.deferredCount} deferred
            </span>
          )}

          {/* Actions — hidden until hover */}
          {!isLocallyCompleted && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 4, opacity: hovered ? 1 : 0, transition: "opacity 0.15s" }}>
              <button onClick={openEdit} title="Edit" style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #e8ece8", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#b9d3c4", transition: "background 0.15s, color 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f8f9f5"; (e.currentTarget as HTMLElement).style.color = "#3d5a4a"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#b9d3c4"; }}
              ><Pencil size={12} strokeWidth={2} /></button>
              <button onClick={() => onDelete?.(task.id)} title="Delete" style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #e8ece8", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#b9d3c4", transition: "background 0.15s, color 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fff0f0"; (e.currentTarget as HTMLElement).style.color = "#c23934"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#b9d3c4"; }}
              ><Trash2 size={12} strokeWidth={2} /></button>
            </div>
          )}
        </div>

        {/* ── Zone Content: title + date + progress ── */}
        <div style={{ padding: "14px 16px" }}>
          <div style={{
            fontSize: 16, fontWeight: 700, color: isLocallyCompleted ? "#b9d3c4" : "#082d1d",
            marginBottom: 10, lineHeight: 1.35,
            textDecoration: isLocallyCompleted ? "line-through" : "none",
          }}>{task.title}</div>

          {due && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 9px", borderRadius: 20, background: "#f3f4f6",
              fontSize: 11.5, fontWeight: 500, color: due.overdue ? "#c23934" : "#3d5a4a",
              marginBottom: totalSubs > 0 ? 12 : 0,
            }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1v4M11 1v4M2 7h12"/></svg>
              {due.label}
            </div>
          )}

          {totalSubs > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#b9d3c4", textTransform: "uppercase", letterSpacing: "0.07em" }}>Progress</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#3d5a4a" }}>{completedSubs} of {totalSubs}</span>
                  {totalSubs > 1 && (
                    <button onClick={() => setSubsExpanded(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#b9d3c4", padding: 0, fontFamily: "inherit" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#3d5a4a"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#b9d3c4"}
                    >{subsExpanded ? "Hide" : "Show"}</button>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 3, height: 4 }}>
                {task.subtasks.map((sub, i) => (
                  <div key={i} style={{ flex: 1, borderRadius: 2, background: sub.isCompleted ? em.strip : "#f0f0f0", transition: "background 0.2s" }} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Zone Subtasks ── */}
        {totalSubs > 0 && subsExpanded && (
          <div style={{ padding: "10px 16px", borderTop: "1px solid #f0f0f0", background: "#fafcfa" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {task.subtasks.map(sub => (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <button onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)} style={{
                    width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                    border: `1.5px solid ${sub.isCompleted ? "#059669" : "#dde4de"}`,
                    background: sub.isCompleted ? "#059669" : "#fff",
                    cursor: sub.isCompleted ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                    onMouseEnter={e => { if (!sub.isCompleted) (e.currentTarget as HTMLElement).style.borderColor = "#059669"; }}
                    onMouseLeave={e => { if (!sub.isCompleted) (e.currentTarget as HTMLElement).style.borderColor = "#dde4de"; }}
                  >
                    {sub.isCompleted && <Check size={7} color="#fff" strokeWidth={3} />}
                  </button>
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: sub.isCompleted ? "#b9d3c4" : "#3d5a4a", textDecoration: sub.isCompleted ? "line-through" : "none" }}>
                    {sub.title}
                  </span>
                  {!isLocallyCompleted && (
                    <button onClick={() => onDeleteSubtask?.(sub.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e8ece8", padding: 0, display: "flex", transition: "color 0.15s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#c23934"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#e8ece8"}
                    ><X size={11} /></button>
                  )}
                </div>
              ))}
            </div>

            {/* Add subtask */}
            {!isLocallyCompleted && (
              showSubInput ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: "1.5px dashed #dde4de", flexShrink: 0 }} />
                  <input ref={subRef} value={subInput} onChange={e => setSubInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addSubtask(); if (e.key === "Escape") { setSubInput(""); setShowSubInput(false); } }}
                    onBlur={() => { if (!subInput.trim()) setShowSubInput(false); else addSubtask(); }}
                    placeholder="Subtask…"
                    style={{ flex: 1, fontSize: 12.5, color: "#082d1d", background: "transparent", border: "none", borderBottom: "1px solid #059669", outline: "none", fontFamily: "inherit" }}
                  />
                </div>
              ) : (
                <button onClick={() => setShowSubInput(true)} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#059669", fontFamily: "inherit", padding: 0, transition: "opacity 0.15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.7"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                ><Plus size={12} strokeWidth={2.5} /> Add subtask</button>
              )
            )}
          </div>
        )}

        {/* Add subtask zone when no subtasks yet */}
        {totalSubs === 0 && !isLocallyCompleted && (
          <div style={{ padding: "0 16px 10px" }}>
            {showSubInput ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "1.5px dashed #dde4de", flexShrink: 0 }} />
                <input ref={subRef} value={subInput} onChange={e => setSubInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addSubtask(); if (e.key === "Escape") { setSubInput(""); setShowSubInput(false); } }}
                  onBlur={() => { if (!subInput.trim()) setShowSubInput(false); else addSubtask(); }}
                  placeholder="Subtask…"
                  style={{ flex: 1, fontSize: 12.5, color: "#082d1d", background: "transparent", border: "none", borderBottom: "1px solid #059669", outline: "none", fontFamily: "inherit" }}
                />
              </div>
            ) : (
              <button onClick={() => setShowSubInput(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#059669", fontFamily: "inherit", padding: 0, transition: "opacity 0.15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.7"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
              ><Plus size={12} strokeWidth={2.5} /> Add subtask</button>
            )}
          </div>
        )}

        {isNudged && !isLocallyCompleted && (
          <div style={{ padding: "0 16px 10px" }}>
            <NudgeBanner task={task} onDefer={onDefer ? d => onDefer(task.id, d) : undefined} onMarkDone={() => onMarkDone?.(task.id)} />
          </div>
        )}

        {/* ── Zone Strip: Mark complete (left) + Defer (right) ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 16px", borderTop: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => onMarkDone?.(task.id)} style={{
              width: 15, height: 15, borderRadius: 4, flexShrink: 0,
              border: `1.5px solid ${isLocallyCompleted ? "#059669" : "#dde4de"}`,
              background: isLocallyCompleted ? "#059669" : "#fff",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "border-color 0.15s, background 0.15s",
            }}
              onMouseEnter={e => { if (!isLocallyCompleted) (e.currentTarget as HTMLElement).style.borderColor = "#059669"; }}
              onMouseLeave={e => { if (!isLocallyCompleted) (e.currentTarget as HTMLElement).style.borderColor = "#dde4de"; }}
            >
              {isLocallyCompleted && <Check size={8} color="#fff" strokeWidth={3} />}
            </button>
            <span onClick={() => onMarkDone?.(task.id)} style={{ fontSize: 12, fontWeight: 500, color: isLocallyCompleted ? "#059669" : "#b9d3c4", cursor: "pointer" }}
              onMouseEnter={e => { if (!isLocallyCompleted) (e.currentTarget as HTMLElement).style.color = "#3d5a4a"; }}
              onMouseLeave={e => { if (!isLocallyCompleted) (e.currentTarget as HTMLElement).style.color = isLocallyCompleted ? "#059669" : "#b9d3c4"; }}
            >{isLocallyCompleted ? "Completed" : "Mark complete"}</span>
          </div>

          {!isLocallyCompleted && onDefer && (
            <button onClick={() => setDeferOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#059669", fontFamily: "inherit", padding: 0 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.textDecoration = "underline"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.textDecoration = "none"}
            >Defer →</button>
          )}
        </div>
      </div>

      {onDefer && <DeferralModal open={deferOpen} onOpenChange={setDeferOpen} task={task} onConfirm={d => onDefer(task.id, d)} />}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

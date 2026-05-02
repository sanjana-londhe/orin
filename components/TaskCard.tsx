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

// ── Design.md tokens ─────────────────────────────────────────────
const T = {
  surface:     "#ffffff",
  stone100:    "#f8f9f5",
  stone400:    "#dde4de",   // border
  stone500:    "#c4cbc2",   // border-strong / hover
  accent:      "#059669",   // emerald
  accentHover: "#047857",
  accentSubtle:"#f2fdec",
  textPrimary: "#082d1d",
  textSecond:  "#3d5a4a",
  textTert:    "#4a6d47",
  textMuted:   "#b9d3c4",
};

function formatDue(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  const now = new Date();
  const overdue = d < now;
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const date = isToday ? "Today" : isTomorrow ? "Tomorrow"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return { label: `${date} · ${time}`, overdue, isoDate: d.toISOString().slice(0, 10), isoTime: d.toISOString().slice(11, 16) };
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
    setEditTime(due?.isoTime ?? ""); setEditEmotion(task.emotionalState as typeof EMOTIONS[number]["value"]);
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

  // ── Inline edit ───────────────────────────────────────────────────
  if (editing) {
    return (
      <div style={{ background: T.surface, border: `1.5px solid ${T.accent}`, borderRadius: 12, padding: "14px 18px", boxShadow: `0 0 0 3px ${T.accentSubtle}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ color: T.accent, fontSize: 14, flexShrink: 0 }}>✦</span>
          <input ref={editTitleRef} value={editTitle} onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
            style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: T.textPrimary, background: "transparent" }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <DatePickerField value={editDate} onChange={setEditDate} label="Due date" />
          <TimePickerField value={editTime} onChange={setEditTime} label="Due time" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.textTert, marginBottom: 8 }}>How do you feel about it?</p>
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
            <p style={{ fontSize: 11, fontWeight: 600, color: T.textTert, marginBottom: 8 }}>Action items</p>
            {task.subtasks.map(sub => (
              <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <button onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)} style={{ width: 15, height: 15, borderRadius: "50%", flexShrink: 0, border: `1.5px solid ${sub.isCompleted ? T.accent : T.stone400}`, background: sub.isCompleted ? T.accent : T.surface, cursor: sub.isCompleted ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {sub.isCompleted && <Check size={8} color="#fff" strokeWidth={3} />}
                </button>
                <span style={{ flex: 1, fontSize: 12.5, color: sub.isCompleted ? T.textMuted : T.textSecond, textDecoration: sub.isCompleted ? "line-through" : "none" }}>{sub.title}</span>
                <button onClick={() => onDeleteSubtask?.(sub.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.stone400, padding: 0 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#c23934"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = T.stone400}
                ><X size={11} /></button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, border: `1.5px dashed ${T.stone400}`, flexShrink: 0 }} />
          <input value={newSub} onChange={e => setNewSub(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && newSub.trim()) { onAddSubtask?.(task.id, newSub.trim()); setNewSub(""); } }}
            placeholder="Add action item…"
            style={{ flex: 1, border: "none", borderBottom: `1px solid ${T.stone400}`, outline: "none", fontSize: 12.5, color: T.textPrimary, background: "transparent", fontFamily: "inherit", paddingBottom: 2 }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={() => setEditing(false)} style={{ padding: "7px 16px", borderRadius: 8, border: `1.5px solid ${T.stone400}`, background: T.surface, color: T.textSecond, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={saveEdit} disabled={!editTitle.trim()} style={{ padding: "7px 20px", borderRadius: 8, border: "none", background: editTitle.trim() ? T.accent : T.stone500, color: "#fff", fontSize: 13, fontWeight: 600, cursor: editTitle.trim() ? "pointer" : "default", fontFamily: "inherit" }}
            onMouseEnter={e => { if (editTitle.trim()) (e.currentTarget as HTMLElement).style.background = T.accentHover; }}
            onMouseLeave={e => { if (editTitle.trim()) (e.currentTarget as HTMLElement).style.background = T.accent; }}
          >Save changes</button>
        </div>
      </div>
    );
  }

  // ── Card ──────────────────────────────────────────────────────────
  return (
    <>
      <div style={{
        background: T.surface,
        border: `1.5px solid ${T.stone400}`,
        borderRadius: 12,
        padding: "14px 18px",
        opacity: isLocallyCompleted ? 0.65 : 1,
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
        onMouseEnter={e => { if (!isLocallyCompleted) { (e.currentTarget as HTMLElement).style.borderColor = T.stone500; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(8,45,29,0.06)"; } }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.stone400; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
      >
        {/* ── Row 1: badges left, edit+delete right ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
          {/* Emotion pill */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px 4px 8px", borderRadius: 999,
            background: em.bg, color: em.fg,
            fontSize: 12, fontWeight: 600, letterSpacing: "0.01em",
          }}>{em.emoji} {em.label}</span>

          {/* Deferred badge */}
          {task.deferredCount > 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 9px", borderRadius: 999,
              background: T.stone100, border: `1px solid ${T.stone400}`,
              fontSize: 11, fontWeight: 600, color: T.textSecond,
            }}>↩ {task.deferredCount} deferred</span>
          )}

          {/* Edit + Delete — always visible top-right */}
          {!isLocallyCompleted && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              <button onClick={openEdit} title="Edit" style={{
                width: 28, height: 28, borderRadius: 7,
                border: `1px solid ${T.stone400}`, background: T.surface,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: T.textMuted, transition: "all 0.12s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.stone100; (e.currentTarget as HTMLElement).style.color = T.textSecond; (e.currentTarget as HTMLElement).style.borderColor = T.stone500; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.surface; (e.currentTarget as HTMLElement).style.color = T.textMuted; (e.currentTarget as HTMLElement).style.borderColor = T.stone400; }}
              ><Pencil size={13} strokeWidth={2} /></button>
              <button onClick={() => onDelete?.(task.id)} title="Delete" style={{
                width: 28, height: 28, borderRadius: 7,
                border: `1px solid ${T.stone400}`, background: T.surface,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: T.textMuted, transition: "all 0.12s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fff0f0"; (e.currentTarget as HTMLElement).style.color = "#c23934"; (e.currentTarget as HTMLElement).style.borderColor = "#fecaca"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.surface; (e.currentTarget as HTMLElement).style.color = T.textMuted; (e.currentTarget as HTMLElement).style.borderColor = T.stone400; }}
              ><Trash2 size={13} strokeWidth={2} /></button>
            </div>
          )}
        </div>

        {/* ── Row 2: Title ── */}
        <p style={{
          fontSize: 15, fontWeight: 700, color: isLocallyCompleted ? T.textMuted : T.textPrimary,
          margin: "0 0 10px", lineHeight: 1.4,
          textDecoration: isLocallyCompleted ? "line-through" : "none",
          letterSpacing: "-0.01em",
        }}>{task.title}</p>

        {/* ── Row 3: Due date + Defer ── */}
        {(due || (!isLocallyCompleted && onDefer)) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: totalSubs > 0 ? 12 : 0 }}>
            {due && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 10px", borderRadius: 8,
                background: due.overdue ? "#FFF0EC" : T.stone100,
                border: `1px solid ${due.overdue ? "#fecaca" : T.stone400}`,
                fontSize: 12, fontWeight: 500,
                color: due.overdue ? "#c23934" : T.textSecond,
              }}>
                <CalendarDays size={12} color={due.overdue ? "#c23934" : T.textMuted} />
                {due.label}
              </span>
            )}
            {!isLocallyCompleted && onDefer && (
              <button onClick={() => setDeferOpen(true)} style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, color: T.accent,
                padding: 0, fontFamily: "inherit",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = T.accentHover}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = T.accent}
              >· Defer</button>
            )}
          </div>
        )}

        {/* ── Progress bar ── */}
        {totalSubs > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 3, height: 3, marginBottom: 8 }}>
              {task.subtasks.map((sub, i) => (
                <div key={i} style={{ flex: 1, borderRadius: 999, background: sub.isCompleted ? em.strip : T.stone400, transition: "background 0.2s" }} />
              ))}
            </div>
            {/* Subtask list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {task.subtasks.map(sub => (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <button onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)} style={{
                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                    border: `1.5px solid ${sub.isCompleted ? T.accent : T.stone400}`,
                    background: sub.isCompleted ? T.accent : T.surface,
                    cursor: sub.isCompleted ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                    onMouseEnter={e => { if (!sub.isCompleted) (e.currentTarget as HTMLElement).style.borderColor = T.accent; }}
                    onMouseLeave={e => { if (!sub.isCompleted) (e.currentTarget as HTMLElement).style.borderColor = T.stone400; }}
                  >
                    {sub.isCompleted && <Check size={8} color="#fff" strokeWidth={3} />}
                  </button>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: sub.isCompleted ? T.textMuted : T.textSecond, textDecoration: sub.isCompleted ? "line-through" : "none" }}>
                    {sub.title}
                  </span>
                  {!isLocallyCompleted && (
                    <button onClick={() => onDeleteSubtask?.(sub.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.stone400, padding: 0, display: "flex", transition: "color 0.12s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#c23934"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = T.stone400}
                    ><X size={12} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add subtask */}
        {!isLocallyCompleted && (
          showSubInput ? (
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1.5px dashed ${T.stone400}`, flexShrink: 0 }} />
              <input ref={subRef} value={subInput} onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addSubtask(); if (e.key === "Escape") { setSubInput(""); setShowSubInput(false); } }}
                onBlur={() => { if (!subInput.trim()) setShowSubInput(false); else addSubtask(); }}
                placeholder="Add subtask…"
                style={{ flex: 1, fontSize: 13, color: T.textPrimary, background: "transparent", border: "none", borderBottom: `1px solid ${T.accent}`, outline: "none", fontFamily: "inherit" }}
              />
            </div>
          ) : (
            <button onClick={() => setShowSubInput(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, color: T.textMuted, fontFamily: "inherit", padding: 0 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = T.accent}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = T.textMuted}
            ><Plus size={12} strokeWidth={2.5} /> Add subtask</button>
          )
        )}

        {isNudged && !isLocallyCompleted && (
          <div style={{ marginBottom: 10 }}>
            <NudgeBanner task={task} onDefer={onDefer ? d => onDefer(task.id, d) : undefined} onMarkDone={() => onMarkDone?.(task.id)} />
          </div>
        )}

        {/* ── Footer: Mark complete ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, paddingTop: 10, borderTop: `1px solid #f0f3f0` }}>
          <button onClick={() => onMarkDone?.(task.id)} style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
            border: `1.5px solid ${isLocallyCompleted ? T.accent : T.stone400}`,
            background: isLocallyCompleted ? T.accent : T.surface,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "border-color 0.15s, background 0.15s",
          }}
            onMouseEnter={e => { if (!isLocallyCompleted) (e.currentTarget as HTMLElement).style.borderColor = T.accent; }}
            onMouseLeave={e => { if (!isLocallyCompleted) (e.currentTarget as HTMLElement).style.borderColor = T.stone400; }}
          >
            {isLocallyCompleted && <Check size={9} color="#fff" strokeWidth={3} />}
          </button>
          <span onClick={() => onMarkDone?.(task.id)} style={{ fontSize: 12, fontWeight: 500, color: isLocallyCompleted ? T.accent : T.textMuted, cursor: "pointer", userSelect: "none" }}
            onMouseEnter={e => { if (!isLocallyCompleted) (e.currentTarget as HTMLElement).style.color = T.textSecond; }}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = isLocallyCompleted ? T.accent : T.textMuted}
          >{isLocallyCompleted ? "Completed" : "Mark complete"}</span>
        </div>
      </div>

      {onDefer && <DeferralModal open={deferOpen} onOpenChange={setDeferOpen} task={task} onConfirm={d => onDefer(task.id, d)} />}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

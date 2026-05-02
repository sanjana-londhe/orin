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
  const date = isToday ? "Today" : isTomorrow ? "Tomorrow"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return { label: `${date} · ${time}`, overdue, isoDate: d.toISOString().slice(0, 10), isoTime: d.toISOString().slice(11, 16) };
}

const EMOTIONS = [
  { value: "DREADING", label: "Dreading", emoji: "😰", bg: "#FFF0EC", fg: "#D14626", strip: "#e05230", activeBg: "#D14626" },
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

  if (editing) {
    return (
      <div style={{ background: "#fff", border: "1.5px solid #059669", borderRadius: 12, padding: "16px 18px", boxShadow: "0 0 0 3px #f2fdec" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ color: "#059669", fontSize: 14 }}>✦</span>
          <input ref={editTitleRef} value={editTitle} onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
            style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#082d1d", background: "transparent" }} />
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
              return <button key={s.value} onClick={() => setEditEmotion(s.value)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600, background: active ? s.activeBg : s.bg, color: active ? "#fff" : s.fg, border: `1px solid ${s.fg}30`, cursor: "pointer", fontFamily: "inherit" }}>{s.emoji} {s.label}</button>;
            })}
          </div>
        </div>
        {task.subtasks.map(sub => (
          <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <button onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)} style={{ width: 15, height: 15, borderRadius: "50%", border: `1.5px solid ${sub.isCompleted ? "#059669" : "#dde4de"}`, background: sub.isCompleted ? "#059669" : "#fff", cursor: sub.isCompleted ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {sub.isCompleted && <Check size={8} color="#fff" strokeWidth={3} />}
            </button>
            <span style={{ flex: 1, fontSize: 12.5, color: sub.isCompleted ? "#b9d3c4" : "#3d5a4a", textDecoration: sub.isCompleted ? "line-through" : "none" }}>{sub.title}</span>
            <button onClick={() => onDeleteSubtask?.(sub.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dde4de", padding: 0 }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#c23934"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#dde4de"}><X size={11} /></button>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, border: "1.5px dashed #dde4de", flexShrink: 0 }} />
          <input value={newSub} onChange={e => setNewSub(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newSub.trim()) { onAddSubtask?.(task.id, newSub.trim()); setNewSub(""); } }} placeholder="Add action item…" style={{ flex: 1, border: "none", borderBottom: "1px solid #dde4de", outline: "none", fontSize: 12.5, color: "#082d1d", background: "transparent", fontFamily: "inherit", paddingBottom: 2 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={() => setEditing(false)} style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid #dde4de", background: "#fff", color: "#4a6d47", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={saveEdit} style={{ padding: "7px 20px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#047857"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#059669"}>Save changes</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* WHITE CARD — matches screenshot */}
      <div style={{
        background: "#ffffff",
        borderRadius: 14,
        border: "1px solid #e5e9e5",
        padding: "16px 18px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        opacity: isLocallyCompleted ? 0.6 : 1,
        transition: "box-shadow 0.15s",
      }}
        onMouseEnter={e => { if (!isLocallyCompleted) (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(0,0,0,0.09)"; }}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"}
      >

        {/* ROW 1 — emotion pill + deferred badge | edit + delete */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>

          {/* 😰 Dreading */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 11px 4px 9px", borderRadius: 999,
            background: em.bg, color: em.fg,
            fontSize: 12.5, fontWeight: 600,
          }}>{em.emoji} {em.label}</span>

          {/* ↩ 2 deferred */}
          {task.deferredCount > 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 999,
              background: "#f3f4f6", border: "1px solid #e5e7eb",
              fontSize: 11.5, fontWeight: 600, color: "#374151",
            }}>↩ {task.deferredCount} deferred</span>
          )}

          {/* Edit ✏ + Delete 🗑 — always top-right */}
          {!isLocallyCompleted && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
              <button onClick={openEdit} style={{
                width: 28, height: 28, borderRadius: 7,
                border: "1px solid #e5e9e5", background: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#9ca3af", transition: "all 0.12s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; (e.currentTarget as HTMLElement).style.color = "#374151"; (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#9ca3af"; (e.currentTarget as HTMLElement).style.borderColor = "#e5e9e5"; }}
              ><Pencil size={13} strokeWidth={2} /></button>
              <button onClick={() => onDelete?.(task.id)} style={{
                width: 28, height: 28, borderRadius: 7,
                border: "1px solid #e5e9e5", background: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#9ca3af", transition: "all 0.12s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fef2f2"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; (e.currentTarget as HTMLElement).style.borderColor = "#fecaca"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#9ca3af"; (e.currentTarget as HTMLElement).style.borderColor = "#e5e9e5"; }}
              ><Trash2 size={13} strokeWidth={2} /></button>
            </div>
          )}
        </div>

        {/* ROW 2 — Title */}
        <p style={{
          fontSize: 15.5, fontWeight: 700,
          color: isLocallyCompleted ? "#9ca3af" : "#111827",
          margin: "0 0 10px", lineHeight: 1.4,
          textDecoration: isLocallyCompleted ? "line-through" : "none",
          letterSpacing: "-0.015em",
        }}>{task.title}</p>

        {/* ROW 3 — 📅 date chip + · Defer */}
        {(due || (!isLocallyCompleted && onDefer)) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            {due && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 11px", borderRadius: 8,
                background: due.overdue ? "#fef2f2" : "#f3f4f6",
                border: `1px solid ${due.overdue ? "#fecaca" : "#e5e7eb"}`,
                fontSize: 12.5, fontWeight: 500,
                color: due.overdue ? "#ef4444" : "#374151",
              }}>
                <CalendarDays size={13} color={due.overdue ? "#ef4444" : "#6b7280"} strokeWidth={2} />
                {due.label}
              </span>
            )}
            {!isLocallyCompleted && onDefer && (
              <button onClick={() => setDeferOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#059669", padding: 0, fontFamily: "inherit" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#047857"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#059669"}
              >· Defer</button>
            )}
          </div>
        )}

        {/* ROW 4 — Segmented progress bar */}
        {totalSubs > 0 && (
          <div style={{ display: "flex", gap: 4, height: 4, marginBottom: 12, borderRadius: 999, overflow: "hidden" }}>
            {task.subtasks.map((sub, i) => (
              <div key={i} style={{ flex: 1, background: sub.isCompleted ? em.strip : "#e5e7eb", transition: "background 0.2s" }} />
            ))}
          </div>
        )}

        {/* ROW 5 — Subtask list */}
        {task.subtasks.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
            {task.subtasks.map(sub => (
              <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)} style={{
                  width: 17, height: 17, borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${sub.isCompleted ? "#059669" : "#d1d5db"}`,
                  background: sub.isCompleted ? "#059669" : "#fff",
                  cursor: sub.isCompleted ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
                  onMouseEnter={e => { if (!sub.isCompleted) (e.currentTarget as HTMLElement).style.borderColor = "#059669"; }}
                  onMouseLeave={e => { if (!sub.isCompleted) (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"; }}
                >
                  {sub.isCompleted && <Check size={9} color="#fff" strokeWidth={3} />}
                </button>
                <span style={{ flex: 1, fontSize: 13.5, color: sub.isCompleted ? "#9ca3af" : "#374151", textDecoration: sub.isCompleted ? "line-through" : "none" }}>
                  {sub.title}
                </span>
                {!isLocallyCompleted && (
                  <button onClick={() => onDeleteSubtask?.(sub.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e5e7eb", padding: 0 }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ef4444"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#e5e7eb"}
                  ><X size={12} /></button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add subtask */}
        {!isLocallyCompleted && (
          showSubInput ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 17, height: 17, borderRadius: "50%", border: "2px dashed #d1d5db", flexShrink: 0 }} />
              <input ref={subRef} value={subInput} onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addSubtask(); if (e.key === "Escape") { setSubInput(""); setShowSubInput(false); } }}
                onBlur={() => { if (!subInput.trim()) setShowSubInput(false); else addSubtask(); }}
                placeholder="Add subtask…"
                style={{ flex: 1, fontSize: 13.5, color: "#111827", background: "transparent", border: "none", borderBottom: "1px solid #059669", outline: "none", fontFamily: "inherit" }}
              />
            </div>
          ) : (
            <button onClick={() => setShowSubInput(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10, background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "#9ca3af", fontFamily: "inherit", padding: 0 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#059669"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9ca3af"}
            ><Plus size={13} strokeWidth={2.5} /> Add subtask</button>
          )
        )}

        {isNudged && !isLocallyCompleted && (
          <div style={{ marginBottom: 10 }}>
            <NudgeBanner task={task} onDefer={onDefer ? d => onDefer(task.id, d) : undefined} onMarkDone={() => onMarkDone?.(task.id)} />
          </div>
        )}

        {/* FOOTER — thin divider + □ Mark complete */}
        <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 4, paddingTop: 11, display: "flex", alignItems: "center", gap: 9 }}>
          <button onClick={() => onMarkDone?.(task.id)} style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
            border: `1.5px solid ${isLocallyCompleted ? "#059669" : "#d1d5db"}`,
            background: isLocallyCompleted ? "#059669" : "#fff",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
            onMouseEnter={e => { if (!isLocallyCompleted) (e.currentTarget as HTMLElement).style.borderColor = "#059669"; }}
            onMouseLeave={e => { if (!isLocallyCompleted) (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db"; }}
          >
            {isLocallyCompleted && <Check size={9} color="#fff" strokeWidth={3} />}
          </button>
          <span onClick={() => onMarkDone?.(task.id)} style={{ fontSize: 12.5, fontWeight: 500, color: isLocallyCompleted ? "#059669" : "#9ca3af", cursor: "pointer" }}
            onMouseEnter={e => { if (!isLocallyCompleted) (e.currentTarget as HTMLElement).style.color = "#374151"; }}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = isLocallyCompleted ? "#059669" : "#9ca3af"}
          >{isLocallyCompleted ? "Completed" : "Mark complete"}</span>
        </div>
      </div>

      {onDefer && <DeferralModal open={deferOpen} onOpenChange={setDeferOpen} task={task} onConfirm={d => onDefer(task.id, d)} />}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

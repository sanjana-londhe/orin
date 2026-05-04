"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { DeferralModal } from "@/components/DeferralModal";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { useIsMobile } from "@/hooks/useIsMobile";

// design.md tokens
const T = {
  textPrimary:   "#082d1d",
  textSecondary: "#3d5a4a",
  textTertiary:  "#4a6d47",
  textMuted:     "#b9d3c4",
  border:        "#dde4de",
  borderStrong:  "#c4cbc2",
  surface:       "#ffffff",
  stone100:      "#f8f9f5",
  stone200:      "#f1f3ef",
  accent:        "#059669",
  accentHover:   "#047857",
  danger:        "#c23934",
  dangerBg:      "#FFF0EC",
  flagged:       "#ff9500",
};

// ── helpers ────────────────────────────────────────────────────────────

function fmtDue(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const d   = new Date(dueAt);
  const now = new Date();
  const yd  = new Date(now); yd.setDate(yd.getDate() - 1);
  const tm  = new Date(now); tm.setDate(tm.getDate() + 1);

  const isToday     = d.toDateString() === now.toDateString();
  const isYesterday = d.toDateString() === yd.toDateString();
  const isTomorrow  = d.toDateString() === tm.toDateString();

  const dateLabel = isToday ? "Today" : isYesterday ? "Yesterday" : isTomorrow ? "Tomorrow"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const timeStr  = d.toISOString().slice(11, 16);
  const hasTime  = timeStr !== "00:00";
  const timeLabel = hasTime ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;
  const overdue  = d < now && !isToday;

  return { dateLabel, timeLabel, overdue, isToday, isoDate: d.toISOString().slice(0, 10), isoTime: timeStr };
}

function getIsoDate(dueAt: Date | string | null) {
  return dueAt ? new Date(dueAt).toISOString().slice(0, 10) : "";
}
function getIsoTime(dueAt: Date | string | null) {
  return dueAt ? new Date(dueAt).toISOString().slice(11, 16) : "";
}

// ── emotion config ─────────────────────────────────────────────────────

const EMOTIONS = [
  { value: "DREADING", label: "Dreading", emoji: "😰", bg: "#FFF0EC", fg: "#D14626" },
  { value: "ANXIOUS",  label: "Anxious",  emoji: "😟", bg: "#FFF8E8", fg: "#B07A10" },
  { value: "NEUTRAL",  label: "Neutral",  emoji: "😐", bg: "#F3F2F0", fg: "#7A756E" },
  { value: "WILLING",  label: "Willing",  emoji: "🙂", bg: "#EEF9F7", fg: "#0E8A7D" },
  { value: "EXCITED",  label: "Excited",  emoji: "🤩", bg: "#EEFAF1", fg: "#1A9444" },
] as const;

// ── note helpers ───────────────────────────────────────────────────────

function loadNote(id: string) {
  try { return localStorage.getItem(`orin_note_${id}`) ?? ""; } catch { return ""; }
}
function persistNote(id: string, text: string) {
  try { if (text.trim()) localStorage.setItem(`orin_note_${id}`, text); else localStorage.removeItem(`orin_note_${id}`); } catch {}
}

// ── types ──────────────────────────────────────────────────────────────

interface Props {
  task: TaskWithSubtasks;
  featured?: boolean;
  canPushUp?: boolean;
  onPushUp?: (id: string) => void;
  onMarkDone?: (id: string) => void;
  onUncomplete?: (id: string) => void;
  onDefer?: (id: string, newDueAt: Date) => void;
  onUpdate?: (id: string, patch: Partial<Pick<Task, "title" | "dueAt" | "emotionalState">>) => void;
  onDelete?: (id: string) => void;
}

// ── component ──────────────────────────────────────────────────────────

function TaskCardInner({ task, onMarkDone, onUncomplete, onDefer, onUpdate, onDelete }: Props) {
  const done    = task.isCompleted;
  const flagged = (task.deferredCount ?? 0) > 0;
  const em      = EMOTIONS.find(e => e.value === task.emotionalState) ?? EMOTIONS[2];
  const due     = fmtDue(task.dueAt);
  const isMobile = useIsMobile();

  const { nudgedTaskIds } = useUIStore();
  const isNudged = nudgedTaskIds.has(task.id);

  const [deferOpen, setDeferOpen]     = useState(false);
  const [editing, setEditing]         = useState(false);
  const [editTitle, setEditTitle]     = useState(task.title);
  const [editDate, setEditDate]       = useState(getIsoDate(task.dueAt));
  const [editTime, setEditTime]       = useState(getIsoTime(task.dueAt));
  const [editEmotion, setEditEmotion] = useState(task.emotionalState as typeof EMOTIONS[number]["value"]);
  const [editNote, setEditNote]       = useState("");
  const [note, setNote]               = useState("");
  const [mounted, setMounted]         = useState(false);
  const [hovered, setHovered]         = useState(false);
  const [checkHov, setCheckHov]       = useState(false);

  const editTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); setNote(loadNote(task.id)); }, [task.id]);
  useEffect(() => {
    if (editing) {
      setEditTitle(task.title);
      setEditDate(getIsoDate(task.dueAt));
      setEditTime(getIsoTime(task.dueAt));
      setEditEmotion(task.emotionalState as typeof EMOTIONS[number]["value"]);
      setEditNote(loadNote(task.id));
      setTimeout(() => editTitleRef.current?.focus(), 10);
    }
  }, [editing]);

  function saveEdit() {
    if (!editTitle.trim()) return;
    const dueAt = editDate ? new Date(`${editDate}T${editTime || "00:00"}`).toISOString() : null;
    onUpdate?.(task.id, { title: editTitle.trim(), dueAt: dueAt as unknown as Date, emotionalState: editEmotion as Task["emotionalState"] });
    persistNote(task.id, editNote);
    setNote(editNote);
    setEditing(false);
  }

  // ── Edit form ──────────────────────────────────────────────────────
  if (editing) {
    return (
      <div style={{ padding: "6px 8px" }}>
        <div style={{
          background: T.surface, border: `1.5px solid ${T.accent}`, borderRadius: 10,
          padding: "14px 16px", boxShadow: "0 0 0 3px rgba(5,150,105,0.08)",
        }}>
          <input
            ref={editTitleRef}
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
            style={{
              width: "100%", border: "none", outline: "none", fontFamily: "inherit",
              fontSize: 14, fontWeight: 500, color: T.textPrimary,
              background: "transparent", marginBottom: 12, display: "block",
            }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Due date</label>
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                style={{ width: "100%", fontSize: 13, padding: "6px 10px", borderRadius: 6, border: `1.5px solid ${T.border}`, outline: "none", fontFamily: "inherit", background: T.stone100, boxSizing: "border-box", color: T.textPrimary }} />
            </div>
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Due time</label>
              <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} disabled={!editDate}
                style={{ width: "100%", fontSize: 13, padding: "6px 10px", borderRadius: 6, border: `1.5px solid ${T.border}`, outline: "none", fontFamily: "inherit", background: editDate ? T.stone100 : T.stone200, boxSizing: "border-box", color: T.textPrimary }} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Feeling</label>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {EMOTIONS.map(s => { const active = editEmotion === s.value; return (
                <button key={s.value} onClick={() => setEditEmotion(s.value)} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px 3px 7px", borderRadius: 999,
                  fontSize: 11.5, fontWeight: 600,
                  background: active ? s.fg : s.bg, color: active ? "#fff" : s.fg,
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                }}>{s.emoji} {s.label}</button>
              ); })}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Note</label>
            <textarea value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Add a note…" rows={2}
              style={{ width: "100%", fontSize: 13, padding: "7px 10px", borderRadius: 6, border: `1.5px solid ${T.border}`, outline: "none", fontFamily: "inherit", background: T.stone100, resize: "vertical", boxSizing: "border-box", color: T.textPrimary }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setEditing(false)}
              style={{ padding: "6px 14px", borderRadius: 6, border: `1.5px solid ${T.border}`, background: T.surface, color: T.textSecondary, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button onClick={saveEdit}
              style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: T.accent, color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={e => (e.currentTarget.style.background = T.accentHover)}
              onMouseLeave={e => (e.currentTarget.style.background = T.accent)}>
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Row ────────────────────────────────────────────────────────────
  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "flex-start",
          padding: "12px 14px 12px 16px",
          background: hovered ? T.stone200 : "transparent",
          transition: "background 0.1s",
        }}
      >
        {/* Circle checkbox */}
        <div style={{ paddingTop: 2, paddingRight: 12, flexShrink: 0 }}>
          <div
            onClick={() => done ? onUncomplete?.(task.id) : onMarkDone?.(task.id)}
            onMouseEnter={() => setCheckHov(true)}
            onMouseLeave={() => setCheckHov(false)}
            style={{
              width: isMobile ? 26 : 20, height: isMobile ? 26 : 20, borderRadius: "50%",
              border: `1.5px solid ${done ? T.accent : checkHov ? T.accent : T.border}`,
              background: done ? T.accent : "transparent",
              cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            {done && (
              <svg width="10" height="7" viewBox="0 0 11 8" fill="none">
                <path d="M1 4l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 450,
            color: done ? T.textMuted : T.textPrimary,
            lineHeight: 1.4,
            textDecoration: done ? "line-through" : "none",
            marginBottom: due || task.emotionalState ? 3 : 0,
          }}>
            {task.title}
          </div>

          {(due || task.emotionalState || !done) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: note && mounted ? 3 : 0 }}>
              {due ? (
                <span
                  onClick={() => !done && setDeferOpen(true)}
                  style={{
                    fontSize: 11.5, fontWeight: 500,
                    color: due.overdue ? T.danger : due.isToday ? T.accent : T.textTertiary,
                    cursor: done ? "default" : "pointer",
                    textDecoration: "none",
                    borderBottom: done ? "none" : `1px dashed ${due.overdue ? T.danger : T.borderStrong}`,
                  }}
                >
                  {due.overdue && "⚠ "}{due.dateLabel}{due.timeLabel && ` · ${due.timeLabel}`}
                </span>
              ) : !done && (
                <span
                  onClick={() => setDeferOpen(true)}
                  style={{
                    fontSize: 11.5, fontWeight: 500, color: T.textMuted,
                    cursor: "pointer", borderBottom: `1px dashed ${T.borderStrong}`,
                  }}
                >+ Set date</span>
              )}
              {task.emotionalState && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 999,
                  background: em.bg, color: em.fg,
                }}>
                  {em.emoji} {em.label}
                </span>
              )}
            </div>
          )}

          {mounted && note && (
            <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {note}
            </div>
          )}

          {isNudged && !done && (
            <div style={{ marginTop: 8 }}>
              <NudgeBanner task={task} onDefer={onDefer ? d => onDefer(task.id, d) : undefined} onMarkDone={() => onMarkDone?.(task.id)} />
            </div>
          )}
        </div>

        {/* Right: edit/delete — always visible on mobile, hover-only on desktop */}
        <div style={{ display: "flex", alignItems: "center", gap: 1, paddingLeft: 8, flexShrink: 0, paddingTop: 1, opacity: (isMobile || hovered) && !done ? 1 : 0, transition: "opacity 0.15s" }}>
          <button onClick={() => setEditing(true)} title="Edit"
            style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textTertiary, transition: "background 0.1s, color 0.1s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.stone200; (e.currentTarget as HTMLElement).style.color = T.textSecondary; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = T.textTertiary; }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={() => onDelete?.(task.id)} title="Delete"
            style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textTertiary, fontSize: 13, transition: "background 0.1s, color 0.1s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.dangerBg; (e.currentTarget as HTMLElement).style.color = T.danger; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = T.textTertiary; }}>
            ✕
          </button>
        </div>
      </div>

      {onDefer && <DeferralModal open={deferOpen} onOpenChange={setDeferOpen} task={task} onConfirm={d => onDefer(task.id, d)} />}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

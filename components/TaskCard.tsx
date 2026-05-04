"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { DeferralModal } from "@/components/DeferralModal";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { useIsMobile } from "@/hooks/useIsMobile";
import { FeelingPickerField, type Feeling } from "@/components/FeelingPickerField";
import { DatePickerField } from "@/components/DatePickerField";
import { TimePickerField } from "@/components/TimePickerField";
import { Pencil, Trash2 } from "lucide-react";

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

// UTC midnight (T00:00:00.000Z) is our sentinel for "date only — no time set"
function fmtDue(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const d   = new Date(dueAt);
  const iso = d.toISOString();

  const hasTime = iso.slice(11) !== "00:00:00.000Z";

  // Canonical YYYY-MM-DD for comparison — avoids timezone drift on date-only tasks
  function localDateIso(offset = 0): string {
    const n = new Date(); n.setDate(n.getDate() + offset);
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  }
  const taskDate = hasTime
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : iso.slice(0, 10);

  const todayIso    = localDateIso(0);
  const yesterdayIso = localDateIso(-1);
  const tomorrowIso = localDateIso(1);

  const isToday    = taskDate === todayIso;
  const isYesterday = taskDate === yesterdayIso;
  const isTomorrow = taskDate === tomorrowIso;
  const overdue    = taskDate < todayIso;

  const dateLabel = isToday ? "Today"
    : isYesterday ? "Yesterday"
    : isTomorrow  ? "Tomorrow"
    : new Date(taskDate + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const timeLabel = hasTime ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;

  return { dateLabel, timeLabel, overdue, isToday, isoDate: taskDate, isoTime: hasTime ? iso.slice(11, 16) : "" };
}

function getIsoDate(dueAt: Date | string | null) {
  if (!dueAt) return "";
  const iso = new Date(dueAt).toISOString();
  // date-only: use UTC date directly; timed: use local date
  const d = new Date(dueAt);
  return iso.slice(11) === "00:00:00.000Z"
    ? iso.slice(0, 10)
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getIsoTime(dueAt: Date | string | null) {
  if (!dueAt) return "";
  const iso = new Date(dueAt).toISOString();
  return iso.slice(11) === "00:00:00.000Z" ? "" : iso.slice(11, 16);
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

  const { nudgedTaskIds, editingTaskId, setEditingTaskId } = useUIStore();
  const isNudged = nudgedTaskIds.has(task.id);

  const [deferOpen, setDeferOpen]     = useState(false);
  const [editing, setEditing]         = useState(false);
  const [completing, setCompleting]         = useState(false); // animation in-flight
  const [showUncompletePrompt, setShowUncompletePrompt] = useState(false);
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

  // Close this edit form if another task or the create form takes focus
  useEffect(() => {
    if (editing && editingTaskId !== task.id) setEditing(false);
  }, [editingTaskId]);

  function openEdit() { setEditingTaskId(task.id); setEditing(true); }
  function closeEdit() { setEditingTaskId(null); setEditing(false); }

  function saveEdit() {
    if (!editTitle.trim()) return;
    const dueAt = editDate
      ? (editTime ? new Date(`${editDate}T${editTime}`).toISOString() : `${editDate}T00:00:00.000Z`)
      : null;
    onUpdate?.(task.id, { title: editTitle.trim(), dueAt: dueAt as unknown as Date, emotionalState: editEmotion as Task["emotionalState"] });
    persistNote(task.id, editNote);
    setNote(editNote);
    closeEdit();
  }

  // ── Edit form — same structure as task creation bar ──────────────────
  if (editing) {
    return (
      <div style={{ padding: "6px 8px" }}>
        <div style={{
          background: T.surface,
          borderRadius: 12,
          border: `1px solid ${T.accent}`,
          boxShadow: "0 0 0 3px rgba(5,150,105,0.07)",
        }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "flex-start", padding: "12px 14px 12px 16px" }}>
            <div style={{ paddingTop: 2, paddingRight: 12, flexShrink: 0 }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                border: `1.5px solid ${T.accent}`, background: "transparent",
              }} />
            </div>
            <input
              ref={editTitleRef}
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") closeEdit(); }}
              style={{
                flex: 1, border: "none", outline: "none", fontFamily: "inherit",
                fontSize: 14, fontWeight: 450, color: T.textPrimary,
                background: "transparent", display: "block",
              }}
            />
          </div>

          {/* Pickers — Feeling → Date → Time */}
          <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 14px" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
              gap: isMobile ? 8 : 10,
            }}>
              <FeelingPickerField
                value={editEmotion as Feeling}
                onChange={v => setEditEmotion(v as typeof editEmotion)}
                label="Feeling"
                dropUp={isMobile}
              />
              <DatePickerField
                value={editDate}
                onChange={setEditDate}
                label="Due date"
                dropUp={isMobile}
              />
              <TimePickerField
                value={editTime}
                onChange={setEditTime}
                label="Due time (optional)"
                selectedDate={editDate}
                dropUp={isMobile}
              />
            </div>
          </div>

          {/* Note */}
          <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 14px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary, margin: "0 0 8px" }}>Note</p>
            <textarea
              value={editNote}
              onChange={e => setEditNote(e.target.value)}
              placeholder="Add a note or description…"
              rows={2}
              style={{
                width: "100%", outline: "none", fontFamily: "inherit",
                fontSize: 13, color: T.textPrimary,
                background: T.stone100,
                border: `1.5px solid ${T.border}`,
                borderRadius: 8,
                padding: "8px 10px",
                resize: "vertical", boxSizing: "border-box", lineHeight: 1.5,
                transition: "border-color 0.14s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = T.accent)}
              onBlur={e => (e.currentTarget.style.borderColor = T.border)}
            />
          </div>

          {/* Actions */}
          <div style={{
            borderTop: `1px solid ${T.border}`,
            padding: "10px 14px",
            display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8,
          }}>
            <div style={{ display: "flex", gap: 8 }}>
            {/* Mobile: Delete (cancel-style, red) + Save only */}
            {isMobile && onDelete ? (
              <button
                onClick={() => { onDelete(task.id); closeEdit(); }}
                style={{
                  padding: "6px 14px", borderRadius: 6,
                  border: `1px solid #e9c3c1`,
                  background: T.surface, color: "#D14626",
                  fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
                }}
              >Delete</button>
            ) : !isMobile && (
              <button onClick={closeEdit} style={{
                padding: "6px 14px", borderRadius: 6, border: `1px solid ${T.border}`,
                background: T.surface, color: T.textSecondary, fontSize: 12.5,
                cursor: "pointer", fontFamily: "inherit",
              }}>Cancel</button>
            )}
            <button
              onClick={saveEdit}
              disabled={!editTitle.trim()}
              style={{
                padding: "6px 16px", borderRadius: 6, border: "none",
                background: editTitle.trim() ? T.accent : T.stone200,
                color: editTitle.trim() ? "#fff" : T.textMuted,
                fontSize: 12.5, fontWeight: 600,
                cursor: editTitle.trim() ? "pointer" : "default",
                fontFamily: "inherit", transition: "background 0.12s",
              }}
              onMouseEnter={e => { if (editTitle.trim()) (e.currentTarget as HTMLElement).style.background = T.accentHover; }}
              onMouseLeave={e => { if (editTitle.trim()) (e.currentTarget as HTMLElement).style.background = T.accent; }}
            >Save</button>
            </div>
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
        onClick={isMobile && !done ? openEdit : undefined}
        style={{
          display: "flex", alignItems: "flex-start",
          padding: isMobile ? "16px 14px" : "12px 14px 12px 16px",
          cursor: isMobile && !done ? "pointer" : "default",
          background: hovered ? T.stone200 : "transparent",
          opacity: completing ? 0 : 1,
          transform: completing ? "translateX(8px)" : "none",
          transition: completing
            ? "opacity 0.3s ease 0.2s, transform 0.3s ease 0.2s"
            : "background 0.1s",
        }}
      >
        {/* Circle checkbox */}
        <div style={{ paddingTop: 2, paddingRight: 12, flexShrink: 0 }}>
          <div
            onClick={e => {
              e.stopPropagation(); // prevent row click from also opening edit on mobile
              if (done) {
                // Future tasks need a prompt to reschedule
                const todayIso = new Date().toISOString().slice(0, 10);
                if (due && due.isoDate > todayIso) {
                  setShowUncompletePrompt(true);
                } else {
                  onUncomplete?.(task.id);
                }
                return;
              }
              setCompleting(true);
              setTimeout(() => { onMarkDone?.(task.id); setCompleting(false); }, 500);
            }}
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
          {/* Title with animated strikethrough on completion */}
          <div style={{
            fontSize: 14, fontWeight: 450,
            color: T.textPrimary,
            lineHeight: 1.4,
            textDecoration: done ? "line-through" : "none",
            marginBottom: due || task.emotionalState ? 3 : 0,
            position: "relative", display: "inline-block", width: "100%",
          }}>
            {task.title}
            {/* Animated strike line — only during the completing animation */}
            {completing && !done && (
              <span style={{
                position: "absolute", left: 0, top: "50%",
                height: "1.5px", background: T.textPrimary,
                animation: "strikethrough-draw 0.25s ease forwards",
              }} />
            )}
          </div>

          {(due || task.emotionalState || !done) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: note && mounted ? 3 : 0 }}>
              {due ? (
                <span
                  onClick={() => !done && setDeferOpen(true)}
                  style={{
                    fontSize: 12, fontWeight: 500,
                    color: done ? T.textMuted : due.overdue ? T.danger : due.isToday ? T.accent : T.textTertiary,
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
                    fontSize: 12, fontWeight: 500, color: T.textMuted,
                    cursor: "pointer", borderBottom: `1px dashed ${T.borderStrong}`,
                  }}
                >+ Set date</span>
              )}
              {task.emotionalState && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  fontSize: 12, fontWeight: 600, padding: "1px 7px", borderRadius: 999,
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

        {/* Right: edit/delete — desktop hover-only; hidden on mobile (tap row instead) */}
        {!isMobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 8, flexShrink: 0, paddingTop: 1, opacity: hovered && !done ? 1 : 0, transition: "opacity 0.15s" }}>
          <button onClick={openEdit} title="Edit"
            style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.stone100, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textTertiary, transition: "background 0.1s, color 0.1s, border-color 0.1s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = T.stone200; el.style.color = T.textSecondary; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = T.stone100; el.style.color = T.textTertiary; }}>
            <Pencil size={11} />
          </button>
          <button onClick={() => onDelete?.(task.id)} title="Delete"
            style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.stone100, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textTertiary, transition: "background 0.1s, color 0.1s, border-color 0.1s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = T.dangerBg; el.style.color = T.danger; el.style.borderColor = "#e9c3c1"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = T.stone100; el.style.color = T.textTertiary; el.style.borderColor = T.border; }}>
            <Trash2 size={11} />
          </button>
        </div>
        )}
      </div>

      {onDefer && <DeferralModal open={deferOpen} onOpenChange={setDeferOpen} task={task} onConfirm={d => onDefer(task.id, d)} />}

      {/* Prompt when uncompleting a future task */}
      {showUncompletePrompt && (
        <>
          <div onClick={() => setShowUncompletePrompt(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(8,45,29,0.2)", backdropFilter: "blur(2px)" }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)", zIndex: 201,
            width: 300, background: "#fff", borderRadius: 12,
            border: "1px solid #dde4de", boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            padding: "20px",
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#082d1d", margin: "0 0 6px" }}>Future task</p>
            <p style={{ fontSize: 13, color: "#3d5a4a", margin: "0 0 16px", lineHeight: 1.5 }}>
              This task is due <strong>{due?.dateLabel}</strong>. Would you like to move it to today?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => {
                  const todayIso = new Date().toISOString().slice(0, 10);
                  onUpdate?.(task.id, { dueAt: new Date(`${todayIso}T00:00:00.000Z`) as unknown as Date });
                  onUncomplete?.(task.id);
                  setShowUncompletePrompt(false);
                }}
                style={{ padding: "10px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Move to today
              </button>
              <button
                onClick={() => { onUncomplete?.(task.id); setShowUncompletePrompt(false); }}
                style={{ padding: "10px", borderRadius: 8, border: "1px solid #dde4de", background: "#fff", color: "#3d5a4a", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                Keep original date
              </button>
              <button
                onClick={() => setShowUncompletePrompt(false)}
                style={{ padding: "6px", borderRadius: 8, border: "none", background: "none", color: "#b9d3c4", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

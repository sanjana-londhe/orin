"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { EmotionalStatePicker, type EmotionalState } from "@/components/EmotionalStatePicker";
import { DeferralModal } from "@/components/DeferralModal";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { getEmotion } from "@/lib/emotions";
import { Calendar, ArrowRight, Check, Trash2, MoreHorizontal } from "lucide-react";

function formatDue(dueAt: Date | string | null) {
  if (!dueAt) return { label: null, overdue: false, isoDate: "", isoTime: "" };
  const d = new Date(dueAt);
  const now = new Date();
  const overdue = d < now;
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const label = isToday
    ? `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : isTomorrow
    ? "Tomorrow"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  return { label, overdue, isoDate: d.toISOString().slice(0, 10), isoTime: d.toISOString().slice(11, 16) };
}

function recurrenceLabel(rule: string | null) {
  if (!rule) return null;
  if (rule.includes("BYDAY=MO,TU,WE,TH,FR")) return "Weekdays";
  if (rule.includes("INTERVAL=2")) return "Biweekly";
  if (rule.includes("WEEKLY")) return "Weekly";
  if (rule.includes("DAILY")) return "Daily";
  return "Recurring";
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
  const em = getEmotion(task.emotionalState);
  const { label: dueLabel, overdue, isoDate, isoTime } = formatDue(task.dueAt);
  const recur = recurrenceLabel(task.recurrenceRule);
  const completedSubs = task.subtasks.filter(s => s.isCompleted).length;
  const totalSubs = task.subtasks.length;

  const [done, setDone]               = useState(false);
  const [deferOpen, setDeferOpen]     = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft]   = useState(task.title);
  const [editingState, setEditingState] = useState(false);
  const [editingDue, setEditingDue]   = useState(false);
  const [dateDraft, setDateDraft]     = useState(isoDate);
  const [timeDraft, setTimeDraft]     = useState(isoTime);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [menuOpen, setMenuOpen]       = useState(false);
  const [hovered, setHovered]         = useState(false);
  const titleRef  = useRef<HTMLInputElement>(null);
  const subtaskRef = useRef<HTMLInputElement>(null);
  const menuRef   = useRef<HTMLDivElement>(null);

  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);
  useEffect(() => { if (addingSubtask) subtaskRef.current?.focus(); }, [addingSubtask]);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e9ede9",
          padding: "11px 14px",
          marginBottom: 6,
          boxShadow: hovered ? "0 3px 10px rgba(0,0,0,0.06)" : "0 1px 2px rgba(0,0,0,0.03)",
          transition: "box-shadow 0.15s, border-color 0.15s",
          borderColor: hovered ? "#c4cbc2" : "#e9ede9",
        }}
      >
        {/* ── Top row: emotion badge + menu ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Emotion badge */}
            {editingState ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <EmotionalStatePicker
                  value={task.emotionalState as EmotionalState}
                  compact
                  onChange={v => { if (v !== task.emotionalState) onUpdate?.(task.id, { emotionalState: v }); setEditingState(false); }}
                />
                <button onClick={() => setEditingState(false)} style={{ fontSize: 10, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <button
                onClick={() => setEditingState(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 999,
                  background: em.pillBg, color: em.pillText,
                  border: `1px solid ${em.pillBg}`,
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  transition: "opacity 0.12s",
                }}
              >
                <span style={{ fontSize: 11 }}>{em.emoji}</span>
                {em.label}
              </button>
            )}

            {/* Deferred badge */}
            {task.deferredCount > 0 && (
              <span style={{
                padding: "2px 7px", borderRadius: 999,
                background: "#FFF0EC", color: "#D14626",
                fontSize: 10.5, fontWeight: 600,
              }}>Deferred {task.deferredCount}×</span>
            )}
            {recur && (
              <span style={{
                padding: "2px 7px", borderRadius: 999,
                background: "#F0F0FF", color: "#5555CC",
                fontSize: 10.5, fontWeight: 600,
              }}>↺ {recur}</span>
            )}
          </div>

          {/* ⋯ Menu */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                width: 28, height: 28, borderRadius: 8,
                border: "1px solid transparent",
                background: menuOpen ? "#f1f3ef" : "transparent",
                cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center",
                color: "#4a6d47", transition: "all 0.12s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f1f3ef"}
              onMouseLeave={e => { if (!menuOpen) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <MoreHorizontal size={15} />
            </button>

            {menuOpen && (
              <div style={{
                position: "absolute", top: 32, right: 0, zIndex: 50,
                background: "#fff", border: "1px solid #e9ede9",
                borderRadius: 10, padding: "4px 0",
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                minWidth: 140,
              }}>
                <button onClick={() => { handleMarkDone(); setMenuOpen(false); }} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "8px 14px", background: "none",
                  border: "none", cursor: "pointer", fontSize: 13, color: "#059669",
                  fontFamily: "inherit", textAlign: "left",
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f2fdec"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
                >
                  <Check size={13} /> Mark done
                </button>
                {onDefer && (
                  <button onClick={() => { setDeferOpen(true); setMenuOpen(false); }} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "8px 14px", background: "none",
                    border: "none", cursor: "pointer", fontSize: 13, color: "#4a6d47",
                    fontFamily: "inherit", textAlign: "left",
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8f9f5"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
                  >
                    <ArrowRight size={13} /> Push task
                  </button>
                )}
                <div style={{ height: 1, background: "#f1f3ef", margin: "4px 0" }} />
                <button onClick={() => { onDelete?.(task.id); setMenuOpen(false); }} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "8px 14px", background: "none",
                  border: "none", cursor: "pointer", fontSize: 13, color: "#c23934",
                  fontFamily: "inherit", textAlign: "left",
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fff0f0"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Title ── */}
        <div style={{ marginBottom: totalSubs > 0 ? 10 : 0 }}>
          {editingTitle ? (
            <input
              ref={titleRef}
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); } }}
              style={{
                width: "100%", fontSize: 14, fontWeight: 700, color: "#082d1d",
                border: "none", borderBottom: "2px solid #059669",
                background: "transparent", outline: "none", fontFamily: "inherit",
                letterSpacing: "-0.01em", lineHeight: 1.3,
              }}
            />
          ) : (
            <p
              onClick={() => setEditingTitle(true)}
              style={{
                fontSize: 14, fontWeight: 700, color: "#082d1d",
                margin: 0, lineHeight: 1.35, letterSpacing: "-0.01em",
                cursor: "text",
              }}
            >
              {task.title}
            </p>
          )}
        </div>

        {/* ── Nudge ── */}
        {isNudged && (
          <div style={{ marginBottom: 12 }}>
            <NudgeBanner task={task} onDefer={onDefer ? d => onDefer(task.id, d) : undefined} onMarkDone={onMarkDone ? handleMarkDone : undefined} />
          </div>
        )}

        {/* ── Subtasks ── */}
        {totalSubs > 0 && (
          <div style={{ marginBottom: 14 }}>
            {/* Segmented progress bar */}
            {/* Segmented progress bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 8 }}>
              {task.subtasks.map((sub, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: sub.isCompleted ? "#059669" : "#e9ede9", transition: "background 0.2s" }} />
              ))}
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#059669", marginLeft: 6, flexShrink: 0 }}>
                {completedSubs}/{totalSubs}
              </span>
            </div>

            {/* Subtask list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {task.subtasks.map(sub => (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)}
                    style={{
                      width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                      cursor: sub.isCompleted ? "default" : "pointer",
                      background: sub.isCompleted ? "#059669" : "#fff",
                      border: `1.5px solid ${sub.isCompleted ? "#059669" : "#dde4de"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {sub.isCompleted && <Check size={8} color="#fff" strokeWidth={3} />}
                  </button>
                  <span style={{
                    fontSize: 12, color: sub.isCompleted ? "#c4cbc2" : "#3d5a4a",
                    textDecoration: sub.isCompleted ? "line-through" : "none",
                    flex: 1,
                  }}>{sub.title}</span>
                  <button onClick={() => onDeleteSubtask?.(sub.id)}
                    style={{ fontSize: 10, color: "#e9ede9", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#c23934"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#e9ede9"}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add subtask */}
        {addingSubtask && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 15, height: 15, borderRadius: 4, border: "1.5px dashed #dde4de", flexShrink: 0 }} />
            <input
              ref={subtaskRef}
              value={subtaskDraft}
              onChange={e => setSubtaskDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submitSubtask(); if (e.key === "Escape") { setSubtaskDraft(""); setAddingSubtask(false); } }}
              onBlur={() => { if (!subtaskDraft.trim()) setAddingSubtask(false); else submitSubtask(); }}
              placeholder="Add subtask…"
              style={{ flex: 1, fontSize: 12, color: "#082d1d", background: "transparent", border: "none", borderBottom: "1px solid #059669", outline: "none", fontFamily: "inherit" }}
            />
          </div>
        )}

        {/* ── Bottom row: date + quick actions ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 8, borderTop: "1px solid #f1f3ef",
          marginTop: 4,
        }}>
          {/* Due date */}
          <div>
            {editingDue ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="date" value={dateDraft} onChange={e => setDateDraft(e.target.value)}
                  style={{ fontSize: 11, border: "1px solid #dde4de", borderRadius: 6, padding: "3px 8px", outline: "none", fontFamily: "inherit" }} />
                <input type="time" value={timeDraft} onChange={e => setTimeDraft(e.target.value)} disabled={!dateDraft}
                  style={{ fontSize: 11, border: "1px solid #dde4de", borderRadius: 6, padding: "3px 8px", outline: "none", fontFamily: "inherit" }} />
                <button onClick={commitDue} style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "none", border: "none", cursor: "pointer" }}>Save</button>
                <button onClick={() => { setDateDraft(isoDate); setTimeDraft(isoTime); setEditingDue(false); }} style={{ fontSize: 11, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setEditingDue(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: dueLabel ? (overdue ? "#FFF0EC" : "#f8f9f5") : "transparent",
                  border: "none", borderRadius: 8, padding: dueLabel ? "5px 10px" : 0,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Calendar size={13} color={overdue ? "#D14626" : "#c4cbc2"} />
                <span style={{
                  fontSize: 12.5, fontWeight: 500,
                  color: overdue ? "#D14626" : dueLabel ? "#4a6d47" : "#c4cbc2",
                }}>
                  {dueLabel ?? "Set due date"}
                </span>
              </button>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={handleMarkDone} title="Mark done" style={{
              width: 26, height: 26, borderRadius: 7, border: "1px solid #e9ede9",
              background: "#fff", color: "#059669", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#059669"; (e.currentTarget as HTMLElement).style.borderColor = "#059669"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "#e9ede9"; (e.currentTarget as HTMLElement).style.color = "#059669"; }}
            ><Check size={12} strokeWidth={2.5} /></button>
            {onDefer && (
              <button onClick={() => setDeferOpen(true)} title="Push task" style={{
                width: 26, height: 26, borderRadius: 7, border: "1px solid #e9ede9",
                background: "#fff", color: "#4a6d47", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f2fdec"; (e.currentTarget as HTMLElement).style.borderColor = "#c8f7ae"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "#e9ede9"; }}
              ><ArrowRight size={12} strokeWidth={2} /></button>
            )}
          </div>
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

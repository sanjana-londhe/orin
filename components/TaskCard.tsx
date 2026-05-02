"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { EmotionalStatePicker, type EmotionalState } from "@/components/EmotionalStatePicker";
import { DeferralModal } from "@/components/DeferralModal";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { getEmotion } from "@/lib/emotions";
import {
  Calendar, Check, Trash2, Clock,
  ChevronRight, ChevronDown, MoreHorizontal, Plus, X,
} from "lucide-react";

function formatDue(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const d   = new Date(dueAt);
  const now = new Date();
  const isToday    = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const overdue    = d < now && !isToday;
  const dateLabel  = isToday ? "Today"
    : isTomorrow   ? "Tomorrow"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeLabel  = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return { dateLabel, timeLabel, overdue, isoDate: d.toISOString().slice(0, 10), isoTime: d.toISOString().slice(11, 16) };
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
  const em       = getEmotion(task.emotionalState);
  const due      = formatDue(task.dueAt);

  const [done, setDone]                     = useState(false);
  const [expanded, setExpanded]             = useState(false);
  const [deferOpen, setDeferOpen]           = useState(false);
  const [editingTitle, setEditingTitle]     = useState(false);
  const [titleDraft, setTitleDraft]         = useState(task.title);
  const [editingEmotion, setEditingEmotion] = useState(false);
  const [editingDue, setEditingDue]         = useState(false);
  const [dateDraft, setDateDraft]           = useState(due?.isoDate ?? "");
  const [timeDraft, setTimeDraft]           = useState(due?.isoTime ?? "");
  const [showMenu, setShowMenu]             = useState(false);
  const [subtaskInput, setSubtaskInput]     = useState("");
  const [showSubInput, setShowSubInput]     = useState(false);

  const menuRef    = useRef<HTMLDivElement>(null);
  const titleRef   = useRef<HTMLInputElement>(null);
  const subRef     = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);
  useEffect(() => { if (showSubInput) subRef.current?.focus(); }, [showSubInput]);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
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

  function addSubtask() {
    const t = subtaskInput.trim();
    if (t) { onAddSubtask?.(task.id, t); }
    setSubtaskInput(""); setShowSubInput(false);
  }

  function handleMarkDone() { setDone(true); onMarkDone?.(task.id); }
  if (done) return null;

  const completedSubs = task.subtasks.filter(s => s.isCompleted).length;
  const totalSubs     = task.subtasks.length;
  const hasSubs       = totalSubs > 0;

  return (
    <>
      <div style={{
        background: "#fff",
        borderRadius: 10,
        border: "1px solid #e8ece8",
        marginBottom: 6,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.15s",
        overflow: "hidden",
      }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 3px 10px rgba(0,0,0,0.07)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"}
      >
        {/* ── Main row ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px",
        }}>

          {/* Emotion emoji + expand chevron */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => setEditingEmotion(true)}
              title={em.label}
              style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}
            >
              {em.emoji}
            </button>
            {hasSubs && (
              <button
                onClick={() => setExpanded(e => !e)}
                style={{
                  width: 18, height: 18, display: "flex", alignItems: "center",
                  justifyContent: "center", background: "none", border: "none",
                  cursor: "pointer", color: "#94a3a0", borderRadius: 4,
                }}
              >
                {expanded
                  ? <ChevronDown size={13} strokeWidth={2} />
                  : <ChevronRight size={13} strokeWidth={2} />}
              </button>
            )}
          </div>

          {/* Title */}
          {editingTitle ? (
            <input
              ref={titleRef}
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); } }}
              style={{
                flex: 1, fontSize: 14, fontWeight: 500, color: "#082d1d",
                border: "none", borderBottom: "1.5px solid #059669",
                background: "transparent", outline: "none", fontFamily: "inherit",
              }}
            />
          ) : (
            <span
              onClick={() => setEditingTitle(true)}
              style={{
                flex: 1, fontSize: 14, fontWeight: 500,
                color: "#1a2e1a", cursor: "text", lineHeight: 1.4,
                minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {task.title}
            </span>
          )}

          {/* Subtask count badge */}
          {hasSubs && !expanded && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
              background: completedSubs === totalSubs ? "#f2fdec" : "#f1f3ef",
              color: completedSubs === totalSubs ? "#059669" : "#4a6d47",
              flexShrink: 0,
            }}>
              {completedSubs}/{totalSubs}
            </span>
          )}

          {/* Due date */}
          {editingDue ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <input type="date" value={dateDraft} onChange={e => setDateDraft(e.target.value)}
                style={{ fontSize: 11, border: "1px solid #dde4de", borderRadius: 5, padding: "2px 6px", outline: "none", fontFamily: "inherit" }} />
              <input type="time" value={timeDraft} onChange={e => setTimeDraft(e.target.value)} disabled={!dateDraft}
                style={{ fontSize: 11, border: "1px solid #dde4de", borderRadius: 5, padding: "2px 6px", outline: "none", fontFamily: "inherit" }} />
              <button onClick={commitDue} style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "none", border: "none", cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditingDue(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c4cbc2" }}><X size={12} /></button>
            </div>
          ) : (
            <button
              onClick={() => setEditingDue(true)}
              style={{
                display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                color: due?.overdue ? "#D14626" : "#94a3a0",
              }}
            >
              <Calendar size={13} />
              {due ? (
                <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                  {due.dateLabel}, {due.timeLabel}
                </span>
              ) : (
                <span style={{ fontSize: 12, color: "#c4cbc2" }}>Set date</span>
              )}
            </button>
          )}

          {/* Actions: ✓ + ⋯ */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <button
              onClick={handleMarkDone}
              title="Complete"
              style={{
                width: 28, height: 28, borderRadius: 7, border: "none",
                background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#c4cbc2", transition: "all 0.12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f2fdec"; (e.currentTarget as HTMLElement).style.color = "#059669"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#c4cbc2"; }}
            >
              <Check size={15} strokeWidth={2.5} />
            </button>

            <div ref={menuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowMenu(o => !o)}
                style={{
                  width: 28, height: 28, borderRadius: 7, border: "none",
                  background: showMenu ? "#f1f3ef" : "transparent", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#94a3a0", transition: "all 0.12s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f1f3ef"; (e.currentTarget as HTMLElement).style.color = "#4a6d47"; }}
                onMouseLeave={e => { if (!showMenu) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#94a3a0"; } }}
              >
                <MoreHorizontal size={15} />
              </button>

              {showMenu && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50,
                  background: "#fff", border: "1px solid #e8ece8", borderRadius: 10,
                  padding: "4px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", minWidth: 148,
                }}>
                  {[
                    { icon: <Check size={13} />, label: "Mark done",  color: "#059669", hover: "#f2fdec", action: () => { handleMarkDone(); setShowMenu(false); } },
                    { icon: <Clock size={13} />,  label: "Push task",  color: "#4a6d47", hover: "#f8f9f5", action: () => { setDeferOpen(true); setShowMenu(false); } },
                    { icon: <Trash2 size={13} />, label: "Delete",     color: "#c23934", hover: "#fff0f0", action: () => { onDelete?.(task.id); setShowMenu(false); } },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} style={{
                      display: "flex", alignItems: "center", gap: 9, width: "100%",
                      padding: "8px 14px", background: "none", border: "none",
                      cursor: "pointer", fontSize: 13, color: item.color,
                      fontFamily: "inherit", textAlign: "left",
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = item.hover}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
                    >{item.icon}{item.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Nudge ── */}
        {isNudged && (
          <div style={{ padding: "0 14px 10px" }}>
            <NudgeBanner task={task} onDefer={onDefer ? d => onDefer(task.id, d) : undefined} onMarkDone={onMarkDone ? handleMarkDone : undefined} />
          </div>
        )}

        {/* ── Expanded: subtasks ── */}
        {expanded && (
          <div style={{ borderTop: "1px solid #f0f4f0", padding: "10px 14px 12px", background: "#fafcfa" }}>
            {/* Emotion picker (if editing) */}
            {editingEmotion && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <EmotionalStatePicker
                  value={task.emotionalState as EmotionalState}
                  compact
                  onChange={v => { if (v !== task.emotionalState) onUpdate?.(task.id, { emotionalState: v }); setEditingEmotion(false); }}
                />
                <button onClick={() => setEditingEmotion(false)} style={{ fontSize: 10, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </div>
            )}

            {/* Progress bar */}
            {hasSubs && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <div style={{ flex: 1, height: 3, background: "#e8ece8", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 999, background: "#059669", width: `${totalSubs ? (completedSubs / totalSubs) * 100 : 0}%`, transition: "width 0.3s" }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", flexShrink: 0 }}>{completedSubs}/{totalSubs}</span>
              </div>
            )}

            {/* Subtask list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 4 }}>
              {task.subtasks.map(sub => (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 9 }}
                  onMouseEnter={e => { const btn = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(".del-btn"); if (btn) btn.style.opacity = "1"; }}
                  onMouseLeave={e => { const btn = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(".del-btn"); if (btn) btn.style.opacity = "0"; }}
                >
                  <button
                    onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)}
                    style={{
                      width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                      cursor: sub.isCompleted ? "default" : "pointer",
                      background: sub.isCompleted ? "#059669" : "#fff",
                      border: `1.5px solid ${sub.isCompleted ? "#059669" : "#c8d5cc"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {sub.isCompleted && <Check size={9} color="#fff" strokeWidth={3} />}
                  </button>
                  <span style={{
                    flex: 1, fontSize: 13, color: sub.isCompleted ? "#b0c0b8" : "#3d5a4a",
                    textDecoration: sub.isCompleted ? "line-through" : "none",
                  }}>{sub.title}</span>
                  <button
                    className="del-btn"
                    onClick={() => onDeleteSubtask?.(sub.id)}
                    style={{ opacity: 0, background: "none", border: "none", cursor: "pointer", padding: 2, color: "#c23934", transition: "opacity 0.15s", borderRadius: 4 }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}

              {/* Add subtask */}
              {showSubInput ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                  <div style={{ width: 15, height: 15, borderRadius: 4, border: "1.5px dashed #c8d5cc", flexShrink: 0 }} />
                  <input
                    ref={subRef}
                    value={subtaskInput}
                    onChange={e => setSubtaskInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addSubtask(); if (e.key === "Escape") { setSubtaskInput(""); setShowSubInput(false); } }}
                    onBlur={() => { if (!subtaskInput.trim()) setShowSubInput(false); else addSubtask(); }}
                    placeholder="Enter subtask…"
                    style={{ flex: 1, fontSize: 13, color: "#082d1d", background: "transparent", border: "none", borderBottom: "1px solid #059669", outline: "none", fontFamily: "inherit" }}
                  />
                  <button onClick={addSubtask} style={{ background: "#059669", border: "none", borderRadius: 5, padding: "3px 5px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <Check size={11} color="#fff" strokeWidth={3} />
                  </button>
                  <button onClick={() => { setSubtaskInput(""); setShowSubInput(false); }} style={{ background: "#f1f3ef", border: "none", borderRadius: 5, padding: "3px 5px", cursor: "pointer", display: "flex", alignItems: "center", color: "#4a6d47" }}>
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSubInput(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, marginTop: 2,
                    width: "100%", padding: "5px 0", background: "none", border: "none",
                    cursor: "pointer", fontSize: 12.5, color: "#94a3a0", fontFamily: "inherit",
                    transition: "color 0.12s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#059669"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#94a3a0"; }}
                >
                  <Plus size={13} strokeWidth={2} /> Add subtask
                </button>
              )}
            </div>

            {/* Badges row */}
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              <button onClick={() => setEditingEmotion(true)} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 9px", borderRadius: 6,
                background: em.pillBg, color: em.pillText,
                border: "none", fontSize: 11.5, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                {em.emoji} {em.label}
              </button>
              {task.deferredCount > 0 && (
                <span style={{ padding: "3px 8px", borderRadius: 6, background: "#FFF0EC", color: "#D14626", fontSize: 11, fontWeight: 600 }}>
                  Deferred {task.deferredCount}×
                </span>
              )}
            </div>
          </div>
        )}

        {/* Emotion picker when collapsed */}
        {!expanded && editingEmotion && (
          <div style={{ padding: "6px 14px 10px", borderTop: "1px solid #f0f4f0", display: "flex", alignItems: "center", gap: 8 }}>
            <EmotionalStatePicker
              value={task.emotionalState as EmotionalState}
              compact
              onChange={v => { if (v !== task.emotionalState) onUpdate?.(task.id, { emotionalState: v }); setEditingEmotion(false); }}
            />
            <button onClick={() => setEditingEmotion(false)} style={{ fontSize: 10, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>✕</button>
          </div>
        )}
      </div>

      {onDefer && (
        <DeferralModal open={deferOpen} onOpenChange={setDeferOpen} task={task} onConfirm={d => onDefer(task.id, d)} />
      )}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

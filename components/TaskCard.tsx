"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { EmotionalStatePicker, type EmotionalState } from "@/components/EmotionalStatePicker";
import { DeferralModal } from "@/components/DeferralModal";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { getEmotion } from "@/lib/emotions";
import { Calendar, Check, Trash2, Clock, ChevronDown, MoreHorizontal, Plus, X } from "lucide-react";

function formatDue(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const d   = new Date(dueAt);
  const now = new Date();
  const overdue    = d < now;
  const isToday    = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const label = isToday ? "Today"
    : isTomorrow ? "Tomorrow"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time  = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return { label, time, overdue, isoDate: d.toISOString().slice(0, 10), isoTime: d.toISOString().slice(11, 16) };
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

  const [done, setDone]                 = useState(false);
  const [expanded, setExpanded]         = useState(false);
  const [deferOpen, setDeferOpen]       = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft]     = useState(task.title);
  const [editEmotion, setEditEmotion]   = useState(false);
  const [editDue, setEditDue]           = useState(false);
  const [dateDraft, setDateDraft]       = useState(due?.isoDate ?? "");
  const [timeDraft, setTimeDraft]       = useState(due?.isoTime ?? "");
  const [showMenu, setShowMenu]         = useState(false);
  const [subInput, setSubInput]         = useState("");
  const [showSubInput, setShowSubInput] = useState(false);

  const menuRef  = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const subRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);
  useEffect(() => { if (showSubInput) subRef.current?.focus(); }, [showSubInput]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
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
    setEditDue(false);
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
      <div style={{
        background: "#fff",
        borderRadius: 14,
        border: "1.5px solid #e8ece8",
        marginBottom: 8,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.09)"; (e.currentTarget as HTMLElement).style.borderColor = "#c8d5cc"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "#e8ece8"; }}
      >
        {/* Coloured top accent bar */}
        <div style={{ height: 4, background: em.strip, width: "100%" }} />

        {/* Card body */}
        <div style={{ padding: "14px 16px 12px" }}>

          {/* Row 1: emotion badge + title + menu */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>

            {/* Emotion badge */}
            {editEmotion ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <EmotionalStatePicker value={task.emotionalState as EmotionalState} compact
                  onChange={v => { if (v !== task.emotionalState) onUpdate?.(task.id, { emotionalState: v }); setEditEmotion(false); }} />
                <button onClick={() => setEditEmotion(false)} style={{ fontSize: 10, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setEditEmotion(true)} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 999,
                background: em.pillBg, color: em.pillText,
                border: `1.5px solid ${em.pillBg}`,
                fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
              }}>
                <span style={{ fontSize: 14 }}>{em.emoji}</span> {em.label}
              </button>
            )}

            {/* Title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {editingTitle ? (
                <input ref={titleRef} value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); } }}
                  style={{ width: "100%", fontSize: 15, fontWeight: 700, color: "#082d1d", border: "none", borderBottom: "2px solid #059669", background: "transparent", outline: "none", fontFamily: "inherit" }}
                />
              ) : (
                <p onClick={() => setEditingTitle(true)} style={{
                  fontSize: 15, fontWeight: 700, color: "#0f2419",
                  margin: 0, lineHeight: 1.35, cursor: "text",
                  letterSpacing: "-0.01em",
                }}>{task.title}</p>
              )}

              {/* Extra badges row */}
              {(task.deferredCount > 0 || task.recurrenceRule) && (
                <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                  {task.deferredCount > 0 && (
                    <span style={{ padding: "2px 8px", borderRadius: 999, background: "#FFF0EC", color: "#D14626", fontSize: 11, fontWeight: 600 }}>
                      Deferred {task.deferredCount}×
                    </span>
                  )}
                  {task.recurrenceRule && (
                    <span style={{ padding: "2px 8px", borderRadius: 999, background: "#F0F0FF", color: "#5555CC", fontSize: 11, fontWeight: 600 }}>↺ Recurring</span>
                  )}
                </div>
              )}
            </div>

            {/* ⋯ menu */}
            <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
              <button onClick={() => setShowMenu(o => !o)} style={{
                width: 28, height: 28, borderRadius: 8, border: "1px solid transparent",
                background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#aab8b2",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f1f3ef"; (e.currentTarget as HTMLElement).style.color = "#4a6d47"; }}
                onMouseLeave={e => { if (!showMenu) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#aab8b2"; } }}
              >
                <MoreHorizontal size={15} />
              </button>
              {showMenu && (
                <div style={{
                  position: "absolute", right: 0, top: 32, zIndex: 50,
                  background: "#fff", border: "1px solid #e8ece8", borderRadius: 10,
                  padding: "4px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", minWidth: 150,
                }}>
                  {[
                    { icon: <Check size={13} />, label: "Mark done",  fg: "#059669", bg: "#f2fdec", fn: () => { handleDone(); setShowMenu(false); } },
                    { icon: <Clock size={13} />, label: "Push task",  fg: "#4a6d47", bg: "#f8f9f5", fn: () => { setDeferOpen(true); setShowMenu(false); } },
                    { icon: <Trash2 size={13} />,label: "Delete",     fg: "#c23934", bg: "#fff0f0", fn: () => { onDelete?.(task.id); setShowMenu(false); } },
                  ].map(item => (
                    <button key={item.label} onClick={item.fn} style={{
                      display: "flex", alignItems: "center", gap: 9, width: "100%",
                      padding: "9px 14px", background: "none", border: "none",
                      cursor: "pointer", fontSize: 13, color: item.fg, fontFamily: "inherit",
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = item.bg}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
                    >{item.icon} {item.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nudge */}
          {isNudged && (
            <div style={{ marginBottom: 10 }}>
              <NudgeBanner task={task} onDefer={onDefer ? d => onDefer(task.id, d) : undefined} onMarkDone={onMarkDone ? handleDone : undefined} />
            </div>
          )}

          {/* Subtask progress bar */}
          {totalSubs > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#aab8b2", textTransform: "uppercase", letterSpacing: "0.05em" }}>Sub tasks</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex", gap: 3 }}>
                    {task.subtasks.map((s, i) => (
                      <div key={i} style={{ width: 18, height: 4, borderRadius: 999, background: s.isCompleted ? em.strip : "#e8ece8", transition: "background 0.2s" }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: em.pillText }}>{completedSubs}/{totalSubs}</span>
                </div>
              </div>

              {/* Subtask rows — always visible */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {task.subtasks.map(sub => (
                  <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 9 }}
                    onMouseEnter={e => { const b = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(".sub-del"); if (b) b.style.opacity = "1"; }}
                    onMouseLeave={e => { const b = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(".sub-del"); if (b) b.style.opacity = "0"; }}
                  >
                    <button onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)} style={{
                      width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                      cursor: sub.isCompleted ? "default" : "pointer",
                      background: sub.isCompleted ? em.strip : "#fff",
                      border: `2px solid ${sub.isCompleted ? em.strip : "#c8d5cc"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                    }}>
                      {sub.isCompleted && <Check size={9} color="#fff" strokeWidth={3} />}
                    </button>
                    <span style={{ flex: 1, fontSize: 13, color: sub.isCompleted ? "#b0c0b8" : "#2d4a3a", textDecoration: sub.isCompleted ? "line-through" : "none" }}>
                      {sub.title}
                    </span>
                    <button className="sub-del" onClick={() => onDeleteSubtask?.(sub.id)}
                      style={{ opacity: 0, background: "none", border: "none", cursor: "pointer", color: "#c23934", transition: "opacity 0.15s", padding: 2, borderRadius: 4 }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add subtask */}
          {showSubInput ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 16, height: 16, borderRadius: 5, border: "2px dashed #c8d5cc", flexShrink: 0 }} />
              <input ref={subRef} value={subInput} onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addSubtask(); if (e.key === "Escape") { setSubInput(""); setShowSubInput(false); } }}
                onBlur={() => { if (!subInput.trim()) setShowSubInput(false); else addSubtask(); }}
                placeholder="Add subtask…"
                style={{ flex: 1, fontSize: 13, color: "#082d1d", background: "transparent", border: "none", borderBottom: "1px solid #059669", outline: "none", fontFamily: "inherit" }}
              />
              <button onClick={addSubtask} style={{ background: "#059669", border: "none", borderRadius: 5, padding: "3px 6px", cursor: "pointer", display: "flex" }}>
                <Check size={11} color="#fff" strokeWidth={3} />
              </button>
              <button onClick={() => { setSubInput(""); setShowSubInput(false); }} style={{ background: "#f1f3ef", border: "none", borderRadius: 5, padding: "3px 6px", cursor: "pointer", display: "flex", color: "#4a6d47" }}>
                <X size={11} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowSubInput(true)} style={{
              display: "flex", alignItems: "center", gap: 5, marginBottom: 10,
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: "#c4cbc2", fontFamily: "inherit", padding: 0,
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#059669"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#c4cbc2"}
            >
              <Plus size={12} strokeWidth={2} /> Add subtask
            </button>
          )}

          {/* Footer: due date + quick actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #f0f4f0" }}>

            {/* Due date */}
            {editDue ? (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <input type="date" value={dateDraft} onChange={e => setDateDraft(e.target.value)}
                  style={{ fontSize: 11, border: "1px solid #dde4de", borderRadius: 5, padding: "2px 6px", outline: "none", fontFamily: "inherit" }} />
                <input type="time" value={timeDraft} onChange={e => setTimeDraft(e.target.value)} disabled={!dateDraft}
                  style={{ fontSize: 11, border: "1px solid #dde4de", borderRadius: 5, padding: "2px 6px", outline: "none", fontFamily: "inherit" }} />
                <button onClick={commitDue} style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "none", border: "none", cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditDue(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c4cbc2" }}><X size={11} /></button>
              </div>
            ) : (
              <button onClick={() => setEditDue(true)} style={{
                display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
                cursor: "pointer", fontFamily: "inherit", padding: 0,
              }}>
                <Calendar size={13} color={due?.overdue ? "#D14626" : "#aab8b2"} />
                <span style={{ fontSize: 12.5, color: due?.overdue ? "#D14626" : due ? "#4a6d47" : "#c4cbc2", fontWeight: due ? 500 : 400 }}>
                  {due ? `${due.label}, ${due.time}` : "Set due date"}
                </span>
              </button>
            )}

            {/* Quick actions */}
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={handleDone} title="Mark done" style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 12px", borderRadius: 8,
                border: "1.5px solid #e8ece8", background: "#fff",
                color: "#059669", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#059669"; (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "#059669"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#059669"; (e.currentTarget as HTMLElement).style.borderColor = "#e8ece8"; }}
              >
                <Check size={12} strokeWidth={2.5} /> Done
              </button>
              {onDefer && (
                <button onClick={() => setDeferOpen(true)} title="Push task" style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 12px", borderRadius: 8,
                  border: "1.5px solid #e8ece8", background: "#fff",
                  color: "#4a6d47", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f2fdec"; (e.currentTarget as HTMLElement).style.borderColor = "#c8f7ae"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "#e8ece8"; }}
                >
                  <Clock size={12} strokeWidth={2} /> Push
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {onDefer && (
        <DeferralModal open={deferOpen} onOpenChange={setDeferOpen} task={task} onConfirm={d => onDefer(task.id, d)} />
      )}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

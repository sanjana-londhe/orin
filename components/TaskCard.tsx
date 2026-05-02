"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { EmotionalStatePicker, type EmotionalState } from "@/components/EmotionalStatePicker";
import { DeferralModal } from "@/components/DeferralModal";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { getEmotion } from "@/lib/emotions";
import { Calendar, ArrowRight, Check, MoreHorizontal, Trash2 } from "lucide-react";

function formatDue(dueAt: Date | string | null) {
  if (!dueAt) return { label: null, overdue: false, isoDate: "", isoTime: "" };
  const d   = new Date(dueAt);
  const now = new Date();
  const overdue    = d < now;
  const isToday    = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const label = isToday
    ? `Today · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : isTomorrow ? "Tomorrow"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  const isNudged       = nudgedTaskIds.has(task.id);
  const em             = getEmotion(task.emotionalState);
  const { label: dueLabel, overdue, isoDate, isoTime } = formatDue(task.dueAt);
  const recur          = recurrenceLabel(task.recurrenceRule);
  const completedSubs  = task.subtasks.filter(s => s.isCompleted).length;
  const totalSubs      = task.subtasks.length;

  const [done, setDone]               = useState(false);
  const [deferOpen, setDeferOpen]     = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft]   = useState(task.title);
  const [editingState, setEditingState] = useState(false);
  const [editingDue, setEditingDue]   = useState(false);
  const [dateDraft, setDateDraft]     = useState(isoDate);
  const [timeDraft, setTimeDraft]     = useState(isoTime);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskDraft, setSubtaskDraft]   = useState("");
  const [menuOpen, setMenuOpen]       = useState(false);
  const titleRef   = useRef<HTMLInputElement>(null);
  const subtaskRef = useRef<HTMLInputElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);

  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);
  useEffect(() => { if (addingSubtask) subtaskRef.current?.focus(); }, [addingSubtask]);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
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

  function submitSubtask() {
    const t = subtaskDraft.trim();
    if (t) onAddSubtask?.(task.id, t);
    setSubtaskDraft(""); setAddingSubtask(false);
  }

  function handleMarkDone() { setDone(true); onMarkDone?.(task.id); }
  if (done) return null;

  return (
    <>
      <div style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e4e8e4",
        marginBottom: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        transition: "box-shadow 0.15s, border-color 0.15s",
        overflow: "hidden",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLElement).style.borderColor = "#c4cbc2"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "#e4e8e4"; }}
      >
        <div style={{ padding: "14px 16px" }}>

          {/* ── Row 1: Title + menu ── */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editingTitle ? (
                <input ref={titleRef} value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); } }}
                  style={{ width: "100%", fontSize: 15, fontWeight: 700, color: "#082d1d", border: "none", borderBottom: "2px solid #059669", background: "transparent", outline: "none", fontFamily: "inherit", letterSpacing: "-0.01em" }}
                />
              ) : (
                <p onClick={() => setEditingTitle(true)} style={{
                  fontSize: 15, fontWeight: 700, color: "#1a2e1a",
                  margin: 0, lineHeight: 1.35, letterSpacing: "-0.01em", cursor: "text",
                }}>
                  {task.title}
                </p>
              )}
            </div>

            {/* ⋯ menu */}
            <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
              <button onClick={() => setMenuOpen(o => !o)} style={{
                width: 26, height: 26, borderRadius: 6, border: "1px solid transparent",
                background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3a0",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f1f3ef"; (e.currentTarget as HTMLElement).style.color = "#4a6d47"; }}
                onMouseLeave={e => { if (!menuOpen) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#94a3a0"; } }}
              >
                <MoreHorizontal size={14} />
              </button>
              {menuOpen && (
                <div style={{
                  position: "absolute", top: 30, right: 0, zIndex: 50,
                  background: "#fff", border: "1px solid #e4e8e4", borderRadius: 10,
                  padding: "4px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", minWidth: 148,
                }}>
                  {[
                    { icon: <Check size={12} />, label: "Mark done",  color: "#059669", bg: "#f2fdec", action: () => { handleMarkDone(); setMenuOpen(false); } },
                    { icon: <ArrowRight size={12} />, label: "Push task", color: "#4a6d47", bg: "#f8f9f5", action: () => { setDeferOpen(true); setMenuOpen(false); } },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "8px 14px", background: "none", border: "none",
                      cursor: "pointer", fontSize: 13, color: item.color, fontFamily: "inherit", textAlign: "left",
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = item.bg}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
                    >{item.icon} {item.label}</button>
                  ))}
                  <div style={{ height: 1, background: "#f1f3ef", margin: "4px 0" }} />
                  <button onClick={() => { onDelete?.(task.id); setMenuOpen(false); }} style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "8px 14px", background: "none", border: "none",
                    cursor: "pointer", fontSize: 13, color: "#c23934", fontFamily: "inherit", textAlign: "left",
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fff0f0"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
                  ><Trash2 size={12} /> Delete</button>
                </div>
              )}
            </div>
          </div>

          {/* Nudge */}
          {isNudged && (
            <div style={{ marginBottom: 10 }}>
              <NudgeBanner task={task} onDefer={onDefer ? d => onDefer(task.id, d) : undefined} onMarkDone={onMarkDone ? handleMarkDone : undefined} />
            </div>
          )}

          {/* ── Subtasks ── */}
          {totalSubs > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3a0", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                  Sub tasks
                </p>
                {/* Segmented bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  {task.subtasks.map((sub, i) => (
                    <div key={i} style={{ width: 16, height: 3, borderRadius: 999, background: sub.isCompleted ? "#059669" : "#e4e8e4", transition: "background 0.2s" }} />
                  ))}
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#059669", marginLeft: 5 }}>{completedSubs}/{totalSubs}</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {task.subtasks.map(sub => (
                  <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      onClick={() => !sub.isCompleted && onCompleteSubtask?.(sub.id)}
                      style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
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
                      fontSize: 13, color: sub.isCompleted ? "#b0c0b8" : "#2d4a3a",
                      textDecoration: sub.isCompleted ? "line-through" : "none", flex: 1,
                    }}>
                      {sub.title}
                    </span>
                    <button onClick={() => onDeleteSubtask?.(sub.id)}
                      style={{ fontSize: 10, color: "#dde4de", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#c23934"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#dde4de"}
                    >✕</button>
                  </div>
                ))}
              </div>

              {addingSubtask ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: "1.5px dashed #c8d5cc", flexShrink: 0 }} />
                  <input ref={subtaskRef} value={subtaskDraft} onChange={e => setSubtaskDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") submitSubtask(); if (e.key === "Escape") { setSubtaskDraft(""); setAddingSubtask(false); } }}
                    onBlur={() => { if (!subtaskDraft.trim()) setAddingSubtask(false); else submitSubtask(); }}
                    placeholder="Add subtask…"
                    style={{ flex: 1, fontSize: 13, color: "#082d1d", background: "transparent", border: "none", borderBottom: "1px solid #059669", outline: "none", fontFamily: "inherit" }}
                  />
                </div>
              ) : (
                <button onClick={() => setAddingSubtask(true)}
                  style={{ fontSize: 12, color: "#b0c0b8", background: "none", border: "none", cursor: "pointer", marginTop: 5, padding: 0, fontFamily: "inherit" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#4a6d47"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#b0c0b8"}
                >+ Add subtask</button>
              )}
            </div>
          )}

          {!totalSubs && !addingSubtask && (
            <button onClick={() => setAddingSubtask(true)}
              style={{ fontSize: 12, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer", marginBottom: 10, padding: 0, fontFamily: "inherit", display: "block" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#4a6d47"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#c4cbc2"}
            >+ Add subtask</button>
          )}
          {!totalSubs && addingSubtask && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, border: "1.5px dashed #c8d5cc", flexShrink: 0 }} />
              <input ref={subtaskRef} value={subtaskDraft} onChange={e => setSubtaskDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitSubtask(); if (e.key === "Escape") { setSubtaskDraft(""); setAddingSubtask(false); } }}
                onBlur={() => { if (!subtaskDraft.trim()) setAddingSubtask(false); else submitSubtask(); }}
                placeholder="Add subtask…"
                style={{ flex: 1, fontSize: 13, color: "#082d1d", background: "transparent", border: "none", borderBottom: "1px solid #059669", outline: "none", fontFamily: "inherit" }}
              />
            </div>
          )}
        </div>

        {/* ── Footer: emotion tag + due date + actions ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 16px",
          borderTop: "1px solid #f0f4f0",
          background: "#fafcfa",
        }}>
          {/* Left: emotion tag + badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {editingState ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <EmotionalStatePicker value={task.emotionalState as EmotionalState} compact
                  onChange={v => { if (v !== task.emotionalState) onUpdate?.(task.id, { emotionalState: v }); setEditingState(false); }} />
                <button onClick={() => setEditingState(false)} style={{ fontSize: 10, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setEditingState(true)} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 9px", borderRadius: 6,
                background: em.pillBg, color: em.pillText,
                border: "none", fontSize: 11.5, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                {em.emoji} {em.label}
              </button>
            )}
            {task.deferredCount > 0 && (
              <span style={{ padding: "3px 8px", borderRadius: 6, background: "#FFF0EC", color: "#D14626", fontSize: 11, fontWeight: 600 }}>
                Deferred {task.deferredCount}×
              </span>
            )}
            {recur && (
              <span style={{ padding: "3px 8px", borderRadius: 6, background: "#F0F0FF", color: "#5555CC", fontSize: 11, fontWeight: 600 }}>
                ↺ {recur}
              </span>
            )}
          </div>

          {/* Right: due date + quick actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {editingDue ? (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <input type="date" value={dateDraft} onChange={e => setDateDraft(e.target.value)}
                  style={{ fontSize: 11, border: "1px solid #dde4de", borderRadius: 5, padding: "2px 6px", outline: "none", fontFamily: "inherit" }} />
                <input type="time" value={timeDraft} onChange={e => setTimeDraft(e.target.value)} disabled={!dateDraft}
                  style={{ fontSize: 11, border: "1px solid #dde4de", borderRadius: 5, padding: "2px 6px", outline: "none", fontFamily: "inherit" }} />
                <button onClick={commitDue} style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "none", border: "none", cursor: "pointer" }}>Save</button>
                <button onClick={() => { setDateDraft(isoDate); setTimeDraft(isoTime); setEditingDue(false); }} style={{ fontSize: 11, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setEditingDue(true)} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: dueLabel ? "3px 8px" : "3px 4px", borderRadius: 6,
                background: overdue ? "#FFF0EC" : dueLabel ? "#f1f3ef" : "transparent",
                border: "none", cursor: "pointer", fontFamily: "inherit",
              }}>
                <Calendar size={12} color={overdue ? "#D14626" : "#94a3a0"} />
                <span style={{ fontSize: 11.5, color: overdue ? "#D14626" : dueLabel ? "#4a6d47" : "#b0c0b8", fontWeight: 500 }}>
                  {dueLabel ?? "Due date"}
                </span>
              </button>
            )}

            <button onClick={handleMarkDone} title="Mark done" style={{
              width: 26, height: 26, borderRadius: 7, border: "1.5px solid #e4e8e4",
              background: "#fff", color: "#059669", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#059669"; (e.currentTarget as HTMLElement).style.borderColor = "#059669"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "#e4e8e4"; (e.currentTarget as HTMLElement).style.color = "#059669"; }}
            ><Check size={12} strokeWidth={2.5} /></button>

            {onDefer && (
              <button onClick={() => setDeferOpen(true)} title="Push task" style={{
                width: 26, height: 26, borderRadius: 7, border: "1.5px solid #e4e8e4",
                background: "#fff", color: "#4a6d47", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f2fdec"; (e.currentTarget as HTMLElement).style.borderColor = "#c8f7ae"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "#e4e8e4"; }}
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

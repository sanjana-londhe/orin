"use client";

import { useState, useRef, useEffect } from "react";
import type { Task } from "@/lib/generated/prisma/client";
import { EmotionalStatePicker, type EmotionalState } from "@/components/EmotionalStatePicker";
import { cn } from "@/lib/utils";

const STATE_CONFIG = {
  DREADING: { strip: "bg-[hsl(var(--emotion-dreading))]", pill: "bg-[hsl(var(--emotion-dreading-bg))] text-[hsl(var(--emotion-dreading-fg))] border border-[hsl(var(--emotion-dreading-border))]", label: "Dreading", emoji: "😮‍💨" },
  ANXIOUS:  { strip: "bg-[hsl(var(--emotion-anxious))]",  pill: "bg-[hsl(var(--emotion-anxious-bg))] text-[hsl(var(--emotion-anxious-fg))] border border-[hsl(var(--emotion-anxious-border))]",  label: "Anxious",  emoji: "😟" },
  NEUTRAL:  { strip: "bg-[hsl(var(--emotion-neutral))]",  pill: "bg-[hsl(var(--emotion-neutral-bg))] text-[hsl(var(--emotion-neutral-fg))] border border-[hsl(var(--emotion-neutral-border))]",  label: "Neutral",  emoji: "😐" },
  WILLING:  { strip: "bg-[hsl(var(--emotion-willing))]",  pill: "bg-[hsl(var(--emotion-willing-bg))] text-[hsl(var(--emotion-willing-fg))] border border-[hsl(var(--emotion-willing-border))]",  label: "Willing",  emoji: "🙂" },
  EXCITED:  { strip: "bg-[hsl(var(--emotion-excited))]",  pill: "bg-[hsl(var(--emotion-excited-bg))] text-[hsl(var(--emotion-excited-fg))] border border-[hsl(var(--emotion-excited-border))]",  label: "Excited",  emoji: "🤩" },
} as const;

function formatDue(dueAt: Date | string | null) {
  if (!dueAt) return { label: "No deadline", overdue: false, isoDate: "", isoTime: "" };
  const d = new Date(dueAt);
  const overdue = d < new Date();
  return {
    label: overdue ? `${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · overdue` : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    overdue,
    isoDate: d.toISOString().slice(0, 10),
    isoTime: d.toISOString().slice(11, 16),
  };
}

interface Props {
  task: Task;
  onMarkDone?: (id: string) => void;
  onDefer?: (id: string) => void;
  onUpdate?: (id: string, patch: Partial<Pick<Task, "title" | "dueAt" | "emotionalState">>) => void;
  onDelete?: (id: string) => void;
}

export function TaskCard({ task, onMarkDone, onDefer, onUpdate, onDelete }: Props) {
  const [done, setDone] = useState(false);
  const state = STATE_CONFIG[task.emotionalState];
  const { label: dueLabel, overdue, isoDate, isoTime } = formatDue(task.dueAt);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [editingDue, setEditingDue] = useState(false);
  const [dateDraft, setDateDraft] = useState(isoDate);
  const [timeDraft, setTimeDraft] = useState(isoTime);
  const [editingState, setEditingState] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);

  function commitTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== task.title) onUpdate?.(task.id, { title: trimmed });
    else setTitleDraft(task.title);
    setEditingTitle(false);
  }

  function commitDue() {
    let dueAt: string | null = null;
    if (dateDraft) {
      dueAt = new Date(`${dateDraft}T${timeDraft || "00:00"}`).toISOString();
    }
    onUpdate?.(task.id, { dueAt: dueAt as unknown as Date });
    setEditingDue(false);
  }

  function commitState(val: EmotionalState) {
    if (val !== task.emotionalState) onUpdate?.(task.id, { emotionalState: val });
    setEditingState(false);
  }

  function handleMarkDone() {
    setDone(true);
    onMarkDone?.(task.id);
  }

  return (
    <article className={cn(
      "rounded-[14px] border border-[var(--stone-400)] bg-white overflow-hidden transition-all",
      done
        ? "opacity-35 pointer-events-none"
        : "hover:-translate-y-px hover:border-[var(--ink)] hover:shadow-[3px_3px_0_var(--ink)]"
    )}>
      <div className={cn("h-[3px] w-full", state.strip)} aria-hidden="true" />

      <div className="px-5 py-4">
        {/* Top row: due date (editable) + emoji */}
        <div className="flex items-start justify-between mb-2.5">
          {editingDue ? (
            <div className="flex items-center gap-1.5">
              <input type="date" value={dateDraft} onChange={e => setDateDraft(e.target.value)}
                className="text-[10px] font-mono border border-[var(--stone-400)] rounded px-1.5 py-0.5 focus:outline-none focus:border-[hsl(var(--primary))]" />
              <input type="time" value={timeDraft} onChange={e => setTimeDraft(e.target.value)}
                disabled={!dateDraft}
                className="text-[10px] font-mono border border-[var(--stone-400)] rounded px-1.5 py-0.5 focus:outline-none focus:border-[hsl(var(--primary))] disabled:opacity-40" />
              <button onClick={commitDue} className="text-[10px] font-bold text-[hsl(var(--primary))]">Save</button>
              <button onClick={() => { setDateDraft(isoDate); setTimeDraft(isoTime); setEditingDue(false); }}
                className="text-[10px] text-[var(--stone-500)]">✕</button>
            </div>
          ) : (
            <button onClick={() => setEditingDue(true)}
              className={cn("font-mono text-[10px] text-left hover:underline decoration-dashed",
                overdue ? "text-[hsl(var(--emotion-dreading-fg))]" : "text-[var(--stone-500)]")}>
              {overdue && <span aria-label="overdue">⚑ </span>}{dueLabel}
            </button>
          )}
          <span className="text-2xl leading-none" aria-hidden="true">{state.emoji}</span>
        </div>

        {/* State pill (click to edit) */}
        <div className="mb-3">
          {editingState ? (
            <div className="space-y-2">
              <EmotionalStatePicker value={task.emotionalState as EmotionalState} onChange={commitState} />
              <button onClick={() => setEditingState(false)} className="text-[10px] text-[var(--stone-500)]">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setEditingState(true)}
              className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold hover:opacity-80 transition-opacity", state.pill)}>
              {state.label}
            </button>
          )}
        </div>

        {/* Title (click to edit, strikethrough when done) */}
        {editingTitle ? (
          <input ref={titleRef} value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); } }}
            className="w-full text-[19px] font-semibold leading-snug tracking-tight text-[var(--lime-ink)] border-b-2 border-[hsl(var(--primary))] bg-transparent outline-none" />
        ) : (
          <h2 onClick={() => !done && setEditingTitle(true)}
            className={cn(
              "text-[19px] font-semibold leading-snug tracking-tight transition-colors",
              done
                ? "line-through text-[var(--stone-500)] font-normal"
                : "text-[var(--lime-ink)] cursor-text hover:text-[hsl(var(--primary))]"
            )}>
            {task.title}
          </h2>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-[var(--stone-300)] bg-[var(--stone-100)] px-5 py-3">
        {done ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--primary))]">
            ✓ Done
          </span>
        ) : (
          <button onClick={handleMarkDone}
            className="inline-flex items-center gap-1.5 rounded-[7px] bg-[hsl(var(--primary))] border border-[var(--ink)] px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:bg-[hsl(var(--primary)/0.9)] hover:shadow-[2px_2px_0_var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2">
            ✓ Mark done
          </button>
        )}
        {onDefer && (
          <button onClick={() => onDefer(task.id)}
            className="inline-flex items-center rounded-[7px] border border-[var(--stone-400)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--stone-500)] transition-all hover:bg-[var(--lime-subtle)] hover:border-[var(--stone-500)] hover:text-[var(--lime-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2">
            Push this →
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          {confirmDelete ? (
            <>
              <span className="text-[11px] text-[hsl(var(--destructive))]">Delete?</span>
              <button onClick={() => onDelete?.(task.id)}
                className="text-[11px] font-bold text-[hsl(var(--destructive))] hover:underline">Yes</button>
              <button onClick={() => setConfirmDelete(false)}
                className="text-[11px] text-[var(--stone-500)] hover:underline">No</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              aria-label="Delete task"
              className="text-[11px] text-[var(--stone-500)] hover:text-[hsl(var(--destructive))] transition-colors px-1">
              ✕
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

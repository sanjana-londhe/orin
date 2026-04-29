"use client";

import type { Task } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

const STATE_CONFIG = {
  DREADING: {
    strip: "bg-[hsl(var(--emotion-dreading))]",
    pill: "bg-[hsl(var(--emotion-dreading-bg))] text-[hsl(var(--emotion-dreading-fg))]",
    label: "Dreading",
    emoji: "😮‍💨",
  },
  ANXIOUS: {
    strip: "bg-[hsl(var(--emotion-anxious))]",
    pill: "bg-[hsl(var(--emotion-anxious-bg))] text-[hsl(var(--emotion-anxious-fg))]",
    label: "Anxious",
    emoji: "😟",
  },
  NEUTRAL: {
    strip: "bg-[hsl(var(--emotion-neutral))]",
    pill: "bg-[hsl(var(--emotion-neutral-bg))] text-[hsl(var(--emotion-neutral-fg))]",
    label: "Neutral",
    emoji: "😐",
  },
  WILLING: {
    strip: "bg-[hsl(var(--emotion-willing))]",
    pill: "bg-[hsl(var(--emotion-willing-bg))] text-[hsl(var(--emotion-willing-fg))]",
    label: "Willing",
    emoji: "🙂",
  },
  EXCITED: {
    strip: "bg-[hsl(var(--emotion-excited))]",
    pill: "bg-[hsl(var(--emotion-excited-bg))] text-[hsl(var(--emotion-excited-fg))]",
    label: "Excited",
    emoji: "🤩",
  },
} as const;

function formatDue(dueAt: Date | string | null): { label: string; overdue: boolean } {
  if (!dueAt) return { label: "No deadline", overdue: false };
  const d = new Date(dueAt);
  const now = new Date();
  const overdue = d < now;
  const label = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return { label: overdue ? `${label} · overdue` : label, overdue };
}

interface Props {
  task: Task;
  onMarkDone?: (id: string) => void;
  onDefer?: (id: string) => void;
}

export function TaskCard({ task, onMarkDone, onDefer }: Props) {
  const state = STATE_CONFIG[task.emotionalState];
  const { label: dueLabel, overdue } = formatDue(task.dueAt);

  return (
    <article className="rounded-[14px] border border-[#EDE8E0] bg-white shadow-sm overflow-hidden transition-all hover:-translate-y-px hover:shadow-md">
      {/* colour strip — reinforced by pill + emoji below (not sole indicator) */}
      <div className={cn("h-[3px] w-full", state.strip)} aria-hidden="true" />

      <div className="px-5 py-4">
        {/* Top row: timestamp + emoji */}
        <div className="flex items-start justify-between mb-2.5">
          <span
            className={cn(
              "font-mono text-[10px]",
              overdue ? "text-[hsl(var(--emotion-dreading-fg))]" : "text-[#C0B8AE]"
            )}
          >
            {overdue && <span aria-label="overdue">⚑ </span>}
            {dueLabel}
          </span>
          <span className="text-2xl leading-none" aria-hidden="true">
            {state.emoji}
          </span>
        </div>

        {/* State pill — text + colour, satisfies WCAG 1.4.1 */}
        <div className="mb-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
              state.pill
            )}
          >
            {state.label}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-[19px] font-semibold leading-snug tracking-tight text-[#1A1814]">
          {task.title}
        </h2>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-[#F0ECE6] bg-[#FDFCFA] px-5 py-3">
        <button
          onClick={() => onMarkDone?.(task.id)}
          className="inline-flex items-center gap-1.5 rounded-[7px] bg-[hsl(var(--primary))] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[hsl(var(--primary)/0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2"
        >
          ✓ Mark done
        </button>
        {onDefer && (
          <button
            onClick={() => onDefer(task.id)}
            className="inline-flex items-center rounded-[7px] border border-[#E4DDD4] bg-transparent px-3 py-1.5 text-xs font-medium text-[#8C8880] transition-colors hover:bg-[#F7F4EF] hover:text-[#1A1814] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2"
          >
            Push this →
          </button>
        )}
      </div>
    </article>
  );
}

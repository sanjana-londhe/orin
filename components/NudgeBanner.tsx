"use client";

import { useUIStore } from "@/store/ui";
import type { Task } from "@/lib/generated/prisma/client";

interface Props {
  task: Task;
  onDefer?: () => void;
  onMarkDone?: () => void;
}

export function NudgeBanner({ task, onDefer, onMarkDone }: Props) {
  const { dismissNudge } = useUIStore();

  const message =
    task.emotionalState === "DREADING"
      ? "This one's been sitting heavy. Want to push it or break it down?"
      : "This feels a bit anxious. A quick push might take the edge off.";

  return (
    <div className="mx-5 mb-4 rounded-[10px] bg-[var(--anxious-bg,#fffbeb)] border border-[var(--anxious-border,#ebd587)] px-4 py-3 relative">
      {/* Decorative quote mark */}
      <span
        aria-hidden="true"
        className="absolute top-2 left-3 font-[Caveat,cursive] text-[40px] leading-none text-[#f0d060] pointer-events-none select-none"
      >
        &ldquo;
      </span>

      <p className="text-[13px] text-[#92400e] leading-[1.5] mb-3 pl-6">
        {message}
      </p>

      <div className="flex items-center gap-2 flex-wrap pl-6">
        {onDefer && (
          <button
            onClick={onDefer}
            className="px-3 py-1 rounded-[7px] bg-[hsl(var(--primary))] border border-[var(--ink)] text-white text-[12px] font-bold transition-all hover:shadow-[2px_2px_0_var(--ink)]"
          >
            Defer
          </button>
        )}
        {onMarkDone && (
          <button
            onClick={onMarkDone}
            className="px-3 py-1 rounded-[7px] bg-white border border-[var(--stone-400)] text-[var(--lime-ink)] text-[12px] font-medium transition-all hover:bg-[var(--lime-subtle)] hover:border-[var(--stone-500)]"
          >
            Mark done
          </button>
        )}
        <button
          onClick={() => dismissNudge(task.id)}
          className="ml-auto text-[11px] text-[var(--stone-500)] hover:text-[var(--lime-ink)] transition-colors px-1"
          aria-label="Dismiss nudge"
        >
          Dismiss ✕
        </button>
      </div>
    </div>
  );
}

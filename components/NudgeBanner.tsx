"use client";

import { useState } from "react";
import { useUIStore } from "@/store/ui";
import { DeferralModal } from "@/components/DeferralModal";
import type { Task } from "@/lib/generated/prisma/client";

interface Props {
  task: Task;
  onDefer?: (newDueAt: Date) => void;
  onMarkDone?: () => void;
}

export function NudgeBanner({ task, onDefer, onMarkDone }: Props) {
  const { dismissNudge } = useUIStore();
  const [deferOpen, setDeferOpen] = useState(false);
  const [deferTab, setDeferTab] = useState<"defer" | "reschedule">("defer");

  function buildMessage(): string {
    if (task.emotionalState === "DREADING") {
      const deferrals = task.deferredCount ?? 0;
      if (deferrals >= 2) return `You've deferred this ${deferrals}× — want to reschedule it properly or break it down?`;
      return "This one's been sitting heavy. Want to push it or break it down?";
    }
    // ANXIOUS — show time remaining
    if (task.dueAt) {
      const hoursLeft = Math.round((new Date(task.dueAt).getTime() - Date.now()) / (60 * 60 * 1000));
      if (hoursLeft <= 3) return `${hoursLeft}h left and this is tagged Anxious — any movement possible?`;
    }
    return "This one feels a bit anxious. Giving yourself more time might help.";
  }

  const message = buildMessage();

  async function handleDismiss() {
    // Optimistic: update Zustand immediately
    dismissNudge(task.id);
    // Persist to server — fire and forget
    try {
      await fetch("/api/nudge-dismissals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id }),
      });
    } catch {
      // Non-critical — Zustand suppression is already active
    }
  }

  function openDefer(tab: "defer" | "reschedule") {
    setDeferTab(tab);
    setDeferOpen(true);
  }

  return (
    <>
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
          <button
            onClick={() => openDefer("defer")}
            className="px-3 py-1 rounded-[7px] bg-[hsl(var(--primary))] border border-[var(--ink)] text-white text-[12px] font-bold transition-all hover:shadow-[2px_2px_0_var(--ink)]"
          >
            Defer
          </button>
          <button
            onClick={() => openDefer("reschedule")}
            className="px-3 py-1 rounded-[7px] bg-white border border-[var(--stone-400)] text-[var(--lime-ink)] text-[12px] font-medium transition-all hover:bg-[var(--lime-subtle)] hover:border-[var(--stone-500)]"
          >
            Reschedule
          </button>
          {onMarkDone && (
            <button
              onClick={onMarkDone}
              className="px-3 py-1 rounded-[7px] bg-white border border-[var(--stone-400)] text-[var(--lime-ink)] text-[12px] font-medium transition-all hover:bg-[var(--lime-subtle)] hover:border-[var(--stone-500)]"
            >
              Mark done
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="ml-auto text-[11px] text-[var(--stone-500)] hover:text-[var(--lime-ink)] transition-colors px-1"
            aria-label="Not now — suppress for 2 hours"
          >
            Not now
          </button>
        </div>
      </div>

      {onDefer && (
        <DeferralModal
          open={deferOpen}
          onOpenChange={setDeferOpen}
          task={task}
          defaultTab={deferTab}
          onConfirm={(newDueAt) => {
            onDefer(newDueAt);
            dismissNudge(task.id);
          }}
        />
      )}
    </>
  );
}

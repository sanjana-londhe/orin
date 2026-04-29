"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/store/ui";
import type { Task } from "@/lib/generated/prisma/client";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const TOUCHED_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours
const DUE_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours

function shouldNudge(task: Task): boolean {
  if (task.isCompleted) return false;
  if (task.emotionalState !== "DREADING" && task.emotionalState !== "ANXIOUS") return false;

  const now = Date.now();

  // Condition A: not touched in > 6h
  const lastTouched = task.lastTouchedAt ? new Date(task.lastTouchedAt).getTime() : 0;
  if (now - lastTouched < TOUCHED_THRESHOLD_MS) return false;

  // Condition B: due within 12h
  if (!task.dueAt) return false;
  const dueIn = new Date(task.dueAt).getTime() - now;
  if (dueIn < 0 || dueIn > DUE_WINDOW_MS) return false;

  return true;
}

export function NudgePoller() {
  const queryClient = useQueryClient();
  const { addNudge, removeNudge, isSuppressed } = useUIStore();

  function evaluate() {
    const cached = queryClient.getQueryData<Task[]>(["tasks", "today"]);
    if (!cached) return;

    for (const task of cached) {
      if (shouldNudge(task) && !isSuppressed(task.id)) {
        addNudge(task.id);
      } else {
        removeNudge(task.id);
      }
    }
  }

  useEffect(() => {
    // Evaluate once on mount, then every 5 minutes
    evaluate();
    const id = setInterval(evaluate, POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

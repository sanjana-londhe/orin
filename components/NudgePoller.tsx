"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/store/ui";
import type { Task } from "@prisma/client";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const TOUCHED_THRESHOLD_MS = 6 * 60 * 60 * 1000;
const DUE_WINDOW_MS = 12 * 60 * 60 * 1000;

function meetsLocalConditions(task: Task): boolean {
  if (task.isCompleted) return false;
  if (task.emotionalState !== "DREADING" && task.emotionalState !== "ANXIOUS") return false;
  const now = Date.now();
  const lastTouched = task.lastTouchedAt ? new Date(task.lastTouchedAt).getTime() : 0;
  if (now - lastTouched < TOUCHED_THRESHOLD_MS) return false;
  if (!task.dueAt) return false;
  const dueIn = new Date(task.dueAt).getTime() - now;
  if (dueIn < 0 || dueIn > DUE_WINDOW_MS) return false;
  return true;
}

async function isServerSuppressed(taskId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/nudge-dismissals?task_id=${taskId}`);
    if (!res.ok) return false;
    const { suppressed } = await res.json();
    return suppressed;
  } catch {
    return false;
  }
}

export function NudgePoller() {
  const queryClient = useQueryClient();
  const { addNudge, removeNudge, isSuppressed } = useUIStore();

  async function evaluate() {
    const cached = queryClient.getQueryData<Task[]>(["tasks", "today"]);
    if (!cached) return;

    for (const task of cached) {
      if (!meetsLocalConditions(task)) {
        removeNudge(task.id);
        continue;
      }

      // Check Zustand (localStorage) suppression first — avoids API call if recently dismissed
      if (isSuppressed(task.id)) {
        removeNudge(task.id);
        continue;
      }

      // Check server-side dismissal record before surfacing the nudge
      const suppressed = await isServerSuppressed(task.id);
      if (suppressed) {
        removeNudge(task.id);
      } else {
        addNudge(task.id);
      }
    }
  }

  useEffect(() => {
    evaluate();
    const id = setInterval(evaluate, POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

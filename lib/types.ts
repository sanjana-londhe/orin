import type { Task } from "@prisma/client";

export type TaskWithSubtasks = Task & { subtasks: Task[] };

// Client-side placeholder id used while a freshly-created task's POST is still
// in flight (see AllTasksView.handleCreate). Server routes expect a real UUID,
// so any mutation fired against one of these would 500 — callers must guard.
export const OPTIMISTIC_ID_PREFIX = "optimistic-";
export function isOptimisticTaskId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_ID_PREFIX);
}

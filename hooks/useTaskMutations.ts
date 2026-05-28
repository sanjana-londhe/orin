"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@prisma/client";
import { isOptimisticTaskId, type TaskWithSubtasks } from "@/lib/types";

export function useTaskMutations() {
  const queryClient = useQueryClient();

  function snapshot() {
    return queryClient.getQueriesData<TaskWithSubtasks[]>({ queryKey: ["tasks"] });
  }
  function rollback(snap: ReturnType<typeof snapshot>) {
    snap.forEach(([key, data]) => queryClient.setQueryData(key, data));
  }
  function settle() {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  // ── markDone: complete in place, card stays ───────────────────────
  const markDone = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
      // 409 = the task is already completed server-side; the desired end state
      // is already true, so keep the optimistic "done" instead of rolling back.
      if (res.status === 409) return { alreadyCompleted: true };
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = snapshot();

      // Find the full task object before removing it from active lists
      let taskData: TaskWithSubtasks | undefined;
      for (const [, data] of queryClient.getQueriesData<TaskWithSubtasks[]>({ queryKey: ["tasks"] })) {
        if (Array.isArray(data)) {
          taskData = data.find(t => t.id === id);
          if (taskData) break;
        }
      }

      // Mark as completed in all cached query lists (removes from active filters)
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: unknown) =>
        Array.isArray(old)
          ? (old as TaskWithSubtasks[]).map(t => t.id === id ? { ...t, isCompleted: true } : t)
          : old
      );

      // Immediately push the task to today-completed so it appears at the bottom
      if (taskData) {
        const done = { ...taskData, isCompleted: true, updatedAt: new Date() };
        queryClient.setQueryData<TaskWithSubtasks[]>(
          ["tasks", "today-completed"],
          old => [done, ...(old ?? []).filter(t => t.id !== id)]
        );
      }

      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx!.snap),
  });

  // ── uncompleteTask: reverse, also in place ────────────────────────
  // Mirror-image of markDone: flip the flag everywhere, then explicitly move
  // the task between the bucketed caches. Without the explicit move, the
  // entry sits in `today-completed` (or `completed`) with its flag flipped to
  // false — gridTasks then renders it once from there *and* once from the
  // active cache, producing the duplicate rows you saw.
  const uncompleteTask = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: false }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = snapshot();

      // Find the full task object before we touch the caches
      let taskData: TaskWithSubtasks | undefined;
      for (const [, data] of queryClient.getQueriesData<TaskWithSubtasks[]>({ queryKey: ["tasks"] })) {
        if (Array.isArray(data)) {
          taskData = data.find(t => t.id === id);
          if (taskData) break;
        }
      }

      // Flip the flag in every cached list (some lists may not contain the
      // task — map is a no-op there).
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: unknown) =>
        Array.isArray(old)
          ? (old as TaskWithSubtasks[]).map(t => t.id === id ? { ...t, isCompleted: false } : t)
          : old
      );

      // Remove from any completed-bucketed lists — an uncompleted task
      // doesn't belong in "tasks completed today" / "all completed".
      const drop = (key: readonly unknown[]) =>
        queryClient.setQueryData<TaskWithSubtasks[]>(
          key as unknown as Parameters<typeof queryClient.setQueryData>[0],
          old => (old ?? []).filter(t => t.id !== id),
        );
      drop(["tasks", "today-completed"]);
      drop(["tasks", "completed"]);

      // Insert (or move to top of) the active-bucketed lists so the row
      // appears immediately. Filter-then-prepend keeps things idempotent if
      // the task was already there.
      if (taskData) {
        const reopened: TaskWithSubtasks = { ...taskData, isCompleted: false, updatedAt: new Date() };
        const upsertTop = (key: readonly unknown[]) =>
          queryClient.setQueryData<TaskWithSubtasks[]>(
            key as unknown as Parameters<typeof queryClient.setQueryData>[0],
            old => [reopened, ...(old ?? []).filter(t => t.id !== id)],
          );
        upsertTop(["tasks", "today-active"]);
        upsertTop(["tasks", "all"]);
      }

      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx!.snap),
    onSettled: settle, // reconcile with server (e.g. flagged/calendar lists)
  });

  // ── updateTask ────────────────────────────────────────────────────
  const updateTask = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => {
      if (patch.emotionalState !== undefined && Object.keys(patch).length === 1) {
        const res = await fetch(`/api/tasks/${id}/emotional-state`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emotional_state: patch.emotionalState }),
        });
        if (!res.ok) throw new Error("Failed");
        return res.json();
      }
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = snapshot();
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: unknown) =>
        Array.isArray(old) ? (old as TaskWithSubtasks[]).map(t => t.id === id ? { ...t, ...patch } : t) : old
      );
      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx!.snap),
    onSettled: settle,
  });

  // ── deferTask ─────────────────────────────────────────────────────
  const deferTask = useMutation({
    mutationFn: async ({ id, newDueAt, reason }: { id: string; newDueAt: Date; reason?: string }) => {
      const res = await fetch(`/api/tasks/${id}/defer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_due_at: newDueAt.toISOString(),
          confirmed: true,
          ...(reason ? { reason } : {}),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: async ({ id, newDueAt }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = snapshot();
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: unknown) =>
        Array.isArray(old)
          ? (old as TaskWithSubtasks[]).map(t =>
              t.id === id ? { ...t, dueAt: newDueAt, deferredCount: t.deferredCount + 1 } : t
            )
          : old
      );
      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx!.snap),
    onSettled: settle,
  });

  // ── deleteTask ────────────────────────────────────────────────────
  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = snapshot();
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: unknown) =>
        Array.isArray(old) ? (old as TaskWithSubtasks[]).filter(t => t.id !== id) : old
      );
      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx!.snap),
    onSettled: settle,
  });

  // Stable wrappers — `*.mutate` is already a stable ref from React Query, but
  // we wrap the arg-shaping ones in useCallback so consumers passing them as
  // props don't bust `memo()` on TaskCard / SortableTaskCard on every parent
  // re-render.
  // All wrappers no-op on optimistic placeholder ids — a freshly-created task
  // has no real UUID yet, so any server call would 500. The placeholder is
  // swapped for the real task within a beat (see AllTasksView.handleCreate).
  const markDoneCb = useCallback(
    (id: string) => { if (!isOptimisticTaskId(id)) markDone.mutate(id); },
    [markDone.mutate],
  );
  const uncompleteCb = useCallback(
    (id: string) => { if (!isOptimisticTaskId(id)) uncompleteTask.mutate(id); },
    [uncompleteTask.mutate],
  );
  const deleteCb = useCallback(
    (id: string) => { if (!isOptimisticTaskId(id)) deleteTask.mutate(id); },
    [deleteTask.mutate],
  );
  const updateTaskCb = useCallback(
    (id: string, patch: Partial<Task>) => { if (!isOptimisticTaskId(id)) updateTask.mutate({ id, patch }); },
    [updateTask.mutate],
  );
  const deferTaskCb = useCallback(
    (id: string, newDueAt: Date, reason?: string) => { if (!isOptimisticTaskId(id)) deferTask.mutate({ id, newDueAt, reason }); },
    [deferTask.mutate],
  );

  // Memoize the returned object so callers using it as a whole don't get a
  // new reference on every render either.
  return useMemo(
    () => ({
      markDone:       markDoneCb,
      uncompleteTask: uncompleteCb,
      updateTask:     updateTaskCb,
      deferTask:      deferTaskCb,
      deleteTask:     deleteCb,
    }),
    [markDoneCb, uncompleteCb, updateTaskCb, deferTaskCb, deleteCb],
  );
}

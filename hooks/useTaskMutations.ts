"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";

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
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = snapshot();
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: unknown) =>
        Array.isArray(old)
          ? (old as TaskWithSubtasks[]).map(t => t.id === id ? { ...t, isCompleted: true } : t)
          : old
      );
      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx!.snap),
  });

  // ── uncompleteTask: reverse, also in place ────────────────────────
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
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: unknown) =>
        Array.isArray(old)
          ? (old as TaskWithSubtasks[]).map(t => t.id === id ? { ...t, isCompleted: false } : t)
          : old
      );
      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx!.snap),
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
    mutationFn: async ({ id, newDueAt }: { id: string; newDueAt: Date }) => {
      const res = await fetch(`/api/tasks/${id}/defer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_due_at: newDueAt.toISOString(), confirmed: true }),
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

  return {
    markDone:       markDone.mutate,
    uncompleteTask: uncompleteTask.mutate,
    updateTask:     (id: string, patch: Partial<Task>) => updateTask.mutate({ id, patch }),
    deferTask:      (id: string, newDueAt: Date) => deferTask.mutate({ id, newDueAt }),
    deleteTask:     deleteTask.mutate,
  };
}

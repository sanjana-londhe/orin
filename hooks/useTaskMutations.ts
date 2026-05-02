"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";

function removeById(id: string) {
  return (old: unknown) => Array.isArray(old) ? (old as TaskWithSubtasks[]).filter(t => t.id !== id) : old;
}

function updateById(id: string, patch: Partial<Task>) {
  return (old: unknown) => Array.isArray(old)
    ? (old as TaskWithSubtasks[]).map(t => t.id === id ? { ...t, ...patch } : t)
    : old;
}

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

  // ── markDone: remove task instantly ──────────────────────────────
  const markDone = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to complete task");
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = snapshot();
      queryClient.setQueriesData({ queryKey: ["tasks"] }, removeById(id));
      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx!.snap),
    onSettled: settle,
  });

  // ── updateTask: update in place instantly ─────────────────────────
  const updateTask = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => {
      if (patch.emotionalState !== undefined && Object.keys(patch).length === 1) {
        const res = await fetch(`/api/tasks/${id}/emotional-state`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emotional_state: patch.emotionalState }),
        });
        if (!res.ok) throw new Error("Failed to update emotional state");
        return res.json();
      }
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = snapshot();
      queryClient.setQueriesData({ queryKey: ["tasks"] }, updateById(id, patch));
      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx!.snap),
    onSettled: settle,
  });

  // ── deferTask: update dueAt + increment deferredCount instantly ───
  const deferTask = useMutation({
    mutationFn: async ({ id, newDueAt }: { id: string; newDueAt: Date }) => {
      const res = await fetch(`/api/tasks/${id}/defer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_due_at: newDueAt.toISOString(), confirmed: true }),
      });
      if (!res.ok) throw new Error("Failed to defer task");
      return res.json();
    },
    onMutate: async ({ id, newDueAt }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = snapshot();
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: unknown) =>
        Array.isArray(old)
          ? (old as TaskWithSubtasks[]).map(t =>
              t.id === id
                ? { ...t, dueAt: newDueAt, deferredCount: t.deferredCount + 1 }
                : t
            )
          : old
      );
      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx!.snap),
    onSettled: settle,
  });

  // ── deleteTask: remove instantly ──────────────────────────────────
  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = snapshot();
      queryClient.setQueriesData({ queryKey: ["tasks"] }, removeById(id));
      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx!.snap),
    onSettled: settle,
  });

  // ── addSubtask: append subtask to parent task instantly ───────────
  const addSubtask = useMutation({
    mutationFn: async ({ parentId, title }: { parentId: string; title: string }) => {
      const res = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, parentTaskId: parentId }),
      });
      if (!res.ok) throw new Error("Failed to create subtask");
      return res.json();
    },
    onMutate: async ({ parentId, title }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = snapshot();
      const optimisticSub = {
        id: `optimistic-sub-${Date.now()}`,
        title, parentTaskId: parentId,
        isCompleted: false, deferredCount: 0,
        userId: "", emotionalState: "NEUTRAL" as const,
        dueAt: null, sortOrder: 0, lastTouchedAt: new Date(),
        recurrenceRule: null, createdAt: new Date(), updatedAt: new Date(),
      } as Task;
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: unknown) =>
        Array.isArray(old)
          ? (old as TaskWithSubtasks[]).map(t =>
              t.id === parentId ? { ...t, subtasks: [...t.subtasks, optimisticSub] } : t
            )
          : old
      );
      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx!.snap),
    onSettled: settle,
  });

  // ── completeSubtask: mark subtask done instantly ──────────────────
  const completeSubtask = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to complete subtask");
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = snapshot();
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: unknown) =>
        Array.isArray(old)
          ? (old as TaskWithSubtasks[]).map(t => ({
              ...t,
              subtasks: t.subtasks.map(s => s.id === id ? { ...s, isCompleted: true } : s),
            }))
          : old
      );
      return { snap };
    },
    onError: (_e, _v, ctx) => rollback(ctx!.snap),
    onSettled: settle,
  });

  return {
    markDone:        markDone.mutate,
    updateTask:      (id: string, patch: Partial<Task>) => updateTask.mutate({ id, patch }),
    deferTask:       (id: string, newDueAt: Date) => deferTask.mutate({ id, newDueAt }),
    deleteTask:      deleteTask.mutate,
    addSubtask:      (parentId: string, title: string) => addSubtask.mutate({ parentId, title }),
    completeSubtask: completeSubtask.mutate,
    deleteSubtask:   deleteTask.mutate,
  };
}

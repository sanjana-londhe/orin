"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskCard } from "@/components/TaskCard";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { useUIStore, type SortMode } from "@/store/ui";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/generated/prisma/client";

const EMOTIONAL_WEIGHT: Record<string, number> = {
  DREADING: 1,
  ANXIOUS:  2,
  NEUTRAL:  3,
  WILLING:  4,
  EXCITED:  5,
};

const SORT_LABELS: Record<SortMode, string> = {
  due_date:  "Due date",
  emotional: "Emotional",
  manual:    "Manual",
};

function sortTasks(tasks: Task[], mode: SortMode): Task[] {
  return [...tasks].sort((a, b) => {
    if (mode === "due_date") {
      if (!a.dueAt && !b.dueAt) return a.sortOrder - b.sortOrder;
      if (!a.dueAt) return 1;   // nulls last
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }
    if (mode === "emotional") {
      const diff = (EMOTIONAL_WEIGHT[a.emotionalState] ?? 3) - (EMOTIONAL_WEIGHT[b.emotionalState] ?? 3);
      if (diff !== 0) return diff;
      // tiebreak: overdue first, then by sortOrder
      if (!a.dueAt && !b.dueAt) return a.sortOrder - b.sortOrder;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }
    // manual
    return a.sortOrder - b.sortOrder;
  });
}

async function fetchTodaysTasks(): Promise<Task[]> {
  const res = await fetch("/api/tasks?filter=today");
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

export function TaskList() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const { sortMode, setSortMode } = useUIStore();

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ["tasks", "today"],
    queryFn: fetchTodaysTasks,
  });

  const sorted = useMemo(() => sortTasks(tasks, sortMode), [tasks, sortMode]);

  const { mutate: markDone } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to complete task");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const { mutate: updateTask } = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const { mutate: deferTask } = useMutation({
    mutationFn: async ({ id, newDueAt }: { id: string; newDueAt: Date }) => {
      const res = await fetch(`/api/tasks/${id}/defer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_due_at: newDueAt.toISOString(), confirmed: true }),
      });
      if (!res.ok) throw new Error("Failed to defer task");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const { mutate: deleteTask } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[140px] rounded-[14px] border border-[var(--stone-400)] bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-[hsl(var(--destructive))]">
        Could not load tasks. Try refreshing.
      </p>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--stone-500)] mb-1">
              Daily workspace · {new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </p>
            <h1 className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-[var(--lime-ink)]">
              Today
            </h1>
            <p className="mt-1 text-[13.5px] text-[var(--stone-500)]">
              {tasks.length === 0
                ? "Nothing on your plate yet"
                : `${tasks.length} task${tasks.length === 1 ? "" : "s"} remaining`}
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-[8px] bg-[hsl(var(--primary))] border border-[var(--ink)] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[hsl(var(--primary)/0.9)] hover:shadow-[2px_2px_0_var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 whitespace-nowrap"
          >
            + New task
          </button>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[var(--stone-500)] mr-1">Sort</span>
          {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={cn(
                "px-3 py-1 rounded-[6px] text-[12.5px] font-semibold border transition-all",
                sortMode === mode
                  ? "bg-[hsl(var(--primary))] text-white border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]"
                  : "bg-white text-[var(--stone-500)] border-[var(--stone-400)] hover:bg-[var(--lime-subtle)] hover:text-[var(--lime-ink)] hover:border-[var(--stone-500)]"
              )}
            >
              {SORT_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[14px] border border-dashed border-[var(--stone-400)] bg-white py-16 text-center">
          <span className="text-5xl" aria-hidden="true">🌿</span>
          <div>
            <p className="font-semibold text-[var(--lime-ink)]">You&apos;re all clear</p>
            <p className="mt-1 text-sm text-[var(--stone-500)]">Add a task to get started</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-1 rounded-[8px] bg-[hsl(var(--primary))] border border-[var(--ink)] px-5 py-2 text-sm font-bold text-white transition-all hover:shadow-[2px_2px_0_var(--ink)]"
          >
            Add first task
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onMarkDone={markDone}
              onDefer={(id, newDueAt) => deferTask({ id, newDueAt })}
              onUpdate={(id, patch) => updateTask({ id, patch })}
              onDelete={deleteTask}
            />
          ))}
        </div>
      )}

      <TaskCreateModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

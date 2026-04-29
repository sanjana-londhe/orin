"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableTaskCard } from "@/components/SortableTaskCard";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { WelcomeView } from "@/components/WelcomeView";
import { useUIStore, type SortMode } from "@/store/ui";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/generated/prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";

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

function sortTasks(tasks: TaskWithSubtasks[], mode: SortMode): TaskWithSubtasks[] {
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

async function fetchTodaysTasks(): Promise<TaskWithSubtasks[]> {
  const res = await fetch("/api/tasks?filter=today");
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

export function TaskList({ userName = "there" }: { userName?: string }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const { sortMode, setSortMode } = useUIStore();

  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data: tasks = [], isLoading } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", "today"],
    queryFn: fetchTodaysTasks,
    retry: 1,
  });

  const sorted = useMemo(() => sortTasks(tasks, sortMode), [tasks, sortMode]);

  // Sync manualOrder when tasks or sort mode changes
  useEffect(() => {
    setManualOrder(sorted.map((t) => t.id));
  }, [tasks, sortMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayTasks = useMemo(() => {
    if (sortMode !== "manual" || manualOrder.length === 0) return sorted;
    const map = new Map(sorted.map((t) => [t.id, t]));
    return manualOrder.map((id) => map.get(id)).filter(Boolean) as TaskWithSubtasks[];
  }, [sorted, manualOrder, sortMode]);

  const { mutate: reorderTasks } = useMutation({
    mutationFn: async (ordered_ids: string[]) => {
      const res = await fetch("/api/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordered_ids }),
      });
      if (!res.ok) throw new Error("Failed to reorder");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = manualOrder.indexOf(active.id as string);
    const newIndex = manualOrder.indexOf(over.id as string);
    const newOrder = arrayMove(manualOrder, oldIndex, newIndex);

    // Optimistic update
    setManualOrder(newOrder);

    // Debounced DB write
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => reorderTasks(newOrder), 500);
  }

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
      // Route emotional state changes through the dedicated endpoint so history is logged
      if (patch.emotionalState !== undefined && Object.keys(patch).length === 1) {
        const res = await fetch(`/api/tasks/${id}/emotional-state`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emotional_state: patch.emotionalState }),
        });
        if (!res.ok) throw new Error("Failed to update emotional state");
        return res.json();
      }
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

  const { mutate: addSubtask } = useMutation({
    mutationFn: async ({ parentId, title }: { parentId: string; title: string }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, parentTaskId: parentId }),
      });
      if (!res.ok) throw new Error("Failed to create subtask");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const { mutate: completeSubtask } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to complete subtask");
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

  // While loading show skeletons — but cap at 3 retries so we never
  // spin forever if the DB isn't set up yet
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[140px] rounded-[14px] border border-[var(--stone-400)] bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  // On error (e.g. DB not migrated yet) fall through to welcome / empty view
  // rather than showing a hard error — the user can still see the interface

  return (
    <>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap sm:flex-nowrap">
          <div className="min-w-0">
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] text-[var(--stone-500)] mr-1">Sort</span>
          {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={cn(
                "px-3 py-2 min-h-[44px] rounded-[6px] text-[12.5px] font-semibold border transition-all sm:py-1 sm:min-h-0",
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

      {/* Empty state → personalised welcome for new users */}
      {tasks.length === 0 ? (
        <WelcomeView name={userName} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {displayTasks.map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  dragActive={sortMode === "manual"}
                  onMarkDone={markDone}
                  onDefer={(id, newDueAt) => deferTask({ id, newDueAt })}
                  onUpdate={(id, patch) => updateTask({ id, patch })}
                  onDelete={deleteTask}
                  onAddSubtask={(parentId, title) => addSubtask({ parentId, title })}
                  onCompleteSubtask={completeSubtask}
                  onDeleteSubtask={deleteTask}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <TaskCreateModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

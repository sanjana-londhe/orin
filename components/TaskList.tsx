"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskCard } from "@/components/TaskCard";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import type { Task } from "@/lib/generated/prisma/client";

async function fetchTodaysTasks(): Promise<Task[]> {
  const res = await fetch("/api/tasks?filter=today");
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

export function TaskList() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ["tasks", "today"],
    queryFn: fetchTodaysTasks,
  });

  const { mutate: markDone } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: true }),
      });
      if (!res.ok) throw new Error("Failed to update task");
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
          <div key={i} className="h-[140px] rounded-[14px] border border-[#EDE8E0] bg-white animate-pulse" />
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
      {/* Header row */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#B0A89E]">
            Daily focus · {new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}
          </p>
          <h1 className="text-[40px] font-black leading-none tracking-tight text-[#1A1814]">
            Today
          </h1>
          <p className="mt-1 text-[13.5px] text-[#A09890]">
            {tasks.length === 0
              ? "Nothing on your plate yet"
              : `${tasks.length} task${tasks.length === 1 ? "" : "s"} remaining`}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-[8px] border border-dashed border-[#D8D2CC] bg-white px-4 py-2 text-sm font-medium text-[#8C8880] transition-colors hover:border-[#B0A89E] hover:text-[#4C4840] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2"
        >
          + New task
        </button>
      </div>

      {/* Empty state */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[14px] border border-dashed border-[#EDE8E0] bg-white py-16 text-center">
          <span className="text-5xl" aria-hidden="true">🌿</span>
          <div>
            <p className="font-semibold text-[#1A1814]">You&apos;re all clear</p>
            <p className="mt-1 text-sm text-[#A09890]">Add a task to get started</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-1 rounded-[8px] bg-[hsl(var(--primary))] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[hsl(var(--primary)/0.85)]"
          >
            Add first task
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onMarkDone={markDone}
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

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SortableTaskCard } from "@/components/SortableTaskCard";
import type { TaskWithSubtasks } from "@/lib/types";
import type { Task } from "@prisma/client";

interface Props {
  title: string;
  emoji: string;
  filter: string;
  emptyText?: string;
}

export function SimpleTaskView({ title, emoji, filter, emptyText = "Nothing here yet" }: Props) {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", filter],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?filter=${filter}`);
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  const { mutate: markDone } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const { mutate: updateTask } = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => {
      if (patch.emotionalState !== undefined && Object.keys(patch).length === 1) {
        const res = await fetch(`/api/tasks/${id}/emotional-state`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emotional_state: patch.emotionalState }) });
        if (!res.ok) throw new Error("Failed");
        return res.json();
      }
      const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const { mutate: deferTask } = useMutation({
    mutationFn: async ({ id, newDueAt }: { id: string; newDueAt: Date }) => {
      const res = await fetch(`/api/tasks/${id}/defer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ new_due_at: newDueAt.toISOString(), confirmed: true }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const { mutate: deleteTask } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const { mutate: addSubtask } = useMutation({
    mutationFn: async ({ parentId, title }: { parentId: string; title: string }) => {
      const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, parentTaskId: parentId }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const { mutate: completeSubtask } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 28px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", color: "#1A1612", display: "flex", alignItems: "center", gap: 10 }}>
          <span>{emoji}</span> {title}
        </h1>
        {!isLoading && (
          <p style={{ fontSize: 13, color: "#B0A89E", marginTop: 4 }}>
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div style={{ columnCount: 3, columnGap: 14 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ breakInside: "avoid", marginBottom: 14, height: 140, borderRadius: 16, background: "rgba(0,0,0,0.04)" }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#B0A89E" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
          <p style={{ fontSize: 14 }}>{emptyText}</p>
        </div>
      ) : (
        <div style={{ columnCount: 3, columnGap: 14 }}>
          {tasks.map(task => (
            <SortableTaskCard
              key={task.id} task={task} dragActive={false}
              onMarkDone={filter !== "completed" ? markDone : undefined}
              onDefer={filter !== "completed" ? (id, newDueAt) => deferTask({ id, newDueAt }) : undefined}
              onUpdate={(id, patch) => updateTask({ id, patch })}
              onDelete={deleteTask}
              onAddSubtask={(parentId, title) => addSubtask({ parentId, title })}
              onCompleteSubtask={completeSubtask}
              onDeleteSubtask={deleteTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

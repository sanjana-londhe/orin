"use client";

import { useQuery } from "@tanstack/react-query";
import { TaskGrid } from "@/components/TaskGrid";
import { PAGE_STYLE } from "@/lib/utils";
import type { TaskWithSubtasks } from "@/lib/types";

interface Props {
  title: string;
  emoji: string;
  filter: string;
  emptyText?: string;
}

export function SimpleTaskView({ title, emoji, filter, emptyText }: Props) {
  const { data: tasks = [], isLoading } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", filter],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?filter=${filter}`);
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  return (
    <div style={PAGE_STYLE}>
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

      <TaskGrid
        tasks={tasks}
        isLoading={isLoading}
        emptyState={
          <div style={{ textAlign: "center", padding: "64px 0", color: "#B0A89E" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
            <p style={{ fontSize: 14 }}>{emptyText ?? "Nothing here yet"}</p>
          </div>
        }
      />
    </div>
  );
}

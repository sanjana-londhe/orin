"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Flag, CheckCircle2, Sparkles, type LucideIcon } from "lucide-react";
import { TaskGrid } from "@/components/TaskGrid";
import { EmptyState } from "@/components/EmptyState";
import { PAGE_STYLE } from "@/lib/utils";
import type { TaskWithSubtasks } from "@/lib/types";

interface Props {
  title: string;
  emoji: string;
  filter: string;
  emptyText?: string;
}

const EMPTY_ICON: Record<string, LucideIcon> = {
  scheduled: CalendarClock,
  flagged:   Flag,
  completed: CheckCircle2,
};

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
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.03em", color: "#082d1d", display: "flex", alignItems: "center", gap: 10 }}>
          <span>{emoji}</span> {title}
        </h1>
        {!isLoading && (
          <p style={{ fontSize: 12, color: "#B0A89E", marginTop: 4 }}>
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <TaskGrid
        tasks={tasks}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={EMPTY_ICON[filter] ?? Sparkles}
            title={emptyText ?? "Nothing here yet"}
          />
        }
      />
    </div>
  );
}

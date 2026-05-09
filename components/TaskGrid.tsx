"use client";

import { memo } from "react";
import { SortableTaskCard } from "@/components/SortableTaskCard";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useUIStore } from "@/store/ui";
import { SkeletonTaskList } from "@/components/Skeleton";
import type { TaskWithSubtasks } from "@/lib/types";

interface Props {
  tasks: TaskWithSubtasks[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  dragActive?: boolean;
}

function TaskGridInner({ tasks, isLoading, emptyState, dragActive = false }: Props) {
  const m = useTaskMutations();
  const editingTaskId = useUIStore(s => s.editingTaskId);
  const isEditing = !!editingTaskId && tasks.some(t => t.id === editingTaskId);

  if (isLoading) return <SkeletonTaskList count={4} />;

  if (tasks.length === 0) {
    return (
      <>
        {emptyState ?? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "#c7c7cc" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
            <p style={{ fontSize: 14, color: "#8e8e93" }}>Nothing here yet</p>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{ background: "white", borderRadius: 12, border: `1px solid ${isEditing ? "#059669" : "#dde4de"}`, transition: "border-color 0.18s" }}>
      {tasks.map((task, i) => (
        <div
          key={task.id}
          style={{ borderBottom: i < tasks.length - 1 ? "1px solid #dde4de" : "none" }}
        >
          <SortableTaskCard
            task={task}
            dragActive={dragActive}
            onMarkDone={m.markDone}
            onUncomplete={m.uncompleteTask}
            onDefer={m.deferTask}
            onUpdate={m.updateTask}
            onDelete={m.deleteTask}
          />
        </div>
      ))}
    </div>
  );
}

export const TaskGrid = memo(TaskGridInner);

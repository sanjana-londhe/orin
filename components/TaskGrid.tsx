"use client";

import { SortableTaskCard } from "@/components/SortableTaskCard";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import type { TaskWithSubtasks } from "@/lib/types";

interface Props {
  tasks: TaskWithSubtasks[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  dragActive?: boolean;
}

const SKELETON_HEIGHTS = [160, 120, 200, 140, 180, 110];

export function TaskGrid({ tasks, isLoading, emptyState, dragActive = false }: Props) {
  const m = useTaskMutations();

  if (isLoading) {
    return (
      <div style={{ columnCount: 3, columnGap: 14 }}>
        {SKELETON_HEIGHTS.map((h, i) => (
          <div key={i} style={{
            breakInside: "avoid", marginBottom: 14, height: h,
            borderRadius: 16, background: "rgba(0,0,0,0.04)",
            animation: "pulse 1.5s ease-in-out infinite",
          }} />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <>
        {emptyState ?? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "#B0A89E" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
            <p style={{ fontSize: 14 }}>Nothing here yet</p>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{ columnCount: 3, columnGap: 14 }}>
      {tasks.map(task => (
        <SortableTaskCard
          key={task.id}
          task={task}
          dragActive={dragActive}
          onMarkDone={m.markDone}
          onDefer={m.deferTask}
          onUpdate={m.updateTask}
          onDelete={m.deleteTask}
          onAddSubtask={m.addSubtask}
          onCompleteSubtask={m.completeSubtask}
          onDeleteSubtask={m.deleteSubtask}
        />
      ))}
    </div>
  );
}

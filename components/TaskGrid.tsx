"use client";

import { memo, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { SortableTaskCard } from "@/components/SortableTaskCard";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useUIStore } from "@/store/ui";
import { SkeletonTaskList } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { celebrate } from "@/lib/celebrate";
import { isOptimisticTaskId, type TaskWithSubtasks } from "@/lib/types";

interface Props {
  tasks: TaskWithSubtasks[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  dragActive?: boolean;
}

function TaskGridInner({ tasks, isLoading, emptyState, dragActive = false }: Props) {
  const m = useTaskMutations();
  const editingTaskId = useUIStore(s => s.editingTaskId);
  const intensity = useUIStore(s => s.celebrationIntensity);

  // Fire the celebration *before* the optimistic mutation flips this task's
  // flag, so the active-count below still includes it. If it was the last one
  // standing, clearing it empties the list → fanfare; otherwise → a whisper.
  const handleMarkDone = useCallback((id: string) => {
    // Task not persisted yet — let the no-op guard in the mutation handle it,
    // and don't celebrate a completion that won't happen.
    if (isOptimisticTaskId(id)) return;
    const activeRemaining = tasks.filter(t => !t.isCompleted).length;
    celebrate(activeRemaining <= 1 ? "day" : "task", intensity);
    m.markDone(id);
  }, [tasks, intensity, m]);

  if (isLoading) return <SkeletonTaskList count={4} />;

  if (tasks.length === 0) {
    return (
      <>
        {emptyState ?? (
          <EmptyState icon={Sparkles} title="Nothing here yet" description="Add a task to get started." />
        )}
      </>
    );
  }

  return (
    <div style={{ background: "white", borderRadius: 4, border: "1px solid #dde4de" }}>
      {tasks.map((task, i) => {
        const editing = task.id === editingTaskId;
        return (
          <div
            key={task.id}
            style={{
              borderBottom: i < tasks.length - 1 ? "1px solid #dde4de" : "none",
              boxShadow: editing ? "inset 0 0 0 1.5px #059669" : "none",
              transition: "box-shadow 0.18s",
            }}
          >
            <SortableTaskCard
              task={task}
              dragActive={dragActive}
              onMarkDone={handleMarkDone}
              onUncomplete={m.uncompleteTask}
              onDefer={m.deferTask}
              onUpdate={m.updateTask}
              onDelete={m.deleteTask}
            />
          </div>
        );
      })}
    </div>
  );
}

export const TaskGrid = memo(TaskGridInner);

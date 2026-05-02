"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard } from "@/components/TaskCard";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";

interface Props {
  task: TaskWithSubtasks;
  onMarkDone?: (id: string) => void;
  onDefer?: (id: string, newDueAt: Date) => void;
  onUpdate?: (id: string, patch: Partial<Pick<Task, "title" | "dueAt" | "emotionalState">>) => void;
  onDelete?: (id: string) => void;
  onAddSubtask?: (parentId: string, title: string) => void;
  onCompleteSubtask?: (id: string) => void;
  onDeleteSubtask?: (id: string) => void;
  onPushUp?: (id: string) => void;
  canPushUp?: boolean;
  isLocallyCompleted?: boolean;
  dragActive?: boolean;
  featured?: boolean;
}

function SortableTaskCardInner({ task, dragActive = false, featured = false, ...props }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, cursor: dragActive ? "grab" : "default" }}
      {...(dragActive ? { ...attributes, ...listeners } : {})}
    >
      <TaskCard task={task} featured={featured} {...props} />
    </div>
  );
}

export const SortableTaskCard = memo(SortableTaskCardInner);

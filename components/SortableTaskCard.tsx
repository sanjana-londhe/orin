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
  dragActive?: boolean;
}

function SortableTaskCardInner({ task, dragActive = false, ...props }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle — only visible in manual sort mode */}
      {dragActive && (
        <div
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 opacity-30 hover:opacity-70 transition-opacity"
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
            <circle cx="3" cy="3" r="1.5" /><circle cx="7" cy="3" r="1.5" />
            <circle cx="3" cy="8" r="1.5" /><circle cx="7" cy="8" r="1.5" />
            <circle cx="3" cy="13" r="1.5" /><circle cx="7" cy="13" r="1.5" />
          </svg>
        </div>
      )}
      <div className={dragActive ? "pl-6" : ""}>
        <TaskCard task={task} {...props} />
      </div>
    </div>
  );
}

export const SortableTaskCard = memo(SortableTaskCardInner);

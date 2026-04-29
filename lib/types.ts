import type { Task } from "@/lib/generated/prisma/client";

export type TaskWithSubtasks = Task & { subtasks: Task[] };

import type { Task } from "@prisma/client";

export type TaskWithSubtasks = Task & { subtasks: Task[] };

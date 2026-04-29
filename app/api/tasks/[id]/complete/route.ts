import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { nextOccurrence } from "@/lib/rrule";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const task = await prisma.task.findFirst({ where: { id, userId: user.id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (task.isCompleted) return NextResponse.json({ error: "Already completed" }, { status: 409 });

  // Mark the task complete
  const completed = await prisma.task.update({
    where: { id },
    data: { isCompleted: true, lastTouchedAt: new Date() },
  });

  // If recurring, insert next occurrence
  let nextTask = null;
  if (task.recurrenceRule) {
    const base = task.dueAt ?? new Date();
    const next = nextOccurrence(task.recurrenceRule, base);

    if (next) {
      nextTask = await prisma.task.create({
        data: {
          userId: task.userId,
          title: task.title,
          emotionalState: task.emotionalState,
          recurrenceRule: task.recurrenceRule,
          dueAt: next,
          sortOrder: task.sortOrder,
          parentTaskId: task.parentTaskId,
          deferredCount: 0,
        },
      });
    }
  }

  return NextResponse.json({ completed, nextTask }, { status: 200 });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DeferSchema, parseJson } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJson(request, DeferSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { new_due_at, reason } = parsed;

  const { id } = await params;
  const task = await prisma.task.findFirst({ where: { id, userId: user.id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newDueAt = new Date(new_due_at);

  const [updatedTask] = await prisma.$transaction([
    prisma.task.update({
      where: { id },
      data: {
        dueAt: newDueAt,
        deferredCount: { increment: 1 },
        lastTouchedAt: new Date(),
      },
    }),
    prisma.deferralLog.create({
      data: {
        taskId: id,
        userId: user.id,
        previousDueAt: task.dueAt,
        newDueAt: newDueAt,
        reason: reason ?? null,
      },
    }),
  ]);

  return NextResponse.json(updatedTask, { status: 200 });
}

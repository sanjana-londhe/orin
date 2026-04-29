import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { new_due_at, confirmed, reason } = body;

  // Confirmed flag is mandatory — deferral must be an intentional user action
  if (!confirmed) {
    return NextResponse.json(
      { error: "Deferral requires confirmed: true" },
      { status: 400 }
    );
  }

  if (!new_due_at) {
    return NextResponse.json({ error: "new_due_at is required" }, { status: 400 });
  }

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

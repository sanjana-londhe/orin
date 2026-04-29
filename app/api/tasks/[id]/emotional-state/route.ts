import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { emotional_state } = await request.json();

  if (!emotional_state) {
    return NextResponse.json({ error: "emotional_state is required" }, { status: 400 });
  }

  const task = await prisma.task.findFirst({ where: { id, userId: user.id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (task.emotionalState === emotional_state) {
    return NextResponse.json(task);
  }

  const [updatedTask] = await prisma.$transaction([
    prisma.task.update({
      where: { id },
      data: { emotionalState: emotional_state, lastTouchedAt: new Date() },
    }),
    prisma.emotionalStateHistory.create({
      data: {
        taskId: id,
        userId: user.id,
        previousState: task.emotionalState,
        newState: emotional_state,
      },
    }),
  ]);

  return NextResponse.json(updatedTask);
}

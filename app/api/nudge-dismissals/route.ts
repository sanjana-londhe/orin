import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("task_id");
  if (!taskId) return NextResponse.json({ error: "task_id required" }, { status: 400 });

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const recent = await prisma.nudgeDismissal.findFirst({
    where: {
      taskId,
      userId: user.id,
      dismissedAt: { gte: twoHoursAgo },
    },
    orderBy: { dismissedAt: "desc" },
  });

  return NextResponse.json({ suppressed: !!recent });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { task_id } = await request.json();
  if (!task_id) return NextResponse.json({ error: "task_id required" }, { status: 400 });

  const task = await prisma.task.findFirst({
    where: { id: task_id, userId: user.id },
    select: { id: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dismissal = await prisma.nudgeDismissal.create({
    data: { taskId: task_id, userId: user.id },
  });

  return NextResponse.json(dismissal, { status: 201 });
}

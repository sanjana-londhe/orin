import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { userId: user.id, parentTaskId: null },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, dueAt, emotionalState } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const lastTask = await prisma.task.findFirst({
    where: { userId: user.id, parentTaskId: null },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title: title.trim(),
      dueAt: dueAt ? new Date(dueAt) : null,
      emotionalState: emotionalState ?? "NEUTRAL",
      sortOrder: (lastTask?.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(task, { status: 201 });
}

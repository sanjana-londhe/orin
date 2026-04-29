import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter");

  let dueAtFilter = {};
  if (filter === "today") {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    dueAtFilter = { OR: [{ dueAt: null }, { dueAt: { lte: todayEnd } }] };
  }

  const tasks = await prisma.task.findMany({
    where: { userId: user.id, parentTaskId: null, isCompleted: false, ...dueAtFilter },
    orderBy: { sortOrder: "asc" },
    include: {
      subtasks: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, dueAt, emotionalState, parentTaskId, recurrenceRule } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // Max depth: 1 level — reject if parent is itself a subtask
  if (parentTaskId) {
    const parent = await prisma.task.findFirst({
      where: { id: parentTaskId, userId: user.id },
      select: { parentTaskId: true },
    });
    if (!parent) return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
    if (parent.parentTaskId) {
      return NextResponse.json({ error: "Subtasks cannot have their own subtasks" }, { status: 400 });
    }
  }

  const lastTask = await prisma.task.findFirst({
    where: { userId: user.id, parentTaskId: parentTaskId ?? null },
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
      parentTaskId: parentTaskId ?? null,
      recurrenceRule: recurrenceRule ?? null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}

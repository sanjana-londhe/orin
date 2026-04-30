import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter");
  const dateParam = searchParams.get("date"); // YYYY-MM-DD — browse a specific day

  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  // Build where clause based on filter
  type WhereClause = Record<string, unknown>;
  let where: WhereClause = { userId: user.id, parentTaskId: null };
  let orderBy: Record<string, string> | Record<string, string>[] = { sortOrder: "asc" };

  // Specific date browse — show all tasks (inc. completed) due on that day
  if (dateParam) {
    const dayStart = new Date(dateParam + "T00:00:00");
    const dayEnd   = new Date(dateParam + "T23:59:59");
    where = { ...where, dueAt: { gte: dayStart, lte: dayEnd } };
    orderBy = { dueAt: "asc" };
  }

  switch (filter) {
    case "today":
      where = { ...where, isCompleted: false, OR: [{ dueAt: null }, { dueAt: { lte: todayEnd } }] };
      break;
    case "scheduled":
      where = { ...where, isCompleted: false, dueAt: { gt: todayEnd } };
      orderBy = { dueAt: "asc" };
      break;
    case "flagged":
      where = { ...where, isCompleted: false, deferredCount: { gt: 0 } };
      orderBy = { deferredCount: "desc" };
      break;
    case "completed":
      where = { ...where, isCompleted: true };
      orderBy = { updatedAt: "desc" };
      break;
    default:
      // "all" — all incomplete, newest first
      where = { ...where, isCompleted: false };
      orderBy = { createdAt: "desc" };
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy,
    include: { subtasks: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  try {
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

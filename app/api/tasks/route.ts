/**
 * /api/tasks
 *
 * Timezone convention: stored timestamps are UTC. Callers that depend on a
 * "day" definition (today, ?date=, ?from=/?to=) pass `?tz=<IANA zone>`. The
 * server computes UTC day boundaries in that zone. Missing/invalid `tz`
 * falls back to UTC. See lib/timezone.ts.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { resolveTz, todayInTz, startOfDayUtc, endOfDayUtc } from "@/lib/timezone";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const filter    = searchParams.get("filter");
  const dateParam = searchParams.get("date"); // YYYY-MM-DD — browse a specific day
  const tz        = resolveTz(searchParams.get("tz"));

  const today    = todayInTz(tz);
  const dayStart = startOfDayUtc(today, tz);
  const dayEnd   = endOfDayUtc(today, tz);

  type WhereClause = Record<string, unknown>;
  let where: WhereClause = { userId: user.id, parentTaskId: null };
  let orderBy: Record<string, string> | Record<string, string>[] = { sortOrder: "asc" };

  // Specific date browse — show all tasks (inc. completed) due on that day.
  if (dateParam) {
    where = {
      ...where,
      dueAt: { gte: startOfDayUtc(dateParam, tz), lte: endOfDayUtc(dateParam, tz) },
    };
    orderBy = { dueAt: "asc" };
  }

  switch (filter) {
    case "today":
      where = { ...where, isCompleted: false };
      break;
    case "scheduled":
      where = { ...where, isCompleted: false, dueAt: { gt: dayEnd } };
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
    case "today-completed":
      // All tasks completed today (by updatedAt) — not limited to those due today.
      where = { ...where, isCompleted: true, updatedAt: { gte: dayStart } };
      orderBy = { updatedAt: "desc" };
      break;
    case "today-active":
      where = { ...where, isCompleted: false };
      break;
    case "calendar": {
      // All tasks (complete + incomplete) within a date range from the client.
      const from = searchParams.get("from");
      const to   = searchParams.get("to");
      const yearStart = `${new Date().getUTCFullYear()}-01-01`;
      const yearEnd   = `${new Date().getUTCFullYear() + 1}-12-31`;
      where = {
        ...where,
        dueAt: {
          gte: startOfDayUtc(from ?? yearStart, tz),
          lte: endOfDayUtc(to ?? yearEnd, tz),
        },
      };
      orderBy = { dueAt: "asc" };
      break;
    }
    default:
      // "all" — all incomplete, newest first.
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

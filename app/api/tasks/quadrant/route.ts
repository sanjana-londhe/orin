import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const EMOTIONAL_WEIGHT: Record<string, number> = {
  DREADING: 5, ANXIOUS: 4, NEUTRAL: 3, WILLING: 2, EXCITED: 1,
};

const PERIOD_HOURS: Record<string, number> = {
  today:   24,
  week:    24 * 7,
  month:   24 * 30,
  quarter: 24 * 90,
  year:    24 * 365,
};

function urgencyScore(dueAt: Date | null, periodHours: number): number {
  if (!dueAt) return 0;
  const hoursRemaining = (dueAt.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursRemaining <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - hoursRemaining / periodHours));
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "week";
  const from   = searchParams.get("from");
  const to     = searchParams.get("to");

  const now = new Date();
  const periodHours = period === "custom" && from && to
    ? (new Date(to + "T23:59:59").getTime() - new Date(from + "T00:00:00").getTime()) / (1000 * 60 * 60)
    : PERIOD_HOURS[period] ?? 168;

  // Bidirectional window: past N hours → future N hours (so completed tasks are included)
  let windowStart: Date | null = null;
  let windowEnd: Date | null = null;

  if (period === "custom" && from && to) {
    windowStart = new Date(from + "T00:00:00");
    windowEnd   = new Date(to   + "T23:59:59");
  } else if (PERIOD_HOURS[period]) {
    const ms = PERIOD_HOURS[period] * 60 * 60 * 1000;
    windowStart = new Date(now.getTime() - ms);
    windowEnd   = new Date(now.getTime() + ms);
  }

  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id, parentTaskId: null,
      OR: windowStart && windowEnd ? [
        { dueAt: null },
        { dueAt: { gte: windowStart, lte: windowEnd } },
      ] : undefined,
    },
    select: { id: true, title: true, emotionalState: true, dueAt: true, deferredCount: true, isCompleted: true },
  });

  const result = tasks.map(t => ({
    id:              t.id,
    title:           t.title,
    emotionalState:  t.emotionalState,
    urgencyScore:    urgencyScore(t.dueAt, periodHours),
    emotionalWeight: EMOTIONAL_WEIGHT[t.emotionalState] ?? 3,
    dueAt:           t.dueAt,
    deferredCount:   t.deferredCount,
    isCompleted:     t.isCompleted,
  }));

  return NextResponse.json(result);
}

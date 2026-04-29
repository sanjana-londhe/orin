import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Last 7 days window
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const [deferrals, completed, mostDeferred] = await Promise.all([
    // All deferrals in the past 7 days with their task's emotional state
    prisma.deferralLog.findMany({
      where: { userId: user.id, createdAt: { gte: weekStart } },
      include: { task: { select: { emotionalState: true, title: true } } },
    }),

    // Completed tasks in the past 7 days
    prisma.task.count({
      where: { userId: user.id, isCompleted: true, updatedAt: { gte: weekStart } },
    }),

    // Task with the highest deferred_count this week
    prisma.task.findFirst({
      where: { userId: user.id },
      orderBy: { deferredCount: "desc" },
      select: { id: true, title: true, deferredCount: true, emotionalState: true },
    }),
  ]);

  // Group deferrals by emotional state
  const deferrals_by_state: Record<string, number> = {
    DREADING: 0, ANXIOUS: 0, NEUTRAL: 0, WILLING: 0, EXCITED: 0,
  };
  for (const d of deferrals) {
    const state = d.task?.emotionalState;
    if (state && state in deferrals_by_state) deferrals_by_state[state]++;
  }

  return NextResponse.json({
    week_start: weekStart.toISOString(),
    total_deferrals: deferrals.length,
    total_completed: completed,
    deferrals_by_state,
    most_deferred_task: (mostDeferred?.deferredCount ?? 0) > 0 ? mostDeferred : null,
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const EMOTIONAL_WEIGHT: Record<string, number> = {
  DREADING: 5,
  ANXIOUS:  4,
  NEUTRAL:  3,
  WILLING:  2,
  EXCITED:  1,
};

function urgencyScore(dueAt: Date | null): number {
  if (!dueAt) return 0;
  const hoursRemaining = (dueAt.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursRemaining <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - hoursRemaining / 168));
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { userId: user.id, parentTaskId: null, isCompleted: false },
    select: { id: true, title: true, emotionalState: true, dueAt: true, deferredCount: true },
  });

  const result = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    emotionalState: t.emotionalState,
    urgencyScore: urgencyScore(t.dueAt),
    emotionalWeight: EMOTIONAL_WEIGHT[t.emotionalState] ?? 3,
    dueAt: t.dueAt,
    deferredCount: t.deferredCount,
  }));

  return NextResponse.json(result);
}

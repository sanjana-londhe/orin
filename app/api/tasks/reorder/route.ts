import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ordered_ids } = await request.json();
  if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
    return NextResponse.json({ error: "ordered_ids array required" }, { status: 400 });
  }

  // Verify all tasks belong to this user
  const tasks = await prisma.task.findMany({
    where: { id: { in: ordered_ids }, userId: user.id },
    select: { id: true },
  });
  if (tasks.length !== ordered_ids.length) {
    return NextResponse.json({ error: "Some tasks not found" }, { status: 404 });
  }

  // Write sort_order spaced by 1000 to leave room for future inserts
  await prisma.$transaction(
    ordered_ids.map((id: string, index: number) =>
      prisma.task.update({
        where: { id },
        data: { sortOrder: index * 1000 },
      })
    )
  );

  return NextResponse.json({ ok: true });
}

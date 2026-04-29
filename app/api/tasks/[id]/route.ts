import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { title, dueAt, emotionalState, isCompleted, sortOrder } = body;

  const existing = await prisma.task.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(dueAt !== undefined && { dueAt: dueAt ? new Date(dueAt) : null }),
      ...(emotionalState !== undefined && { emotionalState }),
      ...(isCompleted !== undefined && { isCompleted }),
      ...(sortOrder !== undefined && { sortOrder }),
      lastTouchedAt: new Date(),
    },
  });

  return NextResponse.json(task);
}

export async function DELETE(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.task.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cascade handled by Prisma schema (onDelete: Cascade on subtasks/history/deferrals)
  await prisma.task.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}

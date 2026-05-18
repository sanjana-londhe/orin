import { z } from "zod";
import { NextResponse } from "next/server";

const EMOTIONAL_STATES = ["DREADING", "ANXIOUS", "NEUTRAL", "WILLING", "EXCITED"] as const;

const isoDate = z.string().refine(
  (s) => !Number.isNaN(Date.parse(s)),
  { message: "Invalid date" },
);

export const TaskCreateSchema = z.object({
  title:           z.string().trim().min(1, "Title is required").max(500),
  dueAt:           isoDate.nullable().optional(),
  emotionalState:  z.enum(EMOTIONAL_STATES).optional(),
  parentTaskId:    z.string().nullable().optional(),
  recurrenceRule:  z.string().nullable().optional(),
});

export const TaskUpdateSchema = z.object({
  title:           z.string().trim().min(1).max(500).optional(),
  dueAt:           isoDate.nullable().optional(),
  emotionalState:  z.enum(EMOTIONAL_STATES).optional(),
  isCompleted:     z.boolean().optional(),
  sortOrder:       z.number().int().optional(),
});

export const DeferSchema = z.object({
  new_due_at: isoDate,
  confirmed:  z.literal(true),
  reason:     z.string().max(500).nullable().optional(),
});

/**
 * Parse a request body against a Zod schema. Returns either the parsed data
 * or a 400 NextResponse with the validation issues. Usage:
 *
 *   const parsed = await parseJson(request, TaskCreateSchema);
 *   if (parsed instanceof NextResponse) return parsed;
 *   const data = parsed;
 */
export async function parseJson<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T> | NextResponse> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 400 },
    );
  }
  return result.data;
}

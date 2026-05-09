import { prisma } from "@/lib/prisma";

// In-memory cache — skips the DB count query for warm function instances
const seededUsers = new Set<string>();

export async function seedOnboardingTasks(userId: string) {
  if (seededUsers.has(userId)) return;

  const count = await prisma.task.count({ where: { userId, parentTaskId: null } });
  seededUsers.add(userId); // cache regardless — if count > 0 no need to check again
  if (count > 0) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = (offsetDays: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offsetDays);
    return dt;
  };

  await prisma.task.createMany({
    data: [
      { userId, title: "Add your first task — pick a feeling that matches how you feel about it", emotionalState: "EXCITED",  dueAt: d(0), sortOrder: 1 },
      { userId, title: "Log an energy check-in in My Energy to start tracking your mood",          emotionalState: "WILLING",  dueAt: d(0), sortOrder: 2 },
      { userId, title: "Visit the Feeling Map to see your tasks plotted by urgency and emotion",   emotionalState: "WILLING",  dueAt: d(1), sortOrder: 3 },
      { userId, title: "Open the Calendar and see how your week looks at a glance",                emotionalState: "EXCITED",  dueAt: d(1), sortOrder: 4 },
      { userId, title: "Explore All Tasks — filter by time period and see everything in one place",emotionalState: "NEUTRAL",  dueAt: d(2), sortOrder: 5 },
    ],
  });
}

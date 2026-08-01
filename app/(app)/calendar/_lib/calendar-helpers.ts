import type { TaskWithSubtasks } from "@/lib/types";
import { EMOTION_MAP } from "@/lib/emotions";

export const DAY_NAMES   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export function em(key: string) {
  return EMOTION_MAP[key as keyof typeof EMOTION_MAP] ?? EMOTION_MAP.NEUTRAL;
}

export function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

export function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

export function fmtTime(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const iso = new Date(dueAt).toISOString();
  if (iso.slice(11) === "00:00:00.000Z") return null;
  return new Date(dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function loadNote(id: string) {
  try { return localStorage.getItem(`orin_note_${id}`) ?? ""; } catch { return ""; }
}

export function persistNote(id: string, text: string) {
  try {
    if (text.trim()) localStorage.setItem(`orin_note_${id}`, text);
    else localStorage.removeItem(`orin_note_${id}`);
  } catch {}
}

export function isOverdue(task: TaskWithSubtasks): boolean {
  if (task.isCompleted || !task.dueAt) return false;
  const iso = new Date(task.dueAt).toISOString();
  // date-only sentinel: compare dates
  if (iso.slice(11) === "00:00:00.000Z") {
    return iso.slice(0, 10) < new Date().toISOString().slice(0, 10);
  }
  return new Date(task.dueAt) < new Date();
}

export function taskDayState(task: TaskWithSubtasks): "overdue" | "today" | "future" | "none" {
  if (!task.dueAt) return "none";
  const iso = new Date(task.dueAt).toISOString();
  const taskDate = iso.slice(11) === "00:00:00.000Z"
    ? iso.slice(0, 10)
    : (() => {
        const d = new Date(task.dueAt as string | Date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })();
  const todayIso = new Date().toISOString().slice(0, 10);
  if (taskDate < todayIso) return "overdue";
  if (taskDate === todayIso) return "today";
  return "future";
}

export function pillStyle(task: TaskWithSubtasks): React.CSSProperties {
  // Completed → grey with strikethrough (clear visual on the grid)
  if (task.isCompleted) return { background: "#f5f5f7", color: "#6e6e73" };
  // Active → colour based on due date
  const state = taskDayState(task);
  if (state === "overdue") return { background: "#fdf0f0", color: "#d70015" };
  if (state === "today")   return { background: "#eef7f1", color: "#248a3d" };
  return { background: "#f5f5f7", color: "#6e6e73" }; // future / no date
}

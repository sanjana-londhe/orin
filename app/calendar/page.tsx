"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TaskWithSubtasks } from "@/lib/types";

// ── Emotion colours ──────────────────────────────────────────────────
const EMOTION_COLOUR: Record<string, string> = {
  DREADING: "#c23934",
  ANXIOUS:  "#886a00",
  NEUTRAL:  "#c4cbc2",
  WILLING:  "#2b6b5e",
  EXCITED:  "#59d10b",
};

const EMOTION_LABEL: Record<string, string> = {
  DREADING: "Dreading",
  ANXIOUS:  "Anxious",
  NEUTRAL:  "Neutral",
  WILLING:  "Willing",
  EXCITED:  "Excited",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Helpers ──────────────────────────────────────────────────────────
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

// ── Page ─────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(isoDate(today));

  const { data: tasks = [], isLoading } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", "all"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to load tasks");
      return res.json();
    },
  });

  // Map tasks by ISO date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskWithSubtasks[]>();
    for (const t of tasks) {
      if (!t.dueAt) continue;
      const key = isoDate(new Date(t.dueAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks]);

  // Build calendar grid
  const { days, month, year } = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
    ];
    return { days, month, year };
  }, [viewDate]);

  const selectedTasks = tasksByDate.get(selected) ?? [];
  const selectedDate = new Date(selected + "T12:00:00");

  function prevMonth() {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  }

  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <div className="mx-auto max-w-[860px] px-6 py-10">

        {/* Page header */}
        <div className="mb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--stone-500)] mb-1">
            Schedule
          </p>
          <h1 className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-[var(--lime-ink)]">
            Calendar
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">

          {/* ── Calendar grid ── */}
          <div className="bg-white rounded-[16px] border-[1.5px] border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] overflow-hidden">

            {/* Month navigation */}
            <div className="px-5 py-4 border-b border-[var(--stone-400)] bg-[var(--lime-subtle)] flex items-center justify-between">
              <button
                onClick={prevMonth}
                aria-label="Previous month"
                className="w-8 h-8 rounded-[6px] border border-[var(--stone-400)] bg-white flex items-center justify-center text-[var(--stone-500)] hover:bg-[var(--lime-subtle)] hover:border-[var(--stone-500)] transition-all"
              >
                ‹
              </button>
              <p className="text-[15px] font-bold text-[var(--lime-ink)] tracking-[-0.02em]">
                {new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <button
                onClick={nextMonth}
                aria-label="Next month"
                className="w-8 h-8 rounded-[6px] border border-[var(--stone-400)] bg-white flex items-center justify-center text-[var(--stone-500)] hover:bg-[var(--lime-subtle)] hover:border-[var(--stone-500)] transition-all"
              >
                ›
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-[var(--stone-300)]">
              {DAYS.map((d) => (
                <div key={d} className="py-2 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--stone-500)]">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="aspect-square border-b border-r border-[var(--stone-300)] last:border-r-0" />;

                const key = isoDate(day);
                const dayTasks = tasksByDate.get(key) ?? [];
                const isToday = sameDay(day, today);
                const isSelected = key === selected;

                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    className={cn(
                      "aspect-square border-b border-r border-[var(--stone-300)] p-1.5 flex flex-col items-start transition-all text-left",
                      i % 7 === 6 && "border-r-0",
                      isSelected
                        ? "bg-[var(--lime-subtle)] border-[var(--lime-border)]"
                        : "hover:bg-[var(--stone-100)]",
                      isToday && !isSelected && "bg-[#f0fdf4]"
                    )}
                  >
                    <span className={cn(
                      "text-[12px] font-semibold leading-none mb-1",
                      isToday
                        ? "w-5 h-5 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center text-[10px]"
                        : "text-[var(--lime-ink)]"
                    )}>
                      {day.getDate()}
                    </span>
                    {/* Emotion dots — up to 4 */}
                    {dayTasks.length > 0 && (
                      <div className="flex flex-wrap gap-[3px]">
                        {dayTasks.slice(0, 4).map((t) => (
                          <span
                            key={t.id}
                            className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                            style={{ background: EMOTION_COLOUR[t.emotionalState] ?? "#c4cbc2" }}
                            aria-hidden="true"
                          />
                        ))}
                        {dayTasks.length > 4 && (
                          <span className="text-[8px] text-[var(--stone-500)] leading-none mt-px">
                            +{dayTasks.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Day panel ── */}
          <div className="bg-white rounded-[16px] border-[1.5px] border-[var(--stone-400)] overflow-hidden">
            {/* Panel header */}
            <div className="px-4 py-3 border-b border-[var(--stone-300)] bg-[var(--stone-100)]">
              <p className="text-[13px] font-bold text-[var(--lime-ink)]">
                {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <p className="font-mono text-[10px] text-[var(--stone-500)] mt-0.5">
                {selectedTasks.length === 0
                  ? "No tasks due"
                  : `${selectedTasks.length} task${selectedTasks.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            {/* Task list for selected day */}
            <div className="divide-y divide-[var(--stone-300)]">
              {isLoading ? (
                <div className="px-4 py-8 flex justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-[var(--stone-400)] border-t-[hsl(var(--primary))] animate-spin" />
                </div>
              ) : selectedTasks.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <span className="text-3xl" aria-hidden="true">🌿</span>
                  <p className="text-[12.5px] text-[var(--stone-500)] mt-2">Nothing due this day</p>
                  <Link href="/" className="mt-3 inline-block text-[12px] font-semibold text-[hsl(var(--primary))] hover:underline">
                    Add a task →
                  </Link>
                </div>
              ) : (
                selectedTasks.map((task) => (
                  <div key={task.id} className="px-4 py-3 flex items-start gap-3">
                    {/* Emotion dot */}
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                      style={{ background: EMOTION_COLOUR[task.emotionalState] ?? "#c4cbc2" }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[var(--lime-ink)] leading-snug">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-[var(--stone-500)] mt-0.5 flex items-center gap-2">
                        <span style={{ color: EMOTION_COLOUR[task.emotionalState] ?? "#c4cbc2" }}>
                          {EMOTION_LABEL[task.emotionalState] ?? task.emotionalState}
                        </span>
                        {task.dueAt && (
                          <span>
                            {new Date(task.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {task.deferredCount > 0 && (
                          <span className="text-[#c23934]">deferred {task.deferredCount}×</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { QuadrantMap, type QuadrantTask } from "@/components/QuadrantMap";

async function fetchQuadrantData(): Promise<QuadrantTask[]> {
  const res = await fetch("/api/tasks/quadrant");
  if (!res.ok) throw new Error("Failed to load quadrant data");
  return res.json();
}

export default function QuadrantPage() {
  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ["tasks", "quadrant"],
    queryFn: fetchQuadrantData,
  });

  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <div className="mx-auto max-w-[860px] px-4 py-6 sm:px-6 sm:py-10">
        {/* Header */}
        <div className="mb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--stone-500)] mb-1">
            Visualization
          </p>
          <h1 className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-[var(--lime-ink)] mb-1">
            Task Quadrant
          </h1>
          <p className="text-[13.5px] text-[var(--stone-500)]">
            Urgency vs. how you feel — your personal radar
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border-[1.5px] border-[var(--ink)] rounded-[16px] overflow-hidden shadow-[3px_3px_0_var(--ink)]">
          {/* Card header */}
          <div className="px-6 py-4 border-b border-[var(--stone-400)] bg-[var(--lime-subtle)]">
            <p className="text-[13.5px] font-bold text-[var(--lime-ink)]">
              Emotional Task Quadrant Map
            </p>
            <p className="text-[11px] text-[var(--stone-500)] mt-0.5">
              {tasks.length} active task{tasks.length !== 1 ? "s" : ""} plotted by urgency and emotional state
            </p>
          </div>

          {/* Map */}
          <div className="px-6 py-5">
            {isLoading && (
              <div className="h-[300px] rounded-[12px] bg-[var(--lime-subtle)] animate-pulse" />
            )}
            {isError && (
              <p className="text-sm text-[hsl(var(--destructive))]">
                Could not load quadrant data.
              </p>
            )}
            {!isLoading && !isError && (
              tasks.length === 0 ? (
                <div className="h-[300px] flex flex-col items-center justify-center gap-3 rounded-[12px] bg-[var(--lime-subtle)] border border-[var(--lime-border)]">
                  <span className="text-4xl" aria-hidden="true">⬡</span>
                  <p className="text-sm text-[var(--stone-500)]">No active tasks to plot yet</p>
                </div>
              ) : (
                <QuadrantMap tasks={tasks} />
              )
            )}
          </div>
        </div>

        {/* Axis explanation */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-[12px] border border-[var(--stone-400)] bg-white px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--stone-500)] mb-1">
              X-axis — Urgency
            </p>
            <p className="text-[12.5px] text-[var(--lime-ink)]">
              How close the deadline is. Tasks due within a week move right. Overdue = far right.
            </p>
          </div>
          <div className="rounded-[12px] border border-[var(--stone-400)] bg-white px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--stone-500)] mb-1">
              Y-axis — Emotional weight
            </p>
            <p className="text-[12.5px] text-[var(--lime-ink)]">
              How you feel about the task. Dreading = top, Excited = bottom.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

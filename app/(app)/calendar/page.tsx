"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { TaskWithSubtasks } from "@/lib/types";
import { withTz } from "@/lib/client-tz";
import { DAY_NAMES, isoDate, fmtTime, pillStyle } from "./_lib/calendar-helpers";
import { CalendarSkeleton, MobileCalendarSkeleton } from "./_components/CalendarSkeleton";
import { MobileCalendar } from "./_components/MobileCalendar";
import { DayTaskListModal } from "./_components/DayTaskListModal";
import { TaskFocusPopup } from "./_components/TaskFocusPopup";

export default function CalendarPage() {
  const queryClient  = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile     = useIsMobile();
  // Pin `today` once per mount so range computation and the rolling agenda
  // stay stable across renders.
  const today        = useMemo(() => new Date(), []);

  const [viewDate, setViewDate]         = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [createDate, setCreateDate]     = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithSubtasks | null>(null);
  const [dayTaskList, setDayTaskList]   = useState<string | null>(null);

  // Mobile renders a rolling agenda (today − 60 → today + 240), so the fetch
  // range covers that whole window. Desktop keeps the per-month ±1 window.
  const viewYear  = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const { rangeFrom, rangeTo } = useMemo(() => {
    if (isMobile) {
      const from = new Date(today); from.setDate(from.getDate() - 60);
      const to   = new Date(today); to.setDate(to.getDate() + 240);
      return { rangeFrom: from.toISOString().slice(0, 10), rangeTo: to.toISOString().slice(0, 10) };
    }
    return {
      rangeFrom: new Date(viewYear, viewMonth - 1, 1).toISOString().slice(0, 10),
      rangeTo:   new Date(viewYear, viewMonth + 2, 0).toISOString().slice(0, 10),
    };
  }, [isMobile, today, viewYear, viewMonth]);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", "calendar", rangeFrom, rangeTo],
    queryFn: async () => {
      const res = await fetch(withTz(`/api/tasks?filter=calendar&from=${rangeFrom}&to=${rangeTo}`));
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  function optimisticToggle(id: string, isCompleted: boolean) {
    queryClient.setQueriesData<TaskWithSubtasks[]>(
      { queryKey: ["tasks", "calendar"], exact: false },
      old => old ? old.map(t => t.id === id ? { ...t, isCompleted } : t) : []
    );
  }

  const { mutate: markDone } = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    onMutate: (id) => optimisticToggle(id, true),
    onError:  (_e, id) => optimisticToggle(id, false),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] }),
  });

  const { mutate: markUndone } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isCompleted: false }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: (id) => optimisticToggle(id, false),
    onError:  (_e, id) => optimisticToggle(id, true),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] }),
  });

  const { mutate: deleteTask } = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    onMutate: (id) => {
      queryClient.setQueriesData<TaskWithSubtasks[]>({ queryKey: ["tasks", "calendar"], exact: false }, old => old ? old.filter(t => t.id !== id) : []);
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] }); setSelectedTask(null); },
  });

  const { mutate: updateTask } = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: ({ id, patch }) => {
      queryClient.setQueriesData<TaskWithSubtasks[]>({ queryKey: ["tasks", "calendar"], exact: false }, old => old ? old.map(t => t.id === id ? { ...t, ...patch } : t) : []);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks", "calendar"] }),
  });

  const todayIso = isoDate(today);

  // selectedTask is captured at click time, but optimistic toggles only
  // update the query cache. Re-deriving from `tasks` keeps the focus popup's
  // checkbox in sync with mark-done / mark-undone.
  const liveSelectedTask = useMemo(() => {
    if (!selectedTask) return null;
    return tasks.find(t => t.id === selectedTask.id) ?? selectedTask;
  }, [tasks, selectedTask]);

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

  const { days, month, year } = useMemo(() => {
    const year     = viewDate.getFullYear();
    const month    = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
    ];
    while (days.length % 7 !== 0) days.push(null);
    return { days, month, year };
  }, [viewDate]);

  // ── Mobile render ─────────────────────────────────────────────────
  if (isMobile) {
    if (tasksLoading) return <MobileCalendarSkeleton />;
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <MobileCalendar
          tasksByDate={tasksByDate} today={today}
          onAddTask={date => { if (date < todayIso) return; setCreateDate(date); }}
          onTaskTap={task => setSelectedTask(task)}
        />

        {liveSelectedTask && (
          <TaskFocusPopup
            task={liveSelectedTask}
            onClose={() => setSelectedTask(null)}
            onMarkDone={id => markDone(id)}
            onMarkUndone={id => markUndone(id)}
            onUpdate={(id, patch) => updateTask({ id, patch })}
            onDelete={id => { deleteTask(id); setSelectedTask(null); }}
          />
        )}
        <TaskCreateModal open={!!createDate} onOpenChange={open => { if (!open) setCreateDate(null); }} defaultDate={createDate ?? undefined} />
      </div>
    );
  }

  // ── Desktop render ────────────────────────────────────────────────
  if (tasksLoading) return <CalendarSkeleton />;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px 16px", borderBottom: "1px solid #dde4de", flexShrink: 0 }}>
        <div>
          <p style={{ fontFamily: "inherit", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4a6d47", margin: "0 0 4px" }}>Workspace · Calendar</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #dde4de", background: "#fff", cursor: "pointer", fontSize: 14, color: "#4a6d47", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.03em", color: "#082d1d", lineHeight: 1, margin: 0 }}>
              {new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h1>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #dde4de", background: "#fff", cursor: "pointer", fontSize: 14, color: "#4a6d47", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          </div>
        </div>
        <div />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #dde4de", flexShrink: 0 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ padding: "8px 0", textAlign: "center", fontFamily: "inherit", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#b9d3c4" }}>{d}</div>
        ))}
      </div>

      <div ref={containerRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {days.map((day, i) => {
            if (!day) return (
              <div key={`empty-${i}`} style={{ height: 130, borderRight: i % 7 !== 6 ? "1px solid #dde4de" : "none", borderBottom: "1px solid #dde4de", background: "#fafbf7" }} />
            );

            const key          = isoDate(day);
            const dayTasks     = tasksByDate.get(key) ?? [];
            const isToday      = key === isoDate(today);
            const isOtherMonth = day.getMonth() !== month;
            const MAX_VISIBLE  = 3;
            const visible      = dayTasks.slice(0, MAX_VISIBLE);
            const overflow     = dayTasks.length - MAX_VISIBLE;
            const isPast       = key < todayIso;

            return (
              <div key={key}
                onClick={() => { if (!isPast) setCreateDate(key); }}
                style={{
                  height: 130, overflow: "hidden",
                  borderRight: i % 7 !== 6 ? "1px solid #dde4de" : "none",
                  borderBottom: "1px solid #dde4de",
                  borderTop: isToday ? "2px solid #059669" : "none",
                  padding: "6px 6px 4px",
                  background: isOtherMonth || isPast ? "#fafbf7" : "#fff",
                  cursor: isPast ? "default" : "pointer", transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!isOtherMonth && !isPast) (e.currentTarget as HTMLElement).style.background = "#f2fdec"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isOtherMonth || isPast ? "#fafbf7" : "#fff"; }}
              >
                <div style={{ marginBottom: 4, display: "flex", justifyContent: "center" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: isToday ? 700 : 400, background: isToday ? "#059669" : "transparent", color: isToday ? "#fff" : isOtherMonth ? "#c4cbc2" : "#082d1d" }}>
                    {day.getDate()}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {visible.map(task => {
                    const ps = pillStyle(task);
                    return (
                      <div key={task.id}
                        onClick={e => { e.stopPropagation(); setDayTaskList(key); }}
                        style={{ display: "flex", alignItems: "center", padding: "2px 6px", borderRadius: 4, background: ps.background, cursor: "pointer", overflow: "hidden" }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 500, color: ps.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textDecoration: task.isCompleted ? "line-through" : "none" }}>
                          {fmtTime(task.dueAt) && <>{fmtTime(task.dueAt)} </>}{task.title}
                        </span>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); setDayTaskList(key); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#059669", fontWeight: 600, padding: "0 4px", textAlign: "left", fontFamily: "inherit" }}>
                      +{overflow} more
                    </button>
                  )}
                  {dayTasks.length === 0 && (
                    <div style={{ textAlign: "center", marginTop: 4, fontSize: 14, color: "#dde4de", lineHeight: 1 }}>+</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {dayTaskList && (
        <DayTaskListModal
          date={dayTaskList}
          tasks={tasksByDate.get(dayTaskList) ?? []}
          onClose={() => setDayTaskList(null)}
          onMarkDone={id => markDone(id)}
          onMarkUndone={id => markUndone(id)}
          onUpdate={(id, patch) => updateTask({ id, patch })}
          onDelete={id => {
            deleteTask(id);
            if ((tasksByDate.get(dayTaskList) ?? []).length <= 1) setDayTaskList(null);
          }}
        />
      )}
      <TaskCreateModal open={!!createDate} onOpenChange={open => { if (!open) setCreateDate(null); }} defaultDate={createDate ?? undefined} />
    </div>
  );
}

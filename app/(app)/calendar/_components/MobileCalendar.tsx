"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { TaskWithSubtasks } from "@/lib/types";
import { DAY_NAMES, MONTH_NAMES, isoDate, fmtTime, pillStyle } from "../_lib/calendar-helpers";

interface Props {
  tasksByDate: Map<string, TaskWithSubtasks[]>;
  today: Date;
  onAddTask: (date: string) => void;
  onTaskTap: (task: TaskWithSubtasks) => void;
}

/**
 * Rolling agenda for mobile: today anchored on open, scroll up to revisit
 * past dates and down to plan ahead. Header label tracks the topmost
 * visible day's month.
 */
export function MobileCalendar({ tasksByDate, today, onAddTask, onTaskTap }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayIso = isoDate(today);
  const [headerLabel, setHeaderLabel] = useState(`${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`);

  // 60 days back, 240 days forward — ~10 months of agenda.
  const daysArr = useMemo(() => {
    const start = new Date(today); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 60);
    return Array.from({ length: 301 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i);
      return d;
    });
  }, [todayIso]); // eslint-disable-line react-hooks/exhaustive-deps

  // Position today's row at the top of the scroll container on mount.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const todayRow = el.querySelector<HTMLElement>('[data-today="true"]');
    if (todayRow) el.scrollTop = todayRow.offsetTop;
  }, [todayIso]);

  // Header label tracks the month of whichever day row is currently topmost.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function update() {
      if (!el) return;
      const containerTop = el.getBoundingClientRect().top;
      const rows = el.querySelectorAll<HTMLElement>("[data-day]");
      for (const row of Array.from(rows)) {
        const r = row.getBoundingClientRect();
        if (r.top + r.height > containerTop + 1) {
          const iso = row.dataset.day!;
          const d = new Date(iso + "T12:00:00");
          setHeaderLabel(`${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`);
          break;
        }
      }
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    return () => el.removeEventListener("scroll", update);
  }, []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #e0e0e0", flexShrink: 0, background: "#fff", textAlign: "center" }}>
        <h1 style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f", letterSpacing: "-0.02em", margin: 0, fontFamily: "inherit" }}>
          {headerLabel}
        </h1>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {daysArr.map(day => {
          const key      = isoDate(day);
          const dayTasks = tasksByDate.get(key) ?? [];
          const isToday  = key === todayIso;
          const dow      = DAY_NAMES[day.getDay()];
          const isPast   = key < todayIso;

          return (
            <div
              key={key}
              data-day={key}
              data-today={isToday ? "true" : undefined}
              style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid #f5f5f7", minHeight: 56, background: isToday ? "#f5f5f7" : isPast ? "#fafafc" : "#fff" }}
            >
              <div style={{ width: 56, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 2, padding: "12px 0 8px", borderRight: `2px solid ${isToday ? "#0066cc" : "#f0f0f0"}` }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: isToday ? "#0066cc" : isPast ? "#d2d2d7" : "#c7c7cc", textTransform: "uppercase" }}>{dow}</span>
                <span style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: isToday ? 700 : 500, background: isToday ? "#0066cc" : "transparent", color: isToday ? "#fff" : isPast ? "#d2d2d7" : "#1d1d1f" }}>{day.getDate()}</span>
              </div>

              <div
                onClick={() => { if (!isPast) onAddTask(key); }}
                style={{ flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 5, cursor: isPast ? "default" : "pointer" }}
              >
                {dayTasks.map(task => {
                  const ps = pillStyle(task);
                  return (
                    <div
                      key={task.id}
                      onClick={e => { e.stopPropagation(); onTaskTap(task); }}
                      style={{
                        padding: "4px 10px", borderRadius: 8,
                        background: ps.background, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6, overflow: "hidden",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 500, color: ps.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textDecoration: task.isCompleted ? "line-through" : "none" }}>
                        {fmtTime(task.dueAt) && <span style={{ fontFamily: "inherit", marginRight: 4, opacity: 0.8 }}>{fmtTime(task.dueAt)}</span>}
                        {task.title}
                      </span>
                    </div>
                  );
                })}
                {!isPast && (
                  <button
                    onClick={e => { e.stopPropagation(); onAddTask(key); }}
                    style={{
                      background: dayTasks.length === 0 ? "#f5f5f7" : "none",
                      border: dayTasks.length === 0 ? "1px dashed #d2d2d7" : "none",
                      borderRadius: 8, cursor: "pointer",
                      fontSize: 11, fontWeight: 500, color: "#0066cc",
                      display: "flex", alignItems: "center", gap: 5,
                      fontFamily: "inherit",
                      padding: dayTasks.length === 0 ? "6px 10px" : "4px 0",
                      alignSelf: "flex-start",
                    }}
                  >
                    <Plus size={12} /> {dayTasks.length === 0 ? "Add task" : "Add"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}

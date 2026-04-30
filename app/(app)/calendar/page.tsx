"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { getEmotion } from "@/lib/emotions";
import type { TaskWithSubtasks } from "@/lib/types";

const EMOTION_COLOUR: Record<string, string> = {
  DREADING: "#c23934",
  ANXIOUS:  "#886a00",
  NEUTRAL:  "#c4cbc2",
  WILLING:  "#2b6b5e",
  EXCITED:  "#59d10b",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ── Task popover (no backdrop) ──────────────────────────────────────
interface PopoverProps {
  task: TaskWithSubtasks;
  anchorRect: DOMRect;
  containerRect: DOMRect;
  onClose: () => void;
  onMarkDone: (id: string) => void;
}

function TaskPopover({ task, anchorRect, containerRect, onClose, onMarkDone }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const EMOTION_LABEL: Record<string, string> = {
    DREADING: "Dreading", ANXIOUS: "Anxious", NEUTRAL: "Neutral",
    WILLING: "Willing", EXCITED: "Excited",
  };
  const EMOTION_EMOJI: Record<string, string> = {
    DREADING: "😮‍💨", ANXIOUS: "😟", NEUTRAL: "😐", WILLING: "🙂", EXCITED: "🤩",
  };

  // Position relative to container
  const top = anchorRect.bottom - containerRect.top + 6;
  let left = anchorRect.left - containerRect.left;
  const PW = 240;

  // Flip right if overflow
  if (left + PW > containerRect.width - 8) {
    left = anchorRect.right - containerRect.left - PW;
  }
  if (left < 4) left = 4;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: "absolute", top, left, width: PW, zIndex: 50,
      background: "#fff",
      border: "1.5px solid #dde4de",
      borderRadius: 10,
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      padding: "12px 14px",
      fontSize: 12,
    }}>
      {/* Emotion strip */}
      <div style={{ height: 3, background: EMOTION_COLOUR[task.emotionalState] ?? "#c4cbc2", borderRadius: "4px 4px 0 0", margin: "-12px -14px 10px" }} />

      <p style={{ fontWeight: 700, fontSize: 13, color: "#1A1814", marginBottom: 4, lineHeight: 1.3 }}>
        {task.title}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>{EMOTION_EMOJI[task.emotionalState]}</span>
        <span style={{ color: EMOTION_COLOUR[task.emotionalState], fontWeight: 600 }}>
          {EMOTION_LABEL[task.emotionalState]}
        </span>
        {task.dueAt && (
          <span style={{ color: "#B0A89E", marginLeft: "auto" }}>
            {new Date(task.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {task.deferredCount > 0 && (
        <p style={{ color: "#c23934", fontSize: 11, marginBottom: 8 }}>
          deferred {task.deferredCount}×
        </p>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => { onMarkDone(task.id); onClose(); }} style={{
          flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid #dde4de",
          background: "#059669", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer",
        }}>
          ✓ Done
        </button>
        <button onClick={onClose} style={{
          padding: "5px 10px", borderRadius: 6, border: "1px solid #dde4de",
          background: "#fff", color: "#4a6d47", fontSize: 11, cursor: "pointer",
        }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────
export default function CalendarPage() {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ task: TaskWithSubtasks; rect: DOMRect } | null>(null);

  const { data: tasks = [] } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", "all"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  const { mutate: markDone } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  // Group tasks by ISO date
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

  // Build grid
  const { days, month, year } = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
    ];
    // Pad to complete last row
    while (days.length % 7 !== 0) days.push(null);
    return { days, month, year };
  }, [viewDate]);

  function handleDayClick(day: Date, e: React.MouseEvent) {
    // Only create task if clicking the day cell itself, not a task pill
    if ((e.target as HTMLElement).closest("[data-task-pill]")) return;
    setPopover(null);
    setCreateDate(isoDate(day));
  }

  function handleTaskClick(task: TaskWithSubtasks, e: React.MouseEvent) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current!.getBoundingClientRect();
    // Convert to relative position
    const relativeRect = new DOMRect(
      rect.left - containerRect.left,
      rect.top - containerRect.top,
      rect.width,
      rect.height
    );
    setPopover(popover?.task.id === task.id ? null : { task, rect: relativeRect });
  }

  const containerRect = containerRef.current?.getBoundingClientRect() ?? new DOMRect(0, 0, 800, 600);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "0" }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 28px 16px",
        borderBottom: "1px solid #dde4de",
        flexShrink: 0,
      }}>
        <div>
          <p style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#b9d3c4", marginBottom: 2 }}>
            Schedule
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: "#082d1d", lineHeight: 1 }}>
            {new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{
            width: 32, height: 32, borderRadius: 6, border: "1.5px solid #dde4de",
            background: "#fff", cursor: "pointer", fontSize: 16, color: "#4a6d47",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>‹</button>
          <button onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))} style={{
            padding: "0 12px", height: 32, borderRadius: 6, border: "1.5px solid #dde4de",
            background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#4a6d47",
          }}>Today</button>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{
            width: 32, height: 32, borderRadius: 6, border: "1.5px solid #dde4de",
            background: "#fff", cursor: "pointer", fontSize: 16, color: "#4a6d47",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>›</button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #dde4de", flexShrink: 0 }}>
        {DAYS.map(d => (
          <div key={d} style={{
            padding: "8px 0", textAlign: "center",
            fontFamily: "monospace", fontSize: 10, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.08em", color: "#b9d3c4",
          }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid — scrollable, fills remaining height */}
      <div ref={containerRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {days.map((day, i) => {
            if (!day) return (
              <div key={`empty-${i}`} style={{
                minHeight: 110, borderRight: i % 7 !== 6 ? "1px solid #dde4de" : "none",
                borderBottom: "1px solid #dde4de", background: "#fafbf7",
              }} />
            );

            const key = isoDate(day);
            const dayTasks = tasksByDate.get(key) ?? [];
            const isToday = isoDate(day) === isoDate(today);
            const isOtherMonth = day.getMonth() !== month;
            const MAX_VISIBLE = 3;
            const visible = dayTasks.slice(0, MAX_VISIBLE);
            const overflow = dayTasks.length - MAX_VISIBLE;

            return (
              <div key={key}
                onClick={(e) => handleDayClick(day, e)}
                style={{
                  minHeight: 110,
                  borderRight: i % 7 !== 6 ? "1px solid #dde4de" : "none",
                  borderBottom: "1px solid #dde4de",
                  padding: "6px 6px 4px",
                  background: isOtherMonth ? "#fafbf7" : "#fff",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!isOtherMonth) (e.currentTarget as HTMLElement).style.background = "#f2fdec"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isOtherMonth ? "#fafbf7" : "#fff"; }}
              >
                {/* Date number */}
                <div style={{ marginBottom: 4, display: "flex", justifyContent: "center" }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: isToday ? 700 : 400,
                    background: isToday ? "#059669" : "transparent",
                    color: isToday ? "#fff" : isOtherMonth ? "#c4cbc2" : "#082d1d",
                  }}>
                    {day.getDate()}
                  </span>
                </div>

                {/* Task pills */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {visible.map(task => (
                    <div key={task.id} data-task-pill="true"
                      onClick={(e) => handleTaskClick(task, e)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "2px 6px", borderRadius: 4,
                        background: EMOTION_COLOUR[task.emotionalState] + "22",
                        borderLeft: `3px solid ${EMOTION_COLOUR[task.emotionalState]}`,
                        cursor: "pointer", overflow: "hidden",
                      }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: "#082d1d",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        flex: 1,
                      }}>
                        {task.dueAt && new Date(task.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " "}
                        {task.title}
                      </span>
                    </div>
                  ))}
                  {overflow > 0 && (
                    <p style={{ fontSize: 10, color: "#b9d3c4", padding: "0 4px", margin: 0 }}>
                      +{overflow} more
                    </p>
                  )}
                </div>

                {/* + hint on hover */}
                {dayTasks.length === 0 && (
                  <div style={{ textAlign: "center", marginTop: 4, fontSize: 18, color: "#dde4de", lineHeight: 1 }}>
                    +
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Task popover — no backdrop */}
        {popover && containerRef.current && (
          <TaskPopover
            task={popover.task}
            anchorRect={popover.rect}
            containerRect={containerRef.current.getBoundingClientRect()}
            onClose={() => setPopover(null)}
            onMarkDone={markDone}
          />
        )}
      </div>

      {/* Task create modal with pre-filled date */}
      <TaskCreateModal
        open={!!createDate}
        onOpenChange={(open) => { if (!open) setCreateDate(null); }}
        defaultDate={createDate ?? undefined}
      />
    </div>
  );
}

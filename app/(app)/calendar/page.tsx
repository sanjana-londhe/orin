"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { TaskWithSubtasks } from "@/lib/types";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

const EMOTION_COLOUR: Record<string, string> = {
  DREADING: "#c23934",
  ANXIOUS:  "#886a00",
  NEUTRAL:  "#c4cbc2",
  WILLING:  "#2b6b5e",
  EXCITED:  "#59d10b",
};
const EMOTION_EMOJI: Record<string, string> = {
  DREADING: "😮‍💨", ANXIOUS: "😟", NEUTRAL: "😐", WILLING: "🙂", EXCITED: "🤩",
};
const EMOTION_LABEL: Record<string, string> = {
  DREADING: "Dreading", ANXIOUS: "Anxious", NEUTRAL: "Neutral", WILLING: "Willing", EXCITED: "Excited",
};

const DAY_NAMES   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

// ── Desktop task popover ─────────────────────────────────────────────

interface PopoverProps {
  task: TaskWithSubtasks;
  anchorRect: DOMRect;
  containerRect: DOMRect;
  onClose: () => void;
  onMarkDone: (id: string) => void;
}

function TaskPopover({ task, anchorRect, containerRect, onClose, onMarkDone }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const top  = anchorRect.bottom - containerRect.top + 6;
  let left   = anchorRect.left - containerRect.left;
  const PW   = 240;
  if (left + PW > containerRect.width - 8) left = anchorRect.right - containerRect.left - PW;
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
      background: "#fff", border: "1.5px solid #dde4de",
      borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      padding: "12px 14px", fontSize: 12,
    }}>
      <div style={{ height: 3, background: EMOTION_COLOUR[task.emotionalState] ?? "#c4cbc2", borderRadius: "4px 4px 0 0", margin: "-12px -14px 10px" }} />
      <p style={{ fontWeight: 700, fontSize: 13, color: "#1A1814", marginBottom: 4, lineHeight: 1.3 }}>{task.title}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>{EMOTION_EMOJI[task.emotionalState]}</span>
        <span style={{ color: EMOTION_COLOUR[task.emotionalState], fontWeight: 600 }}>{EMOTION_LABEL[task.emotionalState]}</span>
        {task.dueAt && <span style={{ color: "#B0A89E", marginLeft: "auto" }}>{new Date(task.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
      </div>
      {task.deferredCount > 0 && <p style={{ color: "#c23934", fontSize: 11, marginBottom: 8 }}>deferred {task.deferredCount}×</p>}
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => { onMarkDone(task.id); onClose(); }} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid #dde4de", background: "#059669", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>✓ Done</button>
        <button onClick={onClose} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #dde4de", background: "#fff", color: "#4a6d47", fontSize: 11, cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
}

// ── Mobile task detail sheet ─────────────────────────────────────────

function MobileTaskSheet({ task, onClose, onMarkDone }: { task: TaskWithSubtasks; onClose: () => void; onMarkDone: (id: string) => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(8,45,29,0.2)" }} />
      <div style={{
        position: "fixed", bottom: 60, left: 0, right: 0, zIndex: 70,
        background: "#fff", borderRadius: "16px 16px 0 0",
        border: "1.5px solid #dde4de", borderBottom: "none",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.1)",
        padding: "0 0 16px",
        overflow: "hidden",
      }}>
        <div style={{ height: 4, background: EMOTION_COLOUR[task.emotionalState] ?? "#c4cbc2", marginBottom: 16 }} />
        <div style={{ padding: "0 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#082d1d", lineHeight: 1.3, flex: 1, margin: 0 }}>{task.title}</p>
            <button onClick={onClose} style={{ width: 28, height: 28, border: "1.5px solid #dde4de", borderRadius: 8, background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a6d47", flexShrink: 0, marginLeft: 12 }}>
              <X size={13} />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>{EMOTION_EMOJI[task.emotionalState]}</span>
            <span style={{ color: EMOTION_COLOUR[task.emotionalState], fontWeight: 600, fontSize: 13 }}>{EMOTION_LABEL[task.emotionalState]}</span>
            {task.dueAt && <span style={{ color: "#b9d3c4", fontSize: 12, marginLeft: "auto", fontFamily: "monospace" }}>{new Date(task.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>
          <button onClick={() => { onMarkDone(task.id); onClose(); }} style={{
            width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
            background: "#059669", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>✓ Mark as done</button>
        </div>
      </div>
    </>
  );
}

// ── Mobile month picker ──────────────────────────────────────────────

function MonthPicker({ year, month, onSelect, onClose }: { year: number; month: number; onSelect: (y: number, m: number) => void; onClose: () => void }) {
  const [pickerYear, setPickerYear] = useState(year);
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(8,45,29,0.15)" }} />
      <div style={{
        position: "fixed", top: 52, left: 12, right: 12, zIndex: 90,
        background: "#fff", borderRadius: 12,
        border: "1.5px solid #dde4de",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        padding: "12px 8px",
      }}>
        {/* Year navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
          <button onClick={() => setPickerYear(y => y - 1)} style={{ width: 32, height: 32, border: "1px solid #dde4de", borderRadius: 8, background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={14} color="#4a6d47" />
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#082d1d" }}>{pickerYear}</span>
          <button onClick={() => setPickerYear(y => y + 1)} style={{ width: 32, height: 32, border: "1px solid #dde4de", borderRadius: 8, background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={14} color="#4a6d47" />
          </button>
        </div>
        {/* Month grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {MONTH_SHORT.map((m, i) => {
            const isActive = pickerYear === year && i === month;
            return (
              <button key={m} onClick={() => { onSelect(pickerYear, i); onClose(); }} style={{
                padding: "10px 0", borderRadius: 8,
                border: isActive ? "1.5px solid #059669" : "1.5px solid transparent",
                background: isActive ? "#f2fdec" : "transparent",
                color: isActive ? "#059669" : "#082d1d",
                fontSize: 13, fontWeight: isActive ? 700 : 400,
                cursor: "pointer", fontFamily: "inherit",
              }}>{m}</button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Mobile agenda view ───────────────────────────────────────────────

function MobileCalendar({
  viewDate, setViewDate, tasksByDate, today,
  onAddTask, onTaskTap,
}: {
  viewDate: Date;
  setViewDate: (d: Date) => void;
  tasksByDate: Map<string, TaskWithSubtasks[]>;
  today: Date;
  onAddTask: (date: string) => void;
  onTaskTap: (task: TaskWithSubtasks) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArr = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>

      {/* Month header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px 10px",
        borderBottom: "1px solid #dde4de",
        flexShrink: 0,
        background: "#fff",
      }}>
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ width: 36, height: 36, border: "1.5px solid #dde4de", borderRadius: 8, background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={16} color="#4a6d47" />
        </button>

        {/* Clickable month/year → opens picker */}
        <button
          onClick={() => setPickerOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 17, fontWeight: 800, color: "#082d1d",
            letterSpacing: "-0.02em", fontFamily: "inherit",
          }}
        >
          {MONTH_NAMES[month]} {year}
          <ChevronRight size={14} color="#059669" style={{ transform: pickerOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
        </button>

        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ width: 36, height: 36, border: "1.5px solid #dde4de", borderRadius: 8, background: "#f8f9f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronRight size={16} color="#4a6d47" />
        </button>
      </div>

      {/* Month picker dropdown */}
      {pickerOpen && (
        <MonthPicker
          year={year} month={month}
          onSelect={(y, m) => setViewDate(new Date(y, m, 1))}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Day rows — scrollable */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {daysArr.map(day => {
          const key      = isoDate(day);
          const dayTasks = tasksByDate.get(key) ?? [];
          const isToday  = key === isoDate(today);
          const dow      = DAY_NAMES[day.getDay()];
          const MAX      = 3;
          const visible  = dayTasks.slice(0, MAX);
          const overflow = dayTasks.length - MAX;

          return (
            <div key={key} style={{
              display: "flex", alignItems: "stretch",
              borderBottom: "1px solid #f1f3ef",
              minHeight: 56,
              background: isToday ? "#f2fdec" : "#fff",
            }}>
              {/* Left: day + date */}
              <div style={{
                width: 56, flexShrink: 0,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 2, padding: "10px 0",
                borderRight: `2px solid ${isToday ? "#059669" : "#e9ede9"}`,
              }}>
                <span style={{
                  fontSize: 9.5, fontWeight: 600, letterSpacing: "0.04em",
                  color: isToday ? "#059669" : "#b9d3c4",
                  textTransform: "uppercase",
                }}>{dow}</span>
                <span style={{
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: isToday ? 800 : 500,
                  background: isToday ? "#059669" : "transparent",
                  color: isToday ? "#fff" : "#082d1d",
                }}>{day.getDate()}</span>
              </div>

              {/* Right: tasks + add button */}
              <div
                style={{ flex: 1, padding: "8px 12px 8px 10px", display: "flex", flexDirection: "column", gap: 4, cursor: "pointer" }}
                onClick={() => onAddTask(key)}
              >
                {visible.map(task => (
                  <div
                    key={task.id}
                    onClick={e => { e.stopPropagation(); onTaskTap(task); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: EMOTION_COLOUR[task.emotionalState] + "18",
                      borderLeft: `3px solid ${EMOTION_COLOUR[task.emotionalState]}`,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#082d1d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {task.dueAt && <span style={{ color: "#b9d3c4", marginRight: 4, fontSize: 11, fontFamily: "monospace" }}>{new Date(task.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                      {task.title}
                    </span>
                    {task.isCompleted && <span style={{ fontSize: 10, color: "#059669" }}>✓</span>}
                  </div>
                ))}
                {overflow > 0 && (
                  <span style={{ fontSize: 11, color: "#b9d3c4", paddingLeft: 4 }}>+{overflow} more</span>
                )}
                {dayTasks.length === 0 && (
                  <span style={{ fontSize: 12, color: "#dde4de", display: "flex", alignItems: "center", gap: 4 }}>
                    <Plus size={12} /> Add task
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {/* Bottom padding above nav bar */}
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function CalendarPage() {
  const queryClient  = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const today        = new Date();
  const isMobile     = useIsMobile();

  const [viewDate, setViewDate]   = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [popover, setPopover]     = useState<{ task: TaskWithSubtasks; rect: DOMRect } | null>(null);
  const [mobileSheet, setMobileSheet] = useState<TaskWithSubtasks | null>(null);

  const { data: tasks = [] } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", "all"],
    queryFn: async () => { const res = await fetch("/api/tasks"); if (!res.ok) return []; return res.json(); },
    retry: 1,
  });

  const { mutate: markDone } = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

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

  function handleDayClick(day: Date, e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("[data-task-pill]")) return;
    setPopover(null);
    setCreateDate(isoDate(day));
  }

  function handleTaskClick(task: TaskWithSubtasks, e: React.MouseEvent) {
    e.stopPropagation();
    const rect          = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current!.getBoundingClientRect();
    const relativeRect  = new DOMRect(rect.left - containerRect.left, rect.top - containerRect.top, rect.width, rect.height);
    setPopover(popover?.task.id === task.id ? null : { task, rect: relativeRect });
  }

  const containerRect = containerRef.current?.getBoundingClientRect() ?? new DOMRect(0, 0, 800, 600);

  // ── Mobile render ─────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <MobileCalendar
          viewDate={viewDate}
          setViewDate={setViewDate}
          tasksByDate={tasksByDate}
          today={today}
          onAddTask={date => setCreateDate(date)}
          onTaskTap={task => setMobileSheet(task)}
        />

        {mobileSheet && (
          <MobileTaskSheet
            task={mobileSheet}
            onClose={() => setMobileSheet(null)}
            onMarkDone={id => { markDone(id); setMobileSheet(null); }}
          />
        )}

        <TaskCreateModal
          open={!!createDate}
          onOpenChange={open => { if (!open) setCreateDate(null); }}
          defaultDate={createDate ?? undefined}
        />
      </div>
    );
  }

  // ── Desktop render ────────────────────────────────────────────────
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
          <p style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#b9d3c4", marginBottom: 6 }}>
            Schedule
          </p>
          {/* Month + nav arrows inline */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #dde4de", background: "#fff", cursor: "pointer", fontSize: 15, color: "#4a6d47", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: "#082d1d", lineHeight: 1, margin: 0 }}>
              {new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h1>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid #dde4de", background: "#fff", cursor: "pointer", fontSize: 15, color: "#4a6d47", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          </div>
        </div>
        <div />
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #dde4de", flexShrink: 0 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ padding: "8px 0", textAlign: "center", fontFamily: "monospace", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#b9d3c4" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div ref={containerRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {days.map((day, i) => {
            if (!day) return (
              <div key={`empty-${i}`} style={{ minHeight: 110, borderRight: i % 7 !== 6 ? "1px solid #dde4de" : "none", borderBottom: "1px solid #dde4de", background: "#fafbf7" }} />
            );

            const key        = isoDate(day);
            const dayTasks   = tasksByDate.get(key) ?? [];
            const isToday    = isoDate(day) === isoDate(today);
            const isOtherMonth = day.getMonth() !== month;
            const MAX_VISIBLE  = 3;
            const visible      = dayTasks.slice(0, MAX_VISIBLE);
            const overflow     = dayTasks.length - MAX_VISIBLE;

            return (
              <div key={key}
                onClick={(e) => handleDayClick(day, e)}
                style={{
                  minHeight: 110,
                  borderRight: i % 7 !== 6 ? "1px solid #dde4de" : "none",
                  borderBottom: "1px solid #dde4de",
                  borderTop: isToday ? "2px solid #059669" : "none",
                  padding: "6px 6px 4px",
                  background: isToday ? "#f2fdec" : isOtherMonth ? "#fafbf7" : "#fff",
                  cursor: "pointer", transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!isOtherMonth && !isToday) (e.currentTarget as HTMLElement).style.background = "#f2fdec"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isToday ? "#f2fdec" : isOtherMonth ? "#fafbf7" : "#fff"; }}
              >
                <div style={{ marginBottom: 4, display: "flex", justifyContent: "center" }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: isToday ? 700 : 400,
                    background: isToday ? "#059669" : "transparent",
                    color: isToday ? "#fff" : isOtherMonth ? "#c4cbc2" : "#082d1d",
                  }}>{day.getDate()}</span>
                </div>

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
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#082d1d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {task.dueAt && new Date(task.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " "}
                        {task.title}
                      </span>
                    </div>
                  ))}
                  {overflow > 0 && <p style={{ fontSize: 10, color: "#b9d3c4", padding: "0 4px", margin: 0 }}>+{overflow} more</p>}
                  {dayTasks.length === 0 && <div style={{ textAlign: "center", marginTop: 4, fontSize: 18, color: "#dde4de", lineHeight: 1 }}>+</div>}
                </div>
              </div>
            );
          })}
        </div>

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

      <TaskCreateModal
        open={!!createDate}
        onOpenChange={open => { if (!open) setCreateDate(null); }}
        defaultDate={createDate ?? undefined}
      />
    </div>
  );
}

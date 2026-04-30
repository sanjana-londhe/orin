"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableTaskCard } from "@/components/SortableTaskCard";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { WelcomeView } from "@/components/WelcomeView";
import { useUIStore, type SortMode } from "@/store/ui";
import { cn } from "@/lib/utils";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";

const EMOTIONAL_WEIGHT: Record<string, number> = {
  DREADING: 1,
  ANXIOUS:  2,
  NEUTRAL:  3,
  WILLING:  4,
  EXCITED:  5,
};

const SORT_LABELS: Record<SortMode, string> = {
  due_date:  "Due date",
  emotional: "Emotional",
  manual:    "Manual",
};

function sortTasks(tasks: TaskWithSubtasks[], mode: SortMode): TaskWithSubtasks[] {
  return [...tasks].sort((a, b) => {
    if (mode === "due_date") {
      if (!a.dueAt && !b.dueAt) return a.sortOrder - b.sortOrder;
      if (!a.dueAt) return 1;   // nulls last
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }
    if (mode === "emotional") {
      const diff = (EMOTIONAL_WEIGHT[a.emotionalState] ?? 3) - (EMOTIONAL_WEIGHT[b.emotionalState] ?? 3);
      if (diff !== 0) return diff;
      // tiebreak: overdue first, then by sortOrder
      if (!a.dueAt && !b.dueAt) return a.sortOrder - b.sortOrder;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }
    // manual
    return a.sortOrder - b.sortOrder;
  });
}

async function fetchTodaysTasks(): Promise<TaskWithSubtasks[]> {
  const res = await fetch("/api/tasks?filter=today");
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

export function TaskList({ userName = "there", timeGreeting = "morning" }: { userName?: string; timeGreeting?: string }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const { sortMode, setSortMode } = useUIStore();
  const m = useTaskMutations();

  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data: tasks = [], isLoading } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", "today"],
    queryFn: fetchTodaysTasks,
    retry: 1,
  });

  const sorted = useMemo(() => sortTasks(tasks, sortMode), [tasks, sortMode]);

  // Sync manualOrder when tasks or sort mode changes
  useEffect(() => {
    setManualOrder(sorted.map((t) => t.id));
  }, [tasks, sortMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayTasks = useMemo(() => {
    if (sortMode !== "manual" || manualOrder.length === 0) return sorted;
    const map = new Map(sorted.map((t) => [t.id, t]));
    return manualOrder.map((id) => map.get(id)).filter(Boolean) as TaskWithSubtasks[];
  }, [sorted, manualOrder, sortMode]);

  const { mutate: reorderTasks } = useMutation({
    mutationFn: async (ordered_ids: string[]) => {
      const res = await fetch("/api/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordered_ids }),
      });
      if (!res.ok) throw new Error("Failed to reorder");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = manualOrder.indexOf(active.id as string);
    const newIndex = manualOrder.indexOf(over.id as string);
    const newOrder = arrayMove(manualOrder, oldIndex, newIndex);

    // Optimistic update
    setManualOrder(newOrder);

    // Debounced DB write
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => reorderTasks(newOrder), 500);
  }

  // All shared mutations from hook — no duplication with SimpleTaskView
  const { markDone, updateTask, deferTask, deleteTask, addSubtask, completeSubtask, deleteSubtask } = m;

  const overdue = tasks.filter(t => t.dueAt && new Date(t.dueAt) < new Date()).length;
  const totalDeferred = tasks.reduce((s, t) => s + (t.deferredCount ?? 0), 0);

  // Quick capture state
  const [captureValue, setCaptureValue] = useState("");
  const { mutate: quickCreate } = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); setCaptureValue(""); },
  });

  return (
    <>
      {/* ── Page header (5.html style) ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
          <div>
            <p style={{ fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4a6d47", marginBottom: 4 }}>
              Daily workspace · {new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </p>
            <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.04em", color: "#082d1d", lineHeight: 1 }}>Today</h1>
            {userName !== "there" && (
              <p style={{ fontSize: 12.5, color: "#4a6d47", marginTop: 4 }}>
                Good {timeGreeting}, {userName} ☀️ &nbsp;·&nbsp; {tasks.length} task{tasks.length !== 1 ? "s" : ""} &nbsp;·&nbsp; {tasks.length} remaining
              </p>
            )}
          </div>
        </div>

        {/* Stats band — 5.html: ink border, cells */}
        <div style={{
          display: "flex", alignItems: "stretch", gap: 0,
          background: "#fff", border: "1.5px solid #dde4de",
          borderRadius: 12, overflow: "hidden", marginBottom: 20,
        }}>
          {[
            { num: tasks.length,    label: "tasks today",   color: "#082d1d" },
            { num: overdue,         label: "on fire · overdue", color: "#c23934" },
            { num: `${totalDeferred}`, label: "total deferrals", color: totalDeferred > 0 ? "#c23934" : "#082d1d" },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: "16px 20px",
              borderRight: "1px solid #dde4de",
            }}>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 3, color: s.color }}>
                {s.num}
              </div>
              <div style={{ fontSize: 11, color: "#4a6d47", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
          {/* Progress cell */}
          <div style={{ flex: 2, padding: "16px 20px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "#3d5a4a" }}>Weekly completion</span>
              <span style={{ fontWeight: 700, color: "#243000" }}>0%</span>
            </div>
            <div style={{ height: 4, background: "#f1f3ef", borderRadius: 999 }}>
              <div style={{ height: "100%", borderRadius: 999, background: "#59d10b", width: "0%" }} />
            </div>
          </div>
        </div>

        {/* Quick capture — 5.html style */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px", background: "#fff",
          border: "1px solid #dde4de", borderRadius: 12,
          marginBottom: 24, transition: "border-color 0.15s, box-shadow 0.15s",
        }}
          onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = "#059669"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(89,209,11,0.3)"; }}
          onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = "#dde4de"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
          <span style={{ fontSize: 14, color: "#4a6d47", flexShrink: 0 }}>✦</span>
          <input value={captureValue} onChange={e => setCaptureValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && captureValue.trim()) quickCreate(captureValue.trim()); }}
            placeholder="Capture a task — what do you need to do?"
            style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 13.5, color: "#082d1d", background: "transparent" }} />
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "#4a6d47", background: "#f1f3ef", border: "1px solid #dde4de", borderRadius: 4, padding: "2px 6px", flexShrink: 0 }}>↵ add</span>
        </div>
      </div>

      {/* ── Cards (5.html: featured + 2-col grid) ── */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 160, borderRadius: 16, background: "rgba(0,0,0,0.04)" }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        /* Empty — same section structure as when tasks exist */
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <span style={{ display: "inline-flex", alignItems: "center", background: "#e3ffd1", border: "1.5px solid #c8f7ae", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, color: "#243000", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>
                📋 Today
              </span>
              <p style={{ fontSize: 15, fontWeight: 800, color: "#082d1d", letterSpacing: "-0.03em" }}>Your tasks</p>
              <p style={{ fontSize: 11, color: "#4a6d47", marginTop: 2 }}>
                {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })} · nothing due today
              </p>
            </div>
            <button onClick={() => setModalOpen(true)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8,
              background: "#059669", border: "none", color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#047857"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#059669"}>
              + New task
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", color: "#b9d3c4" }}>
            <span style={{ fontSize: 40, marginBottom: 12 }}>🌿</span>
            <p style={{ fontSize: 14, fontWeight: 500 }}>You&apos;re all clear for today</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Add a task to get started</p>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {(() => {
              // Split: first DREADING or overdue task → featured; rest → 2-col grid
              const urgentIdx = displayTasks.findIndex(t =>
                t.emotionalState === "DREADING" || (t.dueAt && new Date(t.dueAt) < new Date())
              );
              const featured = urgentIdx >= 0 ? displayTasks[urgentIdx] : null;
              const grid = featured
                ? [...displayTasks.slice(0, urgentIdx), ...displayTasks.slice(urgentIdx + 1)]
                : displayTasks;

              const cardProps = (t: typeof displayTasks[0], isFeatured = false) => ({
                task: t, featured: isFeatured,
                dragActive: sortMode === "manual",
                onMarkDone: markDone, onDefer: deferTask, onUpdate: updateTask,
                onDelete: deleteTask, onAddSubtask: addSubtask,
                onCompleteSubtask: completeSubtask, onDeleteSubtask: deleteSubtask,
              });

              return (
                <>
                  {/* Section: Needs attention (if featured task exists) */}
                  {featured && (
                    <div style={{ marginBottom: 32 }}>
                      <div style={{ marginBottom: 16 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", background: "#e3ffd1", border: "1.5px solid #c8f7ae", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, color: "#243000", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>
                          🔥 Urgent
                        </span>
                        <p style={{ fontSize: 15, fontWeight: 800, color: "#082d1d", letterSpacing: "-0.03em" }}>Needs attention</p>
                        <p style={{ fontSize: 11, color: "#4a6d47", marginTop: 2 }}>Urgent or emotionally heavy</p>
                      </div>
                      <SortableTaskCard key={featured.id} {...cardProps(featured, true)} />
                    </div>
                  )}

                  {/* Section: Other tasks */}
                  {grid.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
                        <div>
                          <span style={{ display: "inline-flex", alignItems: "center", background: "#e3ffd1", border: "1.5px solid #c8f7ae", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, color: "#243000", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>
                            📋 Today
                          </span>
                          <p style={{ fontSize: 15, fontWeight: 800, color: "#082d1d", letterSpacing: "-0.03em" }}>
                            {featured ? "Other tasks" : "Your tasks"}
                          </p>
                          <p style={{ fontSize: 11, color: "#4a6d47", marginTop: 2 }}>
                            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })} · sorted by {SORT_LABELS[sortMode].toLowerCase()}
                          </p>
                        </div>
                        <button onClick={() => setModalOpen(true)} style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "7px 16px", borderRadius: 8,
                          background: "#059669", border: "none",
                          color: "#fff", fontSize: 13, fontWeight: 600,
                          cursor: "pointer", fontFamily: "inherit",
                          transition: "background 0.15s",
                          whiteSpace: "nowrap",
                        }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#047857"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#059669"}>
                          + New task
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {grid.map(t => <SortableTaskCard key={t.id} {...cardProps(t)} />)}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </SortableContext>
        </DndContext>
      )}

      <TaskCreateModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

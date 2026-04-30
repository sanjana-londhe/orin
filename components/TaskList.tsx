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
      {/* ── Sticky stat band + sort ── */}
      <div style={{
        position: "sticky", top: 54, zIndex: 40,
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        margin: "0 -28px", padding: "0 28px",
        display: "flex", alignItems: "stretch", gap: 0,
      }}>
        {[
          { num: tasks.length, label: "tasks today", color: "#1A1612" },
          { num: overdue, label: "on fire · overdue", color: "#FF4A00", pulse: overdue > 0 },
          { num: `${tasks.length > 0 ? Math.round((1 - tasks.length / Math.max(tasks.length, 1)) * 0) : 0}%`, label: "completed today", color: "#1A9444" },
          { num: totalDeferred, label: "total deferrals", color: "#D14626" },
        ].map((s, i) => (
          <div key={i} style={{
            padding: "10px 24px 10px 0", display: "flex", flexDirection: "column",
            justifyContent: "center", gap: 1,
            borderRight: "1px solid rgba(0,0,0,0.06)", marginRight: 24,
          }}>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: s.color }}>
              {s.num}{s.pulse ? " 🔥" : ""}
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 500, color: "#B0A89E" }}>{s.label}</span>
          </div>
        ))}

        {/* Sort pills */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          {(Object.keys(SORT_LABELS) as SortMode[]).map(mode => (
            <button key={mode} onClick={() => setSortMode(mode)} style={{
              fontSize: 11.5, padding: "4px 11px", borderRadius: 999,
              border: sortMode === mode ? "1px solid #059669" : "1px solid rgba(0,0,0,0.1)",
              background: sortMode === mode ? "#059669" : "none",
              color: sortMode === mode ? "#fff" : "#9C9389",
              fontWeight: sortMode === mode ? 600 : 400,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.13s",
            }}>
              {SORT_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Quick capture bar ── */}
      <div style={{ marginTop: 16, marginBottom: 4 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#fff", borderRadius: 14, padding: "13px 18px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.07)",
          border: "1px solid rgba(255,255,255,0.9)",
          transition: "box-shadow 0.2s",
        }}>
          <span style={{ fontSize: 16, opacity: 0.45 }}>✦</span>
          <input
            value={captureValue}
            onChange={e => setCaptureValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && captureValue.trim()) quickCreate(captureValue.trim()); }}
            placeholder="What's on your mind? Capture a task…"
            style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 14, color: "#1A1612", background: "transparent" }}
          />
          <span style={{ fontFamily: "monospace", fontSize: 10.5, color: "#D0C8BE", flexShrink: 0 }}>↵ add</span>
        </div>
      </div>

      {/* ── Day header (4.html style) ── */}
      <div style={{ margin: "28px 0 20px" }}>
        <p style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#B0A89E", marginBottom: 8 }}>
          Daily focus · {new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.045em", color: "#1A1814", lineHeight: 1, marginBottom: 6 }}>
          Today
        </h1>
        {userName !== "there" && (
          <p style={{ fontSize: 13.5, color: "#A09890", marginBottom: 10 }}>
            Good {timeGreeting}, {userName} ☀️ &nbsp;·&nbsp; {tasks.length} task{tasks.length !== 1 ? "s" : ""} &nbsp;·&nbsp; {tasks.length} remaining
          </p>
        )}
        {/* Progress bar */}
        {tasks.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, maxWidth: 160, height: 3, background: "#E4DED8", borderRadius: 999 }}>
              <div style={{ height: "100%", borderRadius: 999, background: "#059669", width: "20%" }} />
            </div>
            <span style={{ fontSize: 11.5, color: "#B0A89E" }}>
              {isLoading ? "…" : "0"} of {tasks.length} done
            </span>
          </div>
        )}
      </div>

      {/* ── Cards ── */}
      {isLoading ? (
        <div style={{ columnCount: 3, columnGap: 14 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ breakInside: "avoid", marginBottom: 14, height: 160, borderRadius: 16, background: "rgba(0,0,0,0.04)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <WelcomeView name={userName} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {/* Masonry 3-column grid */}
            <div style={{ columnCount: 3, columnGap: 14 }}
              className="[column-count:1] sm:[column-count:2] lg:[column-count:3]">
              {displayTasks.map(task => (
                <SortableTaskCard
                  key={task.id} task={task} dragActive={sortMode === "manual"}
                  onMarkDone={markDone}
                  onDefer={deferTask}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onAddSubtask={addSubtask}
                  onCompleteSubtask={completeSubtask}
                  onDeleteSubtask={deleteSubtask}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <TaskCreateModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

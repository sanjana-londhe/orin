"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
import { DatePickerField } from "@/components/DatePickerField";
import { TimePickerField } from "@/components/TimePickerField";
import { SkeletonTaskList } from "@/components/Skeleton";
import { Plus } from "lucide-react";
import { useUIStore, type SortMode } from "@/store/ui";
import { EMOTION_MAP, type EmotionKey } from "@/lib/emotions";
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

// ── Sort dropdown — matches DatePickerField design tokens ────────────
const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "due_date",  label: "Due date" },
  { value: "emotional", label: "Emotional state" },
  { value: "manual",    label: "Manual" },
];

function SortDropdown({ value, onChange }: { value: SortMode; onChange: (m: SortMode) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = SORT_OPTIONS.find(o => o.value === value)!;

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.06em" }}>Sort</span>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", height: 38, borderRadius: 8,
        border: `1.5px solid ${open ? "#059669" : "#dde4de"}`,
        background: "#fcfdfc", color: "#082d1d",
        fontSize: 13.5, fontWeight: 500,
        cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.14s",
        outline: "none",
      }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.borderColor = "#c4cbc2"; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.borderColor = "#dde4de"; }}
      >
        {current.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4a6d47" strokeWidth="2"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.14s", flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
          background: "#fff", border: "1.5px solid #dde4de",
          borderRadius: 10, padding: "4px 0",
          boxShadow: "0 4px 16px rgba(0,0,0,0.09)", minWidth: 180,
        }}>
          {SORT_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "9px 14px", border: "none",
              background: value === opt.value ? "#f2fdec" : "none",
              cursor: "pointer", fontFamily: "inherit",
            }}
              onMouseEnter={e => { if (value !== opt.value) (e.currentTarget as HTMLElement).style.background = "#f1f3ef"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = value === opt.value ? "#f2fdec" : "none"; }}
            >
              <span style={{ fontSize: 13.5, color: "#082d1d", fontWeight: value === opt.value ? 600 : 400 }}>{opt.label}</span>
              {value === opt.value && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskList({ userName = "there", timeGreeting = "morning" }: { userName?: string; timeGreeting?: string }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const { sortMode, setSortMode } = useUIStore();
  const m = useTaskMutations();

  // Emotion filter
  const [filterOpen, setFilterOpen]         = useState(false);
  const [pendingFilters, setPendingFilters]  = useState<Set<EmotionKey>>(new Set());
  const [activeFilters, setActiveFilters]    = useState<Set<EmotionKey>>(new Set());
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const togglePending = useCallback((key: EmotionKey) => {
    setPendingFilters(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  function applyFilter() {
    setActiveFilters(new Set(pendingFilters));
    setFilterOpen(false);
  }

  function clearFilter() {
    setPendingFilters(new Set());
    setActiveFilters(new Set());
    setFilterOpen(false);
  }

  // Date navigation
  const todayISO = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const isToday = selectedDate === todayISO;

  function shiftDay(delta: number) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  }

  function dateLabelFor(iso: string): string {
    const d = new Date(iso + "T12:00:00");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (iso === today.toISOString().slice(0, 10)) return "Today";
    if (iso === yesterday.toISOString().slice(0, 10)) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data: tasks = [], isLoading } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", selectedDate],
    queryFn: async () => {
      const url = isToday
        ? "/api/tasks?filter=today"
        : `/api/tasks?date=${selectedDate}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
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

    // Auto-switch to manual sort when user drags
    if (sortMode !== "manual") setSortMode("manual");

    const oldIndex = manualOrder.indexOf(active.id as string);
    const newIndex = manualOrder.indexOf(over.id as string);
    const newOrder = arrayMove(manualOrder, oldIndex, newIndex);

    setManualOrder(newOrder);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => reorderTasks(newOrder), 500);
  }

  // All shared mutations from hook — no duplication with SimpleTaskView
  const { markDone, updateTask, deferTask, deleteTask, addSubtask, completeSubtask, deleteSubtask } = m;

  // Keep completed tasks in session so they sink to bottom with strikethrough
  const [completedThisSession, setCompletedThisSession] = useState<Map<string, TaskWithSubtasks>>(new Map());

  function handleMarkDone(id: string) {
    const task = displayTasks.find(t => t.id === id);
    if (task) setCompletedThisSession(prev => new Map(prev).set(id, { ...task, isCompleted: true }));
    markDone(id);
  }

  function handleUncomplete(id: string) {
    setCompletedThisSession(prev => { const next = new Map(prev); next.delete(id); return next; });
    fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: false }),
    }).then(() => queryClient.invalidateQueries({ queryKey: ["tasks"] }));
  }

  function pushTaskUp(id: string) {
    const idx = manualOrder.indexOf(id);
    if (idx <= 0) return;
    if (sortMode !== "manual") setSortMode("manual");
    const newOrder = [...manualOrder];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setManualOrder(newOrder);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => reorderTasks(newOrder), 400);
  }

  const filteredTasks = useMemo(() =>
    activeFilters.size === 0
      ? displayTasks
      : displayTasks.filter(t => activeFilters.has(t.emotionalState as EmotionKey)),
    [displayTasks, activeFilters]
  );

  const overdue = tasks.filter(t => t.dueAt && new Date(t.dueAt) < new Date()).length;
  const totalDeferred = tasks.reduce((s, t) => s + (t.deferredCount ?? 0), 0);

  // Inline task creation state
  const [inlineDraft, setInlineDraft] = useState("");
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [inlineDueDate, setInlineDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [inlineDueTime, setInlineDueTime] = useState("");
  const [inlineEmotion, setInlineEmotion] = useState<"DREADING"|"ANXIOUS"|"NEUTRAL"|"WILLING"|"EXCITED">("NEUTRAL");
  const [inlineSubtasks, setInlineSubtasks] = useState<string[]>([]);
  const [inlineSubInput, setInlineSubInput] = useState("");

  const { mutate: createInline, isPending: creatingInline } = useMutation({
    mutationFn: async (vars: { title: string; dueAt: string | null; emotion: typeof inlineEmotion; subtasks: string[] }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: vars.title, dueAt: vars.dueAt, emotionalState: vars.emotion }),
      });
      if (!res.ok) throw new Error("Failed");
      const task = await res.json();
      // Create subtasks in parallel instead of sequentially
      if (vars.subtasks.length > 0) {
        await Promise.all(vars.subtasks.map(st =>
          fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: st, parentTaskId: task.id }),
          })
        ));
      }
      return task;
    },
    onMutate: async (vars) => {
      // Cancel in-flight refetches so they don't overwrite the optimistic update
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = queryClient.getQueriesData<TaskWithSubtasks[]>({ queryKey: ["tasks"] });

      // Build an optimistic task that looks like the real thing
      const optimistic: TaskWithSubtasks = {
        id: `optimistic-${Date.now()}`,
        userId: "",
        title: vars.title,
        dueAt: vars.dueAt ? new Date(vars.dueAt) : null,
        emotionalState: vars.emotion as TaskWithSubtasks["emotionalState"],
        isCompleted: false,
        deferredCount: 0,
        sortOrder: 99999,
        lastTouchedAt: new Date(),
        recurrenceRule: null,
        parentTaskId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        subtasks: vars.subtasks.map((title, i) => ({
          id: `optimistic-sub-${Date.now()}-${i}`,
          userId: "", title,
          parentTaskId: `optimistic-${Date.now()}`,
          isCompleted: false, deferredCount: 0, sortOrder: i,
          lastTouchedAt: new Date(), recurrenceRule: null, dueAt: null,
          emotionalState: "NEUTRAL" as const,
          createdAt: new Date(), updatedAt: new Date(), subtasks: [],
        })),
      };

      queryClient.setQueryData(["tasks", selectedDate], (old: TaskWithSubtasks[] = []) => [...old, optimistic]);

      // Reset form immediately — user sees instant feedback
      setInlineDraft(""); setShowInlineForm(false);
      setInlineDueDate(new Date().toISOString().slice(0, 10));
      setInlineDueTime(""); setInlineEmotion("NEUTRAL");
      setInlineSubtasks([]); setInlineSubInput("");

      return { snap };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snap.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return (
    <>
      {/* ── Page header (5.html style) ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
          <div>
            <p style={{ fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4a6d47", marginBottom: 4 }}>
              Daily workspace · {new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </p>
            <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.04em", color: "#082d1d", lineHeight: 1 }}>
              Today
            </h1>
          </div>
          <button onClick={() => { setShowInlineForm(true); setTimeout(() => document.getElementById("inline-task-input")?.focus(), 50); }} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 18px", borderRadius: 8,
            background: "#059669", border: "none",
            color: "#fff", fontSize: 13.5, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
            transition: "background 0.15s", flexShrink: 0,
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#047857"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#059669"}>
            + New task
          </button>
        </div>

        {/* Sort + Filter row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>

          {/* ── Sort by custom dropdown ── */}
          <SortDropdown value={sortMode} onChange={setSortMode} />

          {/* ── Filter dropdown ── */}
          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              onClick={() => { setPendingFilters(new Set(activeFilters)); setFilterOpen(o => !o); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 12px", height: 38, borderRadius: 8,
                border: `1.5px solid ${activeFilters.size > 0 ? "#059669" : "#dde4de"}`,
                background: activeFilters.size > 0 ? "#f2fdec" : "#fcfdfc",
                color: activeFilters.size > 0 ? "#059669" : "#082d1d",
                fontSize: 13.5, fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.14s",
              }}
              onMouseEnter={e => { if (!activeFilters.size) (e.currentTarget as HTMLElement).style.borderColor = "#c4cbc2"; }}
              onMouseLeave={e => { if (!activeFilters.size) (e.currentTarget as HTMLElement).style.borderColor = "#dde4de"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              Filter
              {activeFilters.size > 0 && (
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#059669", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {activeFilters.size}
                </span>
              )}
            </button>

            {filterOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
                background: "#fff", border: "1.5px solid #dde4de",
                borderRadius: 12, padding: "4px 0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.09)",
                minWidth: 220,
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#b9d3c4", textTransform: "uppercase", letterSpacing: "0.07em", margin: "8px 14px 8px" }}>Filter by feeling</p>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {(Object.entries(EMOTION_MAP) as [EmotionKey, typeof EMOTION_MAP[EmotionKey]][]).map(([key, em]) => {
                    const checked = pendingFilters.has(key);
                    return (
                      <button key={key} onClick={() => togglePending(key)} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 14px", border: "none",
                        background: checked ? em.pillBg : "none",
                        cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left",
                        transition: "background 0.1s",
                      }}
                        onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = "#f1f3ef"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = checked ? em.pillBg : "none"; }}
                      >
                        <span style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          border: `2px solid ${checked ? em.pillText : "#dde4de"}`,
                          background: checked ? em.pillText : "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.1s",
                        }}>
                          {checked && <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="2 6 5 9 10 3"/></svg>}
                        </span>
                        <span style={{ fontSize: 14 }}>{em.emoji}</span>
                        <span style={{ fontSize: 13.5, fontWeight: checked ? 600 : 400, color: checked ? em.pillText : "#082d1d", flex: 1 }}>{em.label}</span>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: em.strip, flexShrink: 0 }} />
                      </button>
                    );
                  })}
                </div>

                <div style={{ height: 1, background: "#dde4de", margin: "4px 0" }} />
                <div style={{ display: "flex", gap: 8, padding: "8px 14px" }}>
                  <button onClick={clearFilter} style={{
                    flex: 1, padding: "7px 0", borderRadius: 8,
                    border: "1.5px solid #dde4de", background: "#fff",
                    color: "#4a6d47", fontSize: 13.5, cursor: "pointer", fontFamily: "inherit",
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#c4cbc2"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#dde4de"}
                  >Clear</button>
                  <button onClick={applyFilter} style={{
                    flex: 1, padding: "7px 0", borderRadius: 8,
                    border: "none", background: "#059669",
                    color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#047857"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#059669"}
                  >Apply</button>
                </div>
              </div>
            )}
          </div>

          {activeFilters.size > 0 && (
            <button onClick={clearFilter} style={{ fontSize: 13, color: "#b9d3c4", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#059669"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#b9d3c4"}
            >✕ Clear</button>
          )}
        </div>


      </div>

      {/* ── Inline creation — plain with divider ── */}
      <div style={{ marginBottom: 20 }}>
        {/* Input row — no card, just text */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
          <Plus size={16} color={showInlineForm ? "#059669" : "#c4cbc2"} strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <input
            id="inline-task-input"
            value={inlineDraft}
            onChange={e => setInlineDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && inlineDraft.trim()) setShowInlineForm(true); }}
            onFocus={() => {}}
            placeholder="Add a task…"
            style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 14, color: "#082d1d", background: "transparent" }}
          />
          {inlineDraft.trim() && !showInlineForm && (
            <button onClick={() => setShowInlineForm(true)} style={{
              padding: "5px 14px", borderRadius: 8, background: "#059669", border: "none",
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>Add →</button>
          )}
        </div>
        <div style={{ height: 1, background: "#e8ece8" }} />

        {showInlineForm && (
          <div style={{ padding: "16px 0 4px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <DatePickerField value={inlineDueDate} onChange={setInlineDueDate} label="Due date" />
              <TimePickerField value={inlineDueTime} onChange={setInlineDueTime} label="Due time" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", marginBottom: 8 }}>How do you feel about it?</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["DREADING","ANXIOUS","NEUTRAL","WILLING","EXCITED"] as const).map(s => {
                  const EM: Record<string,{e:string;bg:string;fg:string}> = {
                    DREADING:{e:"😮‍💨",bg:"#FFF0EC",fg:"#D14626"},
                    ANXIOUS:{e:"😟",bg:"#FFF8E8",fg:"#B07A10"},
                    NEUTRAL:{e:"😐",bg:"#F3F2F0",fg:"#7A756E"},
                    WILLING:{e:"🙂",bg:"#EEF9F7",fg:"#0E8A7D"},
                    EXCITED:{e:"🤩",bg:"#EEFAF1",fg:"#1A9444"},
                  };
                  const em = EM[s];
                  const active = inlineEmotion === s;
                  return (
                    <button key={s} onClick={() => setInlineEmotion(s)} style={{
                      display:"inline-flex",alignItems:"center",gap:4,
                      padding:"4px 10px",borderRadius:7,fontSize:11,fontWeight:600,
                      background: active ? em.fg : em.bg,
                      color: active ? "#fff" : em.fg,
                      border:`1px solid ${em.fg}30`,cursor:"pointer",fontFamily:"inherit",
                    }}>
                      {em.e} {s.charAt(0)+s.slice(1).toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", marginBottom: 8 }}>Action items</p>
              {inlineSubtasks.map((st, i) => (
                <div key={i} style={{ display:"flex",alignItems:"center",gap:8,padding:"3px 0" }}>
                  <span style={{ width:10,height:10,borderRadius:3,border:"1.5px solid #dde4de",flexShrink:0 }} />
                  <span style={{ flex:1,fontSize:12.5,color:"#082d1d" }}>{st}</span>
                  <button onClick={() => setInlineSubtasks(p => p.filter((_,j)=>j!==i))} style={{ fontSize:11,color:"#c4cbc2",background:"none",border:"none",cursor:"pointer" }}>✕</button>
                </div>
              ))}
              <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:4 }}>
                <span style={{ width:10,height:10,borderRadius:3,border:"1.5px dashed #dde4de",flexShrink:0 }} />
                <input value={inlineSubInput} onChange={e=>setInlineSubInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter"&&inlineSubInput.trim()){setInlineSubtasks(p=>[...p,inlineSubInput.trim()]);setInlineSubInput("");}}}
                  placeholder="Add action item…"
                  style={{ flex:1,border:"none",borderBottom:"1px solid #dde4de",outline:"none",fontSize:12.5,color:"#082d1d",background:"transparent",fontFamily:"inherit",paddingBottom:2 }} />
              </div>
            </div>

            <div style={{ display:"flex",justifyContent:"flex-end",gap:8 }}>
              <button onClick={() => { setShowInlineForm(false); setInlineDraft(""); setInlineDueDate(new Date().toISOString().slice(0,10)); setInlineDueTime(""); setInlineEmotion("NEUTRAL"); setInlineSubtasks([]); setInlineSubInput(""); }}
                style={{ padding:"6px 14px",borderRadius:7,border:"1px solid #dde4de",background:"#fff",color:"#4a6d47",fontSize:12.5,cursor:"pointer",fontFamily:"inherit" }}>
                Cancel
              </button>
              <button onClick={() => createInline({
                title: inlineDraft.trim(),
                dueAt: inlineDueDate ? new Date(`${inlineDueDate}T${inlineDueTime || "00:00"}`).toISOString() : null,
                emotion: inlineEmotion,
                subtasks: inlineSubtasks,
              })} disabled={!inlineDraft.trim() || creatingInline} style={{
                padding:"6px 18px",borderRadius:7,border:"none",
                background: inlineDraft.trim() ? "#059669" : "#c4cbc2",
                color:"#fff",fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
              }}>
                {creatingInline ? "Creating…" : "Create task"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Cards ── */}
      {isLoading ? (
        <SkeletonTaskList count={5} />
      ) : tasks.length === 0 && completedThisSession.size > 0 ? (
        /* All tasks completed this session — show them with strikethrough */
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
          {[...completedThisSession.values()].map((t) => (
            <SortableTaskCard key={`done-${t.id}`} task={t} isLocallyCompleted
              onMarkDone={handleUncomplete} onDefer={deferTask} onUpdate={updateTask}
              onDelete={deleteTask} onAddSubtask={addSubtask}
              onCompleteSubtask={completeSubtask} onDeleteSubtask={deleteSubtask}
            />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {(() => {
              // Split: first DREADING or overdue task → featured; rest → 2-col grid
              const urgentIdx = filteredTasks.findIndex(t =>
                t.emotionalState === "DREADING" || (t.dueAt && new Date(t.dueAt) < new Date())
              );
              const featured = urgentIdx >= 0 ? filteredTasks[urgentIdx] : null;
              const grid = featured
                ? [...filteredTasks.slice(0, urgentIdx), ...filteredTasks.slice(urgentIdx + 1)]
                : filteredTasks;

              const allActive = featured ? [featured, ...grid] : grid;
              // Completed this session — show at bottom with strikethrough
              const completedList = [...completedThisSession.values()].filter(
                ct => !allActive.some(t => t.id === ct.id)
              );

              const cardProps = (t: typeof displayTasks[0], idx: number, isCompleted = false) => ({
                task: t,
                featured: false,
                isLocallyCompleted: isCompleted,
                dragActive: sortMode === "manual",
                canPushUp: !isCompleted && idx > 0,
                onPushUp: pushTaskUp,
                onMarkDone: handleMarkDone,
                onDefer: deferTask, onUpdate: updateTask,
                onDelete: deleteTask, onAddSubtask: addSubtask,
                onCompleteSubtask: completeSubtask, onDeleteSubtask: deleteSubtask,
              });

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
                  {allActive.map((t, idx) => (
                    <SortableTaskCard key={t.id} {...cardProps(t, idx)} />
                  ))}
                  {completedList.map((t) => (
                    <SortableTaskCard key={`done-${t.id}`} task={t} isLocallyCompleted
                      onMarkDone={handleUncomplete} onDefer={deferTask} onUpdate={updateTask}
                      onDelete={deleteTask} onAddSubtask={addSubtask}
                      onCompleteSubtask={completeSubtask} onDeleteSubtask={deleteSubtask}
                    />
                  ))}
                </div>
              );
            })()}
          </SortableContext>
        </DndContext>
      )}

      <TaskCreateModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

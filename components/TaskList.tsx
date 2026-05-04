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
import { DatePickerField } from "@/components/DatePickerField";
import { TimePickerField } from "@/components/TimePickerField";
import { FeelingPickerField } from "@/components/FeelingPickerField";
import { SkeletonTaskList } from "@/components/Skeleton";
import { Plus } from "lucide-react";
import type { TaskWithSubtasks } from "@/lib/types";

export function TaskList({ userName = "there", timeGreeting = "morning" }: { userName?: string; timeGreeting?: string }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const m = useTaskMutations();

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

  // Sync manualOrder when tasks change
  useEffect(() => {
    setManualOrder(tasks.map((t) => t.id));
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayTasks = useMemo(() => {
    if (manualOrder.length === 0) return tasks;
    const map = new Map(tasks.map((t) => [t.id, t]));
    return manualOrder.map((id) => map.get(id)).filter(Boolean) as TaskWithSubtasks[];
  }, [tasks, manualOrder]);

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

    setManualOrder(newOrder);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => reorderTasks(newOrder), 500);
  }

  const { markDone, uncompleteTask, updateTask, deferTask, deleteTask } = m;

  function pushTaskUp(id: string) {
    const idx = manualOrder.indexOf(id);
    if (idx <= 0) return;
    const newOrder = [...manualOrder];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setManualOrder(newOrder);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => reorderTasks(newOrder), 400);
  }

  const overdue = tasks.filter(t => t.dueAt && new Date(t.dueAt) < new Date()).length;
  const totalDeferred = tasks.reduce((s, t) => s + (t.deferredCount ?? 0), 0);

  // Inline task creation state
  const [inlineDraft, setInlineDraft] = useState("");
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [inlineDueDate, setInlineDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [inlineDueTime, setInlineDueTime] = useState(() => {
    const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [inlineEmotion, setInlineEmotion] = useState<"DREADING"|"ANXIOUS"|"NEUTRAL"|"WILLING"|"EXCITED"|"">();
  const [inlineNote, setInlineNote] = useState("");

  const { mutate: createInline, isPending: creatingInline } = useMutation({
    mutationFn: async (vars: { title: string; dueAt: string | null; emotion: typeof inlineEmotion; note?: string }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: vars.title, dueAt: vars.dueAt, emotionalState: vars.emotion }),
      });
      if (!res.ok) throw new Error("Failed");
      const task = await res.json();
      // Save note to localStorage after we have the real task ID
      if (vars.note?.trim()) {
        try { localStorage.setItem(`orin_note_${task.id}`, vars.note.trim()); } catch {}
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
        subtasks: [],
      };

      queryClient.setQueryData(["tasks", selectedDate], (old: TaskWithSubtasks[] = []) => [...old, optimistic]);

      // Reset form immediately — user sees instant feedback
      setInlineDraft(""); setShowInlineForm(false);
      setInlineDueDate(new Date().toISOString().slice(0, 10));
      const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
      setInlineDueTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
      setInlineEmotion(undefined); setInlineNote("");

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
        {/* Header: Today top-left, New task top-right */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.04em", color: "#082d1d", lineHeight: 1, marginBottom: 10 }}>
              Today
            </h1>
          </div>

          {/* New task button — top right */}
          <button onClick={() => { setShowInlineForm(true); setTimeout(() => document.getElementById("inline-task-input")?.focus(), 50); }} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", height: 38, borderRadius: 8,
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

      </div>

      {/* ── Inline creation ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 18px", background: "#fff",
          border: `1.5px solid ${showInlineForm ? "#059669" : "#dde4de"}`,
          borderRadius: showInlineForm ? "12px 12px 0 0" : 12,
          transition: "border-color 0.15s",
        }}>
          <span style={{ fontSize: 14, color: "#b9d3c4", flexShrink: 0 }}>✦</span>
          <input
            id="inline-task-input"
            value={inlineDraft}
            onChange={e => setInlineDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && inlineDraft.trim()) setShowInlineForm(true); }}
            placeholder="What needs doing?"
            style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 14, color: "#082d1d", background: "transparent" }}
          />
          {inlineDraft.trim() && !showInlineForm && (
            <button onClick={() => setShowInlineForm(true)} style={{
              padding: "5px 14px", borderRadius: 7, background: "#059669", border: "none",
              color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>Add →</button>
          )}
        </div>

        {showInlineForm && (
          <div style={{
            background: "#fff", border: "1.5px solid #059669", borderTop: "none",
            borderRadius: "0 0 12px 12px", padding: "16px 18px",
            boxShadow: "0 4px 16px rgba(5,150,105,0.08)",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              <DatePickerField value={inlineDueDate} onChange={setInlineDueDate} label="Due date" />
              <TimePickerField value={inlineDueTime} onChange={setInlineDueTime} label="Due time" selectedDate={inlineDueDate} />
              <FeelingPickerField value={inlineEmotion ?? ""} onChange={v => setInlineEmotion(v as typeof inlineEmotion)} label="Feeling" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", marginBottom: 8 }}>Note</p>
              <textarea
                value={inlineNote}
                onChange={e => setInlineNote(e.target.value)}
                placeholder="Add a note or description…"
                rows={2}
                style={{
                  width:"100%", fontSize:12.5, color:"#082d1d", background:"#f8f9f5",
                  border:"1.5px solid #dde4de", borderRadius:8, padding:"8px 10px",
                  outline:"none", fontFamily:"inherit", resize:"vertical",
                  lineHeight:1.5, boxSizing:"border-box", transition:"border-color 0.14s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "#059669")}
                onBlur={e => (e.currentTarget.style.borderColor = "#dde4de")}
              />
            </div>

            <div style={{ display:"flex",justifyContent:"flex-end",gap:8 }}>
              <button onClick={() => { setShowInlineForm(false); setInlineDraft(""); setInlineDueDate(new Date().toISOString().slice(0,10)); const _d = new Date(Date.now() + 3*60*60*1000); setInlineDueTime(`${String(_d.getHours()).padStart(2,"0")}:${String(_d.getMinutes()).padStart(2,"0")}`); setInlineEmotion(undefined); setInlineNote(""); }}
                style={{ padding:"6px 14px",borderRadius:7,border:"1px solid #dde4de",background:"#fff",color:"#4a6d47",fontSize:12.5,cursor:"pointer",fontFamily:"inherit" }}>
                Cancel
              </button>
              <button onClick={() => {
                if (inlineDueDate && inlineDueTime) {
                  const chosen = new Date(`${inlineDueDate}T${inlineDueTime}`);
                  if (chosen <= new Date()) { alert("Please pick a time in the future."); return; }
                }
                createInline({
                  title: inlineDraft.trim(),
                  dueAt: inlineDueDate ? new Date(`${inlineDueDate}T${inlineDueTime || "00:00"}`).toISOString() : null,
                  emotion: inlineEmotion || "NEUTRAL",
                  note: inlineNote,
                });
              }} disabled={!inlineDraft.trim() || creatingInline} style={{
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
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
              {displayTasks.map((t, idx) => (
                <SortableTaskCard
                  key={t.id}
                  task={t}
                  dragActive={true}
                  canPushUp={idx > 0}
                  onPushUp={pushTaskUp}
                  onMarkDone={markDone}
                  onUncomplete={uncompleteTask}
                  onDefer={deferTask}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
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

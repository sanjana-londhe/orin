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
import { useUIStore, type SortMode } from "@/store/ui";
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

  // Inline task creation state
  const [inlineDraft, setInlineDraft] = useState("");
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [inlineDueDate, setInlineDueDate] = useState("");
  const [inlineDueTime, setInlineDueTime] = useState("");
  const [inlineEmotion, setInlineEmotion] = useState<"DREADING"|"ANXIOUS"|"NEUTRAL"|"WILLING"|"EXCITED">("NEUTRAL");
  const [inlineSubtasks, setInlineSubtasks] = useState<string[]>([]);
  const [inlineSubInput, setInlineSubInput] = useState("");

  const { mutate: createInline, isPending: creatingInline } = useMutation({
    mutationFn: async () => {
      const dueAt = inlineDueDate
        ? new Date(`${inlineDueDate}T${inlineDueTime || "00:00"}`).toISOString()
        : null;
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: inlineDraft.trim(), dueAt, emotionalState: inlineEmotion }),
      });
      if (!res.ok) throw new Error("Failed");
      const task = await res.json();
      for (const st of inlineSubtasks) {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: st, parentTaskId: task.id }),
        });
      }
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setInlineDraft(""); setShowInlineForm(false);
      setInlineDueDate(""); setInlineDueTime(""); setInlineEmotion("NEUTRAL");
      setInlineSubtasks([]); setInlineSubInput("");
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
            <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.04em", color: "#082d1d", lineHeight: 1 }}>Today</h1>
            {userName !== "there" && (
              <p style={{ fontSize: 12.5, color: "#4a6d47", marginTop: 4 }}>
                Good {timeGreeting}, {userName} ☀️ &nbsp;·&nbsp; {tasks.length} task{tasks.length !== 1 ? "s" : ""} &nbsp;·&nbsp; {tasks.length} remaining
              </p>
            )}
          </div>
          <button onClick={() => setModalOpen(true)} style={{
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

        {/* Sort dropdown — below Today heading */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: "#4a6d47" }}>Sort by</span>
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
            style={{
              padding: "5px 32px 5px 10px", borderRadius: 7,
              border: "1.5px solid #dde4de", background: "#fff",
              color: "#082d1d", fontSize: 12.5, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit", outline: "none",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a6d47' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
            }}>
            <option value="due_date">Due date</option>
            <option value="emotional">Emotional state</option>
            <option value="manual">Manual</option>
          </select>
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
        /* Empty — section header + inline add input, no CTA button */
        <div style={{ marginBottom: 32 }}>
          {/* Section header — no CTA */}
          <div style={{ marginBottom: 20 }}>
            <span style={{ display: "inline-flex", alignItems: "center", background: "#e3ffd1", border: "1.5px solid #c8f7ae", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, color: "#243000", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>
              📋 Tasks
            </span>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#082d1d", letterSpacing: "-0.03em" }}>Your tasks</p>
            <p style={{ fontSize: 11, color: "#4a6d47", marginTop: 2 }}>
              {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })} · nothing due today
            </p>
          </div>

          {/* Inline task input */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 18px", background: "#fff",
            border: `1.5px solid ${showInlineForm ? "#059669" : "#dde4de"}`,
            borderRadius: showInlineForm ? "12px 12px 0 0" : 12,
            transition: "border-color 0.15s",
          }}>
            <span style={{ fontSize: 14, color: "#b9d3c4", flexShrink: 0 }}>✦</span>
            <input
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
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#047857"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#059669"}>
                Add →
              </button>
            )}
          </div>

          {/* Inline expanded form */}
          {showInlineForm && (
            <div style={{
              background: "#fff", border: "1.5px solid #059669", borderTop: "none",
              borderRadius: "0 0 12px 12px", padding: "16px 18px",
              boxShadow: "0 4px 16px rgba(5,150,105,0.08)",
            }}>
              {/* Due date + time */}
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", marginBottom: 5 }}>Set due date</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#f8f9f5", border: "1px solid #dde4de", borderRadius: 8 }}>
                    <span style={{ fontSize: 13 }}>📅</span>
                    <input type="date" value={inlineDueDate} onChange={e => setInlineDueDate(e.target.value)}
                      style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 12.5, color: "#082d1d", fontFamily: "inherit" }} />
                  </div>
                </div>
                <div style={{ flex: 1, opacity: inlineDueDate ? 1 : 0.4, pointerEvents: inlineDueDate ? "auto" : "none" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", marginBottom: 5 }}>Set time</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#f8f9f5", border: "1px solid #dde4de", borderRadius: 8 }}>
                    <span style={{ fontSize: 13 }}>🕐</span>
                    <input type="time" value={inlineDueTime} onChange={e => setInlineDueTime(e.target.value)} disabled={!inlineDueDate}
                      style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 12.5, color: "#082d1d", fontFamily: "inherit" }} />
                  </div>
                </div>
              </div>

              {/* Feeling */}
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

              {/* Subtasks */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", marginBottom: 8 }}>Action items</p>
                {inlineSubtasks.map((st, i) => (
                  <div key={i} style={{ display:"flex",alignItems:"center",gap:8,padding:"3px 0" }}>
                    <span style={{ width:10,height:10,borderRadius:3,border:"1.5px solid #dde4de",flexShrink:0 }} />
                    <span style={{ flex:1,fontSize:12.5,color:"#082d1d" }}>{st}</span>
                    <button onClick={() => setInlineSubtasks(p => p.filter((_,j)=>j!==i))} style={{ fontSize:10,color:"#c4cbc2",background:"none",border:"none",cursor:"pointer" }}>✕</button>
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

              {/* Actions */}
              <div style={{ display:"flex",justifyContent:"flex-end",gap:8 }}>
                <button onClick={() => { setShowInlineForm(false); setInlineDraft(""); setInlineDueDate(""); setInlineDueTime(""); setInlineEmotion("NEUTRAL"); setInlineSubtasks([]); }}
                  style={{ padding:"6px 14px",borderRadius:7,border:"1px solid #dde4de",background:"#fff",color:"#4a6d47",fontSize:12.5,cursor:"pointer",fontFamily:"inherit" }}>
                  Cancel
                </button>
                <button onClick={() => createInline()} disabled={!inlineDraft.trim() || creatingInline} style={{
                  padding:"6px 18px",borderRadius:7,border:"none",
                  background: inlineDraft.trim() ? "#059669" : "#c4cbc2",
                  color:"#fff",fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                }}
                  onMouseEnter={e => { if(inlineDraft.trim()) (e.currentTarget as HTMLElement).style.background="#047857"; }}
                  onMouseLeave={e => { if(inlineDraft.trim()) (e.currentTarget as HTMLElement).style.background="#059669"; }}>
                  {creatingInline ? "Creating…" : "Create task"}
                </button>
              </div>
            </div>
          )}

          {!showInlineForm && (
            <div style={{ textAlign:"center",padding:"32px 0",color:"#b9d3c4" }}>
              <p style={{ fontSize:13 }}>Type above to add your first task</p>
            </div>
          )}
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
                            📋 Tasks
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

"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TaskGrid } from "@/components/TaskGrid";
import { SkeletonTaskList } from "@/components/Skeleton";
import { DatePickerField } from "@/components/DatePickerField";
import { TimePickerField } from "@/components/TimePickerField";
import { FeelingPickerField } from "@/components/FeelingPickerField";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useUIStore } from "@/store/ui";
import type { TaskWithSubtasks } from "@/lib/types";

const T = {
  bg:           "#fcfdfc",
  surface:      "#ffffff",
  textPrimary:  "#082d1d",
  textSecondary:"#3d5a4a",
  textTertiary: "#4a6d47",
  textMuted:    "#b9d3c4",
  border:       "#dde4de",
  borderStrong: "#c4cbc2",
  accent:       "#059669",
  accentHover:  "#047857",
  stone100:     "#f8f9f5",
  stone200:     "#f1f3ef",
};

type Emotion = "DREADING" | "ANXIOUS" | "NEUTRAL" | "WILLING" | "EXCITED" | "";

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function defaultTimeString() {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AllTasksView() {
  const pathname    = usePathname();
  const isAllPage   = pathname === "/all";
  const queryClient = useQueryClient();
  const isMobile    = useIsMobile();
  const { editingTaskId, setEditingTaskId } = useUIStore();

  const [completedOpen, setCompletedOpen] = useState(false);
  const [formOpen, setFormOpen]     = useState(false);
  const [title, setTitle]           = useState("");
  const [emotion, setEmotion]       = useState<Emotion>("NEUTRAL");
  const [dueDate, setDueDate]       = useState(todayString);
  const [dueTime, setDueTime]       = useState("");
  const [note, setNote]             = useState("");
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const activeFilter    = isAllPage ? "all"             : "today-active";
  const completedFilter = isAllPage ? "completed"       : "today-completed";

  const { data: allTasks = [], isLoading } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", activeFilter],
    queryFn: () => fetch(`/api/tasks?filter=${activeFilter}`).then(r => r.json()),
    retry: 1,
  });

  const { data: completedTasks = [] } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", completedFilter],
    queryFn: () => fetch(`/api/tasks?filter=${completedFilter}`).then(r => r.json()),
    retry: 1,
  });

  // Close create form if a task edit opens
  useEffect(() => {
    if (editingTaskId !== null && formOpen) resetForm();
  }, [editingTaskId]);

  function openForm() {
    setEditingTaskId(null); // close any open task edit
    setFormOpen(true);
    setTimeout(() => titleRef.current?.focus(), 20);
  }

  function resetForm() {
    setTitle(""); setEmotion("NEUTRAL");
    setDueDate(todayString()); setDueTime(""); setNote("");
    setFormOpen(false);
  }

  async function handleCreate() {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    const dueAt = dueDate
      ? new Date(`${dueDate}T${dueTime || "00:00"}`).toISOString()
      : null;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: TaskWithSubtasks = {
      id: optimisticId, userId: "",
      title: title.trim(),
      dueAt: dueAt ? new Date(dueAt) : null,
      emotionalState: (emotion as TaskWithSubtasks["emotionalState"]) || "NEUTRAL",
      isCompleted: false, deferredCount: 0, sortOrder: 0,
      lastTouchedAt: new Date(), recurrenceRule: null, parentTaskId: null,
      createdAt: new Date(), updatedAt: new Date(), subtasks: [],
    };
    const snap = queryClient.getQueryData<TaskWithSubtasks[]>(["tasks", activeFilter]);
    queryClient.setQueryData<TaskWithSubtasks[]>(["tasks", activeFilter], old => [optimistic, ...(old ?? [])]);
    resetForm();

    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: optimistic.title, emotionalState: emotion || null, dueAt }),
      });
      queryClient.invalidateQueries({ queryKey: ["tasks", activeFilter] });
      queryClient.invalidateQueries({ queryKey: ["tasks", completedFilter] });
    } catch {
      queryClient.setQueryData(["tasks", activeFilter], snap);
    } finally {
      setSubmitting(false);
    }
  }

  const pad = isMobile ? "16px 14px 0" : "24px 28px 0";
  const stickyBottom = isMobile ? 68 : 0;

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
    <div style={{
      maxWidth: 860, margin: "0 auto",
      display: "flex", flexDirection: "column", minHeight: "100%",
      padding: pad,
    }}>

      {/* Header */}
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <p style={{ fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: T.textTertiary, margin: "0 0 4px" }}>
          {isAllPage
            ? "Workspace · All Tasks"
            : new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, letterSpacing: "-0.04em", color: T.textPrimary, margin: 0, lineHeight: 1 }}>
          {isAllPage ? "All Tasks" : "Today"}
        </h1>
      </div>

      {/* Task list */}
      <div style={{ marginBottom: 10 }}>
        {isLoading ? (
          <SkeletonTaskList count={4} />
        ) : (
          <TaskGrid
            tasks={allTasks.filter(t => !t.isCompleted)}
            isLoading={false}
            emptyState={
              <div style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🌿</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, marginBottom: 4 }}>No tasks yet</p>
                <p style={{ fontSize: 13, color: T.textTertiary }}>Add your first task below.</p>
              </div>
            }
          />
        )}
      </div>

      {/* Completed section */}
      <div style={{ marginBottom: 10 }}>
        <button
          onClick={() => setCompletedOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "13px 18px", background: T.surface,
            borderRadius: 12, border: `1px solid ${T.border}`,
            cursor: "pointer", fontFamily: "inherit",
            fontSize: 13.5, fontWeight: 600, color: T.textPrimary,
            width: "100%", textAlign: "left", transition: "background 0.1s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = T.stone200)}
          onMouseLeave={e => (e.currentTarget.style.background = T.surface)}
        >
          <svg
            width="11" height="11" viewBox="0 0 12 12" fill="none"
            stroke={T.borderStrong} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: "transform 0.2s", transform: completedOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}
          >
            <path d="M4 2l4 4-4 4"/>
          </svg>
          Completed
          <span style={{ fontSize: 12.5, color: T.textMuted, fontWeight: 500, marginLeft: "auto" }}>
            {completedTasks.length}
          </span>
        </button>

        {completedOpen && completedTasks.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <TaskGrid tasks={completedTasks} isLoading={false} />
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* ── New Task bar — sticky at bottom (desktop only; mobile uses FAB) ── */}
      {!isMobile && <div style={{ position: "sticky", bottom: stickyBottom, padding: `10px 0 28px`, background: T.bg }}>

        <div style={{
          background: T.surface, borderRadius: 12,
          border: `1px solid ${T.accent}`,
          boxShadow: formOpen ? "0 0 0 3px rgba(5,150,105,0.07)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}>

          {/* Row: circle + title */}
          <div
            onClick={!formOpen ? openForm : undefined}
            style={{
              display: "flex", alignItems: "flex-start",
              padding: "12px 14px 12px 16px",
              cursor: !formOpen ? "pointer" : "default",
              background: !formOpen ? "#f2fdec" : "transparent",
              borderRadius: formOpen ? 0 : 11,
              transition: "background 0.15s",
            }}
          >
            <div style={{ paddingTop: 2, paddingRight: 12, flexShrink: 0 }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                background: "transparent", border: `1.5px solid ${T.accent}`,
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {formOpen ? (
                <input
                  ref={titleRef}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") resetForm(); }}
                  placeholder="Task name"
                  style={{
                    width: "100%", border: "none", outline: "none", fontFamily: "inherit",
                    fontSize: 14, fontWeight: 450, color: T.textPrimary,
                    background: "transparent", display: "block",
                  }}
                />
              ) : (
                <span style={{ fontSize: 14, fontWeight: 500, color: T.accent, userSelect: "none" }}>
                  New Task…
                </span>
              )}
            </div>
          </div>

          {/* Pickers row */}
          {formOpen && (
            <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 14px" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
                gap: isMobile ? 8 : 10,
              }}>
                <FeelingPickerField value={emotion} onChange={v => setEmotion(v as Emotion)} label="Feeling" dropUp={isMobile} />
                <DatePickerField value={dueDate} onChange={setDueDate} label="Due date" dropUp={isMobile} />
                <TimePickerField value={dueTime} onChange={setDueTime} label="Due time (optional)" selectedDate={dueDate} dropUp={isMobile} />
              </div>
            </div>
          )}

          {/* Note + actions */}
          {formOpen && (
            <>
              <div style={{ borderTop: `1px solid ${T.border}` }}>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note…"
                  rows={2}
                  style={{
                    width: "100%", border: "none", outline: "none", fontFamily: "inherit",
                    fontSize: 13, color: T.textSecondary, background: "transparent",
                    resize: "none", boxSizing: "border-box", lineHeight: 1.6,
                    padding: "10px 14px",
                  }}
                />
              </div>

              <div style={{
                borderTop: `1px solid ${T.border}`,
                padding: "10px 14px",
                display: "flex", justifyContent: "flex-end", gap: 8,
              }}>
                <button onClick={resetForm} style={{
                  padding: "6px 14px", borderRadius: 6, border: `1px solid ${T.border}`,
                  background: T.surface, color: T.textSecondary, fontSize: 12.5,
                  cursor: "pointer", fontFamily: "inherit",
                }}>Cancel</button>
                <button
                  onClick={handleCreate}
                  disabled={!title.trim() || submitting}
                  style={{
                    padding: "6px 16px", borderRadius: 6, border: "none",
                    background: title.trim() ? T.accent : T.stone200,
                    color: title.trim() ? "#fff" : T.textMuted,
                    fontSize: 12.5, fontWeight: 600,
                    cursor: title.trim() ? "pointer" : "default",
                    fontFamily: "inherit", transition: "background 0.12s",
                  }}
                  onMouseEnter={e => { if (title.trim()) (e.currentTarget as HTMLElement).style.background = T.accentHover; }}
                  onMouseLeave={e => { if (title.trim()) (e.currentTarget as HTMLElement).style.background = T.accent; }}
                >Add Task</button>
              </div>
            </>
          )}
        </div>
      </div>}

    </div>
    </div>
  );
}

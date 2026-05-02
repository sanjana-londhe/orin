"use client";

import { useState, useRef, useEffect } from "react";
import { X, Check, Trash2, Plus } from "lucide-react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { EMOTION_MAP } from "@/lib/emotions";

const EMOTIONS = [
  { value: "DREADING", label: "Dreading", emoji: "😮‍💨" },
  { value: "ANXIOUS",  label: "Anxious",  emoji: "😟" },
  { value: "NEUTRAL",  label: "Neutral",  emoji: "😐" },
  { value: "WILLING",  label: "Willing",  emoji: "🙂" },
  { value: "EXCITED",  label: "Excited",  emoji: "🤩" },
] as const;

interface Props {
  task: TaskWithSubtasks;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Pick<Task, "title" | "dueAt" | "emotionalState">>) => void;
  onAddSubtask: (parentId: string, title: string) => void;
  onDeleteSubtask: (id: string) => void;
  onCompleteSubtask: (id: string) => void;
}

export function TaskEditModal({ task, onClose, onUpdate, onAddSubtask, onDeleteSubtask, onCompleteSubtask }: Props) {
  const [title, setTitle]     = useState(task.title);
  const [emotion, setEmotion] = useState(task.emotionalState as typeof EMOTIONS[number]["value"]);
  const [dateStr, setDateStr] = useState(task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : "");
  const [timeStr, setTimeStr] = useState(task.dueAt ? new Date(task.dueAt).toISOString().slice(11, 16) : "");
  const [newSub, setNewSub]   = useState("");
  const [error, setError]     = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const subRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  function handleSave() {
    if (!title.trim()) { setError("Title is required"); return; }
    const dueAt = dateStr ? new Date(`${dateStr}T${timeStr || "00:00"}`).toISOString() : null;
    onUpdate(task.id, {
      title: title.trim(),
      dueAt: dueAt as unknown as Date,
      emotionalState: emotion as Task["emotionalState"],
    });
    onClose();
  }

  function addSub() {
    const t = newSub.trim();
    if (!t) return;
    onAddSubtask(task.id, t);
    setNewSub("");
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,32,16,0.4)", backdropFilter: "blur(4px)" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 480, background: "#fff", borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,0.15)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid #f0f0f0" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0a2010", margin: 0, letterSpacing: "-0.02em" }}>Edit task</h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #e5e7eb", background: "#f9fafb", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Title */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Task title</label>
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
              style={{ width: "100%", fontSize: 15, fontWeight: 600, color: "#0a2010", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", outline: "none", fontFamily: "inherit", background: "#fafafa", boxSizing: "border-box" }}
              onFocus={e => (e.currentTarget.style.borderColor = "#16a34a")}
              onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
            />
            {error && <p style={{ fontSize: 12, color: "#ef4444", margin: "4px 0 0" }}>{error}</p>}
          </div>

          {/* Date + Time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Due date</label>
              <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)}
                style={{ width: "100%", fontSize: 13, padding: "9px 10px", borderRadius: 10, border: "1.5px solid #e5e7eb", outline: "none", fontFamily: "inherit", background: "#fafafa", boxSizing: "border-box" }}
                onFocus={e => (e.currentTarget.style.borderColor = "#16a34a")}
                onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Due time</label>
              <input type="time" value={timeStr} onChange={e => setTimeStr(e.target.value)} disabled={!dateStr}
                style={{ width: "100%", fontSize: 13, padding: "9px 10px", borderRadius: 10, border: "1.5px solid #e5e7eb", outline: "none", fontFamily: "inherit", background: dateStr ? "#fafafa" : "#f3f4f6", boxSizing: "border-box" }}
                onFocus={e => (e.currentTarget.style.borderColor = "#16a34a")}
                onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
              />
            </div>
          </div>

          {/* Emotion */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>How do you feel about it?</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {EMOTIONS.map(e => {
                const em = EMOTION_MAP[e.value as keyof typeof EMOTION_MAP];
                const active = emotion === e.value;
                return (
                  <button key={e.value} onClick={() => setEmotion(e.value)} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "6px 12px", borderRadius: 999,
                    background: active ? em.pillText : em.pillBg,
                    color: active ? "#fff" : em.pillText,
                    border: "none", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                  }}>
                    {e.emoji} {e.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>Subtasks</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {task.subtasks.map(sub => (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "#f9fafb" }}>
                  <button onClick={() => onCompleteSubtask(sub.id)} style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    cursor: "pointer",
                    background: sub.isCompleted ? "#16a34a" : "#fff",
                    border: `2px solid ${sub.isCompleted ? "#16a34a" : "#d1d5db"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s",
                  }}>
                    {sub.isCompleted && <Check size={9} color="#fff" strokeWidth={3} />}
                  </button>
                  <span style={{ flex: 1, fontSize: 13, color: sub.isCompleted ? "#9ca3af" : "#374151", textDecoration: sub.isCompleted ? "line-through" : "none" }}>
                    {sub.title}
                  </span>
                  <button onClick={() => onDeleteSubtask(sub.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: 0, display: "flex" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ef4444"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#d1d5db"}
                  ><Trash2 size={13} /></button>
                </div>
              ))}

              {/* Add new subtask */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  ref={subRef}
                  value={newSub}
                  onChange={e => setNewSub(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }}
                  placeholder="Add a subtask…"
                  style={{ flex: 1, fontSize: 13, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", outline: "none", fontFamily: "inherit", background: "#fafafa" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "#16a34a")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
                />
                <button onClick={addSub} disabled={!newSub.trim()} style={{
                  width: 34, height: 34, borderRadius: 8, border: "none",
                  background: newSub.trim() ? "#16a34a" : "#e5e7eb",
                  color: newSub.trim() ? "#fff" : "#9ca3af",
                  cursor: newSub.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}><Plus size={15} /></button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1.5px solid #e5e7eb", background: "#fff", color: "#6b7280", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button onClick={handleSave} style={{ flex: 2, padding: "11px 0", borderRadius: 12, border: "none", background: "#16a34a", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

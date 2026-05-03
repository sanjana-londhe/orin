"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";

const EMOTIONS = [
  { value: "DREADING", label: "Dreading", emoji: "😮‍💨", bg: "#FFF0EC", fg: "#D14626", activeBg: "#D14626" },
  { value: "ANXIOUS",  label: "Anxious",  emoji: "😟",   bg: "#FFF8E8", fg: "#B07A10", activeBg: "#B07A10" },
  { value: "NEUTRAL",  label: "Neutral",  emoji: "😐",   bg: "#3a3a3a", fg: "#fff",    activeBg: "#3a3a3a" },
  { value: "WILLING",  label: "Willing",  emoji: "🙂",   bg: "#EEF9F7", fg: "#0E8A7D", activeBg: "#0E8A7D" },
  { value: "EXCITED",  label: "Excited",  emoji: "🤩",   bg: "#EEFAF1", fg: "#1A9444", activeBg: "#1A9444" },
] as const;

interface Props {
  task: TaskWithSubtasks;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Pick<Task, "title" | "dueAt" | "emotionalState">>) => void;
}

export function TaskEditModal({ task, onClose, onUpdate }: Props) {
  const [title, setTitle]     = useState(task.title);
  const [emotion, setEmotion] = useState(task.emotionalState as typeof EMOTIONS[number]["value"]);
  const [dateStr, setDateStr] = useState(task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : "");
  const [timeStr, setTimeStr] = useState(task.dueAt ? new Date(task.dueAt).toISOString().slice(11, 16) : "");
  const [error, setError]     = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  function handleSave() {
    if (!title.trim()) { setError("Title is required"); return; }
    const dueAt = dateStr ? new Date(`${dateStr}T${timeStr || "00:00"}`).toISOString() : null;
    onUpdate(task.id, { title: title.trim(), dueAt: dueAt as unknown as Date, emotionalState: emotion as Task["emotionalState"] });
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,32,16,0.4)", backdropFilter: "blur(4px)" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 480, background: "#fff", borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,0.15)", overflow: "hidden" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid #f0f0f0" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0a2010", margin: 0, letterSpacing: "-0.02em" }}>Edit task</h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #e5e7eb", background: "#f9fafb", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Task title</label>
            <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
              style={{ width: "100%", fontSize: 15, fontWeight: 600, color: "#0a2010", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", outline: "none", fontFamily: "inherit", background: "#fafafa", boxSizing: "border-box" }}
              onFocus={e => (e.currentTarget.style.borderColor = "#16a34a")}
              onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
            />
            {error && <p style={{ fontSize: 12, color: "#ef4444", margin: "4px 0 0" }}>{error}</p>}
          </div>

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

          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#082d1d", display: "block", marginBottom: 10 }}>How do you feel about it?</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {EMOTIONS.map(s => {
                const active = emotion === s.value;
                return (
                  <button key={s.value} onClick={() => setEmotion(s.value)} style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10,
                    background: active ? s.activeBg : s.bg, color: active ? "#fff" : s.fg,
                    border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                  }}>
                    <span style={{ fontSize: 16 }}>{s.emoji}</span> {s.label}
                  </button>
                );
              })}
            </div>
          </div>

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

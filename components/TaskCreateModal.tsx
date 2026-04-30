"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DatePickerField } from "@/components/DatePickerField";

const STATES = [
  { value: "DREADING", label: "Dreading", emoji: "😮‍💨", bg: "#FFF0EC", fg: "#D14626", activeBg: "#D14626" },
  { value: "ANXIOUS",  label: "Anxious",  emoji: "😟",   bg: "#FFF8E8", fg: "#B07A10", activeBg: "#B07A10" },
  { value: "NEUTRAL",  label: "Neutral",  emoji: "😐",   bg: "#3a3a3a", fg: "#fff",    activeBg: "#3a3a3a" },
  { value: "WILLING",  label: "Willing",  emoji: "🙂",   bg: "#EEF9F7", fg: "#0E8A7D", activeBg: "#0E8A7D" },
  { value: "EXCITED",  label: "Excited",  emoji: "🤩",   bg: "#EEFAF1", fg: "#1A9444", activeBg: "#1A9444" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  defaultTitle?: string;
}

function getDefaultDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultTime() {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function TaskCreateModal({ open, onOpenChange, defaultDate, defaultTitle }: Props) {
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    if (open) setOpenCount(c => c + 1);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-[14px] border-[1.5px] border-[#059669]" style={{ boxShadow: "0 4px 24px rgba(5,150,105,0.12)" }}>
        {open && (
          <ModalForm
            key={openCount}
            defaultDate={defaultDate}
            defaultTitle={defaultTitle}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModalForm({ defaultDate, defaultTitle, onClose }: { defaultDate?: string; defaultTitle?: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle]     = useState(defaultTitle ?? "");
  const [emotion, setEmotion] = useState<typeof STATES[number]["value"]>("NEUTRAL");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subInput, setSubInput] = useState("");
  const [error, setError]     = useState("");
  const timeRef = useRef<HTMLInputElement>(null);
  const initTime = getDefaultTime();
  const [selectedDate, setSelectedDate] = useState(defaultDate ?? getDefaultDate());

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const dueTime = timeRef.current?.value ?? initTime;
      const dueAt = selectedDate
        ? new Date(`${selectedDate}T${dueTime || "00:00"}`).toISOString()
        : null;
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), dueAt, emotionalState: emotion }),
      });
      if (!res.ok) {
        let msg = "Failed to create task";
        try { const d = await res.json(); msg = d.error ?? msg; } catch { /* empty */ }
        throw new Error(msg);
      }
      const task = await res.json();
      for (const st of subtasks) {
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
      handleClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleClose() {
    onClose();
  }

  function addSubtask() {
    const t = subInput.trim();
    if (t) { setSubtasks(p => [...p, t]); setSubInput(""); }
  }

  return (
    <>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 20px 16px", borderBottom: "1px solid #e9ede9" }}>
          <span style={{ fontSize: 15, color: "#b9d3c4", flexShrink: 0 }}>✦</span>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What needs doing?"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 16, fontWeight: 500, color: "#082d1d", background: "transparent", fontFamily: "inherit" }}
          />
        </div>

        {/* Body */}
        <div style={{ padding: "20px 20px 16px" }}>

          {/* Due date */}
          <div style={{ marginBottom: 16 }}>
            <DatePickerField value={selectedDate} onChange={setSelectedDate} label="Due date" />
          </div>

          {/* Time */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#082d1d", marginBottom: 8 }}>Due time</p>
            <input ref={timeRef} type="time" defaultValue={initTime}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #dde4de", borderRadius: 8, fontSize: 13, color: "#082d1d", background: "#fafbf7", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Feeling */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#082d1d", marginBottom: 10 }}>How do you feel about it?</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {STATES.map(s => {
                const active = emotion === s.value;
                return (
                  <button key={s.value} onClick={() => setEmotion(s.value)} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "6px 13px", borderRadius: 999,
                    background: active ? s.activeBg : s.bg,
                    color: active ? "#fff" : s.fg,
                    border: `1.5px solid ${active ? s.activeBg : s.bg}`,
                    fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.12s",
                  }}>
                    {s.emoji} {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action items */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#082d1d", marginBottom: 10 }}>Action items</p>
            {subtasks.map((st, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", border: "1.5px solid #dde4de", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: "#082d1d" }}>{st}</span>
                <button onClick={() => setSubtasks(p => p.filter((_, j) => j !== i))}
                  style={{ fontSize: 11, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", border: "1.5px solid #dde4de", flexShrink: 0 }} />
              <input value={subInput} onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                placeholder="Add action item..."
                style={{ flex: 1, border: "none", borderBottom: "1px solid #e9ede9", outline: "none", fontSize: 13, color: "#082d1d", background: "transparent", fontFamily: "inherit", paddingBottom: 4 }} />
            </div>
          </div>

          {error && <p style={{ fontSize: 12, color: "#c23934", marginBottom: 8 }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "12px 20px 18px", borderTop: "1px solid #e9ede9" }}>
          <button onClick={handleClose} style={{
            padding: "9px 20px", borderRadius: 8, border: "1.5px solid #dde4de",
            background: "#fff", color: "#3d5a4a", fontSize: 13.5, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Cancel
          </button>
          <button onClick={() => { if (!title.trim()) { setError("Add a title first"); return; } setError(""); mutate(); }}
            disabled={isPending || !title.trim()}
            style={{
              padding: "9px 24px", borderRadius: 8, border: "none",
              background: title.trim() ? "#059669" : "#c4cbc2",
              color: "#fff", fontSize: 13.5, fontWeight: 700,
              cursor: title.trim() ? "pointer" : "default", fontFamily: "inherit",
              transition: "background 0.13s",
            }}
            onMouseEnter={e => { if (title.trim()) (e.currentTarget as HTMLElement).style.background = "#047857"; }}
            onMouseLeave={e => { if (title.trim()) (e.currentTarget as HTMLElement).style.background = "#059669"; }}>
            {isPending ? "Creating…" : "Create task"}
          </button>
        </div>
    </>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DatePickerField } from "@/components/DatePickerField";
import { TimePickerField } from "@/components/TimePickerField";

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
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden rounded-[12px] border border-[#dde4de]" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.1)", background: "#fff" }}>
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
  const [selectedTime, setSelectedTime] = useState(initTime);

  const { mutate, isPending } = useMutation({
    mutationFn: async (vars: { title: string; dueAt: string | null; emotion: typeof emotion; subtasks: string[] }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: vars.title, dueAt: vars.dueAt, emotionalState: vars.emotion }),
      });
      if (!res.ok) {
        let msg = "Failed to create task";
        try { const d = await res.json(); msg = d.error ?? msg; } catch { /* empty */ }
        throw new Error(msg);
      }
      const task = await res.json();
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
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = queryClient.getQueriesData({ queryKey: ["tasks"] });

      // Insert optimistic task into every tasks query so it appears instantly
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        userId: "",
        title: vars.title,
        dueAt: vars.dueAt ? new Date(vars.dueAt) : null,
        emotionalState: vars.emotion,
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

      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: unknown) =>
        Array.isArray(old) ? [...old, optimistic] : old
      );

      // Close modal immediately — don't wait for the server
      handleClose();

      return { snap };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snap.forEach(([key, data]: [unknown, unknown]) => queryClient.setQueryData(key as Parameters<typeof queryClient.setQueryData>[0], data));
      setError("Failed to create task — please try again");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
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
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px 14px", borderBottom: "1px solid #e9ede9" }}>
          <span style={{ fontSize: 13, color: "#b9d3c4", flexShrink: 0 }}>✦</span>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
            placeholder="What needs doing?"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontWeight: 500, color: "#082d1d", background: "transparent", fontFamily: "inherit" }} />
        </div>

        <div style={{ padding: "16px 20px 14px" }}>

          {/* Date + Time side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <DatePickerField value={selectedDate} onChange={setSelectedDate} label="Due date" />
            <TimePickerField value={selectedTime} onChange={setSelectedTime} label="Due time" />
          </div>

          {/* Feeling — compact pills */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#3d5a4a", marginBottom: 7 }}>Feeling</p>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {STATES.map(s => {
                const active = emotion === s.value;
                return (
                  <button key={s.value} onClick={() => setEmotion(s.value)} style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    padding: "4px 10px", borderRadius: 999,
                    background: active ? s.activeBg : s.bg,
                    color: active ? "#fff" : s.fg,
                    border: `1.5px solid ${active ? s.activeBg : s.bg}`,
                    fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.12s",
                  }}>
                    {s.emoji} {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action items */}
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#3d5a4a", marginBottom: 6 }}>Action items</p>
            {subtasks.map((st, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 0" }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid #dde4de", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: "#082d1d" }}>{st}</span>
                <button onClick={() => setSubtasks(p => p.filter((_, j) => j !== i))}
                  style={{ fontSize: 10, color: "#c4cbc2", background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 7, paddingTop: 3 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid #dde4de", flexShrink: 0 }} />
              <input value={subInput} onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                placeholder="Add action item..."
                style={{ flex: 1, border: "none", borderBottom: "1px solid #e9ede9", outline: "none", fontSize: 12, color: "#082d1d", background: "transparent", fontFamily: "inherit", paddingBottom: 3 }} />
            </div>
          </div>

          {error && <p style={{ fontSize: 11.5, color: "#c23934", marginTop: 6 }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid #e9ede9" }}>
          <button onClick={handleClose} style={{
            padding: "7px 16px", borderRadius: 8, border: "1.5px solid #dde4de",
            background: "#fff", color: "#3d5a4a", fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Cancel
          </button>
          <button onClick={() => {
              if (!title.trim()) { setError("Add a title first"); return; }
              setError("");
              const dueTime = selectedTime || initTime;
              mutate({
                title: title.trim(),
                dueAt: selectedDate ? new Date(`${selectedDate}T${dueTime}`).toISOString() : null,
                emotion,
                subtasks,
              });
            }}
            disabled={isPending || !title.trim()}
            style={{
              padding: "7px 20px", borderRadius: 8, border: "none",
              background: title.trim() ? "#059669" : "#c4cbc2",
              color: "#fff", fontSize: 13, fontWeight: 700,
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

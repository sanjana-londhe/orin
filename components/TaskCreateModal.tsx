"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { EmotionalState } from "@/components/EmotionalStatePicker";

const STATES: {
  value: EmotionalState; label: string; emoji: string; desc: string;
  bg: string; border: string; text: string; ring: string; btnBg: string;
}[] = [
  { value: "DREADING", label: "Dreading",  emoji: "😮‍💨", desc: "I really don't want to do this",  bg: "bg-[#fcf0f3]", border: "border-[#e9c3c1]", text: "text-[#991e4b]", ring: "ring-[#c23934]", btnBg: "#c23934" },
  { value: "ANXIOUS",  label: "Anxious",   emoji: "😟",   desc: "This makes me nervous",           bg: "bg-[#f9f2d9]", border: "border-[#ebd587]", text: "text-[#886a00]", ring: "ring-[#886a00]", btnBg: "#886a00" },
  { value: "NEUTRAL",  label: "Neutral",   emoji: "😐",   desc: "I feel nothing about this",        bg: "bg-[#f1f3ef]", border: "border-[#dde4de]", text: "text-[#4a6d47]", ring: "ring-[#c4cbc2]", btnBg: "#059669" },
  { value: "WILLING",  label: "Willing",   emoji: "🙂",   desc: "I don't mind doing this",          bg: "bg-[#e8f5f5]", border: "border-[#bed7d7]", text: "text-[#234b43]", ring: "ring-[#2b6b5e]", btnBg: "#2b6b5e" },
  { value: "EXCITED",  label: "Excited",   emoji: "🤩",   desc: "I actually want to do this",       bg: "bg-[#f2fdec]", border: "border-[#c8f7ae]", text: "text-[#243000]", ring: "ring-[#59d10b]", btnBg: "#59d10b" },
];

const RECURRENCE_PRESETS = [
  { label: "None",       value: "" },
  { label: "↺ Daily",    value: "FREQ=DAILY" },
  { label: "↺ Weekdays", value: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
  { label: "↺ Weekly",   value: "FREQ=WEEKLY" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string; // ISO date string e.g. "2026-04-30"
}

export function TaskCreateModal({ open, onOpenChange, defaultDate }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep]                     = useState<"details" | "emotion">("details");
  const [title, setTitle]                   = useState("");
  const [dueDate, setDueDate]               = useState(defaultDate ?? "");
  const [dueTime, setDueTime]               = useState("");
  const [emotionalState, setEmotionalState] = useState<EmotionalState>("NEUTRAL");
  const [recurrence, setRecurrence]         = useState("");
  const [subtasks, setSubtasks]             = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput]     = useState("");
  const [error, setError]                   = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      let dueAt: string | null = null;
      if (dueDate) dueAt = new Date(`${dueDate}T${dueTime || "00:00"}`).toISOString();

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, dueAt, emotionalState, recurrenceRule: recurrence || null }),
      });
      if (!res.ok) {
        let msg = "Failed to create task";
        try { const d = await res.json(); msg = d.error ?? msg; } catch { /* empty */ }
        throw new Error(msg);
      }
      const task = await res.json();

      // Create subtasks if any
      for (const st of subtasks) {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: st, parentTaskId: task.id }),
        });
      }
      return task;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); handleClose(); },
    onError: (e: Error) => setError(e.message),
  });

  function handleClose() {
    setTitle(""); setDueDate(defaultDate ?? ""); setDueTime("");
    setEmotionalState("NEUTRAL"); setRecurrence("");
    setSubtasks([]); setSubtaskInput(""); setError(""); setStep("details");
    onOpenChange(false);
  }

  function addSubtask() {
    const t = subtaskInput.trim();
    if (t) { setSubtasks(p => [...p, t]); setSubtaskInput(""); }
  }

  const sel = STATES.find(s => s.value === emotionalState)!;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden rounded-[16px] border border-[var(--stone-400)] shadow-md">

        {step === "details" ? (
          /* ─── Step 1: Task details ─── */
          <div>
            <div className="px-6 pt-6 pb-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#B0A89E] mb-3">New task</p>

              {/* Title */}
              <textarea autoFocus value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (title.trim()) { setError(""); setStep("emotion"); } } }}
                placeholder="What needs doing?"
                rows={2}
                className="w-full resize-none bg-transparent outline-none text-[22px] font-bold leading-snug tracking-[-0.025em] text-[#1A1814] placeholder:text-[#D8D2CC] mb-5"
              />

              {/* Due date + time — clear labels */}
              <div className="flex gap-2 mb-5">
                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-[#8C8880] mb-1.5">Set due date</p>
                  <div className="flex items-center gap-1.5 rounded-[8px] border border-[#E4DDD4] bg-[#FDFCFA] px-3 py-2.5">
                    <span className="text-[13px]">📅</span>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                      className="flex-1 bg-transparent outline-none text-[12.5px] text-[#4C4840] min-w-0" />
                  </div>
                </div>
                <div className={cn("flex-1", !dueDate && "opacity-40 pointer-events-none")}>
                  <p className="text-[11px] font-semibold text-[#8C8880] mb-1.5">Set time</p>
                  <div className="flex items-center gap-1.5 rounded-[8px] border border-[#E4DDD4] bg-[#FDFCFA] px-3 py-2.5">
                    <span className="text-[13px]">🕐</span>
                    <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)}
                      disabled={!dueDate}
                      className="flex-1 bg-transparent outline-none text-[12.5px] text-[#4C4840]" />
                  </div>
                </div>
              </div>

              {/* Repeats */}
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-[#8C8880] mb-1.5">Repeats</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {RECURRENCE_PRESETS.map(p => (
                    <button key={p.value} type="button" onClick={() => setRecurrence(p.value)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[11px] font-semibold border transition-all",
                        recurrence === p.value
                          ? "bg-[#059669] text-white border-\[#059669\]"
                          : "bg-white text-[#8C8880] border-[#E4DDD4] hover:border-[#B0A89E]"
                      )}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <p className="text-[11px] font-semibold text-[#8C8880] mb-1.5">Action items (optional)</p>
                {subtasks.map((st, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span className="w-[10px] h-[10px] rounded-[2px] border border-[#D8D2CC] flex-shrink-0" />
                    <span className="text-[12.5px] text-[#4C4840] flex-1">{st}</span>
                    <button onClick={() => setSubtasks(p => p.filter((_, j) => j !== i))}
                      className="text-[10px] text-[#D8D2CC] hover:text-[#c23934] transition-colors">✕</button>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-[10px] h-[10px] rounded-[2px] border border-dashed border-[#D8D2CC] flex-shrink-0" />
                  <input value={subtaskInput} onChange={e => setSubtaskInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                    placeholder="Add an action item…"
                    className="flex-1 bg-transparent outline-none text-[12.5px] text-[#4C4840] placeholder:text-[#D8D2CC]"
                  />
                  {subtaskInput && (
                    <button onClick={addSubtask} className="text-[10px] font-bold text-[#059669]">+ Add</button>
                  )}
                </div>
              </div>

              {error && <p className="text-[12px] text-[#c23934] mt-3">{error}</p>}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-[#F0ECE6] bg-[#FDFCFA]">
              <button onClick={handleClose} className="text-[12.5px] text-[#8C8880] hover:text-[#1A1814]">Cancel</button>
              <button onClick={() => { if (!title.trim()) { setError("Add a title first"); return; } setError(""); setStep("emotion"); }}
                className="flex items-center gap-1.5 bg-[#059669] border border-[var(--stone-400)] text-white text-[12.5px] font-bold px-4 py-2 rounded-[8px] hover: transition-all">
                Next → how do you feel?
              </button>
            </div>
          </div>

        ) : (
          /* ─── Step 2: Emotional state ─── */
          <div>
            <div className="px-6 pt-6 pb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#B0A89E] mb-1">How do you feel about it?</p>
              <p className="text-[17px] font-bold tracking-tight text-[#1A1814] truncate mb-4">{title}</p>

              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Emotional state">
                {STATES.map(s => (
                  <button key={s.value} role="radio" aria-checked={emotionalState === s.value}
                    onClick={() => setEmotionalState(s.value)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-[10px] border text-left transition-all",
                      s.bg, s.border,
                      emotionalState === s.value ? `ring-2 ${s.ring} ring-offset-1` : "hover:opacity-90"
                    )}>
                    <span className="text-[22px] leading-none flex-shrink-0">{s.emoji}</span>
                    <div className="flex-1">
                      <p className={cn("text-[13px] font-bold", s.text)}>{s.label}</p>
                      <p className={cn("text-[11px] opacity-70", s.text)}>{s.desc}</p>
                    </div>
                    {emotionalState === s.value && <span className={cn("text-[13px] font-bold flex-shrink-0", s.text)}>✓</span>}
                  </button>
                ))}
              </div>

              {error && <p className="text-[12px] text-[#c23934] mt-3">{error}</p>}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-[#F0ECE6] bg-[#FDFCFA]">
              <button onClick={() => setStep("details")} className="text-[12.5px] text-[#8C8880] hover:text-[#1A1814]">← Back</button>
              <button onClick={() => mutate()} disabled={isPending}
                style={{ background: sel.btnBg }}
                className="flex items-center gap-1.5 text-white text-[12.5px] font-bold px-5 py-2 rounded-[8px] border border-[var(--stone-400)] hover: transition-all disabled:opacity-50">
                {isPending ? "Creating…" : `Add task — ${sel.emoji} ${sel.label}`}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { EmotionalState } from "@/components/EmotionalStatePicker";

const STATES: {
  value: EmotionalState;
  label: string;
  emoji: string;
  desc: string;
  bg: string;
  border: string;
  text: string;
  selected: string;
}[] = [
  { value: "DREADING",  label: "Dreading",  emoji: "😮‍💨", desc: "I really don't want to do this", bg: "bg-[#fcf0f3]", border: "border-[#e9c3c1]", text: "text-[#991e4b]", selected: "ring-[#c23934]" },
  { value: "ANXIOUS",   label: "Anxious",   emoji: "😟",   desc: "This makes me nervous",          bg: "bg-[#f9f2d9]", border: "border-[#ebd587]", text: "text-[#886a00]", selected: "ring-[#886a00]" },
  { value: "NEUTRAL",   label: "Neutral",   emoji: "😐",   desc: "I feel nothing about this",       bg: "bg-[#f1f3ef]", border: "border-[#dde4de]", text: "text-[#4a6d47]", selected: "ring-[#c4cbc2]" },
  { value: "WILLING",   label: "Willing",   emoji: "🙂",   desc: "I don't mind doing this",         bg: "bg-[#e8f5f5]", border: "border-[#bed7d7]", text: "text-[#234b43]", selected: "ring-[#2b6b5e]" },
  { value: "EXCITED",   label: "Excited",   emoji: "🤩",   desc: "I actually want to do this",      bg: "bg-[#f2fdec]", border: "border-[#c8f7ae]", text: "text-[#243000]", selected: "ring-[#59d10b]" },
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
}

export function TaskCreateModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle]                   = useState("");
  const [dueDate, setDueDate]               = useState("");
  const [dueTime, setDueTime]               = useState("");
  const [emotionalState, setEmotionalState] = useState<EmotionalState>("NEUTRAL");
  const [recurrence, setRecurrence]         = useState("");
  const [error, setError]                   = useState("");
  const [step, setStep]                     = useState<"title" | "state">("title");

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      let dueAt: string | null = null;
      if (dueDate) {
        dueAt = new Date(`${dueDate}T${dueTime || "00:00"}`).toISOString();
      }
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, dueAt, emotionalState, recurrenceRule: recurrence || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create task");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      handleClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleClose() {
    setTitle(""); setDueDate(""); setDueTime("");
    setEmotionalState("NEUTRAL"); setRecurrence("");
    setError(""); setStep("title");
    onOpenChange(false);
  }

  function handleTitleNext(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("What needs doing?"); return; }
    setError("");
    setStep("state");
  }

  const selectedState = STATES.find(s => s.value === emotionalState)!;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden rounded-[16px] border-[1.5px] border-[#050e11] shadow-[4px_4px_0_#050e11]">

        {step === "title" ? (
          /* ── Step 1: Title + date ── */
          <form onSubmit={handleTitleNext}>
            <div className="px-6 pt-6 pb-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#B0A89E] mb-3">
                New task
              </p>

              {/* Title */}
              <textarea
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (title.trim()) { setError(""); setStep("state"); } } }}
                placeholder="What needs doing?"
                rows={2}
                className="w-full resize-none bg-transparent outline-none text-[22px] font-bold leading-snug tracking-[-0.025em] text-[#1A1814] placeholder:text-[#D8D2CC] mb-5"
              />

              {/* Due date + time */}
              <div className="flex items-center gap-2 mb-5">
                <div className="flex items-center gap-1.5 flex-1 rounded-[8px] border border-[#E4DDD4] bg-[#FDFCFA] px-3 py-2">
                  <span className="text-[13px]">📅</span>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-[12.5px] text-[#4C4840] min-w-0" />
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 rounded-[8px] border border-[#E4DDD4] bg-[#FDFCFA] px-3 py-2 transition-opacity",
                  !dueDate && "opacity-40 pointer-events-none"
                )}>
                  <span className="text-[13px]">🕐</span>
                  <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)}
                    disabled={!dueDate}
                    className="bg-transparent outline-none text-[12.5px] text-[#4C4840] w-[72px]" />
                </div>
              </div>

              {/* Recurrence */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {RECURRENCE_PRESETS.map(p => (
                  <button key={p.value} type="button"
                    onClick={() => setRecurrence(p.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all",
                      recurrence === p.value
                        ? "bg-[#059669] text-white border-[#050e11]"
                        : "bg-white text-[#8C8880] border-[#E4DDD4] hover:border-[#B0A89E]"
                    )}>
                    {p.label}
                  </button>
                ))}
              </div>

              {error && <p className="text-[12px] text-[#c23934] mt-3">{error}</p>}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-[#F0ECE6] bg-[#FDFCFA]">
              <button type="button" onClick={handleClose}
                className="text-[12.5px] text-[#8C8880] hover:text-[#1A1814] transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="flex items-center gap-1.5 bg-[#059669] border border-[#050e11] text-white text-[12.5px] font-bold px-4 py-2 rounded-[8px] transition-all hover:shadow-[2px_2px_0_#050e11]">
                Next → how do you feel?
              </button>
            </div>
          </form>

        ) : (
          /* ── Step 2: Emotional state ── */
          <div>
            <div className="px-6 pt-6 pb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#B0A89E] mb-1">
                How do you feel about it?
              </p>
              <p className="text-[18px] font-bold tracking-tight text-[#1A1814] truncate mb-5">
                {title}
              </p>

              {/* State cards */}
              <div className="flex flex-col gap-2 mb-2" role="radiogroup" aria-label="Emotional state">
                {STATES.map(s => (
                  <button key={s.value} type="button"
                    role="radio" aria-checked={emotionalState === s.value}
                    onClick={() => setEmotionalState(s.value)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-[10px] border text-left transition-all",
                      s.bg, s.border,
                      emotionalState === s.value
                        ? `ring-2 ${s.selected} ring-offset-1`
                        : "hover:opacity-90"
                    )}>
                    <span className="text-[22px] leading-none flex-shrink-0">{s.emoji}</span>
                    <div>
                      <p className={cn("text-[13px] font-bold", s.text)}>{s.label}</p>
                      <p className={cn("text-[11px] opacity-75", s.text)}>{s.desc}</p>
                    </div>
                    {emotionalState === s.value && (
                      <span className={cn("ml-auto text-[13px] font-bold", s.text)}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-[#F0ECE6] bg-[#FDFCFA]">
              <button onClick={() => setStep("title")}
                className="text-[12.5px] text-[#8C8880] hover:text-[#1A1814] transition-colors">
                ← Back
              </button>
              <button onClick={() => mutate()} disabled={isPending}
                className={cn(
                  "flex items-center gap-1.5 text-white text-[12.5px] font-bold px-5 py-2 rounded-[8px] border border-[#050e11] transition-all hover:shadow-[2px_2px_0_#050e11]",
                  selectedState.bg.replace("bg-", "bg-"),
                  `bg-[${selectedState.value === "DREADING" ? "#c23934" : selectedState.value === "ANXIOUS" ? "#886a00" : selectedState.value === "NEUTRAL" ? "#c4cbc2" : selectedState.value === "WILLING" ? "#2b6b5e" : "#59d10b"}]`
                )}
                style={{ background: {
                  DREADING: "#c23934", ANXIOUS: "#886a00", NEUTRAL: "#059669",
                  WILLING: "#2b6b5e", EXCITED: "#59d10b",
                }[emotionalState] }}>
                {isPending ? "Creating…" : `Add task — ${selectedState.emoji} ${selectedState.label}`}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmotionalStatePicker, type EmotionalState } from "@/components/EmotionalStatePicker";
import { cn } from "@/lib/utils";

const RECURRENCE_PRESETS = [
  { label: "None",      value: "" },
  { label: "↺ Daily",   value: "FREQ=DAILY" },
  { label: "↺ Weekdays",value: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
  { label: "↺ Weekly",  value: "FREQ=WEEKLY" },
  { label: "↺ Biweekly",value: "FREQ=WEEKLY;INTERVAL=2" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskCreateModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [emotionalState, setEmotionalState] = useState<EmotionalState>("NEUTRAL");
  const [recurrenceRule, setRecurrenceRule] = useState("");
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      let dueAt: string | null = null;
      if (dueDate) {
        dueAt = dueTime
          ? new Date(`${dueDate}T${dueTime}`).toISOString()
          : new Date(`${dueDate}T00:00:00`).toISOString();
      }

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          dueAt,
          emotionalState,
          recurrenceRule: recurrenceRule || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create task");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      handleClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleClose() {
    setTitle("");
    setDueDate("");
    setDueTime("");
    setEmotionalState("NEUTRAL");
    setRecurrenceRule("");
    setError("");
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    setError("");
    mutate();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Title <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <Input autoFocus placeholder="What needs doing?"
              value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Due date + time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Due date</label>
              <Input type="date" value={dueDate}
                onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Due time</label>
              <Input type="time" value={dueTime}
                onChange={(e) => setDueTime(e.target.value)} disabled={!dueDate} />
            </div>
          </div>

          {/* Recurrence */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Repeats</label>
            <div className="flex flex-wrap gap-1.5">
              {RECURRENCE_PRESETS.map((p) => (
                <button key={p.value} type="button"
                  onClick={() => setRecurrenceRule(p.value)}
                  className={cn(
                    "px-3 py-1 rounded-[6px] border text-[12px] font-semibold transition-all",
                    recurrenceRule === p.value
                      ? "bg-[hsl(var(--primary))] text-white border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]"
                      : "bg-white text-[var(--lime-ink)] border-[var(--stone-400)] hover:bg-[var(--lime-subtle)] hover:border-[var(--stone-500)]"
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Emotional state */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">How do you feel about it?</label>
            <EmotionalStatePicker value={emotionalState} onChange={setEmotionalState} />
          </div>

          {error && (
            <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

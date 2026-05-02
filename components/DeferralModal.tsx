"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Task } from "@prisma/client";

// ── date helpers ──────────────────────────────────────────────────

function addHours(base: Date, h: number): Date {
  return new Date(base.getTime() + h * 60 * 60 * 1000);
}

function nextWeekday(day: number, hour = 9): Date {
  // day: 0=Sun,1=Mon,...,6=Sat
  const now = new Date();
  const result = new Date(now);
  result.setHours(hour, 0, 0, 0);
  const diff = (day - now.getDay() + 7) % 7 || 7; // always future
  result.setDate(now.getDate() + diff);
  return result;
}

function tomorrow9am(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

function formatPreview(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  }) + " at " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── option configs ────────────────────────────────────────────────

const HOUR_OPTIONS = [
  { label: "+1h",  hours: 1 },
  { label: "+2h",  hours: 2 },
  { label: "+4h",  hours: 4 },
  { label: "+8h",  hours: 8 },
];

const RESCHEDULE_OPTIONS = [
  { label: "Tomorrow",     fn: () => tomorrow9am() },
  { label: "This weekend", fn: () => nextWeekday(6, 10) },
  { label: "Next Monday",  fn: () => nextWeekday(1, 9) },
];

type Tab = "defer" | "reschedule";
type Selection =
  | { kind: "hours"; hours: number }
  | { kind: "reschedule"; fn: () => Date }
  | { kind: "custom-hours"; hours: number }
  | { kind: "custom-date"; date: string; time: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onConfirm: (newDueAt: Date) => void;
  defaultTab?: Tab;
}

export function DeferralModal({ open, onOpenChange, task, onConfirm, defaultTab = "defer" }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [customHours, setCustomHours] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("09:00");

  const base = new Date(); // always add hours from right now

  const preview = useMemo<Date | null>(() => {
    if (!selected) return null;
    if (selected.kind === "hours")        return addHours(base, selected.hours);
    if (selected.kind === "reschedule")   return selected.fn();
    if (selected.kind === "custom-hours") return isNaN(selected.hours) ? null : addHours(base, selected.hours);
    if (selected.kind === "custom-date" && selected.date) {
      return new Date(`${selected.date}T${selected.time || "09:00"}`);
    }
    return null;
  }, [selected, base]);

  function handleConfirm() {
    if (!preview) return;
    onConfirm(preview);
    onOpenChange(false);
    reset();
  }

  function reset() {
    setTab(defaultTab);
    setSelected(null);
    setCustomHours("");
    setCustomDate("");
    setCustomTime("09:00");
  }

  function handleClose() { onOpenChange(false); reset(); }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[var(--lime-ink)]">Give yourself more time</DialogTitle>
        </DialogHeader>

        {/* Current due date */}
        {task.dueAt && (
          <p className="text-[12.5px] text-[var(--stone-500)] -mt-1">
            Currently on for{" "}
            <span className="font-semibold text-[var(--lime-ink)]">
              {formatPreview(new Date(task.dueAt))}
            </span>
          </p>
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-[8px] border border-[var(--stone-400)] bg-[var(--stone-100)] p-1">
          {(["defer", "reschedule"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setSelected(null); }}
              className={cn(
                "flex-1 rounded-[6px] py-1.5 text-[12.5px] font-semibold transition-all capitalize",
                tab === t
                  ? "bg-white text-[var(--lime-ink)] shadow-sm border border-[var(--stone-400)]"
                  : "text-[var(--stone-500)] hover:text-[var(--lime-ink)]"
              )}>
              {t === "defer" ? "A bit more time" : "Pick a new day"}
            </button>
          ))}
        </div>

        {/* Tab: Defer by hours */}
        {tab === "defer" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {HOUR_OPTIONS.map((opt) => (
                <button key={opt.hours}
                  onClick={() => setSelected({ kind: "hours", hours: opt.hours })}
                  className={cn(
                    "rounded-[8px] border py-2.5 text-[13px] font-bold transition-all",
                    selected?.kind === "hours" && (selected as { hours: number }).hours === opt.hours
                      ? "bg-[hsl(var(--primary))] text-white"
                      : "bg-white text-[var(--lime-ink)] border-[var(--stone-400)] hover:border-[var(--stone-500)] hover:bg-[var(--lime-subtle)]"
                  )}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom hours */}
            <div className="flex items-center gap-2">
              <Input
                type="number" min="1" max="168" placeholder="Custom hours"
                value={customHours}
                onChange={(e) => {
                  setCustomHours(e.target.value);
                  const h = parseFloat(e.target.value);
                  if (!isNaN(h) && h > 0) setSelected({ kind: "custom-hours", hours: h });
                  else setSelected(null);
                }}
                className="h-9 text-[13px]"
              />
              <span className="text-[12.5px] text-[var(--stone-500)] whitespace-nowrap">hours</span>
            </div>
          </div>
        )}

        {/* Tab: Reschedule */}
        {tab === "reschedule" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {RESCHEDULE_OPTIONS.map((opt) => (
                <button key={opt.label}
                  onClick={() => setSelected({ kind: "reschedule", fn: opt.fn })}
                  className={cn(
                    "rounded-[8px] border py-2.5 text-[12px] font-semibold transition-all",
                    selected?.kind === "reschedule" && preview && formatPreview(preview) === formatPreview(opt.fn())
                      ? "bg-[hsl(var(--primary))] text-white"
                      : "bg-white text-[var(--lime-ink)] border-[var(--stone-400)] hover:border-[var(--stone-500)] hover:bg-[var(--lime-subtle)]"
                  )}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Pick a date */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--stone-500)]">
                Pick a date
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setSelected({ kind: "custom-date", date: e.target.value, time: customTime });
                  }}
                  className="h-9 text-[13px]" />
                <Input type="time" value={customTime}
                  onChange={(e) => {
                    setCustomTime(e.target.value);
                    if (customDate) setSelected({ kind: "custom-date", date: customDate, time: e.target.value });
                  }}
                  disabled={!customDate}
                  className="h-9 text-[13px] disabled:opacity-40" />
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="rounded-[10px] bg-[var(--lime-muted)] border border-[var(--lime-border)] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--lime-dark)] mb-0.5">
              Giving yourself until
            </p>
            <p className="text-[14px] font-semibold text-[var(--lime-ink)]">
              {formatPreview(preview)}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={handleClose}>Not now</Button>
          <Button
            disabled={!preview}
            onClick={handleConfirm}
            className="bg-[hsl(var(--primary))] border text-white font-bold hover:bg-[hsl(var(--primary)/0.9)]  disabled:opacity-40 disabled:shadow-none"
          >
            Take this time
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

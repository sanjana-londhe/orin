"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Link from "next/link";

interface WeeklyReport {
  week_start: string;
  total_deferrals: number;
  total_completed: number;
  deferrals_by_state: Record<string, number>;
  most_deferred_task: {
    id: string;
    title: string;
    deferredCount: number;
    emotionalState: string;
  } | null;
}

const EMOTION_COLOUR: Record<string, string> = {
  DREADING: "#c23934",
  ANXIOUS:  "#886a00",
  NEUTRAL:  "#c4cbc2",
  WILLING:  "#2b6b5e",
  EXCITED:  "#59d10b",
};

const EMOTION_EMOJI: Record<string, string> = {
  DREADING: "😮‍💨",
  ANXIOUS:  "😟",
  NEUTRAL:  "😐",
  WILLING:  "🙂",
  EXCITED:  "🤩",
};

// ── Once-per-week surface logic ──────────────────────────────────────
function getWeekKey(): string {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  return `orin-weekly-shown-${sunday.toISOString().slice(0, 10)}`;
}

function shouldShowThisWeek(): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(getWeekKey());
}

function markShownThisWeek() {
  if (typeof window === "undefined") return;
  localStorage.setItem(getWeekKey(), "1");
}

// ── Component ────────────────────────────────────────────────────────
export function WeeklyReviewCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (shouldShowThisWeek()) setVisible(true);
  }, []);

  const { data, isLoading } = useQuery<WeeklyReport>({
    queryKey: ["reports", "weekly"],
    queryFn: async () => {
      const res = await fetch("/api/reports/weekly");
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
    enabled: visible,
  });

  function dismiss() {
    markShownThisWeek();
    setVisible(false);
  }

  if (!visible || isLoading || !data) return null;

  // Don't render if there's nothing to show (brand-new user with no activity)
  if (data.total_completed === 0 && data.total_deferrals === 0) return null;

  const weekStart = new Date(data.week_start);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const dateRange = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const topDeferState = Object.entries(data.deferrals_by_state)
    .sort(([, a], [, b]) => b - a)
    .find(([, v]) => v > 0);

  const insight = buildInsight(data, topDeferState?.[0] ?? null);

  return (
    <div className="mb-6 rounded-[16px] border-[1.5px] border-[var(--ink)] bg-white shadow-[3px_3px_0_var(--ink)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--stone-400)] bg-[var(--lime-subtle)] flex items-center justify-between">
        <div>
          <p className="text-[13.5px] font-bold text-[var(--lime-ink)]">
            📊 Weekly Emotional Review
          </p>
          <p className="font-mono text-[10px] text-[var(--stone-500)] mt-0.5">
            {dateRange} · {data.total_completed} tasks completed
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss weekly review"
          className="text-[var(--stone-500)] hover:text-[var(--lime-ink)] transition-colors text-[12px] px-1"
        >
          ✕
        </button>
      </div>

      {/* Stats grid */}
      <div className="px-6 py-5">
        <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
          {[
            {
              emoji: EMOTION_EMOJI["DREADING"],
              num: data.deferrals_by_state["DREADING"] ?? 0,
              colour: EMOTION_COLOUR["DREADING"],
              label: "Dreading\ndeferred",
            },
            {
              emoji: EMOTION_EMOJI["ANXIOUS"],
              num: data.deferrals_by_state["ANXIOUS"] ?? 0,
              colour: EMOTION_COLOUR["ANXIOUS"],
              label: "Anxious\ndeferred",
            },
            {
              emoji: "✅",
              num: data.total_completed,
              colour: "#059669",
              label: "Tasks\ncompleted",
            },
            {
              emoji: "📊",
              num: data.total_deferrals,
              colour: data.total_deferrals > 5 ? EMOTION_COLOUR["DREADING"] : "#4a6d47",
              label: "Total\ndeferred",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-[12px] border border-[var(--lime-border)] bg-[var(--lime-subtle)] px-4 py-3 text-center"
            >
              <div className="text-xl mb-1" aria-hidden="true">{stat.emoji}</div>
              <div
                className="text-[22px] font-black leading-none tracking-[-0.05em] mb-1"
                style={{ color: stat.colour }}
              >
                {stat.num}
              </div>
              <div className="text-[10px] text-[var(--stone-500)] font-medium leading-[1.3] whitespace-pre-line">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Insight callout */}
        {insight && (
          <div className="rounded-[12px] bg-[var(--lime-muted)] border border-[var(--lime-border)] px-4 py-3 text-[13px] text-[var(--lime-ink)] leading-[1.55]">
            {insight}
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 flex items-center justify-between">
          <Link
            href="/quadrant"
            className="text-[12.5px] font-bold text-[var(--lime-dark)] border-b-[1.5px] border-[var(--lime-border)] hover:border-[var(--lime-dark)] pb-px transition-colors"
          >
            See quadrant map →
          </Link>
          <button
            onClick={dismiss}
            className="text-[12px] text-[var(--stone-500)] hover:text-[var(--lime-ink)] transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function buildInsight(data: WeeklyReport, topDeferState: string | null): string | null {
  if (data.most_deferred_task && data.most_deferred_task.deferredCount >= 2) {
    return `"${data.most_deferred_task.title}" was pushed ${data.most_deferred_task.deferredCount}× this week. Want to try tackling it first thing next week?`;
  }
  if (topDeferState === "DREADING" && (data.deferrals_by_state["DREADING"] ?? 0) >= 2) {
    const n = data.deferrals_by_state["DREADING"];
    return `You deferred ${n} tasks tagged Dreading this week. Most heavy tasks get easier once you start — even 5 minutes counts.`;
  }
  if (data.total_completed > 0) {
    return `You completed ${data.total_completed} task${data.total_completed !== 1 ? "s" : ""} this week. That's real progress.`;
  }
  return null;
}

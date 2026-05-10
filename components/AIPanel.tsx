"use client";

import { useState, useMemo, useEffect } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { X, Sparkles, Zap, TrendingUp, Compass, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { loadEnergyStore, todayKey } from "@/components/EnergyCheckInModal";
import { EMOTION_MAP } from "@/lib/emotions";
import type { TaskWithSubtasks } from "@/lib/types";

// ── Scoring ──────────────────────────────────────────────────────────

const EMOTION_WEIGHT: Record<string, number> = {
  DREADING: 5, ANXIOUS: 4, NEUTRAL: 3, WILLING: 2, EXCITED: 1,
};

function urgencyScore(dueAt: Date | string | null): number {
  if (!dueAt) return 0.05;
  const hours = (new Date(dueAt).getTime() - Date.now()) / 3600000;
  if (hours < 0) return 1; // overdue
  return Math.max(0, 1 - hours / 168); // 168h = 1 week
}

function taskScore(t: TaskWithSubtasks): number {
  const u = urgencyScore(t.dueAt);
  const e = EMOTION_WEIGHT[t.emotionalState] ?? 3;
  return u * e + e * 0.1; // emotion as tiebreaker
}

// ── Weekly report type ───────────────────────────────────────────────

interface WeeklyReport {
  total_completed: number;
  total_deferrals: number;
  deferrals_by_state: Record<string, number>;
  most_deferred_task: { title: string; deferredCount: number; emotionalState: string } | null;
}

// ── Hierarchy: Group → Section → Body ────────────────────────────────

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 18 }}>
      <p style={{
        fontSize: 10, fontWeight: 600, color: "#4a6d47",
        textTransform: "uppercase", letterSpacing: "0.10em",
        margin: "0 0 4px",
      }}>{label}</p>
      {children}
    </div>
  );
}

function Section({ icon, title, children, defaultOpen = true }: {
  icon: React.ReactNode; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "12px 0 10px", background: "none", border: "none",
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#4a6d47", display: "inline-flex" }}>{icon}</span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "#082d1d", letterSpacing: "-0.01em" }}>{title}</span>
        </div>
        {open ? <ChevronUp size={14} color="#b9d3c4" /> : <ChevronDown size={14} color="#b9d3c4" />}
      </button>
      {open && <div style={{ paddingBottom: 14, paddingLeft: 22 }}>{children}</div>}
      <div style={{ height: 1, background: "#f1f3ef" }} />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

interface Props { onClose: () => void }

export function AIPanel({ onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: todayTasks = [] } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", new Date().toISOString().slice(0, 10)],
    queryFn: () => fetch("/api/tasks?filter=today").then(r => r.json()),
    retry: 1,
  });

  const { data: completedTasks = [] } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", "completed"],
    queryFn: () => fetch("/api/tasks?filter=completed").then(r => r.json()),
    retry: 1,
  });

  const { data: weekly } = useQuery<WeeklyReport>({
    queryKey: ["reports", "weekly"],
    queryFn: () => fetch("/api/reports/weekly").then(r => r.json()),
    retry: 1,
  });

  // ── Derived data ──────────────────────────────────────────────────

  const overdue     = todayTasks.filter(t => t.dueAt && new Date(t.dueAt) < new Date());
  const pending     = todayTasks.filter(t => !t.isCompleted);
  const hasEnergy   = mounted && (loadEnergyStore()[todayKey()] ?? []).length > 0;

  // Task coach — highest scored pending task
  const recommended = useMemo(() =>
    [...pending].sort((a, b) => taskScore(b) - taskScore(a))[0],
    [pending]
  );

  // Weekly patterns
  const bestEmotion = useMemo(() => {
    const counts: Record<string, number> = {};
    completedTasks.forEach(t => { counts[t.emotionalState] = (counts[t.emotionalState] ?? 0) + 1; });
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return best ? { key: best[0], count: best[1], em: EMOTION_MAP[best[0] as keyof typeof EMOTION_MAP] } : null;
  }, [completedTasks]);

  const worstEmotion = useMemo(() => {
    if (!weekly?.deferrals_by_state) return null;
    const worst = Object.entries(weekly.deferrals_by_state)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])[0];
    return worst ? { key: worst[0], count: worst[1], em: EMOTION_MAP[worst[0] as keyof typeof EMOTION_MAP] } : null;
  }, [weekly]);

  // ── Render ────────────────────────────────────────────────────────

  const isMobile = useIsMobile();

  return (
    <aside style={isMobile ? {
      position: "fixed", inset: 0, zIndex: 100,
      background: "#fff",
      display: "flex", flexDirection: "column",
    } : {
      width: 320, flexShrink: 0,
      background: "#fff", borderLeft: "1px solid #e9ede9",
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 18px 14px",
        borderBottom: "1px solid #e9ede9",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(135deg, #f2fdec, #fff)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: "linear-gradient(135deg, #059669, #047857)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={14} color="#fff" />
          </div>
          <div>
            <p style={{
              fontFamily: "inherit",
              fontSize: 10, fontWeight: 600, color: "#4a6d47",
              textTransform: "uppercase", letterSpacing: "0.08em",
              margin: "0 0 1px",
            }}>Workspace · Insights</p>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#082d1d", margin: 0, letterSpacing: "-0.02em" }}>
              Orin Insight
            </h2>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: "50%", border: "1px solid #e9ede9",
          background: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#4a6d47",
        }}>
          <X size={13} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 18px 24px" }}>

        <Group label="Today">
        {/* ── 1. Daily Briefing ── */}
        <Section icon={<Zap size={14} />} title="Today's briefing">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, lineHeight: 1.55 }}>
            <p style={{ margin: 0, color: overdue.length > 0 ? "#D14626" : "#3d5a4a", fontWeight: overdue.length > 0 ? 600 : 400 }}>
              {overdue.length > 0 ? `${overdue.length} overdue` : "Nothing overdue."}
            </p>
            <p style={{ margin: 0, color: "#082d1d" }}>
              <strong style={{ color: "#082d1d" }}>{pending.length}</strong>
              <span style={{ color: "#3d5a4a" }}> task{pending.length !== 1 ? "s" : ""} remaining today.</span>
            </p>
            <p style={{ margin: 0, color: hasEnergy ? "#059669" : "#3d5a4a" }}>
              {hasEnergy ? "Energy logged today." : (
                <>Energy not logged yet — <span style={{ color: "#4a6d47" }}>track how you feel to unlock pattern insights.</span></>
              )}
            </p>
          </div>
        </Section>

        {/* ── 3. Task Coach (moved up — also a 'Today' insight) ── */}
        <Section icon={<Compass size={14} />} title="What to work on next">
          {pending.length === 0 ? (
            <p style={{ fontSize: 13, color: "#059669", margin: 0 }}>🎉 All caught up — no pending tasks for today.</p>
          ) : recommended ? (
            <div style={{ fontSize: 13, lineHeight: 1.55 }}>
              <p style={{ margin: "0 0 6px", color: "#3d5a4a" }}>
                Start with:{" "}
                <strong style={{ color: "#082d1d" }}>&ldquo;{recommended.title}&rdquo;</strong>
              </p>
              <p style={{ margin: "0 0 6px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {recommended.dueAt && new Date(recommended.dueAt) < new Date() && (
                  <span style={{ color: "#D14626", fontWeight: 600 }}>Overdue</span>
                )}
                {(() => {
                  const em = EMOTION_MAP[recommended.emotionalState as keyof typeof EMOTION_MAP];
                  return em ? <span style={{ color: em.pillText, fontWeight: 600 }}>{em.emoji} {em.label}</span> : null;
                })()}
                {recommended.deferredCount > 0 && (
                  <span style={{ color: "#D14626", fontWeight: 600 }}>Deferred {recommended.deferredCount}×</span>
                )}
              </p>
              <p style={{ fontSize: 11, color: "#4a6d47", margin: 0 }}>
                Scored highest on urgency + emotional weight across your {pending.length} pending tasks.
              </p>
            </div>
          ) : null}
        </Section>
        </Group>

        <Group label="This week">
        {/* ── 2. This-week stats ── */}
        <Section icon={<TrendingUp size={14} />} title="At a glance">
          {!weekly ? (
            <p style={{ fontSize: 12.5, color: "#b9d3c4", margin: 0 }}>Loading…</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Completed", val: weekly.total_completed, dot: "#22c55e" },
                { label: "Deferred",  val: weekly.total_deferrals, dot: "#f59e0b" },
                { label: "Pending",   val: pending.length,         dot: "#94a3b8" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#3d5a4a" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: row.dot, opacity: 0.7 }} />
                    {row.label}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: "#082d1d", fontVariantNumeric: "tabular-nums" }}>{row.val}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── 3. Patterns ── */}
        <Section icon={<Sparkles size={14} />} title="Patterns">
          {!weekly || (weekly.total_completed === 0 && !bestEmotion && !worstEmotion) ? (
            <p style={{ fontSize: 12.5, color: "#b9d3c4", margin: 0 }}>
              Complete and defer some tasks this week to see patterns here.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
              {bestEmotion && (
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: 11, color: "#4a6d47" }}>Most completions when feeling</p>
                  <p style={{ margin: 0, color: bestEmotion.em?.pillText ?? "#082d1d", fontWeight: 600 }}>
                    {bestEmotion.em?.emoji} {bestEmotion.em?.label}
                    <span style={{ color: "#4a6d47", fontWeight: 400, marginLeft: 6 }}>· {bestEmotion.count}</span>
                  </p>
                </div>
              )}
              {worstEmotion && (
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: 11, color: "#4a6d47" }}>Most deferrals when feeling</p>
                  <p style={{ margin: 0, color: worstEmotion.em?.pillText ?? "#082d1d", fontWeight: 600 }}>
                    {worstEmotion.em?.emoji} {worstEmotion.em?.label}
                    <span style={{ color: "#4a6d47", fontWeight: 400, marginLeft: 6 }}>· {worstEmotion.count}</span>
                  </p>
                </div>
              )}
              {weekly.most_deferred_task && (
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: 11, color: "#4a6d47" }}>Most deferred task</p>
                  <p style={{ margin: 0, color: "#082d1d" }}>
                    &ldquo;{weekly.most_deferred_task.title}&rdquo;
                    <span style={{ color: "#D14626", fontWeight: 600, marginLeft: 6 }}>· {weekly.most_deferred_task.deferredCount}×</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </Section>
        </Group>
      </div>
    </aside>
  );
}

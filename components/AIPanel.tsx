"use client";

import { useState, useMemo, useEffect } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { X, Sparkles, Zap, TrendingUp, Compass, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
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

// ── Reframe templates ────────────────────────────────────────────────

function getReframeSteps(title: string): string[] {
  const t = title.toLowerCase();
  if (/write|report|doc|draft|email|brief|summary/.test(t)) return [
    `Open a blank doc and type just the title: "${title}"`,
    "Spend 5 min bullet-pointing the 3 main things to cover",
    "Write one rough paragraph — it doesn't need to be good yet",
  ];
  if (/call|meeting|talk|present|pitch|discuss/.test(t)) return [
    "Write down the one thing you need to get out of this conversation",
    "Prepare 3 bullet points or questions to guide it",
    "Block 10 min before for a quick mental warm-up",
  ];
  if (/review|check|audit|read|look|analyse/.test(t)) return [
    "Open the thing — just open it, don't do anything yet",
    "Skim for 5 minutes to get the lay of the land",
    "Write 3 notes on what needs attention before going deeper",
  ];
  if (/plan|strategy|roadmap|design|architect/.test(t)) return [
    "Write the problem you're trying to solve in one sentence",
    "List 3 constraints or requirements from memory",
    "Sketch the simplest possible version that would work",
  ];
  if (/fix|bug|error|issue|debug|broken/.test(t)) return [
    "Reproduce the problem — can you make it happen consistently?",
    "Write down what you know and what you don't know",
    "Try one small hypothesis — even if it fails, you've learned something",
  ];
  return [
    "Set a 10-minute timer — just start, don't aim to finish",
    "Identify the single smallest action you can take right now",
    "Do only that one thing, then decide if you want to continue",
  ];
}

// ── Weekly report type ───────────────────────────────────────────────

interface WeeklyReport {
  total_completed: number;
  total_deferrals: number;
  deferrals_by_state: Record<string, number>;
  most_deferred_task: { title: string; deferredCount: number; emotionalState: string } | null;
}

// ── Section wrapper ──────────────────────────────────────────────────

function Section({ icon, title, children, defaultOpen = true }: {
  icon: React.ReactNode; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "10px 0", background: "none", border: "none",
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ color: "#059669" }}>{icon}</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#082d1d", letterSpacing: "-0.01em" }}>{title}</span>
        </div>
        {open ? <ChevronUp size={13} color="#b9d3c4" /> : <ChevronDown size={13} color="#b9d3c4" />}
      </button>
      {open && <div style={{ paddingBottom: 12 }}>{children}</div>}
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

  const { data: allTasks = [] } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", "all"],
    queryFn: () => fetch("/api/tasks?filter=all").then(r => r.json()),
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

  // Reframe — most deferred dreaded/anxious task
  const dreaded = useMemo(() =>
    [...allTasks]
      .filter(t => t.emotionalState === "DREADING" || t.emotionalState === "ANXIOUS")
      .sort((a, b) => (b.deferredCount ?? 0) - (a.deferredCount ?? 0))[0],
    [allTasks]
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

  const reframeSteps = useMemo(() =>
    dreaded ? getReframeSteps(dreaded.title) : [],
    [dreaded]
  );

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

        {/* ── 2. Weekly Patterns ── */}
        <Section icon={<TrendingUp size={14} />} title="Weekly patterns">
          {!weekly ? (
            <p style={{ fontSize: 12.5, color: "#b9d3c4", margin: 0 }}>Loading patterns…</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, lineHeight: 1.55 }}>
              <p style={{ margin: 0, color: "#3d5a4a" }}>
                <strong style={{ color: "#059669" }}>{weekly.total_completed}</strong> task{weekly.total_completed === 1 ? "" : "s"} completed this week.
              </p>
              {bestEmotion && (
                <p style={{ margin: 0, color: "#3d5a4a" }}>
                  You finish most tasks when feeling{" "}
                  <strong style={{ color: bestEmotion.em?.pillText ?? "#082d1d" }}>{bestEmotion.em?.emoji} {bestEmotion.em?.label}</strong>
                  <span style={{ color: "#4a6d47" }}> ({bestEmotion.count} completed).</span>
                </p>
              )}
              {worstEmotion && (
                <p style={{ margin: 0, color: "#3d5a4a" }}>
                  Most deferrals when feeling{" "}
                  <strong style={{ color: worstEmotion.em?.pillText ?? "#082d1d" }}>{worstEmotion.em?.emoji} {worstEmotion.em?.label}</strong>
                  <span style={{ color: "#4a6d47" }}> ({worstEmotion.count} deferrals).</span>
                </p>
              )}
              {weekly.most_deferred_task && (
                <p style={{ margin: 0, color: "#3d5a4a" }}>
                  Most deferred task:{" "}
                  <span style={{ color: "#082d1d", fontWeight: 600 }}>&ldquo;{weekly.most_deferred_task.title}&rdquo;</span>
                  {" "}— pushed <span style={{ color: "#D14626", fontWeight: 600 }}>{weekly.most_deferred_task.deferredCount}×</span>.
                </p>
              )}
              {weekly.total_completed === 0 && !bestEmotion && !worstEmotion && (
                <p style={{ margin: 0, color: "#b9d3c4" }}>
                  Complete and defer some tasks this week to see your patterns here.
                </p>
              )}
            </div>
          )}
        </Section>

        {/* ── 3. Task Coach ── */}
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

        {/* ── 4. Reframe Assistant ── */}
        <Section icon={<Lightbulb size={14} />} title="Reframe a dreaded task" defaultOpen={!!dreaded}>
          {!dreaded ? (
            <p style={{ fontSize: 12.5, color: "#b9d3c4", margin: 0 }}>
              No dreaded or anxious tasks right now.
            </p>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.55 }}>
              <p style={{ margin: "0 0 8px", color: "#3d5a4a" }}>
                {(() => {
                  const em = EMOTION_MAP[dreaded.emotionalState as keyof typeof EMOTION_MAP];
                  return em ? <span style={{ color: em.pillText, fontWeight: 600 }}>{em.emoji} {em.label}</span> : null;
                })()}
                {dreaded.deferredCount > 0 ? <> · deferred <span style={{ color: "#D14626", fontWeight: 600 }}>{dreaded.deferredCount}×</span></> : ""}
                <br />
                <strong style={{ color: "#082d1d" }}>&ldquo;{dreaded.title}&rdquo;</strong>
              </p>

              <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#082d1d" }}>Break it down — just do step 1:</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {reframeSteps.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: 999, flexShrink: 0,
                      background: i === 0 ? "#059669" : "#f1f3ef",
                      color: i === 0 ? "#fff" : "#4a6d47",
                      fontSize: 11, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{i + 1}</span>
                    <p style={{
                      fontSize: 13, color: i === 0 ? "#082d1d" : "#4a6d47",
                      fontWeight: i === 0 ? 600 : 400,
                      margin: 0, lineHeight: 1.5,
                    }}>{step}</p>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 11, color: "#b9d3c4", margin: "12px 0 0", fontStyle: "italic" }}>
                You only have to do step 1. The rest follows.
              </p>
            </div>
          )}
        </Section>
      </div>
    </aside>
  );
}

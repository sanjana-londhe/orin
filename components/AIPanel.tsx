"use client";

import { useState, useMemo, useEffect } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { X, Sparkles, Zap, TrendingUp, Compass, AlertCircle, Flame, Heart, CalendarClock, Moon, Lightbulb, type LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { loadEnergyStore, todayKey, type CheckIn } from "@/components/EnergyCheckInModal";
import { EMOTION_MAP } from "@/lib/emotions";
import type { TaskWithSubtasks } from "@/lib/types";
import { withTz } from "@/lib/client-tz";

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

// ── Block: each insight as its own bordered card ─────────────────────

function Block({ icon: Icon, title, children }: {
  icon: LucideIcon; title: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e9ede9",
      borderRadius: 4,
      padding: "12px 14px",
      marginTop: 8,
      boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <span style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "#f2fdec",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "#059669", flexShrink: 0,
        }}>
          <Icon size={12} />
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#082d1d", letterSpacing: "-0.01em" }}>{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

interface Props { onClose: () => void }

export function AIPanel({ onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"today" | "week">("today");
  useEffect(() => setMounted(true), []);

  const { data: todayTasks = [] } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", new Date().toISOString().slice(0, 10)],
    queryFn: () => fetch(withTz("/api/tasks?filter=today")).then(r => r.json()),
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

  // Today's latest mood (from energy check-ins)
  const todayMood = useMemo(() => {
    if (!mounted) return null;
    const entries = loadEnergyStore()[todayKey()] ?? [];
    if (!entries.length) return null;
    return entries.reduce((s: number, e: CheckIn) => s + e.mood, 0) / entries.length;
  }, [mounted]);

  // Task coach — mood-aware: if low mood, prefer Willing/Excited tasks
  const recommended = useMemo(() => {
    if (!pending.length) return null;
    const lowMood = todayMood !== null && todayMood <= 2.5;
    if (lowMood) {
      const easy = pending.filter(t => t.emotionalState === "WILLING" || t.emotionalState === "EXCITED");
      if (easy.length) return [...easy].sort((a, b) => taskScore(b) - taskScore(a))[0];
    }
    return [...pending].sort((a, b) => taskScore(b) - taskScore(a))[0];
  }, [pending, todayMood]);

  // Avoidance — tasks deferred 3+ times
  const avoidance = useMemo(() =>
    [...allTasks]
      .filter(t => !t.isCompleted && (t.deferredCount ?? 0) >= 3)
      .sort((a, b) => (b.deferredCount ?? 0) - (a.deferredCount ?? 0))
      .slice(0, 3),
    [allTasks]
  );

  // Streak — consecutive days back from today (or yesterday) with completions
  const streak = useMemo(() => {
    const dayKey = (d: Date) => {
      const x = new Date(d); x.setHours(0, 0, 0, 0);
      return x.toISOString().slice(0, 10);
    };
    const days = new Set(completedTasks.map(t => dayKey(new Date(t.updatedAt))));
    const today = new Date();
    let cursor = days.has(dayKey(today)) ? today : new Date(today.getTime() - 86400000);
    let count = 0;
    while (days.has(dayKey(cursor)) && count < 365) {
      count++;
      cursor = new Date(cursor.getTime() - 86400000);
    }
    return count;
  }, [completedTasks]);

  // Mood ↔ completion correlation across past 14 days
  const moodVsCompletion = useMemo(() => {
    if (!mounted) return null;
    const store = loadEnergyStore();
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const completionsByDay: Record<string, number> = {};
    completedTasks.forEach(t => {
      const k = dayKey(new Date(t.updatedAt));
      completionsByDay[k] = (completionsByDay[k] ?? 0) + 1;
    });
    const samples: { mood: number; completions: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = dayKey(d);
      const entries = store[k] ?? [];
      if (!entries.length) continue;
      const mood = entries.reduce((s: number, e: CheckIn) => s + e.mood, 0) / entries.length;
      samples.push({ mood, completions: completionsByDay[k] ?? 0 });
    }
    const high = samples.filter(s => s.mood >= 4);
    const low  = samples.filter(s => s.mood <= 2.5);
    if (high.length < 2 || low.length < 2) return null;
    const highAvg = high.reduce((s, x) => s + x.completions, 0) / high.length;
    const lowAvg  = low.reduce((s, x) => s + x.completions, 0) / low.length;
    if (lowAvg <= 0) return { highAvg: highAvg.toFixed(1), lowAvg: "0", ratio: null };
    return { highAvg: highAvg.toFixed(1), lowAvg: lowAvg.toFixed(1), ratio: (highAvg / lowAvg).toFixed(1) };
  }, [completedTasks, mounted]);

  // Tomorrow's emotional load
  const tomorrowLoad = useMemo(() => {
    if (!allTasks.length) return null;
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);
    const end = new Date(tomorrow); end.setHours(23, 59, 59, 999);
    const tasks = allTasks.filter(t => {
      if (!t.dueAt || t.isCompleted) return false;
      const due = new Date(t.dueAt);
      return due >= tomorrow && due <= end;
    });
    if (!tasks.length) return null;
    const byEmotion: Record<string, number> = {};
    tasks.forEach(t => { byEmotion[t.emotionalState] = (byEmotion[t.emotionalState] ?? 0) + 1; });
    return { total: tasks.length, byEmotion };
  }, [allTasks]);

  // Time flags
  const now = new Date();
  const isEvening = now.getHours() >= 18;
  const isSunday  = now.getDay() === 0;

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

  // Empty-week onboarding flag
  const noDataYet = !weekly || (weekly.total_completed === 0 && weekly.total_deferrals === 0 && !hasEnergy);

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
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#082d1d", margin: 0, letterSpacing: "-0.02em" }}>
              Orin Insight
            </h2>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: 8,
          border: "1.5px solid #dde4de", background: "#f8f9f5",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#4a6d47",
        }}>
          <X size={13} />
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ padding: "10px 18px 0", borderBottom: "1px solid #f1f3ef" }}>
        <div style={{ display: "flex", gap: 4, background: "#f8f9f5", border: "1px solid #e9ede9", borderRadius: 4, padding: 3 }}>
          {(["today", "week"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "5px 0", borderRadius: 3,
                border: tab === t ? "1px solid #e9ede9" : "1px solid transparent",
                background: tab === t ? "#fff" : "transparent",
                color: tab === t ? "#082d1d" : "#4a6d47",
                fontSize: 11, fontWeight: tab === t ? 600 : 500,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                textTransform: "capitalize", transition: "all 0.12s",
              }}
            >
              {t === "week" ? "This week" : "Today"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 18px 24px" }}>

        {/* Empty-week onboarding pinned at top */}
        {noDataYet && mounted ? (
          <div style={{ marginTop: 14, padding: "14px 14px", background: "#f2fdec", border: "1px solid #c8f7ae", borderRadius: 4 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#059669", textTransform: "uppercase", letterSpacing: "0.10em", margin: "0 0 6px" }}>Get started</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#082d1d", margin: "0 0 8px", letterSpacing: "-0.01em" }}>Unlock insights in 3 steps</p>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "#3d5a4a", lineHeight: 1.6 }}>
              <li>Add a few tasks with how you feel about each</li>
              <li>Log an energy check-in to capture your mood</li>
              <li>Complete or defer them — patterns will appear here</li>
            </ol>
          </div>
        ) : null}

        {/* ── Hero ── */}
        {tab === "today" ? (
          <div style={{ padding: "20px 4px 18px", borderBottom: "1px solid #f1f3ef", marginBottom: 6 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.10em", margin: "0 0 6px" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long" })}
            </p>
            <p style={{ margin: "0 0 4px", letterSpacing: "-0.02em" }}>
              <span style={{ fontSize: 22, fontWeight: 600, color: "#082d1d", fontVariantNumeric: "tabular-nums" }}>{pending.length}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#3d5a4a", marginLeft: 8 }}>
                task{pending.length !== 1 ? "s" : ""} remaining
              </span>
            </p>
            <p style={{ margin: 0, fontSize: 11, color: overdue.length > 0 ? "#D14626" : "#4a6d47", fontWeight: overdue.length > 0 ? 600 : 400 }}>
              {overdue.length > 0
                ? `⚠ ${overdue.length} overdue${hasEnergy ? " · energy logged" : ""}`
                : (hasEnergy ? "Nothing overdue · energy logged" : "Nothing overdue · log energy to unlock patterns")}
            </p>
          </div>
        ) : (
          <div style={{ padding: "20px 4px 18px", borderBottom: "1px solid #f1f3ef", marginBottom: 6 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.10em", margin: "0 0 6px" }}>Streak</p>
            <p style={{ margin: "0 0 4px", letterSpacing: "-0.02em" }}>
              <span style={{ fontSize: 22, fontWeight: 600, color: "#059669", fontVariantNumeric: "tabular-nums" }}>{streak}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#3d5a4a", marginLeft: 8 }}>
                day{streak === 1 ? "" : "s"} in a row
              </span>
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#4a6d47" }}>
              {weekly
                ? <><strong style={{ color: "#082d1d" }}>{weekly.total_completed}</strong> done · <strong style={{ color: "#082d1d" }}>{weekly.total_deferrals}</strong> deferred this week</>
                : "Loading…"}
            </p>
          </div>
        )}

        {/* ── Tab content ── */}
        {tab === "today" ? (
          <>

        {/* Avoidance alert — slipping tasks */}
        {avoidance.length > 0 && (
          <Block icon={AlertCircle} title="Slipping tasks">
            <p style={{ fontSize: 11, color: "#3d5a4a", margin: "0 0 8px", lineHeight: 1.5 }}>
              Deferred 3+ times — consider doing just step 1.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {avoidance.map(t => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
                  <span style={{ color: "#082d1d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>&ldquo;{t.title}&rdquo;</span>
                  <span style={{ color: "#D14626", fontWeight: 600, flexShrink: 0 }}>{t.deferredCount}×</span>
                </div>
              ))}
            </div>
          </Block>
        )}

        {/* Today's briefing — 3 stat tiles */}
        <Block icon={Zap} title="Today's briefing">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {[
              { label: "Overdue", val: String(overdue.length), color: overdue.length > 0 ? "#D14626" : "#082d1d", bg: overdue.length > 0 ? "#FFF0EC" : "#f8f9f5" },
              { label: "Pending", val: String(pending.length), color: "#082d1d", bg: "#f8f9f5" },
              { label: "Energy",  val: hasEnergy ? "✓" : "—", color: hasEnergy ? "#059669" : "#b9d3c4", bg: hasEnergy ? "#f2fdec" : "#f8f9f5" },
            ].map(t => (
              <div key={t.label} style={{
                background: t.bg, borderRadius: 4, padding: "8px 6px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: t.color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{t.val}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.label}</span>
              </div>
            ))}
          </div>
        </Block>

        {/* What to work on next — only when there's a recommendation or a celebration to give */}
        {(recommended || (pending.length === 0 && todayTasks.length > 0)) && (
        <Block icon={Compass} title={isEvening ? "Wrapping up the day" : "What to work on next"}>
          {pending.length === 0 ? (
            <p style={{ fontSize: 12, color: "#059669", margin: 0 }}>🎉 All caught up — nothing pending today.</p>
          ) : recommended ? (
            <div style={{ fontSize: 12, lineHeight: 1.55 }}>
              {todayMood !== null && todayMood <= 2.5 && (recommended.emotionalState === "WILLING" || recommended.emotionalState === "EXCITED") && (
                <p style={{ margin: "0 0 6px", fontSize: 11, color: "#4a6d47" }}>
                  Low mood today — picking something gentler.
                </p>
              )}
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
            </div>
          ) : null}
        </Block>
        )}

        {/* End-of-day reflection — only after 6pm */}
        {isEvening && (
          <Block icon={Moon} title="End-of-day reflection">
            <p style={{ fontSize: 12, color: "#3d5a4a", margin: 0, lineHeight: 1.55 }}>
              {pending.length === 0
                ? "You finished everything today. Take a breath and call it done."
                : <>{pending.length} task{pending.length === 1 ? "" : "s"} unfinished — that&apos;s okay. Reschedule what won&apos;t happen tonight.</>
              }
            </p>
          </Block>
        )}

          </>
        ) : (
          <>

        {/* At a glance — 3 stat tiles */}
        {weekly && (weekly.total_completed > 0 || weekly.total_deferrals > 0 || pending.length > 0) && (
          <Block icon={TrendingUp} title="At a glance">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {[
                { label: "Completed", val: weekly.total_completed, color: "#1A9444", bg: "#EEFAF1" },
                { label: "Deferred",  val: weekly.total_deferrals, color: "#B07A10", bg: "#FFF8E8" },
                { label: "Pending",   val: pending.length,         color: "#082d1d", bg: "#f8f9f5" },
              ].map(t => (
                <div key={t.label} style={{
                  background: t.bg, borderRadius: 4, padding: "8px 6px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: t.color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{t.val}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.label}</span>
                </div>
              ))}
            </div>
          </Block>
        )}

        {/* Streak — only if streak > 0 */}
        {streak > 0 && (
          <Block icon={Flame} title="Streak">
            <p style={{ margin: 0, fontSize: 12, color: "#3d5a4a", lineHeight: 1.55 }}>
              <strong style={{ color: "#059669", fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{streak}</strong>
              <span style={{ marginLeft: 6 }}>day{streak === 1 ? "" : "s"} in a row with at least one task done.</span>
            </p>
          </Block>
        )}

        {/* Patterns — each sub-pattern is its own tinted sub-card */}
        {(bestEmotion || worstEmotion || weekly?.most_deferred_task) && (
          <Block icon={Sparkles} title="Patterns">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {bestEmotion && (
                <div style={{ background: bestEmotion.em?.pillBg ?? "#f8f9f5", borderRadius: 4, padding: "8px 10px" }}>
                  <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.06em" }}>Most completions when feeling</p>
                  <p style={{ margin: 0, color: bestEmotion.em?.pillText ?? "#082d1d", fontWeight: 600, fontSize: 12 }}>
                    {bestEmotion.em?.emoji} {bestEmotion.em?.label}
                    <span style={{ color: "#4a6d47", fontWeight: 400, marginLeft: 6 }}>· {bestEmotion.count}</span>
                  </p>
                </div>
              )}
              {worstEmotion && (
                <div style={{ background: worstEmotion.em?.pillBg ?? "#f8f9f5", borderRadius: 4, padding: "8px 10px" }}>
                  <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.06em" }}>Most deferrals when feeling</p>
                  <p style={{ margin: 0, color: worstEmotion.em?.pillText ?? "#082d1d", fontWeight: 600, fontSize: 12 }}>
                    {worstEmotion.em?.emoji} {worstEmotion.em?.label}
                    <span style={{ color: "#4a6d47", fontWeight: 400, marginLeft: 6 }}>· {worstEmotion.count}</span>
                  </p>
                </div>
              )}
              {weekly?.most_deferred_task && (
                <div style={{ background: "#FFF0EC", borderRadius: 4, padding: "8px 10px" }}>
                  <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.06em" }}>Most deferred task</p>
                  <p style={{ margin: 0, color: "#082d1d", fontSize: 12 }}>
                    &ldquo;{weekly.most_deferred_task.title}&rdquo;
                    <span style={{ color: "#D14626", fontWeight: 600, marginLeft: 6 }}>· {weekly.most_deferred_task.deferredCount}×</span>
                  </p>
                </div>
              )}
            </div>
          </Block>
        )}

        {/* Mood ↔ productivity — only when correlation is computable */}
        {moodVsCompletion && (
          <Block icon={Heart} title="Mood vs. productivity">
            <div style={{ fontSize: 12, lineHeight: 1.55 }}>
              <p style={{ margin: "0 0 6px", color: "#3d5a4a" }}>
                <span style={{ color: "#082d1d", fontWeight: 600 }}>{moodVsCompletion.highAvg}</span> tasks/day on high-mood days
                {" vs "}
                <span style={{ color: "#082d1d", fontWeight: 600 }}>{moodVsCompletion.lowAvg}</span> on low-mood days.
              </p>
              {moodVsCompletion.ratio && (
                <p style={{ margin: 0, fontSize: 11, color: "#4a6d47" }}>
                  You finish <strong>{moodVsCompletion.ratio}×</strong> more when feeling good — protect your high-mood time.
                </p>
              )}
            </div>
          </Block>
        )}

        {/* Tomorrow's load — only when there's something due tomorrow */}
        {tomorrowLoad && (
          <Block icon={CalendarClock} title="Tomorrow's load">
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
              <p style={{ margin: "0 0 8px", color: "#3d5a4a" }}>
                <strong style={{ color: "#082d1d" }}>{tomorrowLoad.total}</strong> task{tomorrowLoad.total === 1 ? "" : "s"} due tomorrow.
              </p>
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", border: "1px solid #f1f3ef" }}>
                {(["DREADING", "ANXIOUS", "NEUTRAL", "WILLING", "EXCITED"] as const).map(key => {
                  const n = tomorrowLoad.byEmotion[key] ?? 0;
                  if (!n) return null;
                  const em = EMOTION_MAP[key];
                  return <div key={key} title={`${em.label}: ${n}`} style={{ flex: n, background: em.strip, opacity: 0.85 }} />;
                })}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {(["DREADING", "ANXIOUS", "NEUTRAL", "WILLING", "EXCITED"] as const).map(key => {
                  const n = tomorrowLoad.byEmotion[key] ?? 0;
                  if (!n) return null;
                  const em = EMOTION_MAP[key];
                  return (
                    <span key={key} style={{ fontSize: 11, color: em.pillText, fontWeight: 500 }}>
                      {em.emoji} {n}
                    </span>
                  );
                })}
              </div>
            </div>
          </Block>
        )}

        {/* Sunday review — only on Sundays */}
        {isSunday && weekly && (
          <Block icon={Lightbulb} title="Sunday review">
            <p style={{ fontSize: 12, color: "#3d5a4a", margin: 0, lineHeight: 1.55 }}>
              This week: <strong style={{ color: "#082d1d" }}>{weekly.total_completed}</strong> done,{" "}
              <strong style={{ color: "#082d1d" }}>{weekly.total_deferrals}</strong> deferred.{" "}
              {bestEmotion ? <>You moved best when feeling <span style={{ color: bestEmotion.em?.pillText, fontWeight: 600 }}>{bestEmotion.em?.label}</span>.</> : null}
              {" "}Take a breath and pick one thing to bring into next week.
            </p>
          </Block>
        )}

          </>
        )}
      </div>
    </aside>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { Heart, Lightbulb } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import type { TaskWithSubtasks } from "@/lib/types";
import { EMOTION_MAP } from "@/lib/emotions";
import {
  EnergyCheckInModal,
  loadEnergyStore,
  saveEnergyStore,
  todayKey,
  type CheckIn,
  type EnergyStore,
} from "@/components/EnergyCheckInModal";

// ── Constants ────────────────────────────────────────────────────────

const MOODS = [
  { value: 1, emoji: "😔", label: "Very unpleasant" },
  { value: 2, emoji: "😕", label: "Unpleasant" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Pleasant" },
  { value: 5, emoji: "😄", label: "Very pleasant" },
];

function moodEmoji(v: number) { return MOODS[Math.round(v) - 1]?.emoji ?? "😐"; }
function moodLabel(v: number) { return MOODS[Math.round(v) - 1]?.label ?? "Neutral"; }

function moodColor(v: number) {
  if (v >= 4.5) return "#059669";
  if (v >= 3.5) return "#34d399";
  if (v >= 2.5) return "#f59e0b";
  if (v >= 1.5) return "#f97316";
  return "#ef4444";
}

function avgMood(entries: CheckIn[]): number | null {
  if (!entries.length) return null;
  return entries.reduce((s, e) => s + e.mood, 0) / entries.length;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Mood week — 7-day vertical bar row ───────────────────────────────

function MoodChart({ data }: { data: { label: string; value: number | null }[] }) {
  const BAR_AREA = 64;
  const hasData = data.some(d => d.value !== null);
  if (!hasData) {
    return (
      <p style={{ fontSize: 12, color: "#b9d3c4", margin: 0, textAlign: "center", padding: "12px 0" }}>
        Log your feelings to see your mood across the week.
      </p>
    );
  }
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
      gap: 6,
    }}>
      {data.map((d, i) => {
        const has = d.value !== null;
        const v = d.value ?? 0;
        // bar height = (mood / 5) * area, with a 6px floor when there's any data
        const h = has ? Math.max(6, (v / 5) * BAR_AREA) : 0;
        return (
          <div key={i} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          }}>
            <div style={{
              width: "100%", height: BAR_AREA,
              display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}>
              {has ? (
                <div style={{
                  width: "60%",
                  height: h,
                  background: moodColor(v),
                  borderRadius: 2,
                  opacity: 0.85,
                  transition: "height 0.25s ease",
                }} />
              ) : (
                <span style={{ fontSize: 14, color: "#dde4de", paddingBottom: 2 }}>·</span>
              )}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: "#4a6d47",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}



// ── Main component ────────────────────────────────────────────────────

export function EnergyView() {
  const [store, setStore]       = useState<EnergyStore>({});
  const [mounted, setMounted]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { setStore(loadEnergyStore()); setMounted(true); }, []);

  // Listen for changes saved from the sidebar modal
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "orin_energy_v2") setStore(loadEnergyStore());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function handleSave(entry: CheckIn) {
    const key = todayKey();
    const next = { ...store, [key]: [...(store[key] ?? []), entry] };
    setStore(next);
    saveEnergyStore(next);
  }

  const today        = todayKey();
  const todayEntries = store[today] ?? [];
  const latest       = todayEntries.at(-1);
  const todayAvg     = avgMood(todayEntries);

  // 7-day mood trend
  const weekData = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      value: avgMood(store[key] ?? []),
    };
  }), [store]);

  // ── Headline insight: how did the week feel? ──────────────────────
  const weekHeadline = useMemo(() => {
    const filled = weekData.filter(d => d.value !== null) as { label: string; value: number }[];
    if (filled.length === 0) return null;
    const avg = filled.reduce((s, d) => s + d.value, 0) / filled.length;
    const best = filled.reduce((a, b) => (b.value > a.value ? b : a));
    const worst = filled.reduce((a, b) => (b.value < a.value ? b : a));
    const lean = avg >= 4 ? "Pleasant" : avg >= 3 ? "Neutral" : avg >= 2 ? "Low" : "Tough";
    const half = Math.ceil(filled.length / 2);
    const firstHalf = filled.slice(0, half).reduce((s, d) => s + d.value, 0) / half;
    const lastHalf  = filled.slice(-half).reduce((s, d) => s + d.value, 0) / half;
    const trend = lastHalf > firstHalf + 0.4 ? "rising"
                : lastHalf < firstHalf - 0.4 ? "falling"
                : "steady";
    return {
      avg: avg.toFixed(1),
      lean, trend, best, worst,
      flat: best.value === worst.value,
      checkIns: filled.length,
    };
  }, [weekData]);

  // ── What lifts you / pulls you down ──────────────────────────────
  // For every contribution tag, average the mood of check-ins that included it.
  const liftsPulls = useMemo(() => {
    const tagMoods: Record<string, number[]> = {};
    Object.values(store).forEach(entries => {
      entries.forEach(e => {
        e.contributions.forEach(c => {
          if (!tagMoods[c]) tagMoods[c] = [];
          tagMoods[c].push(e.mood);
        });
      });
    });
    const avgs = Object.entries(tagMoods)
      .filter(([, arr]) => arr.length >= 2)
      .map(([tag, arr]) => ({ tag, avg: arr.reduce((s, m) => s + m, 0) / arr.length, count: arr.length }))
      .sort((a, b) => b.avg - a.avg);
    if (avgs.length === 0) return null;
    const lifts = avgs.filter(x => x.avg >= 3.5).slice(0, 3);
    const pulls = [...avgs].filter(x => x.avg < 3).slice(0, 3);
    return { lifts, pulls, hasAny: lifts.length + pulls.length > 0 };
  }, [store]);

  // Task data for mood × tasks
  const { data: allTasks = [] }       = useQuery<TaskWithSubtasks[]>({ queryKey: ["tasks", "all"],       queryFn: () => fetch("/api/tasks?filter=all").then(r => r.json()),       retry: 1 });
  const { data: completedTasks = [] } = useQuery<TaskWithSubtasks[]>({ queryKey: ["tasks", "completed"], queryFn: () => fetch("/api/tasks?filter=completed").then(r => r.json()), retry: 1 });
  const allForStats = useMemo(() => [...allTasks, ...completedTasks], [allTasks, completedTasks]);

  // ── Mood × tasks: high-mood vs low-mood completion ratio ─────────
  const moodVsTasks = useMemo(() => {
    const completionsByDay: Record<string, number> = {};
    completedTasks.forEach(t => {
      const k = new Date(t.updatedAt).toISOString().slice(0, 10);
      completionsByDay[k] = (completionsByDay[k] ?? 0) + 1;
    });
    const samples: { mood: number; completions: number }[] = [];
    Object.entries(store).forEach(([k, entries]) => {
      if (!entries.length) return;
      const mood = entries.reduce((s: number, e: CheckIn) => s + e.mood, 0) / entries.length;
      samples.push({ mood, completions: completionsByDay[k] ?? 0 });
    });
    const high = samples.filter(s => s.mood >= 4);
    const low  = samples.filter(s => s.mood <= 2.5);
    if (!high.length || !low.length) return null;
    const highAvg = high.reduce((s, x) => s + x.completions, 0) / high.length;
    const lowAvg  = low.reduce((s, x) => s + x.completions, 0) / low.length;
    return {
      highAvg: highAvg.toFixed(1),
      lowAvg:  lowAvg.toFixed(1),
      ratio:   lowAvg > 0 ? (highAvg / lowAvg).toFixed(1) : null,
    };
  }, [completedTasks, store]);

  // Best / worst emotion for tasks (using completion rate)
  const taskByEmotion = useMemo(() => {
    const buckets: Record<string, { done: number; total: number }> = {};
    Object.keys(EMOTION_MAP).forEach(k => { buckets[k] = { done: 0, total: 0 }; });
    allForStats.forEach(t => { if (buckets[t.emotionalState]) buckets[t.emotionalState].total++; });
    completedTasks.forEach(t => { if (buckets[t.emotionalState]) buckets[t.emotionalState].done++; });
    const ranked = Object.entries(buckets)
      .filter(([, v]) => v.total > 0)
      .map(([k, v]) => ({ key: k, em: EMOTION_MAP[k as keyof typeof EMOTION_MAP], done: v.done, total: v.total, rate: v.done / v.total }))
      .sort((a, b) => b.rate - a.rate);
    if (ranked.length < 2) return null;
    return { best: ranked[0], worst: ranked[ranked.length - 1] };
  }, [allForStats, completedTasks]);

  const isMobile = useIsMobile();

  if (!mounted) return null;

  const pad = isMobile ? "16px 14px 80px" : "24px 28px 64px";

  // Shared card style matching the mockup
  const card: React.CSSProperties = {
    background: "#fff",
    border: "0.5px solid rgba(0,0,0,0.09)",
    borderRadius: 4,
    padding: isMobile ? "16px" : "20px 24px",
    marginBottom: 12,
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: pad }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: isMobile ? 16 : 20 }}>
        <p style={{ fontFamily: "inherit", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4a6d47", margin: "0 0 4px" }}>
          Workspace · My Energy
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.03em", color: "#082d1d", margin: 0, lineHeight: 1 }}>
          My Energy
        </h1>
      </div>

      {/* ── 1. Today — action anchor ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 11, color: "#4a6d47", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, margin: "0 0 2px" }}>Today</p>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: "#082d1d", margin: 0, letterSpacing: "-0.02em" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
          </div>
          {todayEntries.length > 0 && (
            <button onClick={() => setModalOpen(true)} style={{
              padding: "5px 12px", borderRadius: 4, border: "0.5px solid rgba(0,0,0,0.12)",
              background: "#fff", color: "#059669", fontSize: 11, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}>+ Log again</button>
          )}
        </div>

        {todayEntries.length === 0 ? (
          <div>
            <EmptyState icon={Heart} title="No check-in yet today" description="How are you feeling right now?" compact />
            <div style={{ display: "flex", justifyContent: "center", marginTop: -6 }}>
              <button onClick={() => setModalOpen(true)} style={{
                padding: "8px 20px", borderRadius: 4, border: "none",
                background: "#059669", color: "#fff", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>Log my feelings</button>
            </div>
          </div>
        ) : (
          <div>
            {latest && (
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px 10px 14px",
                borderLeft: `2px solid ${moodColor(latest.mood)}`,
                background: "#f8f9f5", borderRadius: "0 4px 4px 0", marginBottom: 10,
              }}>
                <span style={{ fontSize: 22 }}>{moodEmoji(latest.mood)}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "#082d1d", margin: "0 0 4px" }}>{moodLabel(latest.mood)}</p>
                  {latest.contributions.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {latest.contributions.map(c => (
                        <span key={c} style={{
                          padding: "2px 7px", borderRadius: 3, fontSize: 11, fontWeight: 500,
                          background: "#f2fdec", color: "#059669",
                        }}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 11, color: "#4a6d47", flexShrink: 0 }}>{timeAgo(latest.time)}</p>
              </div>
            )}
            {todayEntries.length > 1 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {todayEntries.slice(0, -1).map((e, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 4,
                    background: "#f8f9f5", border: "0.5px solid rgba(0,0,0,0.08)",
                    fontSize: 11, color: "#3d5a4a",
                  }}>
                    <span>{moodEmoji(e.mood)}</span>
                    <span>{moodLabel(e.mood)}</span>
                    <span style={{ color: "#4a6d47" }}>{timeAgo(e.time)}</span>
                  </div>
                ))}
              </div>
            )}
            {todayAvg !== null && todayEntries.length > 1 && (
              <p style={{ fontSize: 11, color: "#059669", fontWeight: 500, margin: "10px 0 0" }}>
                Today&apos;s average: {moodLabel(todayAvg)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── 2. Mood × tasks ── */}
      {(moodVsTasks || taskByEmotion) && (
        <div style={card}>
          <p style={{ fontSize: 11, color: "#4a6d47", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, margin: "0 0 4px" }}>Mood × tasks</p>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: "#082d1d", margin: "0 0 14px", letterSpacing: "-0.02em" }}>How feelings turn into action</h3>

          {moodVsTasks && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: taskByEmotion ? 14 : 0 }}>
              <div style={{ background: "#f2fdec", borderRadius: 4, padding: "10px 12px" }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#059669", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>High-mood days</p>
                <p style={{ margin: 0, color: "#082d1d" }}>
                  <strong style={{ fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{moodVsTasks.highAvg}</strong>
                  <span style={{ fontSize: 11, color: "#4a6d47", marginLeft: 4 }}>tasks/day</span>
                </p>
              </div>
              <div style={{ background: "#f8f9f5", borderRadius: 4, padding: "10px 12px" }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Low-mood days</p>
                <p style={{ margin: 0, color: "#082d1d" }}>
                  <strong style={{ fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{moodVsTasks.lowAvg}</strong>
                  <span style={{ fontSize: 11, color: "#4a6d47", marginLeft: 4 }}>tasks/day</span>
                </p>
              </div>
            </div>
          )}

          {moodVsTasks?.ratio && (
            <p style={{ fontSize: 12, color: "#3d5a4a", margin: "0 0 14px", lineHeight: 1.5 }}>
              You finish <strong style={{ color: "#082d1d" }}>{moodVsTasks.ratio}×</strong> more on high-mood days — protect that time.
            </p>
          )}

          {taskByEmotion && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: taskByEmotion.best.em?.pillBg, borderRadius: 4, padding: "10px 12px" }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Most likely to finish</p>
                <p style={{ margin: 0, fontSize: 13, color: taskByEmotion.best.em?.pillText, fontWeight: 600 }}>
                  {taskByEmotion.best.em?.emoji} {taskByEmotion.best.em?.label}
                  <span style={{ color: "#4a6d47", fontWeight: 400, fontSize: 11, marginLeft: 6 }}>· {Math.round(taskByEmotion.best.rate * 100)}%</span>
                </p>
              </div>
              <div style={{ background: taskByEmotion.worst.em?.pillBg, borderRadius: 4, padding: "10px 12px" }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Least likely to finish</p>
                <p style={{ margin: 0, fontSize: 13, color: taskByEmotion.worst.em?.pillText, fontWeight: 600 }}>
                  {taskByEmotion.worst.em?.emoji} {taskByEmotion.worst.em?.label}
                  <span style={{ color: "#4a6d47", fontWeight: 400, fontSize: 11, marginLeft: 6 }}>· {Math.round(taskByEmotion.worst.rate * 100)}%</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 3. This week — headline + bars ── */}
      <div style={card}>
        <p style={{ fontSize: 11, color: "#4a6d47", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, margin: "0 0 4px" }}>This week</p>
        {weekHeadline ? (
          <p style={{ fontSize: 14, color: "#082d1d", margin: "0 0 16px", letterSpacing: "-0.01em", lineHeight: 1.5 }}>
            You leaned <strong>{weekHeadline.lean}</strong>
            {weekHeadline.trend === "rising" && <> · trended <strong style={{ color: "#059669" }}>upward</strong></>}
            {weekHeadline.trend === "falling" && <> · trended <strong style={{ color: "#D14626" }}>downward</strong></>}
            {weekHeadline.trend === "steady" && !weekHeadline.flat && <> · stayed <strong>steady</strong></>}
            .{" "}
            {!weekHeadline.flat && (
              <>Best day <strong>{weekHeadline.best.label}</strong>, dipped <strong>{weekHeadline.worst.label}</strong>.</>
            )}
          </p>
        ) : (
          <p style={{ fontSize: 14, color: "#3d5a4a", margin: "0 0 16px", lineHeight: 1.5 }}>
            Log a few check-ins to see your week unfold.
          </p>
        )}
        <MoodChart data={weekData} />
        {weekHeadline && (
          <p style={{ fontSize: 11, color: "#4a6d47", margin: "12px 0 0", textAlign: "center" }}>
            {weekHeadline.checkIns} day{weekHeadline.checkIns === 1 ? "" : "s"} logged · avg <strong style={{ color: "#082d1d" }}>{weekHeadline.avg}</strong> / 5
          </p>
        )}
      </div>

      {/* ── 4. What lifts / pulls ── */}
      <div style={card}>
        <p style={{ fontSize: 11, color: "#4a6d47", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, margin: "0 0 4px" }}>What&apos;s moving you</p>
        <h3 style={{ fontSize: 14, fontWeight: 500, color: "#082d1d", margin: "0 0 14px", letterSpacing: "-0.02em" }}>Lifts your mood vs. pulls it down</h3>
        {!liftsPulls?.hasAny ? (
          <EmptyState icon={Lightbulb} title="Not enough signal yet" description="Tag your check-ins with what&apos;s affecting you to see what lifts you." compact />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <div style={{ background: "#f2fdec", border: "1px solid #c8f7ae", borderRadius: 4, padding: "10px 12px" }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#059669", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Lifts you</p>
              {liftsPulls.lifts.length === 0 ? (
                <p style={{ fontSize: 12, color: "#4a6d47", margin: 0 }}>—</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {liftsPulls.lifts.map(l => (
                    <div key={l.tag} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#082d1d" }}>
                      <span>{l.tag}</span>
                      <span style={{ color: "#059669", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{l.avg.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ background: "#FFF0EC", border: "1px solid #fecaca", borderRadius: 4, padding: "10px 12px" }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#D14626", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Pulls you down</p>
              {liftsPulls.pulls.length === 0 ? (
                <p style={{ fontSize: 12, color: "#4a6d47", margin: 0 }}>—</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {liftsPulls.pulls.map(p => (
                    <div key={p.tag} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#082d1d" }}>
                      <span>{p.tag}</span>
                      <span style={{ color: "#D14626", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{p.avg.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>


      {/* Modal */}
      {modalOpen && (
        <EnergyCheckInModal
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

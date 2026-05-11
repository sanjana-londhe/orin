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

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

// ── Range filter ─────────────────────────────────────────────────────

type Range = "7d" | "30d" | "90d" | "1y" | "all";

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "7d",  label: "7d"  },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "1y",  label: "1y"  },
  { value: "all", label: "All" },
];

function rangeDays(r: Range): number | null {
  if (r === "7d")  return 7;
  if (r === "30d") return 30;
  if (r === "90d") return 90;
  if (r === "1y")  return 365;
  return null;
}

function rangeLongLabel(r: Range): string {
  if (r === "7d")  return "Last 7 days";
  if (r === "30d") return "Last 30 days";
  if (r === "90d") return "Last 90 days";
  if (r === "1y")  return "Last year";
  return "All time";
}

// ── Mood chart — adapts to range ─────────────────────────────────────

type Bar = { label: string; value: number | null; isLast?: boolean };

function MoodChart({ data, dense }: { data: Bar[]; dense?: boolean }) {
  const BAR_AREA = 72;
  const hasData = data.some(d => d.value !== null);
  if (!hasData) {
    return (
      <p style={{ fontSize: 12, color: "#b9d3c4", margin: 0, textAlign: "center", padding: "18px 0" }}>
        Log your feelings to see your mood trend.
      </p>
    );
  }
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${data.length}, 1fr)`,
      gap: dense ? 2 : 6,
    }}>
      {data.map((d, i) => {
        const has = d.value !== null;
        const v = d.value ?? 0;
        const h = has ? Math.max(6, (v / 5) * BAR_AREA) : 0;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}>
            <div style={{
              width: "100%", height: BAR_AREA,
              display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}>
              {has ? (
                <div style={{
                  width: dense ? "85%" : "60%",
                  height: h,
                  background: moodColor(v),
                  borderRadius: 2,
                  opacity: d.isLast ? 1 : 0.85,
                  transition: "height 0.25s ease",
                }} />
              ) : (
                <span style={{ fontSize: 14, color: "#dde4de", paddingBottom: 2 }}>·</span>
              )}
            </div>
            <span style={{
              fontSize: 9, fontWeight: 600,
              color: "#4a6d47",
              textTransform: "uppercase", letterSpacing: "0.04em",
              whiteSpace: "nowrap", overflow: "hidden",
              minHeight: 11,
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
  const [range, setRange]       = useState<Range>("7d");

  useEffect(() => { setStore(loadEnergyStore()); setMounted(true); }, []);
  useEffect(() => {
    function onStorage(e: StorageEvent) { if (e.key === "orin_energy_v2") setStore(loadEnergyStore()); }
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

  // ── Date-range scoping ────────────────────────────────────────────
  const rangeStart = useMemo(() => {
    const days = rangeDays(range);
    if (days === null) return null;
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - (days - 1));
    return d;
  }, [range]);

  function inRange(iso: string) {
    if (!rangeStart) return true;
    return new Date(iso + "T00:00:00") >= rangeStart;
  }

  const filteredStore = useMemo(() => {
    if (!rangeStart) return store;
    const out: EnergyStore = {};
    Object.entries(store).forEach(([k, v]) => { if (inRange(k)) out[k] = v; });
    return out;
  }, [store, rangeStart]);

  // ── Chart data — adapts to range ──────────────────────────────────
  const chartData: Bar[] = useMemo(() => {
    const todayD = startOfDay(new Date());
    if (range === "7d" || range === "30d") {
      const days = range === "7d" ? 7 : 30;
      const bars: Bar[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(todayD); d.setDate(d.getDate() - i);
        const key = isoDay(d);
        const isLast = i === 0;
        let label = "";
        if (days === 7) label = d.toLocaleDateString("en-US", { weekday: "short" });
        else label = (d.getDay() === 1 || isLast) ? `${d.getMonth() + 1}/${d.getDate()}` : "";
        bars.push({ label, value: avgMood(store[key] ?? []), isLast });
      }
      return bars;
    }
    if (range === "90d") {
      // 13 weekly buckets
      const bars: Bar[] = [];
      for (let w = 12; w >= 0; w--) {
        const end = new Date(todayD); end.setDate(end.getDate() - w * 7);
        const start = new Date(end); start.setDate(start.getDate() - 6);
        const vals: number[] = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const a = avgMood(store[isoDay(d)] ?? []);
          if (a !== null) vals.push(a);
        }
        const isLast = w === 0;
        const label = (w % 2 === 0 || isLast) ? `${end.getMonth() + 1}/${end.getDate()}` : "";
        bars.push({
          label,
          value: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null,
          isLast,
        });
      }
      return bars;
    }
    // 1y + all → monthly buckets
    let monthsBack = 12;
    if (range === "all") {
      const keys = Object.keys(store).sort();
      if (keys.length > 0) {
        const earliest = new Date(keys[0] + "T00:00:00");
        const monthsSpan = (todayD.getFullYear() - earliest.getFullYear()) * 12
                          + (todayD.getMonth() - earliest.getMonth()) + 1;
        monthsBack = Math.max(1, Math.min(24, monthsSpan));
      } else {
        monthsBack = 1;
      }
    }
    const bars: Bar[] = [];
    for (let m = monthsBack - 1; m >= 0; m--) {
      const d = new Date(todayD.getFullYear(), todayD.getMonth() - m, 1);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const vals: number[] = [];
      for (let day = new Date(d); day < next; day.setDate(day.getDate() + 1)) {
        const a = avgMood(store[isoDay(day)] ?? []);
        if (a !== null) vals.push(a);
      }
      const isLast = m === 0;
      bars.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        value: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null,
        isLast,
      });
    }
    return bars;
  }, [range, store]);

  const chartDense = chartData.length > 14;

  // ── Headline / summary over filtered range ───────────────────────
  const headline = useMemo(() => {
    const filledKeys: { key: string; value: number }[] = [];
    Object.entries(filteredStore).forEach(([k, entries]) => {
      const a = avgMood(entries);
      if (a !== null) filledKeys.push({ key: k, value: a });
    });
    if (filledKeys.length === 0) return null;
    filledKeys.sort((a, b) => a.key.localeCompare(b.key));
    const avg = filledKeys.reduce((s, d) => s + d.value, 0) / filledKeys.length;
    const best  = filledKeys.reduce((a, b) => (b.value > a.value ? b : a));
    const worst = filledKeys.reduce((a, b) => (b.value < a.value ? b : a));
    const lean = avg >= 4 ? "Pleasant" : avg >= 3 ? "Neutral" : avg >= 2 ? "Low" : "Tough";
    const half = Math.ceil(filledKeys.length / 2);
    const firstHalf = filledKeys.slice(0, half).reduce((s, d) => s + d.value, 0) / half;
    const lastHalf  = filledKeys.slice(-half).reduce((s, d) => s + d.value, 0) / half;
    const trend = lastHalf > firstHalf + 0.4 ? "rising"
                : lastHalf < firstHalf - 0.4 ? "falling"
                : "steady";
    function fmtDay(k: string) {
      const d = new Date(k + "T00:00:00");
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }
    return {
      avg: avg.toFixed(1),
      lean, trend,
      bestLabel:  fmtDay(best.key),
      worstLabel: fmtDay(worst.key),
      flat: best.value === worst.value,
      checkIns: filledKeys.length,
    };
  }, [filteredStore]);

  // ── What lifts you / pulls you down (within range) ───────────────
  const liftsPulls = useMemo(() => {
    const tagMoods: Record<string, number[]> = {};
    Object.values(filteredStore).forEach(entries => {
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
  }, [filteredStore]);

  // ── Task data — fetched once, filtered by range ──────────────────
  const { data: allTasks = [] }       = useQuery<TaskWithSubtasks[]>({ queryKey: ["tasks", "all"],       queryFn: () => fetch("/api/tasks?filter=all").then(r => r.json()),       retry: 1 });
  const { data: completedTasks = [] } = useQuery<TaskWithSubtasks[]>({ queryKey: ["tasks", "completed"], queryFn: () => fetch("/api/tasks?filter=completed").then(r => r.json()), retry: 1 });

  const filteredCompleted = useMemo(() => {
    if (!rangeStart) return completedTasks;
    return completedTasks.filter(t => new Date(t.updatedAt) >= rangeStart);
  }, [completedTasks, rangeStart]);
  const filteredAll = useMemo(() => {
    if (!rangeStart) return [...allTasks, ...completedTasks];
    return [...allTasks, ...completedTasks].filter(t => new Date(t.createdAt) >= rangeStart);
  }, [allTasks, completedTasks, rangeStart]);

  // Mood × tasks within range
  const moodVsTasks = useMemo(() => {
    const completionsByDay: Record<string, number> = {};
    filteredCompleted.forEach(t => {
      const k = isoDay(new Date(t.updatedAt));
      completionsByDay[k] = (completionsByDay[k] ?? 0) + 1;
    });
    const samples: { mood: number; completions: number }[] = [];
    Object.entries(filteredStore).forEach(([k, entries]) => {
      if (!entries.length) return;
      const mood = entries.reduce((s, e) => s + e.mood, 0) / entries.length;
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
  }, [filteredCompleted, filteredStore]);

  const taskByEmotion = useMemo(() => {
    const buckets: Record<string, { done: number; total: number }> = {};
    Object.keys(EMOTION_MAP).forEach(k => { buckets[k] = { done: 0, total: 0 }; });
    filteredAll.forEach(t => { if (buckets[t.emotionalState]) buckets[t.emotionalState].total++; });
    filteredCompleted.forEach(t => { if (buckets[t.emotionalState]) buckets[t.emotionalState].done++; });
    const ranked = Object.entries(buckets)
      .filter(([, v]) => v.total > 0)
      .map(([k, v]) => ({ key: k, em: EMOTION_MAP[k as keyof typeof EMOTION_MAP], done: v.done, total: v.total, rate: v.done / v.total }))
      .sort((a, b) => b.rate - a.rate);
    if (ranked.length < 2) return null;
    return { best: ranked[0], worst: ranked[ranked.length - 1] };
  }, [filteredAll, filteredCompleted]);

  const isMobile = useIsMobile();
  if (!mounted) return null;

  const pad = isMobile ? "16px 14px 80px" : "24px 28px 64px";

  const card: React.CSSProperties = {
    background: "#fff",
    border: "0.5px solid rgba(0,0,0,0.09)",
    borderRadius: 6,
    padding: isMobile ? "16px" : "20px 24px",
    marginBottom: 14,
  };

  // ── Section header — visual divider + label ──────────────────────
  function SectionHeader({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }) {
    return (
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 10, color: "#4a6d47", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 600, margin: "0 0 3px" }}>{eyebrow}</p>
        <h3 style={{ fontSize: 14, fontWeight: 500, color: "#082d1d", margin: 0, letterSpacing: "-0.02em" }}>{title}</h3>
        {hint && (
          <p style={{ fontSize: 11, color: "#4a6d47", margin: "4px 0 0" }}>{hint}</p>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: pad }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: isMobile ? 16 : 20 }}>
        <p style={{ fontFamily: "inherit", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4a6d47", margin: "0 0 4px" }}>
          Workspace · My Energy
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.03em", color: "#082d1d", margin: 0, lineHeight: 1 }}>
          My Energy
        </h1>
      </div>

      {/* ── Section 1: Today — action anchor ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 10, color: "#4a6d47", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 600, margin: "0 0 3px" }}>Today</p>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: "#082d1d", margin: 0, letterSpacing: "-0.02em" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
          </div>
          {todayEntries.length > 0 && (
            <button onClick={() => setModalOpen(true)} style={{
              padding: "5px 12px", borderRadius: 6, border: "0.5px solid rgba(0,0,0,0.12)",
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
                padding: "8px 20px", borderRadius: 6, border: "none",
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
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 10px 4px 8px", borderRadius: "0 4px 4px 0",
                    background: "#f8f9f5",
                    borderLeft: `2px solid ${moodColor(e.mood)}`,
                    borderTop: "0.5px solid rgba(0,0,0,0.06)",
                    borderRight: "0.5px solid rgba(0,0,0,0.06)",
                    borderBottom: "0.5px solid rgba(0,0,0,0.06)",
                    fontSize: 11, color: "#3d5a4a",
                  }}>
                    <span style={{ fontSize: 13 }}>{moodEmoji(e.mood)}</span>
                    <span style={{ fontWeight: 500, color: "#082d1d" }}>{moodLabel(e.mood)}</span>
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

      {/* ── Range filter divider ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap",
        margin: "20px 2px 10px",
      }}>
        <div>
          <p style={{ fontSize: 10, color: "#4a6d47", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 600, margin: "0 0 2px" }}>Insights</p>
          <p style={{ fontSize: 12, color: "#3d5a4a", margin: 0 }}>{rangeLongLabel(range)}</p>
        </div>
        <div style={{
          display: "inline-flex", padding: 3, gap: 2,
          background: "#f8f9f5",
          border: "0.5px solid rgba(0,0,0,0.08)",
          borderRadius: 8,
        }}>
          {RANGE_OPTIONS.map(opt => {
            const active = range === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                style={{
                  padding: "5px 11px", borderRadius: 6, border: "none",
                  background: active ? "#fff" : "transparent",
                  color: active ? "#059669" : "#4a6d47",
                  fontSize: 11, fontWeight: active ? 600 : 500,
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  transition: "background 0.14s, color 0.14s",
                }}
              >{opt.label}</button>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Mood trend ── */}
      <div style={card}>
        <SectionHeader eyebrow="Mood trend" title="How your energy moves" />
        {headline ? (
          <p style={{ fontSize: 13, color: "#082d1d", margin: "0 0 14px", letterSpacing: "-0.01em", lineHeight: 1.5 }}>
            You leaned <strong>{headline.lean}</strong>
            {headline.trend === "rising"  && <> · trended <strong style={{ color: "#059669" }}>upward</strong></>}
            {headline.trend === "falling" && <> · trended <strong style={{ color: "#D14626" }}>downward</strong></>}
            {headline.trend === "steady" && !headline.flat && <> · stayed <strong>steady</strong></>}
            .{" "}
            {!headline.flat && (
              <>Best <strong>{headline.bestLabel}</strong>, dipped <strong>{headline.worstLabel}</strong>.</>
            )}
          </p>
        ) : (
          <p style={{ fontSize: 13, color: "#3d5a4a", margin: "0 0 14px", lineHeight: 1.5 }}>
            No check-ins in this range yet.
          </p>
        )}
        <MoodChart data={chartData} dense={chartDense} />
        {headline && (
          <p style={{ fontSize: 11, color: "#4a6d47", margin: "14px 0 0", textAlign: "center" }}>
            {headline.checkIns} day{headline.checkIns === 1 ? "" : "s"} logged · avg <strong style={{ color: "#082d1d" }}>{headline.avg}</strong> / 5
          </p>
        )}
      </div>

      {/* ── Section 3: What lifts / pulls ── */}
      <div style={card}>
        <SectionHeader eyebrow="What's moving you" title="Lifts your mood vs. pulls it down" />
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

      {/* ── Section 4: Mood × tasks ── */}
      {(moodVsTasks || taskByEmotion) && (
        <div style={card}>
          <SectionHeader eyebrow="Mood × tasks" title="How feelings turn into action" />

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

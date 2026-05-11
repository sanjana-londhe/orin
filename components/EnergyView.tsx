"use client";

import { useState, useEffect, useMemo } from "react";
import { Heart, Lightbulb, Flame } from "lucide-react";
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

// ── Mood constants ───────────────────────────────────────────────────

// Muted, single-hue-leaning palette — clay → sand → sage. Easier on the
// eyes than the saturated red→green of most mood trackers.
const MOODS = [
  { value: 1, emoji: "😔", label: "Very unpleasant", color: "#b86a5e", soft: "#f1e2dd" },
  { value: 2, emoji: "😕", label: "Unpleasant",      color: "#c89478", soft: "#f3e7da" },
  { value: 3, emoji: "😐", label: "Neutral",         color: "#a89c75", soft: "#eee9d8" },
  { value: 4, emoji: "🙂", label: "Pleasant",        color: "#7aa68a", soft: "#e3ede2" },
  { value: 5, emoji: "😄", label: "Very pleasant",   color: "#4e8a6a", soft: "#d7e6d8" },
];

function moodMeta(v: number) { return MOODS[Math.round(v) - 1] ?? MOODS[2]; }
function moodEmoji(v: number) { return moodMeta(v).emoji; }
function moodLabel(v: number) { return moodMeta(v).label; }
function moodColor(v: number) { return moodMeta(v).color; }
function moodSoft(v: number)  { return moodMeta(v).soft; }

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

// ── GitHub-style mood heatmap ────────────────────────────────────────

function MoodHeatmap({
  startDate,
  endDate,
  store,
  isMobile,
}: {
  startDate: Date;
  endDate: Date;
  store: EnergyStore;
  isMobile: boolean;
}) {
  const days = useMemo(() => {
    const out: { date: Date; key: string; value: number | null }[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = isoDay(d);
      out.push({ date: new Date(d), key, value: avgMood(store[key] ?? []) });
    }
    return out;
  }, [startDate, endDate, store]);

  // Build week-columns. First column starts on Sunday of startDate's week.
  const grid = useMemo(() => {
    if (days.length === 0) return { columns: [], monthLabels: [] };
    const firstDow = days[0].date.getDay();
    const cells: (typeof days[number] | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    cells.push(...days);
    // Pad trailing
    while (cells.length % 7 !== 0) cells.push(null);
    const columns: ((typeof days[number] | null)[])[] = [];
    for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));
    // Month label positions
    const monthLabels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    columns.forEach((col, idx) => {
      const firstReal = col.find(c => c !== null);
      if (firstReal && firstReal.date.getMonth() !== lastMonth) {
        monthLabels.push({ col: idx, label: firstReal.date.toLocaleDateString("en-US", { month: "short" }) });
        lastMonth = firstReal.date.getMonth();
      }
    });
    return { columns, monthLabels };
  }, [days]);

  if (days.every(d => d.value === null)) {
    return (
      <p style={{ fontSize: 12, color: "#b9d3c4", margin: 0, textAlign: "center", padding: "20px 0" }}>
        Log check-ins to fill your mood map.
      </p>
    );
  }

  const cellSize = grid.columns.length > 30 ? 10 : grid.columns.length > 14 ? 14 : isMobile ? 18 : 22;
  const gap = grid.columns.length > 30 ? 2 : 3;
  const dowLabels = ["Mon", "Wed", "Fri"];

  return (
    <div style={{ overflowX: "auto", paddingBottom: 2, marginLeft: -2 }}>
      <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
        {/* Month labels row */}
        <div style={{ position: "relative", height: 12, marginLeft: 26 }}>
          {grid.monthLabels.map(m => (
            <span key={m.col} style={{
              position: "absolute",
              left: m.col * (cellSize + gap),
              fontSize: 10, color: "#4a6d47", fontWeight: 600, letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>{m.label}</span>
          ))}
        </div>
        {/* DOW labels + grid */}
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ display: "flex", flexDirection: "column", gap, paddingTop: 0, width: 20 }}>
            {[0,1,2,3,4,5,6].map(dow => (
              <div key={dow} style={{
                height: cellSize, fontSize: 9, color: "#7a8a7a",
                display: "flex", alignItems: "center",
                visibility: dow === 1 || dow === 3 || dow === 5 ? "visible" : "hidden",
              }}>{dowLabels[dow === 1 ? 0 : dow === 3 ? 1 : 2]}</div>
            ))}
          </div>
          <div style={{ display: "flex", gap }}>
            {grid.columns.map((col, ci) => (
              <div key={ci} style={{ display: "flex", flexDirection: "column", gap }}>
                {col.map((cell, ri) => {
                  if (!cell) return <div key={ri} style={{ width: cellSize, height: cellSize }} />;
                  const has = cell.value !== null;
                  const today = isoDay(new Date()) === cell.key;
                  return (
                    <div key={ri} title={`${cell.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${has ? ` · ${moodLabel(cell.value!)}` : " · no entry"}`}
                      style={{
                        width: cellSize, height: cellSize, borderRadius: 3,
                        background: has ? moodColor(cell.value!) : "#eef1ed",
                        opacity: has ? 0.92 : 1,
                        border: today ? "1.5px solid #082d1d" : "none",
                        boxSizing: "border-box",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, marginLeft: 26 }}>
          <span style={{ fontSize: 10, color: "#7a8a7a" }}>Less</span>
          {MOODS.map(m => (
            <div key={m.value} style={{ width: 10, height: 10, borderRadius: 2, background: m.color, opacity: 0.92 }} />
          ))}
          <span style={{ fontSize: 10, color: "#7a8a7a" }}>More</span>
        </div>
      </div>
    </div>
  );
}

// ── Mood distribution — stacked horizontal bar ───────────────────────

function MoodDistribution({ counts, total }: { counts: number[]; total: number }) {
  if (total === 0) {
    return (
      <p style={{ fontSize: 12, color: "#b9d3c4", margin: 0, textAlign: "center", padding: "12px 0" }}>
        No check-ins in this range.
      </p>
    );
  }
  return (
    <div>
      <div style={{ display: "flex", width: "100%", height: 16, borderRadius: 4, overflow: "hidden", background: "#f1f3ef", marginBottom: 12 }}>
        {MOODS.map((m, i) => {
          const c = counts[i] ?? 0;
          if (c === 0) return null;
          const pct = (c / total) * 100;
          return (
            <div key={m.value} title={`${m.label} · ${c}`} style={{
              width: `${pct}%`, background: m.color, opacity: 0.92,
            }} />
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {MOODS.map((m, i) => {
          const c = counts[i] ?? 0;
          const pct = total ? Math.round((c / total) * 100) : 0;
          return (
            <div key={m.value} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: "8px 4px",
              opacity: c > 0 ? 1 : 0.45,
            }}>
              <span style={{ fontSize: 20 }}>{m.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#082d1d", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
              <span style={{ fontSize: 10, color: "#7a8a7a", letterSpacing: "0.02em" }}>{c} log{c === 1 ? "" : "s"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export function EnergyView() {
  const [store, setStore]       = useState<EnergyStore>({});
  const [mounted, setMounted]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [range, setRange]       = useState<Range>("30d");

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

  // ── Date range scoping ────────────────────────────────────────────
  const { rangeStart, rangeEnd } = useMemo(() => {
    const end = startOfDay(new Date());
    const days = rangeDays(range);
    let start: Date;
    if (days === null) {
      const keys = Object.keys(store).sort();
      start = keys.length ? startOfDay(new Date(keys[0] + "T00:00:00")) : new Date(end);
    } else {
      start = new Date(end); start.setDate(start.getDate() - (days - 1));
    }
    return { rangeStart: start, rangeEnd: end };
  }, [range, store]);

  const filteredStore = useMemo(() => {
    const out: EnergyStore = {};
    Object.entries(store).forEach(([k, v]) => {
      const d = new Date(k + "T00:00:00");
      if (d >= rangeStart && d <= rangeEnd) out[k] = v;
    });
    return out;
  }, [store, rangeStart, rangeEnd]);

  // ── Hero summary: hero mood + headline trend ─────────────────────
  const summary = useMemo(() => {
    const entries: CheckIn[] = [];
    const byDay: { key: string; value: number }[] = [];
    Object.entries(filteredStore).forEach(([k, ent]) => {
      ent.forEach(e => entries.push(e));
      const a = avgMood(ent);
      if (a !== null) byDay.push({ key: k, value: a });
    });
    if (entries.length === 0) return null;
    byDay.sort((a, b) => a.key.localeCompare(b.key));

    const avg = entries.reduce((s, e) => s + e.mood, 0) / entries.length;
    const counts = [0, 0, 0, 0, 0];
    entries.forEach(e => { counts[Math.round(e.mood) - 1]++; });

    const best  = byDay.reduce((a, b) => (b.value > a.value ? b : a));
    const worst = byDay.reduce((a, b) => (b.value < a.value ? b : a));
    const half = Math.ceil(byDay.length / 2);
    const fh = byDay.slice(0, half).reduce((s, d) => s + d.value, 0) / half;
    const lh = byDay.slice(-half).reduce((s, d) => s + d.value, 0) / half;
    const trend = lh > fh + 0.4 ? "rising" : lh < fh - 0.4 ? "falling" : "steady";

    function fmtDay(k: string) {
      const d = new Date(k + "T00:00:00");
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }
    return {
      avg, counts, entries: entries.length, days: byDay.length,
      trend, flat: best.value === worst.value,
      bestLabel: fmtDay(best.key), worstLabel: fmtDay(worst.key),
    };
  }, [filteredStore]);

  // ── Streak: consecutive days with a check-in, ending today/yesterday ─
  const streak = useMemo(() => {
    let n = 0;
    const d = startOfDay(new Date());
    if (!store[isoDay(d)]?.length) d.setDate(d.getDate() - 1);
    while (store[isoDay(d)]?.length) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }, [store]);

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
    const lifts = avgs.filter(x => x.avg >= 3.5).slice(0, 4);
    const pulls = [...avgs].filter(x => x.avg < 3).slice(0, 4);
    return { lifts, pulls, hasAny: lifts.length + pulls.length > 0 };
  }, [filteredStore]);

  // ── Task data ────────────────────────────────────────────────────
  const { data: allTasks = [] }       = useQuery<TaskWithSubtasks[]>({ queryKey: ["tasks", "all"],       queryFn: () => fetch("/api/tasks?filter=all").then(r => r.json()),       retry: 1 });
  const { data: completedTasks = [] } = useQuery<TaskWithSubtasks[]>({ queryKey: ["tasks", "completed"], queryFn: () => fetch("/api/tasks?filter=completed").then(r => r.json()), retry: 1 });

  const filteredCompleted = useMemo(() =>
    completedTasks.filter(t => { const d = new Date(t.updatedAt); return d >= rangeStart && d <= rangeEnd; }),
    [completedTasks, rangeStart, rangeEnd]);
  const filteredAll = useMemo(() =>
    [...allTasks, ...completedTasks].filter(t => { const d = new Date(t.createdAt); return d >= rangeStart && d <= rangeEnd; }),
    [allTasks, completedTasks, rangeStart, rangeEnd]);

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

  // ── Reusable: small section card ─────────────────────────────────
  function Section({ eyebrow, title, hint, children }: {
    eyebrow?: string; title?: string; hint?: string; children: React.ReactNode;
  }) {
    return (
      <div style={{
        background: "#fff",
        border: "0.5px solid rgba(0,0,0,0.09)",
        borderRadius: 8,
        padding: isMobile ? "16px" : "20px 22px",
        marginBottom: 12,
      }}>
        {(eyebrow || title) && (
          <div style={{ marginBottom: 16 }}>
            {eyebrow && <p style={{ fontSize: 10, color: "#7a8a7a", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 600, margin: "0 0 4px" }}>{eyebrow}</p>}
            {title && <h3 style={{ fontSize: 15, fontWeight: 600, color: "#082d1d", margin: 0, letterSpacing: "-0.02em" }}>{title}</h3>}
            {hint && <p style={{ fontSize: 12, color: "#5f6b5f", margin: "4px 0 0", lineHeight: 1.45 }}>{hint}</p>}
          </div>
        )}
        {children}
      </div>
    );
  }

  const heroMood = summary ? Math.round(summary.avg) : null;
  const heroColor = summary ? moodColor(summary.avg) : "#7a8a7a";
  const heroSoft  = summary ? moodSoft(summary.avg)  : "#f1f3ef";

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: pad }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: isMobile ? 16 : 20 }}>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4a6d47", margin: "0 0 4px" }}>
          Workspace · My Energy
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.03em", color: "#082d1d", margin: 0, lineHeight: 1 }}>
          My Energy
        </h1>
      </div>

      {/* ── Today action anchor ── */}
      <Section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: todayEntries.length === 0 ? 0 : 12 }}>
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
                padding: "9px 22px", borderRadius: 999, border: "none",
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
                background: "#f8f9f5", borderRadius: "0 6px 6px 0", marginBottom: 10,
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
      </Section>

      {/* ── Range filter divider ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap",
        margin: "22px 2px 12px",
      }}>
        <div>
          <p style={{ fontSize: 10, color: "#4a6d47", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 600, margin: "0 0 2px" }}>Insights</p>
          <p style={{ fontSize: 12, color: "#3d5a4a", margin: 0 }}>{rangeLongLabel(range)}</p>
        </div>
        <div style={{
          display: "inline-flex", padding: 3, gap: 2,
          background: "#f8f9f5",
          border: "0.5px solid rgba(0,0,0,0.08)",
          borderRadius: 999,
        }}>
          {RANGE_OPTIONS.map(opt => {
            const active = range === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                style={{
                  padding: "5px 12px", borderRadius: 999, border: "none",
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

      {/* ── Hero: average mood for range ── */}
      <div style={{
        background: "#fff",
        border: "0.5px solid rgba(0,0,0,0.09)",
        borderTop: `3px solid ${heroColor}`,
        borderRadius: 8,
        padding: isMobile ? "22px 16px" : "28px 24px",
        marginBottom: 12,
        textAlign: "center",
      }}>
        {summary ? (
          <>
            <div style={{ fontSize: 60, lineHeight: 1, margin: "0 0 10px" }}>
              {moodEmoji(summary.avg)}
            </div>
            <p style={{ fontSize: 20, fontWeight: 600, color: "#082d1d", margin: "0 0 8px", letterSpacing: "-0.015em" }}>
              {heroMood !== null ? moodLabel(heroMood) : "—"}
            </p>
            <p style={{ fontSize: 13, color: "#3d5a4a", margin: 0, lineHeight: 1.55 }}>
              avg <strong style={{ color: "#082d1d", fontVariantNumeric: "tabular-nums" }}>{summary.avg.toFixed(1)}</strong> / 5
              <span style={{ color: "#c4cbc2", margin: "0 8px" }}>·</span>
              {summary.days} day{summary.days === 1 ? "" : "s"} logged
              <span style={{ color: "#c4cbc2", margin: "0 8px" }}>·</span>
              {summary.entries} check-in{summary.entries === 1 ? "" : "s"}
            </p>
            {!summary.flat && (
              <p style={{ fontSize: 12, color: "#4a6d47", margin: "12px 0 0" }}>
                {summary.trend === "rising"  && <>Trending <strong style={{ color: "#082d1d" }}>upward</strong> · </>}
                {summary.trend === "falling" && <>Trending <strong style={{ color: "#082d1d" }}>downward</strong> · </>}
                {summary.trend === "steady"  && <>Steady · </>}
                best <strong style={{ color: "#082d1d" }}>{summary.bestLabel}</strong>
              </p>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 44, lineHeight: 1, margin: "0 0 8px", opacity: 0.4 }}>🌱</div>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#3d5a4a", margin: "0 0 4px" }}>Nothing here yet</p>
            <p style={{ fontSize: 12, color: "#7a8a7a", margin: 0 }}>Log a check-in to see your mood across {rangeLongLabel(range).toLowerCase()}.</p>
          </>
        )}
      </div>

      {/* ── Quick stat strip: streak + most common mood ── */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div style={{
            background: "#fff", border: "0.5px solid rgba(0,0,0,0.09)",
            borderRadius: 8, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: "#f8f9f5", color: "#4a6d47",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><Flame size={16} /></div>
            <div>
              <p style={{ fontSize: 10, color: "#4a6d47", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, margin: "0 0 3px" }}>Streak</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#082d1d", margin: 0 }}>
                {streak} <span style={{ fontSize: 12, color: "#4a6d47", fontWeight: 500 }}>day{streak === 1 ? "" : "s"}</span>
              </p>
            </div>
          </div>
          {(() => {
            const idx = summary.counts.indexOf(Math.max(...summary.counts));
            const m = MOODS[idx];
            return (
              <div style={{
                background: "#fff", border: "0.5px solid rgba(0,0,0,0.09)",
                borderRadius: 8, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: "#f8f9f5",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>{m.emoji}</div>
                <div>
                  <p style={{ fontSize: 10, color: "#4a6d47", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, margin: "0 0 3px" }}>Most felt</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#082d1d", margin: 0 }}>{m.label}</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Mood map (heatmap) ── */}
      <Section eyebrow="Mood map" title="Your days, at a glance" hint="Each square is a day — color = average mood">
        <MoodHeatmap startDate={rangeStart} endDate={rangeEnd} store={store} isMobile={isMobile} />
      </Section>

      {/* ── Mood distribution ── */}
      <Section eyebrow="How often" title="Time spent in each mood" hint="Share of all check-ins in this range">
        <MoodDistribution counts={summary?.counts ?? [0,0,0,0,0]} total={summary?.entries ?? 0} />
      </Section>

      {/* ── What lifts / pulls ── */}
      <Section eyebrow="What's moving you" title="Lifts your mood vs. pulls it down">
        {!liftsPulls?.hasAny ? (
          <EmptyState icon={Lightbulb} title="Not enough signal yet" description="Tag your check-ins with what&apos;s affecting you to see what lifts you." compact />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div style={{ borderLeft: "2px solid #4e8a6a", paddingLeft: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#4e8a6a", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Lifts you</p>
              {liftsPulls.lifts.length === 0 ? (
                <p style={{ fontSize: 12, color: "#7a8a7a", margin: 0 }}>—</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {liftsPulls.lifts.map(l => (
                    <div key={l.tag} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#082d1d" }}>
                      <span>{l.tag} <span style={{ color: "#7a8a7a", fontSize: 10 }}>· {l.count}×</span></span>
                      <span style={{ color: "#4e8a6a", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{l.avg.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ borderLeft: "2px solid #b86a5e", paddingLeft: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#b86a5e", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Pulls you down</p>
              {liftsPulls.pulls.length === 0 ? (
                <p style={{ fontSize: 12, color: "#7a8a7a", margin: 0 }}>—</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {liftsPulls.pulls.map(p => (
                    <div key={p.tag} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#082d1d" }}>
                      <span>{p.tag} <span style={{ color: "#7a8a7a", fontSize: 10 }}>· {p.count}×</span></span>
                      <span style={{ color: "#b86a5e", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{p.avg.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* ── Mood × tasks ── */}
      {(moodVsTasks || taskByEmotion) && (
        <Section eyebrow="Mood × tasks" title="How feelings turn into action">
          {moodVsTasks && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: taskByEmotion ? 18 : 0 }}>
              <div style={{ borderLeft: "2px solid #4e8a6a", paddingLeft: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>High-mood days</p>
                <p style={{ margin: 0, color: "#082d1d" }}>
                  <strong style={{ fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{moodVsTasks.highAvg}</strong>
                  <span style={{ fontSize: 12, color: "#4a6d47", marginLeft: 4 }}>tasks/day</span>
                </p>
              </div>
              <div style={{ borderLeft: "2px solid #c4cbc2", paddingLeft: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Low-mood days</p>
                <p style={{ margin: 0, color: "#082d1d" }}>
                  <strong style={{ fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{moodVsTasks.lowAvg}</strong>
                  <span style={{ fontSize: 12, color: "#4a6d47", marginLeft: 4 }}>tasks/day</span>
                </p>
              </div>
            </div>
          )}

          {moodVsTasks?.ratio && (
            <p style={{ fontSize: 13, color: "#3d5a4a", margin: "0 0 18px", lineHeight: 1.5 }}>
              You finish <strong style={{ color: "#082d1d" }}>{moodVsTasks.ratio}×</strong> more on high-mood days — protect that time.
            </p>
          )}

          {taskByEmotion && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ borderLeft: "2px solid #4e8a6a", paddingLeft: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Most likely to finish</p>
                <p style={{ margin: 0, fontSize: 13, color: "#082d1d", fontWeight: 600 }}>
                  {taskByEmotion.best.em?.emoji} {taskByEmotion.best.em?.label}
                  <span style={{ color: "#4a6d47", fontWeight: 400, fontSize: 11, marginLeft: 6 }}>· {Math.round(taskByEmotion.best.rate * 100)}%</span>
                </p>
              </div>
              <div style={{ borderLeft: "2px solid #b86a5e", paddingLeft: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#4a6d47", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Least likely to finish</p>
                <p style={{ margin: 0, fontSize: 13, color: "#082d1d", fontWeight: 600 }}>
                  {taskByEmotion.worst.em?.emoji} {taskByEmotion.worst.em?.label}
                  <span style={{ color: "#4a6d47", fontWeight: 400, fontSize: 11, marginLeft: 6 }}>· {Math.round(taskByEmotion.worst.rate * 100)}%</span>
                </p>
              </div>
            </div>
          )}
        </Section>
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

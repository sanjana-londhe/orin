"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
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

// ── SVG mood trend chart ─────────────────────────────────────────────

function MoodChart({ data }: { data: { label: string; value: number | null }[] }) {
  const W = 560, H = 110, PAD = { top: 12, right: 12, bottom: 26, left: 26 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const hasData = data.some(d => d.value !== null);

  const x = (i: number) => (i / (data.length - 1)) * iW;
  const y = (v: number) => iH - ((v - 1) / 4) * iH;

  const filled = data.map((d, i) => ({ ...d, i, v: d.value ?? 0 }));
  const areaPath = hasData
    ? `M${x(0)},${iH} ${filled.map(d => `L${x(d.i)},${y(d.v)}`).join(" ")} L${x(data.length - 1)},${iH} Z`
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {[1, 2, 3, 4, 5].map(v => (
          <line key={v} x1={0} x2={iW} y1={y(v)} y2={y(v)} stroke="#f1f3ef" strokeWidth={1} />
        ))}
        {[1, 3, 5].map(v => (
          <text key={v} x={-5} y={y(v) + 4} textAnchor="end" fontSize={9} fill="#c4cbc2">
            {MOODS[v - 1].emoji}
          </text>
        ))}
        {hasData ? (
          <>
            <path d={areaPath} fill="url(#moodGrad)" />
            <polyline
              points={filled.filter(d => d.value !== null).map(d => `${x(d.i)},${y(d.v)}`).join(" ")}
              fill="none" stroke="#059669" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"
            />
            {filled.map(d => d.value !== null && (
              <circle key={d.i} cx={x(d.i)} cy={y(d.v)} r={4}
                fill="#fff" stroke="#059669" strokeWidth={2} />
            ))}
          </>
        ) : (
          <text x={iW / 2} y={iH / 2 + 4} textAnchor="middle" fontSize={11} fill="#c4cbc2">
            Log your feelings to see your mood trend
          </text>
        )}
        {data.map((d, i) => (
          <text key={i} x={x(i)} y={iH + 18} textAnchor="middle" fontSize={9} fill="#4a6d47">
            {d.label}
          </text>
        ))}
      </g>
    </svg>
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

  // Top influences from last 7 days
  const topInfluences = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(store).forEach(([key, entries]) => {
      const d = new Date(key);
      const daysDiff = (Date.now() - d.getTime()) / 86400000;
      if (daysDiff > 7) return;
      entries.forEach(e => e.contributions.forEach(c => { counts[c] = (counts[c] ?? 0) + 1; }));
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [store]);

  // Task data for the bottom sections
  const { data: allTasks = [] }       = useQuery<TaskWithSubtasks[]>({ queryKey: ["tasks", "all"],       queryFn: () => fetch("/api/tasks?filter=all").then(r => r.json()),       retry: 1 });
  const { data: completedTasks = [] } = useQuery<TaskWithSubtasks[]>({ queryKey: ["tasks", "completed"], queryFn: () => fetch("/api/tasks?filter=completed").then(r => r.json()), retry: 1 });
  const allForStats = useMemo(() => [...allTasks, ...completedTasks], [allTasks, completedTasks]);

  const emotionDist = useMemo(() => {
    const total = allForStats.length || 1;
    return Object.entries(EMOTION_MAP).map(([key, em]) => {
      const count = allForStats.filter(t => t.emotionalState === key).length;
      return { key, em, count, pct: Math.round((count / total) * 100) };
    });
  }, [allForStats]);

  const completionRates = useMemo(() => Object.entries(EMOTION_MAP).map(([key, em]) => {
    const total = allForStats.filter(t => t.emotionalState === key).length;
    const done  = completedTasks.filter(t => t.emotionalState === key).length;
    return { key, em, total, done, rate: total ? Math.round((done / total) * 100) : 0 };
  }).filter(r => r.total > 0).sort((a, b) => b.rate - a.rate), [allForStats, completedTasks]);

  if (!mounted) return null;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 28px 64px" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <p style={{ fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4a6d47", margin: "0 0 4px" }}>
            Workspace · My Energy
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.04em", color: "#082d1d", margin: 0, lineHeight: 1 }}>
            My Energy
          </h1>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 12, border: "none",
            background: "#059669", color: "#fff",
            fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 4px 14px rgba(5,150,105,0.3)",
          }}
        >
          <Zap size={15} strokeWidth={2.5} />
          Log my feelings
        </button>
      </div>

      {/* ── Today's check-in ── */}
      <div style={{
        background: "#fff", border: "1px solid #e9ede9", borderRadius: 16,
        padding: "20px 24px", marginBottom: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#082d1d", margin: "0 0 2px", letterSpacing: "-0.01em" }}>
              Today&apos;s feeling
            </h2>
            <p style={{ fontSize: 12, color: "#4a6d47", margin: 0 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          {todayEntries.length > 0 && (
            <button onClick={() => setModalOpen(true)} style={{
              padding: "6px 14px", borderRadius: 8, border: "1.5px solid #e9ede9",
              background: "#fff", color: "#059669", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}>+ Log again</button>
          )}
        </div>

        {todayEntries.length === 0 ? (
          /* Empty state */
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "28px 0", gap: 12,
          }}>
            <span style={{ fontSize: 40 }}>🌱</span>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#082d1d", margin: 0 }}>No check-in yet today</p>
            <p style={{ fontSize: 13, color: "#4a6d47", margin: 0 }}>How are you feeling right now?</p>
            <button onClick={() => setModalOpen(true)} style={{
              marginTop: 4, padding: "10px 24px", borderRadius: 10, border: "none",
              background: "#059669", color: "#fff",
              fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Log my feelings</button>
          </div>
        ) : (
          /* Check-in summary */
          <div>
            {/* Latest entry */}
            {latest && (
              <div style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "14px 16px", borderRadius: 12,
                background: "#f8f9f5", border: "1px solid #e9ede9", marginBottom: 12,
              }}>
                <span style={{ fontSize: 40 }}>{moodEmoji(latest.mood)}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#082d1d", margin: "0 0 2px" }}>
                    {moodLabel(latest.mood)}
                  </p>
                  {latest.contributions.length > 0 && (
                    <p style={{ fontSize: 12.5, color: "#4a6d47", margin: "0 0 8px" }}>
                      Influenced by: {latest.contributions.join(", ")}
                    </p>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {latest.contributions.map(c => (
                      <span key={c} style={{
                        padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                        background: "#f2fdec", color: "#059669", border: "1px solid #c8f7ae",
                      }}>{c}</span>
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: 11, color: "#c4cbc2", flexShrink: 0 }}>{timeAgo(latest.time)}</p>
              </div>
            )}

            {/* All today's entries if more than 1 */}
            {todayEntries.length > 1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {todayEntries.slice(0, -1).map((e, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 8, background: "#f8f9f5",
                    border: "1px solid #e9ede9", fontSize: 12, color: "#4a6d47",
                  }}>
                    <span>{moodEmoji(e.mood)}</span>
                    <span>{moodLabel(e.mood)}</span>
                    <span style={{ color: "#c4cbc2" }}>{timeAgo(e.time)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Average pill */}
            {todayAvg !== null && todayEntries.length > 1 && (
              <div style={{
                marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 999,
                background: "#f2fdec", border: "1px solid #c8f7ae",
              }}>
                <span style={{ fontSize: 13 }}>📊</span>
                <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>
                  Today&apos;s average: {moodLabel(todayAvg)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 7-day mood trend ── */}
      <div style={{
        background: "#fff", border: "1px solid #e9ede9", borderRadius: 16,
        padding: "20px 24px", marginBottom: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#082d1d", margin: "0 0 2px", letterSpacing: "-0.01em" }}>
          Mood this week
        </h2>
        <p style={{ fontSize: 12, color: "#4a6d47", margin: "0 0 16px" }}>Daily average from your check-ins</p>
        <MoodChart data={weekData} />
      </div>

      {/* ── Top influences + emotional load ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Top influences */}
        <div style={{
          background: "#fff", border: "1px solid #e9ede9", borderRadius: 16,
          padding: "20px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#082d1d", margin: "0 0 2px", letterSpacing: "-0.01em" }}>
            What&apos;s affecting you
          </h2>
          <p style={{ fontSize: 12, color: "#4a6d47", margin: "0 0 16px" }}>Top influences this week</p>
          {topInfluences.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "#c4cbc2", textAlign: "center", padding: "16px 0" }}>
              Log check-ins to see patterns
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topInfluences.map(([label, count], i) => {
                const max = topInfluences[0][1];
                return (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, color: "#082d1d" }}>{label}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#4a6d47" }}>{count}×</span>
                    </div>
                    <div style={{ height: 6, background: "#f1f3ef", borderRadius: 999 }}>
                      <div style={{
                        height: "100%", borderRadius: 999,
                        background: i === 0 ? "#059669" : "#34d399",
                        width: `${(count / max) * 100}%`,
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Emotional load from tasks */}
        <div style={{
          background: "#fff", border: "1px solid #e9ede9", borderRadius: 16,
          padding: "20px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#082d1d", margin: "0 0 2px", letterSpacing: "-0.01em" }}>
            Task emotional load
          </h2>
          <p style={{ fontSize: 12, color: "#4a6d47", margin: "0 0 16px" }}>
            Across {allForStats.length} tasks
          </p>
          {allForStats.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "#c4cbc2", textAlign: "center", padding: "16px 0" }}>No tasks yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {emotionDist.map(({ key, em, count, pct }) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, color: "#082d1d", display: "flex", alignItems: "center", gap: 5 }}>
                      <span>{em.emoji}</span>{em.label}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "#4a6d47" }}>{count} · {pct}%</span>
                  </div>
                  <div style={{ height: 6, background: "#f1f3ef", borderRadius: 999 }}>
                    <div style={{ height: "100%", borderRadius: 999, background: em.strip, width: `${pct}%`, transition: "width 0.4s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Completion by feeling ── */}
      {completionRates.length > 0 && (
        <div style={{
          background: "#fff", border: "1px solid #e9ede9", borderRadius: 16,
          padding: "20px 24px", marginBottom: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#082d1d", margin: "0 0 2px", letterSpacing: "-0.01em" }}>
            Completion by feeling
          </h2>
          <p style={{ fontSize: 12, color: "#4a6d47", margin: "0 0 16px" }}>Which emotions lead to getting things done</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {completionRates.map(({ key, em, done, total, rate }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{em.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#082d1d" }}>{em.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: rate >= 70 ? "#059669" : rate >= 40 ? "#f59e0b" : "#ef4444" }}>{rate}%</span>
                  </div>
                  <div style={{ height: 6, background: "#f1f3ef", borderRadius: 999 }}>
                    <div style={{ height: "100%", borderRadius: 999, background: rate >= 70 ? "#059669" : rate >= 40 ? "#f59e0b" : "#ef4444", width: `${rate}%`, transition: "width 0.4s ease" }} />
                  </div>
                  <p style={{ fontSize: 10.5, color: "#c4cbc2", margin: "3px 0 0" }}>{done} of {total} completed</p>
                </div>
              </div>
            ))}
          </div>
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

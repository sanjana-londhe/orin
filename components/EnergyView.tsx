"use client";

import { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useQuery } from "@tanstack/react-query";
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
  const [hovered, setHovered] = useState<{ i: number; v: number } | null>(null);
  const W = 560, H = 120, PAD = { top: 16, right: 12, bottom: 26, left: 92 };
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
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
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
          <text key={v} x={-8} y={y(v) + 4} textAnchor="end" fontSize={9} fill="#c4cbc2">
            {MOODS[v - 1].label}
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
              <circle key={d.i} cx={x(d.i)} cy={y(d.v)} r={5}
                fill={moodColor(d.v)} stroke="#fff" strokeWidth={2}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered({ i: d.i, v: d.v })}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
            {hovered && (() => {
              const cx = x(hovered.i);
              const cy = y(hovered.v);
              const label = moodLabel(hovered.v);
              const tw = label.length * 6.2 + 20;
              const tx = Math.max(0, Math.min(cx - tw / 2, iW - tw));
              const ty = cy - 36;
              return (
                <g style={{ pointerEvents: "none" }}>
                  <rect x={tx} y={ty} width={tw} height={22} rx={5} fill="#082d1d" />
                  <text x={tx + tw / 2} y={ty + 15} textAnchor="middle" fontSize={10} fill="#fff" fontWeight="600">
                    {label}
                  </text>
                </g>
              );
            })()}
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

// ── Emotion color tokens ─────────────────────────────────────────────

const EC: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  DREADING: { bg: "#FFF0EC", text: "#D14626", border: "rgba(209,70,38,0.18)",  dot: "#ef4444" },
  ANXIOUS:  { bg: "#FFF8E8", text: "#B07A10", border: "rgba(245,158,11,0.2)",  dot: "#f59e0b" },
  NEUTRAL:  { bg: "#F3F2F0", text: "#7A756E", border: "rgba(0,0,0,0.08)",      dot: "#94a3b8" },
  WILLING:  { bg: "#EEF9F7", text: "#0E8A7D", border: "rgba(14,138,125,0.2)",  dot: "#14b8a6" },
  EXCITED:  { bg: "#EEFAF1", text: "#1A9444", border: "rgba(26,148,68,0.18)",  dot: "#22c55e" },
};


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
        <h1 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 500, letterSpacing: "-0.03em", color: "#082d1d", margin: 0, lineHeight: 1 }}>
          My Energy
        </h1>
      </div>

      {/* ── Today's check-in ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: "#888780", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 500, margin: "0 0 2px" }}>Today&apos;s feeling</p>
            <h3 style={{ fontSize: 16, fontWeight: 500, color: "#082d1d", margin: 0, letterSpacing: "-0.02em" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
          </div>
          {todayEntries.length > 0 && (
            <button onClick={() => setModalOpen(true)} style={{
              padding: "5px 12px", borderRadius: 6, border: "0.5px solid rgba(0,0,0,0.12)",
              background: "#fff", color: "#059669", fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}>+ Log again</button>
          )}
        </div>

        {todayEntries.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0", gap: 10 }}>
            <span style={{ fontSize: 32 }}>🌱</span>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#082d1d", margin: 0 }}>No check-in yet today</p>
            <p style={{ fontSize: 12, color: "#5f5e5a", margin: 0 }}>How are you feeling right now?</p>
            <button onClick={() => setModalOpen(true)} style={{
              marginTop: 4, padding: "8px 20px", borderRadius: 8, border: "none",
              background: "#059669", color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}>Log my feelings</button>
          </div>
        ) : (
          <div>
            {latest && (
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px 10px 14px",
                borderLeft: `2px solid ${moodColor(latest.mood)}`,
                background: "#f8f9f5", borderRadius: "0 8px 8px 0", marginBottom: 10,
              }}>
                <span style={{ fontSize: 28 }}>{moodEmoji(latest.mood)}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#082d1d", margin: "0 0 4px" }}>{moodLabel(latest.mood)}</p>
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
                <p style={{ fontSize: 11, color: "#888780", flexShrink: 0 }}>{timeAgo(latest.time)}</p>
              </div>
            )}
            {todayEntries.length > 1 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {todayEntries.slice(0, -1).map((e, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 6,
                    background: "#f8f9f5", border: "0.5px solid rgba(0,0,0,0.08)",
                    fontSize: 12, color: "#5f5e5a",
                  }}>
                    <span>{moodEmoji(e.mood)}</span>
                    <span>{moodLabel(e.mood)}</span>
                    <span style={{ color: "#888780" }}>{timeAgo(e.time)}</span>
                  </div>
                ))}
              </div>
            )}
            {todayAvg !== null && todayEntries.length > 1 && (
              <p style={{ fontSize: 12, color: "#059669", fontWeight: 500, margin: "10px 0 0" }}>
                📊 Today&apos;s average: {moodLabel(todayAvg)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Mood this week ── */}
      <div style={card}>
        <p style={{ fontSize: 11, color: "#888780", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 500, margin: "0 0 2px" }}>Mood this week</p>
        <h3 style={{ fontSize: 16, fontWeight: 500, color: "#082d1d", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Daily average from check-ins</h3>
        <MoodChart data={weekData} />
      </div>


      {/* ── Top influences + emotional load ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 0 }}>

        {/* Top influences */}
        <div style={card}>
          <p style={{ fontSize: 11, color: "#888780", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 500, margin: "0 0 2px" }}>What&apos;s affecting you</p>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: "#082d1d", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Top influences</h3>
          {topInfluences.length === 0 ? (
            <p style={{ fontSize: 12, color: "#888780", textAlign: "center", padding: "16px 0", margin: 0 }}>
              Log check-ins to see patterns
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {topInfluences.map(([label, count]) => {
                const max = topInfluences[0][1];
                return (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
                    <span style={{ fontSize: 13, color: "#082d1d" }}>{label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 56, height: 3, background: "rgba(0,0,0,0.07)", borderRadius: 999 }}>
                        <div style={{ height: "100%", background: "#059669", borderRadius: 999, width: `${(count / max) * 100}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#888780", minWidth: 18, textAlign: "right" }}>{count}×</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Emotional load from tasks */}
        <div style={card}>
          <p style={{ fontSize: 11, color: "#888780", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 500, margin: "0 0 2px" }}>Task emotional load</p>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: "#082d1d", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Across {allForStats.length} tasks</h3>
          {allForStats.length === 0 ? (
            <p style={{ fontSize: 12, color: "#888780", textAlign: "center", padding: "16px 0", margin: 0 }}>No tasks yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {emotionDist.filter(r => r.count > 0).map(({ key, em, count, pct }) => {
                const ec = EC[key] ?? EC.NEUTRAL;
                return (
                  <div key={key} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "7px 10px 7px 12px",
                    borderLeft: `2px solid ${ec.text}`,
                    background: ec.bg, borderRadius: "0 6px 6px 0",
                  }}>
                    <span style={{ fontSize: 13, color: "#082d1d" }}>{em.emoji} {em.label}</span>
                    <span style={{ fontSize: 11, color: ec.text, fontWeight: 500 }}>{count} · {pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Completion by feeling ── */}
      {completionRates.length > 0 && (
        <div style={{ ...card, marginTop: 12 }}>
          <p style={{ fontSize: 11, color: "#888780", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 500, margin: "0 0 2px" }}>Completion by feeling</p>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: "#082d1d", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Which emotions get things done</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {completionRates.map(({ key, em, done, total, rate }) => {
              const rateColor = rate >= 70 ? "#059669" : rate >= 40 ? "#f59e0b" : "#ef4444";
              const rateBg    = rate >= 70 ? "#EEFAF1" : rate >= 40 ? "#FFF8E8" : "#FFF0EC";
              return (
                <div key={key} style={{
                  padding: "9px 12px 9px 14px",
                  borderLeft: `2px solid ${rateColor}`,
                  background: rateBg, borderRadius: "0 6px 6px 0",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "#082d1d" }}>{em.emoji} {em.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "#888780" }}>{done} of {total}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: rateColor }}>{rate}%</span>
                    </div>
                  </div>
                  <div style={{ height: 3, background: "rgba(0,0,0,0.08)", borderRadius: 999 }}>
                    <div style={{ height: "100%", background: rateColor, borderRadius: 999, width: `${rate}%`, transition: "width 0.4s ease" }} />
                  </div>
                </div>
              );
            })}
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

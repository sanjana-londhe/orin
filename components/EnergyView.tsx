"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TaskWithSubtasks } from "@/lib/types";
import { EMOTION_MAP } from "@/lib/emotions";

// ── Energy scale ─────────────────────────────────────────────────────
const LEVELS = [
  { value: 1, emoji: "🪫", label: "Drained" },
  { value: 2, emoji: "😮‍💨", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "⚡", label: "Good" },
  { value: 5, emoji: "🔥", label: "Peak" },
];

const SLOTS = [
  { key: "morning",   label: "Morning",   icon: "🌅", hours: "6 – 12am" },
  { key: "afternoon", label: "Afternoon", icon: "☀️",  hours: "12 – 5pm" },
  { key: "evening",   label: "Evening",   icon: "🌙", hours: "5 – 10pm" },
] as const;

type Slot = typeof SLOTS[number]["key"];

type DayLog = Partial<Record<Slot, number>>;
type EnergyStore = Record<string, DayLog>;

function todayKey() { return new Date().toISOString().slice(0, 10); }

function loadStore(): EnergyStore {
  try { return JSON.parse(localStorage.getItem("orin_energy") ?? "{}"); } catch { return {}; }
}
function saveStore(s: EnergyStore) {
  localStorage.setItem("orin_energy", JSON.stringify(s));
}

function avgDay(log: DayLog): number | null {
  const vals = Object.values(log).filter((v): v is number => v !== undefined);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function levelColor(v: number) {
  if (v >= 4.5) return "#059669";
  if (v >= 3.5) return "#34d399";
  if (v >= 2.5) return "#86efac";
  if (v >= 1.5) return "#fbbf24";
  return "#f87171";
}

// ── Area chart (SVG) ─────────────────────────────────────────────────
function AreaChart({ data }: { data: { label: string; value: number | null }[] }) {
  const W = 600, H = 120, PAD = { top: 12, right: 16, bottom: 28, left: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const filled = data.map((d, i) => ({ ...d, v: d.value ?? 0, i }));
  const hasData = data.some(d => d.value !== null);

  const scaleX = (i: number) => (i / (data.length - 1)) * innerW;
  const scaleY = (v: number) => innerH - ((v - 1) / 4) * innerH;

  const points = filled.map(d => `${scaleX(d.i)},${scaleY(d.v)}`).join(" ");
  const areaPath = hasData
    ? `M${scaleX(0)},${innerH} ` +
      filled.map(d => `L${scaleX(d.i)},${scaleY(d.v)}`).join(" ") +
      ` L${scaleX(data.length - 1)},${innerH} Z`
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#059669" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {/* Grid lines */}
        {[1, 2, 3, 4, 5].map(v => (
          <line key={v} x1={0} x2={innerW} y1={scaleY(v)} y2={scaleY(v)}
            stroke="#f1f3ef" strokeWidth={1} />
        ))}
        {/* Y labels */}
        {[1, 3, 5].map(v => (
          <text key={v} x={-6} y={scaleY(v) + 4} textAnchor="end"
            fontSize={9} fill="#c4cbc2">{v}</text>
        ))}

        {hasData ? (
          <>
            <path d={areaPath} fill="url(#energyGrad)" />
            <polyline points={points} fill="none" stroke="#059669" strokeWidth={2} strokeLinejoin="round" />
            {filled.map(d => d.value !== null && (
              <circle key={d.i} cx={scaleX(d.i)} cy={scaleY(d.v)} r={3.5}
                fill="#fff" stroke="#059669" strokeWidth={2} />
            ))}
          </>
        ) : (
          <text x={innerW / 2} y={innerH / 2} textAnchor="middle"
            fontSize={11} fill="#c4cbc2">Log energy to see your trend</text>
        )}

        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={scaleX(i)} y={innerH + 16} textAnchor="middle"
            fontSize={9} fill="#4a6d47">{d.label}</text>
        ))}
      </g>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────
export function EnergyView() {
  const [store, setStore] = useState<EnergyStore>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStore(loadStore());
    setMounted(true);
  }, []);

  const today = todayKey();
  const todayLog: DayLog = store[today] ?? {};

  function setLevel(slot: Slot, value: number) {
    const next: EnergyStore = {
      ...store,
      [today]: { ...todayLog, [slot]: todayLog[slot] === value ? undefined : value },
    };
    setStore(next);
    saveStore(next);
  }

  // 7-day trend
  const weekData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      const log = store[key];
      return {
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        value: log ? avgDay(log) : null,
      };
    });
  }, [store]);

  const todayAvg = avgDay(todayLog);

  // Task data
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

  const allForStats = [...allTasks, ...completedTasks];

  // Emotion distribution across all tasks
  const emotionDist = useMemo(() => {
    const total = allForStats.length || 1;
    return Object.entries(EMOTION_MAP).map(([key, em]) => {
      const count = allForStats.filter(t => t.emotionalState === key).length;
      return { key, em, count, pct: Math.round((count / total) * 100) };
    });
  }, [allForStats]);

  // Completion rate per emotion
  const completionRates = useMemo(() => {
    return Object.entries(EMOTION_MAP).map(([key, em]) => {
      const total = allForStats.filter(t => t.emotionalState === key).length;
      const done  = completedTasks.filter(t => t.emotionalState === key).length;
      return { key, em, total, done, rate: total ? Math.round((done / total) * 100) : 0 };
    }).filter(r => r.total > 0).sort((a, b) => b.rate - a.rate);
  }, [allForStats, completedTasks]);

  // Auto insights
  const insights = useMemo(() => {
    const out: string[] = [];
    if (completionRates.length > 0) {
      const best = completionRates[0];
      out.push(`You complete ${best.rate}% of tasks you feel ${best.em.label.toLowerCase()} about — your highest rate.`);
      if (completionRates.length > 1) {
        const worst = completionRates[completionRates.length - 1];
        out.push(`Tasks you feel ${worst.em.label.toLowerCase()} about have a ${worst.rate}% completion rate — consider breaking them into smaller steps.`);
      }
    }
    const deferred = allTasks.filter(t => t.deferredCount > 0).length;
    if (deferred > 0) {
      out.push(`${deferred} task${deferred !== 1 ? "s" : ""} in your list ${deferred !== 1 ? "have" : "has"} been deferred at least once. Emotional friction is often the cause.`);
    }
    const weekAvgs = weekData.map(d => d.value).filter((v): v is number => v !== null);
    if (weekAvgs.length >= 3) {
      const avg = weekAvgs.reduce((a, b) => a + b, 0) / weekAvgs.length;
      out.push(`Your average energy this week is ${avg.toFixed(1)}/5 — ${avg >= 4 ? "you're in a strong flow state." : avg >= 3 ? "a solid baseline." : "consider lighter task loads."}`);
    }
    return out;
  }, [completionRates, allTasks, weekData]);

  if (!mounted) return null;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 28px 64px" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4a6d47", marginBottom: 4 }}>
          Workspace · Flow
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.04em", color: "#082d1d", margin: 0, lineHeight: 1 }}>
            Flow
          </h1>
          {todayAvg !== null && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#f2fdec", border: "1.5px solid #c8f7ae",
              borderRadius: 12, padding: "8px 16px",
            }}>
              <span style={{ fontSize: 20 }}>{LEVELS[Math.round(todayAvg) - 1]?.emoji}</span>
              <div>
                <p style={{ fontSize: 11, color: "#4a6d47", margin: 0 }}>Today&apos;s energy</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: "#059669", margin: 0, letterSpacing: "-0.02em" }}>
                  {todayAvg.toFixed(1)} / 5
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 1: Daily check-in ── */}
      <div style={{
        background: "#fff", border: "1px solid #e9ede9", borderRadius: 16,
        padding: "20px 24px", marginBottom: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#082d1d", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
          How&apos;s your energy today?
        </h2>
        <p style={{ fontSize: 12.5, color: "#4a6d47", margin: "0 0 20px" }}>
          Log each time slot to build your weekly trend.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {SLOTS.map(slot => {
            const selected = todayLog[slot.key];
            return (
              <div key={slot.key} style={{
                background: "#f8f9f5", borderRadius: 12, padding: "14px 12px",
                border: selected ? "1.5px solid #c8f7ae" : "1.5px solid #e9ede9",
                transition: "border-color 0.15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <span style={{ fontSize: 16 }}>{slot.icon}</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#082d1d", margin: 0 }}>{slot.label}</p>
                    <p style={{ fontSize: 10, color: "#c4cbc2", margin: 0 }}>{slot.hours}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                  {LEVELS.map(l => (
                    <button key={l.value} onClick={() => setLevel(slot.key, l.value)}
                      title={l.label}
                      style={{
                        width: 34, height: 34, borderRadius: 8, border: "none",
                        background: selected === l.value ? levelColor(l.value) : "#fff",
                        cursor: "pointer", fontSize: 16,
                        boxShadow: selected === l.value ? `0 2px 8px ${levelColor(l.value)}50` : "0 1px 3px rgba(0,0,0,0.06)",
                        transform: selected === l.value ? "scale(1.1)" : "scale(1)",
                        transition: "all 0.12s",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                      {l.emoji}
                    </button>
                  ))}
                </div>
                {selected && (
                  <p style={{ textAlign: "center", fontSize: 10.5, color: "#059669", fontWeight: 600, marginTop: 8 }}>
                    {LEVELS[selected - 1].label}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: 7-day trend ── */}
      <div style={{
        background: "#fff", border: "1px solid #e9ede9", borderRadius: 16,
        padding: "20px 24px", marginBottom: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#082d1d", margin: "0 0 2px", letterSpacing: "-0.01em" }}>
              Energy this week
            </h2>
            <p style={{ fontSize: 12, color: "#4a6d47", margin: 0 }}>Daily average from your check-ins</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {LEVELS.map(l => (
              <div key={l.value} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 11 }}>{l.emoji}</span>
                <span style={{ fontSize: 9.5, color: "#4a6d47" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        <AreaChart data={weekData} />
      </div>

      {/* ── Section 3 + 4: two-column ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Emotional load */}
        <div style={{
          background: "#fff", border: "1px solid #e9ede9", borderRadius: 16,
          padding: "20px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#082d1d", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            Emotional load
          </h2>
          <p style={{ fontSize: 12, color: "#4a6d47", margin: "0 0 16px" }}>
            Distribution across {allForStats.length} tasks
          </p>
          {allForStats.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "#c4cbc2", textAlign: "center", padding: "20px 0" }}>
              No tasks yet
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {emotionDist.map(({ key, em, count, pct }) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, color: "#082d1d", display: "flex", alignItems: "center", gap: 5 }}>
                      <span>{em.emoji}</span> {em.label}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "#4a6d47" }}>{count} · {pct}%</span>
                  </div>
                  <div style={{ height: 6, background: "#f1f3ef", borderRadius: 999 }}>
                    <div style={{
                      height: "100%", borderRadius: 999,
                      background: em.strip, width: `${pct}%`,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completion rates */}
        <div style={{
          background: "#fff", border: "1px solid #e9ede9", borderRadius: 16,
          padding: "20px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#082d1d", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            Completion by feeling
          </h2>
          <p style={{ fontSize: 12, color: "#4a6d47", margin: "0 0 16px" }}>
            Which emotions lead to getting things done
          </p>
          {completionRates.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "#c4cbc2", textAlign: "center", padding: "20px 0" }}>
              Complete some tasks to see patterns
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {completionRates.map(({ key, em, done, total, rate }) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, color: "#082d1d", display: "flex", alignItems: "center", gap: 5 }}>
                      <span>{em.emoji}</span> {em.label}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: rate >= 70 ? "#059669" : rate >= 40 ? "#886a00" : "#c23934" }}>
                      {rate}%
                    </span>
                  </div>
                  <div style={{ height: 6, background: "#f1f3ef", borderRadius: 999, position: "relative" }}>
                    <div style={{
                      height: "100%", borderRadius: 999,
                      background: rate >= 70 ? "#059669" : rate >= 40 ? "#f59e0b" : "#f87171",
                      width: `${rate}%`, transition: "width 0.4s ease",
                    }} />
                  </div>
                  <p style={{ fontSize: 10, color: "#c4cbc2", margin: "3px 0 0" }}>{done} of {total} completed</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 5: Insights ── */}
      {insights.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #f2fdec 0%, #e8f5f0 100%)",
          border: "1.5px solid #c8f7ae", borderRadius: 16,
          padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>🌱</span>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#082d1d", margin: 0, letterSpacing: "-0.01em" }}>
              Orin insights
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {insights.map((text, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{
                  width: 20, height: 20, borderRadius: "50%", background: "#059669",
                  color: "#fff", fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                }}>{i + 1}</span>
                <p style={{ fontSize: 13, color: "#234b43", margin: 0, lineHeight: 1.6 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

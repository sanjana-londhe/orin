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

// Mood scale — a five-step sequential ramp drawn from Apple system colours
// (red → orange → yellow → teal → green), so the heatmap reads in the same
// language as the emotional-state chips. Data, not chrome: never an affordance.
const MOODS = [
  { value: 1, emoji: "😔", label: "Very unpleasant", color: "#d70015", soft: "#fdf0f0" },
  { value: 2, emoji: "😕", label: "Unpleasant",      color: "#b25000", soft: "#fdf4ec" },
  { value: 3, emoji: "😐", label: "Neutral",         color: "#8a6d00", soft: "#fbf6e3" },
  { value: 4, emoji: "🙂", label: "Pleasant",        color: "#0071a4", soft: "#eef6fa" },
  { value: 5, emoji: "😄", label: "Very pleasant",   color: "#248a3d", soft: "#eef7f1" },
];

function moodMeta(v: number) { return MOODS[Math.round(v) - 1] ?? MOODS[2]; }
function moodEmoji(v: number) { return moodMeta(v).emoji; }
function moodLabel(v: number) { return moodMeta(v).label; }
function moodColor(v: number) { return moodMeta(v).color; }

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

function rangeDays(r: Range): number | null {
  if (r === "7d")  return 7;
  if (r === "30d") return 30;
  if (r === "90d") return 90;
  if (r === "1y")  return 365;
  return null;
}

// ── GitHub-style mood heatmap ────────────────────────────────────────

type HeatCell = { date: Date; key: string; value: number | null; entries: CheckIn[] };

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
  const [tip, setTip] = useState<{ cell: HeatCell; rect: DOMRect } | null>(null);

  const days = useMemo(() => {
    const out: HeatCell[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = isoDay(d);
      const entries = store[key] ?? [];
      out.push({ date: new Date(d), key, value: avgMood(entries), entries });
    }
    return out;
  }, [startDate, endDate, store]);

  // Build week-columns. First column starts on Sunday of startDate's week.
  // Keep this hook above any early-return so the hook order is stable.
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

  // Mobile gets a totally different layout: last 12 weeks as rows so each
  // cell is large enough to read and tap. The 52-wide GitHub grid is
  // unreadable below ~6px / cell on a 375px screen.
  if (isMobile) {
    return <MoodHeatmapMobile days={days} store={store} />;
  }

  if (days.every(d => d.value === null)) {
    return (
      <p style={{ fontSize: 12, color: "#c7c7cc", margin: 0, textAlign: "center", padding: "20px 0" }}>
        Log check-ins to fill your mood map.
      </p>
    );
  }

  // Cells size themselves to fill the container width. Each column is
  // flex:1 inside a flex row, and each cell is aspect-ratio:1 inside
  // its column — so the grid is always a perfect rectangle of squares.
  const gap = isMobile ? 2 : 3;
  const dowGutter = isMobile ? 22 : 26;
  const todayIso = isoDay(new Date());

  return (
    <div style={{ width: "100%" }}>
      {/* Month labels row — same flex layout so labels align with their column */}
      <div style={{ display: "flex", gap, marginBottom: 4, paddingLeft: dowGutter + 6 }}>
        {grid.columns.map((_, idx) => {
          const monthEntry = grid.monthLabels.find(m => m.col === idx);
          return (
            <div key={idx} style={{
              flex: 1, minWidth: 0,
              fontSize: 10, color: "#86868b", fontWeight: 600,
              letterSpacing: "0.04em", textTransform: "uppercase",
              whiteSpace: "nowrap", lineHeight: 1, height: 12,
            }}>{monthEntry?.label ?? ""}</div>
          );
        })}
      </div>

      {/* DOW labels + grid */}
      <div style={{ display: "flex", gap: 6 }}>
        {/* DOW labels column */}
        <div style={{
          width: dowGutter,
          display: "flex", flexDirection: "column", gap,
          flexShrink: 0,
        }}>
          {/* DOW rows flex to match the heatmap cell heights — no
              aspect-ratio here, because the column on the right
              (where cell width = container-width / 53) determines
              the row height. */}
          {[0,1,2,3,4,5,6].map(dow => {
            const showLabel = dow === 1 || dow === 3 || dow === 5;
            const label = dow === 1 ? "Mon" : dow === 3 ? "Wed" : dow === 5 ? "Fri" : "";
            return (
              <div key={dow} style={{
                flex: 1, minHeight: 0,
                fontSize: 9, color: "#86868b",
                display: "flex", alignItems: "center", justifyContent: "flex-end",
                paddingRight: 4, lineHeight: 1,
                visibility: showLabel ? "visible" : "hidden",
              }}>{label}</div>
            );
          })}
        </div>

        {/* Heatmap columns — flex:1 each so they share the available width */}
        <div style={{ flex: 1, display: "flex", gap }}>
          {grid.columns.map((col, ci) => (
            <div key={ci} style={{
              flex: 1, minWidth: 0,
              display: "flex", flexDirection: "column", gap,
            }}>
              {col.map((cell, ri) => {
                if (!cell) {
                  return (
                    <div key={ri} style={{
                      aspectRatio: "1", width: "100%",
                      borderRadius: 8,
                      background: "#f0f0f0", opacity: 0.5,
                    }} />
                  );
                }
                const has = cell.value !== null;
                const today = todayIso === cell.key;
                return (
                  <div
                    key={ri}
                    onMouseEnter={e => setTip({ cell, rect: e.currentTarget.getBoundingClientRect() })}
                    onMouseLeave={() => setTip(t => t?.cell.key === cell.key ? null : t)}
                    style={{
                      aspectRatio: "1", width: "100%",
                      borderRadius: 8,
                      background: has ? moodColor(cell.value!) : "#f0f0f0",
                      outline: today ? "2px solid #1d1d1f" : "none",
                      outlineOffset: today ? -1 : 0,
                      boxSizing: "border-box",
                      cursor: "pointer",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        marginTop: 10, paddingLeft: dowGutter + 6,
      }}>
        <span style={{ fontSize: 10, color: "#86868b" }}>Unpleasant</span>
        {MOODS.map(m => (
          <div key={m.value} style={{
            width: 11, height: 11, borderRadius: 8, background: m.color,
          }} />
        ))}
        <span style={{ fontSize: 10, color: "#86868b" }}>Pleasant</span>
      </div>

      {tip && <HeatmapTooltip cell={tip.cell} rect={tip.rect} />}
    </div>
  );
}

// Mobile mood map: last 12 weeks vertical layout. Each row is a week,
// each column is a day (Sun-Sat). Cells are ~36px so they read well
// and accept taps; tapping opens an inline detail row below the grid.
function MoodHeatmapMobile({ days, store }: { days: HeatCell[]; store: EnergyStore }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const todayIso = isoDay(new Date());

  // Trailing 12-week window ending Saturday of this week, so the most
  // recent days sit at the bottom-right and the rectangle is always full.
  const weeks = useMemo(() => {
    const WEEKS = 12;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay())); // Saturday of current week
    const start = new Date(end);
    start.setDate(start.getDate() - (WEEKS * 7 - 1)); // Sunday 12 weeks back
    const byKey = new Map(days.map(d => [d.key, d]));
    const rows: HeatCell[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const row: HeatCell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const key = isoDay(date);
        const entries = store[key] ?? [];
        row.push(byKey.get(key) ?? { date, key, value: avgMood(entries), entries });
      }
      rows.push(row);
    }
    return rows;
  }, [days, store]);

  // Reuse weeks state for the row label (start-of-week date).
  const weekLabel = (row: HeatCell[]) =>
    row[0].date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const selected = selectedKey ? (weeks.flat().find(c => c.key === selectedKey) ?? null) : null;

  if (days.every(d => d.value === null)) {
    return (
      <p style={{ fontSize: 12, color: "#c7c7cc", margin: 0, textAlign: "center", padding: "20px 0" }}>
        Log check-ins to fill your mood map.
      </p>
    );
  }

  const DOW = ["S", "M", "T", "W", "T", "F", "S"];
  const labelCol = 44;

  return (
    <div style={{ width: "100%" }}>
      {/* DOW header */}
      <div style={{ display: "flex", gap: 4, paddingLeft: labelCol, marginBottom: 6 }}>
        {DOW.map((d, i) => (
          <div key={i} style={{
            flex: 1, textAlign: "center",
            fontSize: 10, fontWeight: 600, color: "#86868b",
          }}>{d}</div>
        ))}
      </div>

      {/* Week rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {weeks.map((row, ri) => (
          <div key={ri} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{
              width: labelCol - 4, flexShrink: 0,
              fontSize: 10, color: "#86868b",
              letterSpacing: "0.02em", textAlign: "right", paddingRight: 4,
            }}>{weekLabel(row)}</div>
            {row.map(cell => {
              const has = cell.value !== null;
              const isToday = cell.key === todayIso;
              const isFuture = cell.date > new Date(todayIso + "T23:59:59");
              const isSelected = cell.key === selectedKey;
              return (
                <button
                  key={cell.key}
                  onClick={() => setSelectedKey(k => k === cell.key ? null : cell.key)}
                  disabled={isFuture}
                  style={{
                    flex: 1, aspectRatio: "1",
                    borderRadius: 8,
                    background: has ? moodColor(cell.value!) : "#f0f0f0",
                    opacity: isFuture ? 0.35 : 1,
                    border: isSelected
                      ? "2px solid #1d1d1f"
                      : isToday ? "2px solid #1d1d1f" : "1px solid transparent",
                    boxSizing: "border-box",
                    cursor: isFuture ? "default" : "pointer",
                    padding: 0,
                    transition: "transform 0.1s",
                    transform: isSelected ? "scale(1.05)" : "scale(1)",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Selected detail */}
      {selected && (
        <div style={{
          marginTop: 12,
          padding: "12px 14px",
          background: "#f5f5f7",
          border: "1px solid #f0f0f0",
          borderRadius: 8,
        }}>
          <p style={{
            fontSize: 10, fontWeight: 600, color: "#86868b",
            letterSpacing: "0.08em", textTransform: "uppercase",
            margin: "0 0 6px",
          }}>{selected.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          {selected.entries.length === 0 ? (
            <p style={{ margin: 0, color: "#86868b", fontSize: 12 }}>No check-in this day.</p>
          ) : selected.entries.length === 1 ? (
            <>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>
                <span style={{ marginRight: 6 }}>{moodEmoji(selected.entries[0].mood)}</span>
                {moodLabel(selected.entries[0].mood)}
              </p>
              {selected.entries[0].contributions.length > 0 && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#333333" }}>
                  {selected.entries[0].contributions.join(" · ")}
                </p>
              )}
            </>
          ) : (
            <>
              <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>
                <span style={{ marginRight: 6 }}>{moodEmoji(selected.value!)}</span>
                {moodLabel(selected.value!)}
                <span style={{ color: "#86868b", fontWeight: 500, marginLeft: 6, fontSize: 11 }}>
                  avg of {selected.entries.length}
                </span>
              </p>
              {selected.entries.map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#333333", marginTop: i === 0 ? 4 : 2 }}>
                  <span>{moodEmoji(e.mood)}</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.contributions.length > 0 ? e.contributions.join(" · ") : moodLabel(e.mood)}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        marginTop: 12,
      }}>
        <span style={{ fontSize: 10, color: "#86868b" }}>Unpleasant</span>
        {MOODS.map(m => (
          <div key={m.value} style={{
            width: 12, height: 12, borderRadius: 8, background: m.color,
          }} />
        ))}
        <span style={{ fontSize: 10, color: "#86868b" }}>Pleasant</span>
      </div>
    </div>
  );
}

function HeatmapTooltip({ cell, rect }: { cell: HeatCell; rect: DOMRect }) {
  // Position above the cell when there's room; otherwise below.
  const above = rect.top > 140;
  const top = above ? rect.top - 8 : rect.bottom + 8;
  const left = rect.left + rect.width / 2;

  const dateLabel = cell.date.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div style={{
      position: "fixed",
      top, left,
      transform: `translate(-50%, ${above ? "-100%" : "0"})`,
      background: "#fff",
      border: "1px solid #e0e0e0",
      borderRadius: 8,
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      padding: "10px 12px",
      fontSize: 11.5,
      fontFamily: "inherit",
      color: "#1d1d1f",
      zIndex: 200,
      pointerEvents: "none",
      minWidth: 180, maxWidth: 260,
      lineHeight: 1.45,
    }}>
      <p style={{
        fontSize: 10, fontWeight: 600, color: "#86868b",
        letterSpacing: "0.08em", textTransform: "uppercase",
        margin: "0 0 4px",
      }}>{dateLabel}</p>

      {cell.entries.length === 0 ? (
        <p style={{ margin: 0, color: "#86868b", fontSize: 11 }}>No check-in</p>
      ) : cell.entries.length === 1 ? (
        <>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>
            <span style={{ marginRight: 4 }}>{moodEmoji(cell.entries[0].mood)}</span>
            {moodLabel(cell.entries[0].mood)}
          </p>
          {cell.entries[0].contributions.length > 0 && (
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#333333" }}>
              {cell.entries[0].contributions.join(" · ")}
            </p>
          )}
        </>
      ) : (
        <>
          <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600 }}>
            <span style={{ marginRight: 4 }}>{moodEmoji(cell.value!)}</span>
            {moodLabel(cell.value!)}
            <span style={{ color: "#86868b", fontWeight: 500, marginLeft: 6 }}>
              avg of {cell.entries.length}
            </span>
          </p>
          {cell.entries.map((e, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 11, color: "#333333",
              marginTop: i === 0 ? 4 : 2,
            }}>
              <span style={{ fontSize: 12 }}>{moodEmoji(e.mood)}</span>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.contributions.length > 0 ? e.contributions.join(" · ") : moodLabel(e.mood)}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Mood distribution — stacked horizontal bar ───────────────────────

function MoodDistribution({ counts, total, isMobile = false }: { counts: number[]; total: number; isMobile?: boolean }) {
  if (total === 0) {
    return (
      <p style={{ fontSize: 12, color: "#c7c7cc", margin: 0, textAlign: "center", padding: "12px 0" }}>
        No check-ins in this range.
      </p>
    );
  }
  return (
    <div>
      <div style={{ display: "flex", width: "100%", height: 16, borderRadius: 11, overflow: "hidden", background: "#f5f5f7", marginBottom: 12 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: isMobile ? 4 : 8 }}>
        {MOODS.map((m, i) => {
          const c = counts[i] ?? 0;
          const pct = total ? Math.round((c / total) * 100) : 0;
          return (
            <div key={m.value} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: isMobile ? "8px 2px" : "8px 4px",
              opacity: c > 0 ? 1 : 0.45,
            }}>
              <span style={{ fontSize: isMobile ? 18 : 20 }}>{m.emoji}</span>
              <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: "#1d1d1f", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
              <span style={{ fontSize: 10, color: "#86868b", letterSpacing: "0.02em" }}>{c} log{c === 1 ? "" : "s"}</span>
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
  // Range filter removed — page always shows the full year window.
  const range: Range = "all";

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
      // "All time" — fixed 52-week lookback, GitHub-style. The grid
      // is the same rectangle whether you logged once or every day.
      start = new Date(end); start.setDate(start.getDate() - 364);
    } else {
      start = new Date(end); start.setDate(start.getDate() - (days - 1));
    }
    return { rangeStart: start, rangeEnd: end };
  }, [range]);

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
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        padding: isMobile ? "16px" : "20px 22px",
        marginBottom: 12,
      }}>
        {(eyebrow || title) && (
          <div style={{ marginBottom: 16 }}>
            {eyebrow && <p style={{ fontSize: 10, color: "#86868b", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 600, margin: "0 0 4px" }}>{eyebrow}</p>}
            {title && <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", margin: 0, letterSpacing: "-0.02em" }}>{title}</h3>}
            {hint && <p style={{ fontSize: 12, color: "#86868b", margin: "4px 0 0", lineHeight: 1.45 }}>{hint}</p>}
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: pad }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: isMobile ? 16 : 20 }}>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#86868b", margin: "0 0 4px" }}>
          Workspace · My Energy
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: "#1d1d1f", margin: 0, lineHeight: 1.05 }}>
          My Energy
        </h1>
      </div>

      {/* ── Today action anchor ── */}
      <Section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: todayEntries.length === 0 ? 0 : 12 }}>
          <div>
            <p style={{ fontSize: 10, color: "#86868b", letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 600, margin: "0 0 4px" }}>Today</p>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", margin: 0, letterSpacing: "-0.02em" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
          </div>
          {todayEntries.length > 0 && (
            <button onClick={() => setModalOpen(true)} style={{
              padding: "5px 12px", borderRadius: 8, border: "1px solid #e0e0e0",
              background: "#fff", color: "#0066cc", fontSize: 11.5, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}>+ Log again</button>
          )}
        </div>

        {todayEntries.length === 0 ? (
          <div>
            <EmptyState icon={Heart} title="No check-in yet today" description="How are you feeling right now?" compact />
            <div style={{ display: "flex", justifyContent: "center", marginTop: -6 }}>
              <button onClick={() => setModalOpen(true)} style={{
                padding: "9px 22px", borderRadius: 8,
                border: "none",
                background: "#0066cc", color: "#fff", fontSize: 12.5, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>Log my feelings</button>
            </div>
          </div>
        ) : (
          <div>
            {latest && (
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px",
                background: "#f5f5f7", border: "1px solid #f0f0f0",
                borderRadius: 8, marginBottom: 10,
              }}>
                <span style={{ fontSize: 22 }}>{moodEmoji(latest.mood)}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "#1d1d1f", margin: "0 0 4px" }}>{moodLabel(latest.mood)}</p>
                  {latest.contributions.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {latest.contributions.map(c => (
                        <span key={c} style={{
                          padding: "3px 9px", borderRadius: 8, fontSize: 11, fontWeight: 500,
                          background: "#fff", border: "1px solid #e0e0e0",
                          color: "#333333",
                        }}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 11, color: "#86868b", flexShrink: 0 }}>{timeAgo(latest.time)}</p>
              </div>
            )}
            {todayEntries.length > 1 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {todayEntries.slice(0, -1).map((e, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 10px", borderRadius: 8,
                    background: "#f5f5f7", border: "1px solid #e0e0e0",
                    fontSize: 11, color: "#333333",
                  }}>
                    <span style={{ fontSize: 13 }}>{moodEmoji(e.mood)}</span>
                    <span style={{ fontWeight: 500, color: "#1d1d1f" }}>{moodLabel(e.mood)}</span>
                    <span style={{ color: "#86868b" }}>{timeAgo(e.time)}</span>
                  </div>
                ))}
              </div>
            )}
            {todayAvg !== null && todayEntries.length > 1 && (
              <p style={{ fontSize: 11, color: "#0066cc", fontWeight: 500, margin: "10px 0 0" }}>
                Today&apos;s average: {moodLabel(todayAvg)}
              </p>
            )}
          </div>
        )}
      </Section>

      {/* ── Quick stat strip: streak + most common mood ── */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div style={{
            background: "#fff", border: "1px solid #e0e0e0",
            borderRadius: 8, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: "#f5f5f7", color: "#86868b",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><Flame size={16} /></div>
            <div>
              <p style={{ fontSize: 10, color: "#86868b", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, margin: "0 0 3px" }}>Streak</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>
                {streak} <span style={{ fontSize: 12, color: "#86868b", fontWeight: 500 }}>day{streak === 1 ? "" : "s"}</span>
              </p>
            </div>
          </div>
          {(() => {
            const idx = summary.counts.indexOf(Math.max(...summary.counts));
            const m = MOODS[idx];
            return (
              <div style={{
                background: "#fff", border: "1px solid #e0e0e0",
                borderRadius: 8, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: "#f5f5f7",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>{m.emoji}</div>
                <div>
                  <p style={{ fontSize: 10, color: "#86868b", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, margin: "0 0 3px" }}>Most felt</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>{m.label}</p>
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
        <MoodDistribution counts={summary?.counts ?? [0,0,0,0,0]} total={summary?.entries ?? 0} isMobile={isMobile} />
      </Section>

      {/* ── What lifts / pulls ── */}
      <Section eyebrow="What's moving you" title="Lifts your mood vs. pulls it down">
        {!liftsPulls?.hasAny ? (
          <EmptyState icon={Lightbulb} title="Not enough signal yet" description="Tag your check-ins with what&apos;s affecting you to see what lifts you." compact />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
                <span style={{ color: "#248a3d" }}>▲</span> Lifts you
              </p>
              {liftsPulls.lifts.length === 0 ? (
                <p style={{ fontSize: 12, color: "#86868b", margin: 0 }}>—</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {liftsPulls.lifts.map(l => (
                    <div key={l.tag} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", borderRadius: 8,
                      background: "#f5f5f7", border: "1px solid #f0f0f0",
                      fontSize: 13, color: "#1d1d1f",
                    }}>
                      <span>{l.tag} <span style={{ color: "#86868b", fontSize: 10, marginLeft: 4 }}>{l.count}×</span></span>
                      <span style={{
                        padding: "2px 9px", borderRadius: 8,
                        background: "#eef7f1", border: "1px solid #e0e0e0",
                        color: "#248a3d",
                        fontWeight: 600, fontSize: 11, fontVariantNumeric: "tabular-nums",
                      }}>{l.avg.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
                <span style={{ color: "#d70015" }}>▼</span> Pulls you down
              </p>
              {liftsPulls.pulls.length === 0 ? (
                <p style={{ fontSize: 12, color: "#86868b", margin: 0 }}>—</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {liftsPulls.pulls.map(p => (
                    <div key={p.tag} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", borderRadius: 8,
                      background: "#f5f5f7", border: "1px solid #f0f0f0",
                      fontSize: 13, color: "#1d1d1f",
                    }}>
                      <span>{p.tag} <span style={{ color: "#86868b", fontSize: 10, marginLeft: 4 }}>{p.count}×</span></span>
                      <span style={{
                        padding: "2px 9px", borderRadius: 8,
                        background: "#fdf0f0", border: "1px solid #f0c9c9",
                        color: "#d70015",
                        fontWeight: 600, fontSize: 11, fontVariantNumeric: "tabular-nums",
                      }}>{p.avg.toFixed(1)}</span>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: taskByEmotion ? 14 : 0 }}>
              <div style={{
                background: "#f5f5f7", borderRadius: 8,
                border: "1px solid #f0f0f0",
                padding: "14px 16px",
              }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>High-mood days</p>
                <p style={{ margin: 0, color: "#1d1d1f" }}>
                  <strong style={{ fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{moodVsTasks.highAvg}</strong>
                  <span style={{ fontSize: 12, color: "#86868b", marginLeft: 4 }}>tasks/day</span>
                </p>
              </div>
              <div style={{
                background: "#f5f5f7", borderRadius: 8,
                border: "1px solid #f0f0f0",
                padding: "14px 16px",
              }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Low-mood days</p>
                <p style={{ margin: 0, color: "#1d1d1f" }}>
                  <strong style={{ fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{moodVsTasks.lowAvg}</strong>
                  <span style={{ fontSize: 12, color: "#86868b", marginLeft: 4 }}>tasks/day</span>
                </p>
              </div>
            </div>
          )}

          {moodVsTasks?.ratio && (
            <p style={{ fontSize: 13, color: "#333333", margin: "0 0 18px", lineHeight: 1.5 }}>
              You finish <strong style={{ color: "#1d1d1f" }}>{moodVsTasks.ratio}×</strong> more on high-mood days — protect that time.
            </p>
          )}

          {taskByEmotion && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{
                background: "#f5f5f7", borderRadius: 8,
                border: "1px solid #f0f0f0",
                padding: "14px 16px",
              }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Most likely to finish</p>
                <p style={{ margin: 0, fontSize: 13, color: "#1d1d1f", fontWeight: 600 }}>
                  {taskByEmotion.best.em?.emoji} {taskByEmotion.best.em?.label}
                  <span style={{ color: "#86868b", fontWeight: 400, fontSize: 11, marginLeft: 6 }}>· {Math.round(taskByEmotion.best.rate * 100)}%</span>
                </p>
              </div>
              <div style={{
                background: "#f5f5f7", borderRadius: 8,
                border: "1px solid #f0f0f0",
                padding: "14px 16px",
              }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Least likely to finish</p>
                <p style={{ margin: 0, fontSize: 13, color: "#1d1d1f", fontWeight: 600 }}>
                  {taskByEmotion.worst.em?.emoji} {taskByEmotion.worst.em?.label}
                  <span style={{ color: "#86868b", fontWeight: 400, fontSize: 11, marginLeft: 6 }}>· {Math.round(taskByEmotion.worst.rate * 100)}%</span>
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

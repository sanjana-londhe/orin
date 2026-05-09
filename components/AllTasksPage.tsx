"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TaskGrid } from "@/components/TaskGrid";
import { SkeletonTaskList, SkeletonBox } from "@/components/Skeleton";
import { DatePickerField } from "@/components/DatePickerField";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { TaskWithSubtasks } from "@/lib/types";

// ── design tokens ──────────────────────────────────────────────────────
const T = {
  bg:           "#fcfdfc",
  surface:      "#ffffff",
  textPrimary:  "#082d1d",
  textSecondary:"#3d5a4a",
  textTertiary: "#4a6d47",
  textMuted:    "#b9d3c4",
  border:       "#dde4de",
  borderStrong: "#c4cbc2",
  accent:       "#059669",
  stone100:     "#f8f9f5",
  stone200:     "#f1f3ef",
  stone300:     "#e9ede9",
};

type Tab    = "incomplete" | "deferred" | "completed";
type Preset = "today" | "yesterday" | "tomorrow" | "7d" | "1m" | "quarter" | "custom" | null;

const TABS: { key: Tab; label: string }[] = [
  { key: "incomplete", label: "Incomplete" },
  { key: "deferred",   label: "Deferred"   },
  { key: "completed",  label: "Completed"  },
];

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today",     label: "Today"     },
  { key: "yesterday", label: "Yesterday" },
  { key: "tomorrow",  label: "Tomorrow"  },
  { key: "7d",        label: "7 days"    },
  { key: "1m",        label: "1 month"   },
  { key: "quarter",   label: "Quarter"   },
  { key: "custom",    label: "Custom"    },
];

// ── date helpers ───────────────────────────────────────────────────────
function getRange(preset: Preset, from: string, to: string): [Date | null, Date | null] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const eod   = (d: Date) => { const e = new Date(d); e.setHours(23, 59, 59, 999); return e; };
  const shift = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

  switch (preset) {
    case "today":     return [today, eod(today)];
    case "yesterday": { const yd = shift(today, -1); return [yd, eod(yd)]; }
    case "tomorrow":  { const tm = shift(today, +1); return [tm, eod(tm)]; }
    case "7d":        return [today, eod(shift(today, 7))];
    case "1m":        { const e = new Date(today); e.setMonth(e.getMonth() + 1); return [today, eod(e)]; }
    case "quarter":   { const e = new Date(today); e.setMonth(e.getMonth() + 3); return [today, eod(e)]; }
    case "custom":    return [
      from ? new Date(from + "T00:00:00") : null,
      to   ? new Date(to   + "T23:59:59") : null,
    ];
    default: return [null, null];
  }
}

function filterByRange(tasks: TaskWithSubtasks[], from: Date | null, to: Date | null) {
  if (!from && !to) return tasks;
  return tasks.filter(t => {
    if (!t.dueAt) return false;
    const d = new Date(t.dueAt);
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  });
}

// ── component ──────────────────────────────────────────────────────────
export function AllTasksPage() {
  const [tab, setTab]       = useState<Tab>("incomplete");
  const [preset, setPreset] = useState<Preset>(null);
  const [from, setFrom]     = useState("");
  const [to, setTo]         = useState("");
  const isMobile            = useIsMobile();

  const queries = {
    incomplete: useQuery<TaskWithSubtasks[]>({ queryKey: ["tasks","all"],       queryFn: () => fetch("/api/tasks?filter=all").then(r => r.json()),       retry: 1 }),
    deferred:   useQuery<TaskWithSubtasks[]>({ queryKey: ["tasks","flagged"],   queryFn: () => fetch("/api/tasks?filter=flagged").then(r => r.json()),   retry: 1 }),
    completed:  useQuery<TaskWithSubtasks[]>({ queryKey: ["tasks","completed"], queryFn: () => fetch("/api/tasks?filter=completed").then(r => r.json()), retry: 1 }),
  };

  const [rangeFrom, rangeTo] = getRange(preset, from, to);

  function rawFor(t: Tab) {
    return queries[t]?.data ?? [];
  }

  function countFor(t: Tab) {
    return filterByRange(rawFor(t), rangeFrom, rangeTo).length;
  }

  const displayTasks = useMemo(() => {
    return filterByRange(rawFor(tab), rangeFrom, rangeTo);
  }, [tab, preset, from, to,
      queries.incomplete.data, queries.deferred.data, queries.completed.data]);

  const isLoading  = queries[tab]?.isLoading;
  const activeTab  = TABS.find(t => t.key === tab)!;

  const pad = isMobile ? "16px 14px 80px" : "24px 28px 64px";

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: pad }}>

      {/* Header */}
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <p style={{ fontFamily: "inherit", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: T.textTertiary, margin: "0 0 4px" }}>
          Workspace · All Tasks
        </p>
        <h1 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 500, letterSpacing: "-0.03em", color: T.textPrimary, margin: 0, lineHeight: 1 }}>
          All Tasks
        </h1>
      </div>

      {/* ── Period chips — horizontally scrollable on mobile ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        marginBottom: 16,
        overflowX: isMobile ? "auto" : "visible",
        flexWrap: isMobile ? "nowrap" : "wrap",
        paddingBottom: isMobile ? 4 : 0,
        // hide scrollbar on mobile
        msOverflowStyle: "none",
        scrollbarWidth: "none",
      } as React.CSSProperties}>
        <button
          onClick={() => { setPreset(null); setFrom(""); setTo(""); }}
          style={{
            padding: isMobile ? "8px 16px" : "6px 14px",
            borderRadius: 6, fontSize: 12.5, fontWeight: 500,
            border: `1.5px solid ${preset === null ? T.accent : T.border}`,
            background: preset === null ? T.accent : T.surface,
            color: preset === null ? "#fff" : T.textSecondary,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
            flexShrink: 0,
          }}
        >All time</button>

        {PRESETS.map(p => {
          const active = preset === p.key;
          return (
            <button
              key={p.key!}
              onClick={() => { setPreset(p.key); if (p.key !== "custom") { setFrom(""); setTo(""); } }}
              style={{
                padding: isMobile ? "8px 16px" : "6px 14px",
                borderRadius: 6, fontSize: 12.5, fontWeight: 500,
                border: `1.5px solid ${active ? T.accent : T.border}`,
                background: active ? T.accent : T.surface,
                color: active ? "#fff" : T.textSecondary,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                flexShrink: 0,
              }}
            >{p.label}</button>
          );
        })}
      </div>

      {/* Custom date pickers */}
      {preset === "custom" && (
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "flex-end",
          gap: 8, marginBottom: 16,
        }}>
          <div style={{ width: isMobile ? "100%" : 160 }}>
            <DatePickerField value={from} onChange={setFrom} label="From" calendarOnly />
          </div>
          {!isMobile && <span style={{ fontSize: 12, color: T.textTertiary, paddingBottom: 10, flexShrink: 0 }}>to</span>}
          <div style={{ width: isMobile ? "100%" : 160 }}>
            <DatePickerField value={to} onChange={setTo} label="To" calendarOnly />
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{
        display: "flex", gap: 2, marginBottom: 16,
        background: T.stone200, borderRadius: 8, padding: 4,
      }}>
        {TABS.map(t => {
          const count      = countFor(t.key);
          const active     = tab === t.key;
          const tabLoading = queries[t.key]?.isLoading;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: isMobile ? "9px 6px" : "7px 10px",
                borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: isMobile ? 12 : 12.5, fontWeight: active ? 600 : 400,
                background: active ? T.surface : "transparent",
                color: active ? T.textPrimary : T.textTertiary,
                boxShadow: "none",
                transition: "all 0.12s", fontFamily: "inherit",
              }}
            >
              {t.label}
              {tabLoading
                ? <SkeletonBox width={28} height={18} radius={999} />
                : (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
                    background: active ? T.stone200 : T.stone300,
                    color: active ? T.accent : T.textTertiary,
                    minWidth: 20, textAlign: "center",
                  }}>{count}</span>
                )
              }
            </button>
          );
        })}
      </div>

      {/* ── Task list ── */}
      {isLoading ? (
        <SkeletonTaskList count={5} />
      ) : (
        <TaskGrid
          tasks={displayTasks}
          isLoading={false}
          emptyState={
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, marginBottom: 4 }}>
                No {activeTab.label.toLowerCase()} tasks{preset ? " in this period" : ""}
              </p>
              {preset && (
                <button onClick={() => { setPreset(null); setFrom(""); setTo(""); }} style={{
                  marginTop: 8, fontSize: 12.5, color: T.accent, background: "none",
                  border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit",
                }}>Clear date filter</button>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}

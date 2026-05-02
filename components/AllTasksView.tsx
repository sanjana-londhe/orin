"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TaskGrid } from "@/components/TaskGrid";
import type { TaskWithSubtasks } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────

type Tab       = "todo" | "deferred" | "completed" | "deleted";
type Preset    = "today" | "tomorrow" | "7d" | "1m" | "quarter" | "year" | "custom" | null;

const TABS: { key: Tab; label: string; filter: string; emoji: string }[] = [
  { key: "todo",      label: "To-do",     filter: "all",       emoji: "📋" },
  { key: "deferred",  label: "Deferred",  filter: "flagged",   emoji: "⏭️" },
  { key: "completed", label: "Completed", filter: "completed", emoji: "✅" },
  { key: "deleted",   label: "Deleted",   filter: "",          emoji: "🗑️" },
];

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today",   label: "Today" },
  { key: "tomorrow",label: "Tomorrow" },
  { key: "7d",      label: "7 days" },
  { key: "1m",      label: "1 month" },
  { key: "quarter", label: "Quarter" },
  { key: "year",    label: "Year" },
  { key: "custom",  label: "Custom" },
];

// ── Helpers ──────────────────────────────────────────────────────────

function getRange(preset: Preset, from: string, to: string): [Date | null, Date | null] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const eod   = (d: Date) => { const e = new Date(d); e.setHours(23, 59, 59, 999); return e; };

  switch (preset) {
    case "today":    return [today, eod(today)];
    case "tomorrow": { const t = new Date(today); t.setDate(t.getDate() + 1); return [t, eod(t)]; }
    case "7d":       { const e = new Date(today); e.setDate(e.getDate() + 7);  return [today, eod(e)]; }
    case "1m":       { const e = new Date(today); e.setMonth(e.getMonth() + 1); return [today, eod(e)]; }
    case "quarter":  { const e = new Date(today); e.setMonth(e.getMonth() + 3); return [today, eod(e)]; }
    case "year":     { const e = new Date(today); e.setFullYear(e.getFullYear() + 1); return [today, eod(e)]; }
    case "custom":   return [
      from ? new Date(from + "T00:00:00") : null,
      to   ? new Date(to   + "T23:59:59") : null,
    ];
    default: return [null, null];
  }
}

function filterByRange(tasks: TaskWithSubtasks[], from: Date | null, to: Date | null): TaskWithSubtasks[] {
  if (!from && !to) return tasks;
  return tasks.filter(t => {
    if (!t.dueAt) return false;
    const d = new Date(t.dueAt);
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  });
}

function formatPresetLabel(preset: Preset, from: string, to: string): string {
  if (!preset) return "";
  if (preset === "custom") {
    if (from && to) return `${from} → ${to}`;
    if (from) return `From ${from}`;
    if (to)   return `To ${to}`;
    return "Custom range";
  }
  const [start, end] = getRange(preset, from, to);
  if (!start || !end) return "";
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return preset === "today" || preset === "tomorrow" ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
}

// ── Component ────────────────────────────────────────────────────────

export function AllTasksView() {
  const [tab, setTab]           = useState<Tab>("todo");
  const [preset, setPreset]     = useState<Preset>(null);
  const [customFrom, setFrom]   = useState("");
  const [customTo, setTo]       = useState("");

  const activeTab = TABS.find(t => t.key === tab)!;

  // Fetch for every tab so counts are always visible
  const results = {
    todo:      useQuery<TaskWithSubtasks[]>({ queryKey: ["tasks","all"],       queryFn: () => fetch("/api/tasks?filter=all").then(r => r.json()),       retry: 1 }),
    deferred:  useQuery<TaskWithSubtasks[]>({ queryKey: ["tasks","flagged"],   queryFn: () => fetch("/api/tasks?filter=flagged").then(r => r.json()),   retry: 1 }),
    completed: useQuery<TaskWithSubtasks[]>({ queryKey: ["tasks","completed"], queryFn: () => fetch("/api/tasks?filter=completed").then(r => r.json()), retry: 1 }),
  };

  const [rangeFrom, rangeTo] = getRange(preset, customFrom, customTo);

  const tasksForTab = useMemo(() => {
    if (tab === "deleted") return [];
    const raw = results[tab as keyof typeof results]?.data ?? [];
    return filterByRange(raw, rangeFrom, rangeTo);
  }, [tab, results.todo.data, results.deferred.data, results.completed.data, rangeFrom, rangeTo]);

  function countFor(t: Tab) {
    if (t === "deleted") return 0;
    const raw = results[t as keyof typeof results]?.data ?? [];
    return filterByRange(raw, rangeFrom, rangeTo).length;
  }

  const isLoading = tab !== "deleted" && results[tab as keyof typeof results]?.isLoading;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 28px 64px" }}>

      {/* Page title */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4a6d47", marginBottom: 4 }}>
          Workspace · All Tasks
        </p>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.04em", color: "#082d1d", margin: 0, lineHeight: 1 }}>
          All Tasks
        </h1>
      </div>

      {/* ── Date preset bar (Mixpanel-style) ── */}
      <div style={{
        background: "#fff", border: "1px solid #e9ede9", borderRadius: 12,
        padding: "10px 14px", marginBottom: 16,
        display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#c4cbc2", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 4 }}>
          Due
        </span>

        {/* "All time" pill (clear) */}
        <button
          onClick={() => { setPreset(null); setFrom(""); setTo(""); }}
          style={{
            padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
            fontSize: 12.5, fontWeight: preset === null ? 600 : 450,
            background: preset === null ? "#082d1d" : "#f1f3ef",
            color: preset === null ? "#fff" : "#4a6d47",
            transition: "all 0.12s",
          }}
        >All time</button>

        <div style={{ width: 1, height: 18, background: "#e9ede9", margin: "0 2px" }} />

        {PRESETS.map(p => (
          <button
            key={p.key!}
            onClick={() => { setPreset(p.key); if (p.key !== "custom") { setFrom(""); setTo(""); } }}
            style={{
              padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: 12.5, fontWeight: preset === p.key ? 600 : 450,
              background: preset === p.key ? "#059669" : "#f1f3ef",
              color: preset === p.key ? "#fff" : "#4a6d47",
              transition: "all 0.12s",
            }}
          >{p.label}</button>
        ))}

        {/* Active range label */}
        {preset && preset !== "custom" && (
          <span style={{ fontSize: 11.5, color: "#4a6d47", marginLeft: 4, fontFamily: "monospace" }}>
            · {formatPresetLabel(preset, customFrom, customTo)}
          </span>
        )}
      </div>

      {/* Custom date inputs */}
      {preset === "custom" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
          background: "#fff", border: "1px solid #e9ede9", borderRadius: 10,
          padding: "10px 14px",
        }}>
          <span style={{ fontSize: 12.5, color: "#4a6d47", fontWeight: 500 }}>From</span>
          <input
            type="date" value={customFrom} onChange={e => setFrom(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: 7, border: "1.5px solid #dde4de", fontSize: 12.5, color: "#082d1d", fontFamily: "inherit", outline: "none", background: "#fff" }}
          />
          <span style={{ fontSize: 12.5, color: "#c4cbc2" }}>→</span>
          <input
            type="date" value={customTo} min={customFrom} onChange={e => setTo(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: 7, border: "1.5px solid #dde4de", fontSize: 12.5, color: "#082d1d", fontFamily: "inherit", outline: "none", background: "#fff" }}
          />
          {customFrom && customTo && (
            <span style={{ fontSize: 11.5, color: "#059669", fontFamily: "monospace", marginLeft: 4 }}>
              {formatPresetLabel("custom", customFrom, customTo)}
            </span>
          )}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{
        display: "flex", gap: 2, marginBottom: 20,
        background: "#f1f3ef", borderRadius: 10, padding: 4,
      }}>
        {TABS.map(t => {
          const count   = countFor(t.key);
          const active  = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: active ? 600 : 450,
                background: active ? "#fff" : "transparent",
                color: active ? "#082d1d" : "#4a6d47",
                boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.12s",
              }}
            >
              <span style={{ fontSize: 14 }}>{t.emoji}</span>
              {t.label}
              {t.key !== "deleted" && (
                <span style={{
                  fontSize: 10.5, fontWeight: 700,
                  padding: "1px 7px", borderRadius: 999,
                  background: active ? "#f1f3ef" : "#e9ede9",
                  color: active ? "#059669" : "#4a6d47",
                  minWidth: 22, textAlign: "center",
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Task list ── */}
      {tab === "deleted" ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#c4cbc2" }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🗑️</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#082d1d", marginBottom: 6 }}>No deleted tasks</p>
          <p style={{ fontSize: 13, color: "#4a6d47" }}>Deleted tasks are permanently removed and cannot be recovered.</p>
        </div>
      ) : (
        <TaskGrid
          tasks={tasksForTab}
          isLoading={!!isLoading}
          emptyState={
            <div style={{ textAlign: "center", padding: "64px 0", color: "#c4cbc2" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>{activeTab.emoji}</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#082d1d", marginBottom: 6 }}>
                No {activeTab.label.toLowerCase()} tasks
                {preset ? ` in this period` : ""}
              </p>
              {preset && (
                <button onClick={() => setPreset(null)} style={{
                  marginTop: 8, fontSize: 12.5, color: "#059669", background: "none",
                  border: "none", cursor: "pointer", textDecoration: "underline",
                }}>Clear date filter</button>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PAGE_STYLE } from "@/lib/utils";
import { QuadrantMap, type QuadrantTask } from "@/components/QuadrantMap";
import { SkeletonBox } from "@/components/Skeleton";
import { DatePickerField } from "@/components/DatePickerField";

type Period = "today" | "week" | "month" | "quarter" | "year" | "custom";

const TABS: { value: Period; label: string }[] = [
  { value: "today",   label: "Today" },
  { value: "week",    label: "Week" },
  { value: "month",   label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year",    label: "Year" },
  { value: "custom",  label: "Custom" },
];

function getToday() { return new Date().toISOString().slice(0, 10); }
function getFuture(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function QuadrantPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [customFrom, setCustomFrom] = useState(getToday());
  const [customTo,   setCustomTo]   = useState(getFuture(30));

  const apiUrl = period === "custom"
    ? `/api/tasks/quadrant?period=custom&from=${customFrom}&to=${customTo}`
    : `/api/tasks/quadrant?period=${period}`;

  const { data: tasks = [], isLoading, isError } = useQuery<QuadrantTask[]>({
    queryKey: ["tasks", "quadrant", period, customFrom, customTo],
    queryFn: async () => {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error("Failed to load quadrant data");
      return res.json();
    },
  });

  return (
    <div style={PAGE_STYLE}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4a6d47", marginBottom: 4 }}>
          Visualization
        </p>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.04em", color: "#082d1d", lineHeight: 1 }}>
          Feeling Map
        </h1>
        <p style={{ fontSize: 12.5, color: "#4a6d47", marginTop: 4 }}>
          Urgency vs. emotional weight — your personal radar
        </p>
      </div>

      {/* Period tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(tab => {
          const active = period === tab.value;
          return (
            <button key={tab.value} onClick={() => setPeriod(tab.value)} style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 500,
              border: `1.5px solid ${active ? "#059669" : "#dde4de"}`,
              background: active ? "#059669" : "#fff",
              color: active ? "#fff" : "#3d5a4a",
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
            }}>
              {tab.label}
            </button>
          );
        })}

        {/* Custom date range */}
        {period === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
            <div style={{ width: 160 }}>
              <DatePickerField value={customFrom} onChange={setCustomFrom} />
            </div>
            <span style={{ fontSize: 12, color: "#4a6d47" }}>to</span>
            <div style={{ width: 160 }}>
              <DatePickerField value={customTo} onChange={setCustomTo} />
            </div>
          </div>
        )}
      </div>

      {/* Quadrant card */}
      <div style={{
        background: "#fff", borderRadius: 16, overflow: "hidden",
        border: "1px solid #dde4de",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        {/* Card header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #e9ede9", background: "#f2fdec", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: "#082d1d", margin: 0 }}>
              Emotional Task Quadrant Map
            </p>
            <p style={{ fontSize: 11, color: "#4a6d47", marginTop: 2 }}>
              {tasks.length} active task{tasks.length !== 1 ? "s" : ""} · {TABS.find(t => t.value === period)?.label} view
            </p>
          </div>
        </div>

        {/* Map */}
        <div style={{ padding: "20px 24px 16px" }}>
          {isLoading && <SkeletonBox height={300} radius={12} />}
          {isError && (
            <p style={{ fontSize: 13, color: "#c23934", padding: "64px 0", textAlign: "center" }}>
              Could not load data.
            </p>
          )}
          {!isLoading && !isError && (
            tasks.length === 0 ? (
              <div style={{ height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#b9d3c4", background: "#f2fdec", borderRadius: 12 }}>
                <span style={{ fontSize: 40 }}>⬡</span>
                <p style={{ fontSize: 13 }}>No tasks in this period</p>
              </div>
            ) : (
              <QuadrantMap tasks={tasks} />
            )
          )}
        </div>
      </div>

      {/* Axis explanation */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { title: "X-axis — Urgency", body: "How close the deadline is within the selected period. Right = imminent." },
          { title: "Y-axis — Emotional weight", body: "How you feel. Dreading = top, Excited = bottom." },
        ].map((item, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #dde4de", borderRadius: 10, padding: "12px 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#4a6d47", marginBottom: 4 }}>{item.title}</p>
            <p style={{ fontSize: 12.5, color: "#082d1d" }}>{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

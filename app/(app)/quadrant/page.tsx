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

      {/* Task count */}
      <p style={{ fontSize: 12, color: "#4a6d47", marginBottom: 16 }}>
        {isLoading ? "Loading…" : `${tasks.length} task${tasks.length !== 1 ? "s" : ""} · ${TABS.find(t => t.value === period)?.label} view`}
      </p>

      {/* Map — full width, no wrapper box */}
      {isLoading && <SkeletonBox height={340} radius={12} />}
      {isError && (
        <p style={{ fontSize: 13, color: "#c23934", padding: "64px 0", textAlign: "center" }}>
          Could not load data.
        </p>
      )}
      {!isLoading && !isError && (
        tasks.length === 0 ? (
          <div style={{ height: 340, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#b9d3c4", background: "#f8f9f5", borderRadius: 12, border: "1px solid #dde4de" }}>
            <span style={{ fontSize: 40 }}>⬡</span>
            <p style={{ fontSize: 13 }}>No tasks in this period</p>
          </div>
        ) : (
          <QuadrantMap tasks={tasks} />
        )
      )}
    </div>
  );
}

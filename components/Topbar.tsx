"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useUIStore, type SortMode } from "@/store/ui";
import { TaskCreateModal } from "@/components/TaskCreateModal";

const PAGE_NAMES: Record<string, string> = {
  "/":         "Today",
  "/quadrant": "Quadrant",
  "/calendar": "Calendar",
  "/scheduled":"Scheduled",
  "/all":      "All",
  "/flagged":  "Flagged",
  "/completed":"Completed",
};

const SORT_LABELS: Record<SortMode, string> = {
  due_date:  "Due date",
  emotional: "Emotional",
  manual:    "Manual",
};

const T = {
  border:      "#dde4de",
  accent:      "#059669",
  accentHover: "#047857",
  accentSubtle:"#f2fdec",
  textPrimary: "#082d1d",
  textSecondary:"#3d5a4a",
  textTertiary:"#4a6d47",
  surfaceMuted:"#f1f3ef",
  stone500:    "#c4cbc2",
};

interface Props { pageName: string; initial: string }

export function Topbar({ initial }: Props) {
  const pathname = usePathname();
  const { sortMode, setSortMode } = useUIStore();
  const [modalOpen, setModalOpen] = useState(false);
  const currentPage = PAGE_NAMES[pathname] ?? "Today";

  return (
    <>
      <div style={{
        height: 50, flexShrink: 0,
        borderBottom: `1.5px solid ${T.border}`,
        padding: "0 24px",
        display: "flex", alignItems: "center", gap: 12,
        background: "rgba(252,253,252,0.9)",
        backdropFilter: "blur(12px)",
      }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: T.textTertiary, flex: 1 }}>
          <span>Workspace</span>
          <span style={{ color: T.stone500 }}>/</span>
          <span style={{ color: T.textPrimary, fontWeight: 600 }}>{currentPage}</span>
        </div>

        {/* Sort + controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: T.textTertiary, marginRight: 2 }}>Sort</span>
          {(Object.keys(SORT_LABELS) as SortMode[]).map(mode => {
            const active = sortMode === mode;
            return (
              <button key={mode} onClick={() => setSortMode(mode)} style={{
                padding: "4px 12px", borderRadius: 6,
                border: active ? "1.5px solid #050e11" : `1.5px solid ${T.border}`,
                background: active ? T.accent : "none",
                color: active ? "#fff" : T.textSecondary,
                fontSize: 12.5, fontWeight: active ? 700 : 400,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
              }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = T.accentSubtle; (e.currentTarget as HTMLElement).style.borderColor = T.stone500; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.borderColor = T.border; } }}>
                {SORT_LABELS[mode]}
              </button>
            );
          })}

          {/* Search icon */}
          <button style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.textTertiary, cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.surfaceMuted}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}>
            ⌕
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 18, background: T.border }} />

          {/* + New task */}
          <button onClick={() => setModalOpen(true)} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 16px", borderRadius: 8,
            background: T.accent, border: "1.5px solid #050e11",
            color: "#fff", fontSize: 12.5, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.13s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.accentHover; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.accent; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
            + New task
          </button>

          {/* Avatar */}
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: T.accent, border: "1.5px solid #050e11",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>
            {initial}
          </div>
        </div>
      </div>

      <TaskCreateModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

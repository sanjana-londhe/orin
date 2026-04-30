"use client";

import { usePathname } from "next/navigation";

const PAGE_NAMES: Record<string, string> = {
  "/":         "Today",
  "/quadrant": "Quadrant",
  "/calendar": "Calendar",
  "/scheduled":"Scheduled",
  "/all":      "All",
  "/flagged":  "Flagged",
  "/completed":"Completed",
};

const T = {
  border:      "#dde4de",
  textPrimary: "#082d1d",
  textTertiary:"#4a6d47",
  surfaceMuted:"#f1f3ef",
  stone500:    "#c4cbc2",
  accent:      "#059669",
};

interface Props { pageName: string; initial: string }

export function Topbar({ initial }: Props) {
  const pathname = usePathname();
  const currentPage = PAGE_NAMES[pathname] ?? "Today";

  return (
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

      {/* Right side — search + avatar only */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button style={{
          width: 30, height: 30, borderRadius: 8,
          border: `1px solid ${T.border}`, background: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, color: T.textTertiary, cursor: "pointer",
        }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.surfaceMuted}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}>
          ⌕
        </button>

        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: T.accent, border: `1.5px solid ${T.border}`,
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, cursor: "pointer",
        }}>
          {initial}
        </div>
      </div>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { signOut } from "@/app/actions/auth";

const PAGE_NAMES: Record<string, string> = {
  "/":         "To-do list",
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

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

      {/* Right side */}
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

        {/* Avatar + dropdown */}
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <div
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: T.accent, border: `1.5px solid ${T.border}`,
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, cursor: "pointer", userSelect: "none",
            }}>
            {initial}
          </div>

          {dropdownOpen && (
            <div style={{
              position: "absolute", top: 36, right: 0,
              background: "#fff", border: `1.5px solid ${T.border}`,
              borderRadius: 10, padding: "4px 0",
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              minWidth: 140, zIndex: 100,
            }}>
              {[
                { label: "Profile", icon: "👤", action: () => setDropdownOpen(false) },
              ].map(item => (
                <button key={item.label} onClick={item.action} style={{
                  display: "flex", alignItems: "center", gap: 9,
                  width: "100%", padding: "9px 14px",
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, color: T.textPrimary, fontFamily: "inherit",
                  textAlign: "left", transition: "background 0.1s",
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.surfaceMuted}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}

              <div style={{ height: 1, background: T.border, margin: "4px 0" }} />

              <form action={signOut}>
                <button type="submit" style={{
                  display: "flex", alignItems: "center", gap: 9,
                  width: "100%", padding: "9px 14px",
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, color: "#c23934", fontFamily: "inherit",
                  textAlign: "left", transition: "background 0.1s",
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fff0ec"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}>
                  <span style={{ fontSize: 14 }}>→</span>
                  Log out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

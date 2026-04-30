"use client";

import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { signOut } from "@/app/actions/auth";
import { ProfileModal } from "@/components/ProfileModal";

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
  textSecondary:"#3d5a4a",
  textTertiary:"#4a6d47",
  surfaceMuted:"#f1f3ef",
  stone500:    "#c4cbc2",
  accent:      "#059669",
};

interface Props { pageName: string; initial: string; name?: string; email?: string }

export function Topbar({ initial, name = "", email = "" }: Props) {
  const pathname = usePathname();
  const currentPage = PAGE_NAMES[pathname] ?? "Today";

  const [view, setView]         = useState<"menu" | "confirm-logout" | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentName, setCurrentName] = useState(name);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setView(null);
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

      {/* Avatar + dropdown — no search icon */}
      <div ref={dropdownRef} style={{ position: "relative" }}>
        <div onClick={() => setView(v => v ? null : "menu")} style={{
          width: 28, height: 28, borderRadius: "50%",
          background: T.accent, border: `1.5px solid ${T.border}`,
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, cursor: "pointer", userSelect: "none",
        }}>
          {(currentName.charAt(0) || initial).toUpperCase()}
        </div>

        {/* Menu */}
        {view === "menu" && (
          <div style={{
            position: "absolute", top: 36, right: 0, zIndex: 100,
            background: "#fff", border: `1.5px solid ${T.border}`,
            borderRadius: 10, padding: "4px 0",
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 160,
          }}>
            <button onClick={() => { setView(null); setProfileOpen(true); }} style={{
              display: "flex", alignItems: "center", gap: 9,
              width: "100%", padding: "9px 14px",
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, color: T.textPrimary, fontFamily: "inherit",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.surfaceMuted}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}>
              <span>👤</span> Profile
            </button>
            <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
            <button onClick={() => setView("confirm-logout")} style={{
              display: "flex", alignItems: "center", gap: 9,
              width: "100%", padding: "9px 14px",
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, color: "#c23934", fontFamily: "inherit",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fff0ec"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}>
              <span>→</span> Log out
            </button>
          </div>
        )}

        {/* Logout confirmation */}
        {view === "confirm-logout" && (
          <div style={{
            position: "absolute", top: 36, right: 0, zIndex: 100,
            background: "#fff", border: `1.5px solid ${T.border}`,
            borderRadius: 12, padding: "20px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)", width: 240,
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginBottom: 6 }}>Log out?</p>
            <p style={{ fontSize: 12.5, color: T.textTertiary, marginBottom: 16, lineHeight: 1.5 }}>
              You&apos;ll need to sign in again to access your tasks.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setView(null)} style={{
                flex: 1, padding: "7px 0", borderRadius: 8,
                border: `1px solid ${T.border}`, background: "#fff",
                fontSize: 12.5, color: T.textSecondary, cursor: "pointer", fontFamily: "inherit",
              }}>
                Cancel
              </button>
              <form action={signOut} style={{ flex: 1 }}>
                <button type="submit" style={{
                  width: "100%", padding: "7px 0", borderRadius: 8,
                  border: "none", background: "#c23934",
                  fontSize: 12.5, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit",
                }}>
                  Log out
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
      {/* Centered profile modal */}
      <ProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        name={currentName}
        email={email}
        initial={currentName.charAt(0).toUpperCase() || initial}
        onNameUpdate={n => setCurrentName(n)}
      />
    </div>
  );
}

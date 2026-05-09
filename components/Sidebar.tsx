"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ListChecks, ScatterChart, CalendarDays, List, Zap,
  ChevronLeft, Plus,
} from "lucide-react";
import { ProfileModal } from "@/components/ProfileModal";
import { useUIStore } from "@/store/ui";
import { EnergyCheckInModal, loadEnergyStore, saveEnergyStore, todayKey, type CheckIn } from "@/components/EnergyCheckInModal";
import { getEmotion } from "@/lib/emotions";
import { signOut, signInWithGoogle } from "@/app/actions/auth";
import type { TaskWithSubtasks } from "@/lib/types";
import { useIsMobile } from "@/hooks/useIsMobile";

const VIEWS = [
  { href: "/",         Icon: ListChecks,   label: "Today",    fullLabel: "To-do list" },
  { href: "/energy",   Icon: Zap,          label: "Energy",   fullLabel: "My Energy" },
  { href: "/quadrant", Icon: ScatterChart, label: "Map",      fullLabel: "Quadrant" },
  { href: "/calendar", Icon: CalendarDays, label: "Calendar", fullLabel: "Calendar" },
  { href: "/all",      Icon: List,         label: "All",      fullLabel: "All Tasks" },
];

interface Props { userName: string; email?: string; initial?: string; isGuest?: boolean }

export function Sidebar({ userName, email = "", initial = "", isGuest = false }: Props) {
  const pathname   = usePathname();
  const router     = useRouter();
  const isMobile   = useIsMobile();
  const requestCreateTask = useUIStore(s => s.requestCreateTask);
  function openCreate() {
    requestCreateTask();
    if (pathname !== "/") router.push("/");
  }
  const [collapsed, setCollapsed]     = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showUser, setShowUser]       = useState(false);
  const [currentName, setCurrentName] = useState(userName);
  const [avatarSrc, setAvatarSrc]     = useState<string | null>(null);
  const [energyModalOpen, setEnergyModalOpen] = useState(false);

  const isCollapsed = !isMobile && collapsed;

  const { data: tasks = [] } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", "today"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?filter=today");
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  const deferred = tasks.filter(t => t.deferredCount > 0).length;
  const pending  = tasks.length;

  // ── Mobile: bottom tab bar (nav only — profile/energy handled by AppShell top bar) ──
  if (isMobile) {
    return (
      <>
        {/* FAB — new task */}
        <button
          onClick={openCreate}
          style={{
            position: "fixed", bottom: 72, right: 20, zIndex: 60,
            width: 52, height: 52, borderRadius: "50%",
            background: "#059669", border: "none",
            boxShadow: "0 4px 12px rgba(5,150,105,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#fff",
          }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>

        {/* Bottom nav — 5 views */}
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          height: 60, background: "#f8f9f5",
          borderTop: "1.5px solid #dde4de",
          display: "flex", alignItems: "stretch",
        }}>
          {VIEWS.map(({ href, Icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                flex: 1,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 3, textDecoration: "none",
                color: active ? "#059669" : "#4a6d47",
                background: active ? "#f2fdec" : "transparent",
                borderTop: active ? "2px solid #059669" : "2px solid transparent",
                transition: "background 0.1s",
              }}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>{label}</span>
              </Link>
            );
          })}
        </nav>
      </>
    );
  }

  // ── Desktop: left sidebar ─────────────────────────────────────────────
  return (
    <>
      <aside style={{
        width: isCollapsed ? 64 : 240,
        flexShrink: 0,
        background: "#f8f9f5",
        borderRight: "1.5px solid #dde4de",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        transition: "width 0.2s ease",
        overflow: "hidden",
      }}>

        {/* Logo row */}
        <div style={{
          height: 54, flexShrink: 0,
          padding: isCollapsed ? "0 10px" : "0 14px 0 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #e9ede9",
        }}>
          {!isCollapsed && (
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <rect width="100" height="100" rx="22" fill="#02382a"/>
                <circle cx="50" cy="41" r="18" fill="#059669"/>
                <circle cx="50" cy="59" r="18" fill="#59d10b"/>
              </svg>
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em", color: "#082d1d" }}>orin</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: 26, height: 26, borderRadius: 6, border: "1px solid #e9ede9",
              background: "#fff", cursor: "pointer", color: "#4a6d47",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "transform 0.2s",
              transform: collapsed ? "rotate(180deg)" : "none",
              marginLeft: collapsed ? "auto" : 0,
            }}
          >
            <ChevronLeft size={13} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: isCollapsed ? "10px 6px" : "10px 10px" }}>

          {/* Nav */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 14 }}>
            {VIEWS.map(({ href, Icon, fullLabel }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href}
                  title={isCollapsed ? fullLabel : undefined}
                  style={{
                    display: "flex", flexDirection: "row",
                    alignItems: "center", gap: 9,
                    padding: isCollapsed ? "9px" : "8px 10px",
                    borderRadius: 8, textDecoration: "none",
                    background: active ? "#e8f5f0" : "transparent",
                    color: active ? "#059669" : "#3d5a4a",
                    fontWeight: active ? 600 : 400,
                    fontSize: 13,
                    justifyContent: isCollapsed ? "center" : "flex-start",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f1f3ef"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Icon size={15} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                  {!isCollapsed && (
                    <>
                      <span style={{ flex: 1 }}>{fullLabel}</span>
                      {href === "/" && tasks.length > 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 999,
                          background: active ? "rgba(5,150,105,0.15)" : "#f1f3ef",
                          color: active ? "#059669" : "#4a6d47",
                        }}>{tasks.length}</span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Stats */}
          {!isCollapsed && (
            <div style={{
              background: "#fff", border: "1px solid #e9ede9",
              borderRadius: 4, padding: "12px 14px", marginBottom: 14,
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#3d5a4a", marginBottom: 10, margin: "0 0 10px" }}>This week</p>
              {[
                { dot: getEmotion("EXCITED").strip,  label: "Completed", val: 0 },
                { dot: getEmotion("DREADING").strip, label: "Deferred",  val: deferred },
                { dot: getEmotion("ANXIOUS").strip,  label: "Pending",   val: pending },
              ].map((row, i, arr) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: i < arr.length - 1 ? 8 : 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#4a6d47" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: row.dot }} />
                    {row.label}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#082d1d" }}>{row.val}</span>
                </div>
              ))}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e9ede9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "#4a6d47" }}>Completion</span>
                  <span style={{ fontWeight: 700, color: "#059669" }}>0%</span>
                </div>
                <div style={{ height: 3, background: "#e9ede9", borderRadius: 999 }}>
                  <div style={{ height: "100%", borderRadius: 999, background: "#59d10b", width: "0%" }} />
                </div>
              </div>
            </div>
          )}

          {/* Track energy promo — calm meadow palette */}
          {!isCollapsed && (
            <button
              onClick={() => setEnergyModalOpen(true)}
              style={{
                width: "100%", textAlign: "left",
                padding: 14, borderRadius: 4,
                border: "0.5px solid rgba(14,58,37,0.10)",
                background: "linear-gradient(160deg, #e7eed7 0%, #cad9b6 60%, #b9cfa7 100%)",
                color: "#0e3a25", cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 1px 2px rgba(14,58,37,0.04)",
                transition: "box-shadow 0.16s, transform 0.16s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(14,58,37,0.10)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 2px rgba(14,58,37,0.04)"; }}
            >
              <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 5px", lineHeight: 1.3, letterSpacing: "-0.01em" }}>Track your energy</p>
              <p style={{ fontSize: 11.5, margin: "0 0 10px", color: "#3d5a4a", lineHeight: 1.5 }}>
                Log how you feel and see patterns over time.
              </p>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#0e3a25" }}>Check in now →</span>
            </button>
          )}
        </div>

        {/* Bottom section */}
        <div style={{ padding: isCollapsed ? "10px 6px" : "10px 10px", borderTop: "1px solid #e9ede9", flexShrink: 0 }}>
          {!isCollapsed && (
            <button onClick={openCreate} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "7px 10px", borderRadius: 8, border: "1.5px dashed #c4cbc2",
              background: "none", cursor: "pointer", fontSize: 12.5, color: "#4a6d47",
              fontFamily: "inherit", marginBottom: 6,
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#059669"; (e.currentTarget as HTMLElement).style.color = "#059669"; (e.currentTarget as HTMLElement).style.background = "#f2fdec"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#c4cbc2"; (e.currentTarget as HTMLElement).style.color = "#4a6d47"; (e.currentTarget as HTMLElement).style.background = "none"; }}
            >
              <Plus size={13} /> New task…
            </button>
          )}

          {/* User profile / Guest login */}
          {isGuest ? (
            /* Guest — show Login with Google */
            !isCollapsed && (
              <div style={{ padding: "4px 2px" }}>
                <form action={signInWithGoogle}>
                  <button type="submit" style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    width: "100%", padding: "9px 10px", borderRadius: 8,
                    border: "0.5px solid rgba(0,0,0,0.12)", background: "#fff",
                    cursor: "pointer", fontSize: 12.5, fontWeight: 500, color: "#082d1d",
                    fontFamily: "inherit",
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.25)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.12)"}
                  >
                    <svg width="14" height="14" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01a4.8 4.8 0 0 1-7.18-2.53H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
                    </svg>
                    Login with Google
                  </button>
                </form>
                <p style={{ fontSize: 10, color: "#b9d3c4", textAlign: "center", margin: "6px 0 0", lineHeight: 1.4 }}>
                  Guest session · data not saved
                </p>
              </div>
            )
          ) : (
            /* Signed-in user */
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowUser(!showUser)}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: isCollapsed ? "8px" : "7px 10px",
                  borderRadius: 8, cursor: "pointer", width: "100%",
                  background: "transparent", border: "none", fontFamily: "inherit",
                  justifyContent: isCollapsed ? "center" : "flex-start",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f1f3ef"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", background: "#059669",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, overflow: "hidden",
                }}>
                  {avatarSrc
                    ? <img src={avatarSrc} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : (currentName.charAt(0) || initial).toUpperCase()
                  }
                </div>
                {!isCollapsed && (
                  <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#082d1d", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentName}</p>
                    <p style={{ fontSize: 11, color: "#4a6d47", margin: 0 }}>Free plan</p>
                  </div>
                )}
              </button>

              {showUser && (
                <div style={{
                  position: "absolute", bottom: "100%", left: 0, right: 0,
                  background: "#fff", border: "1.5px solid #e9ede9",
                  borderRadius: 4, padding: "4px 0", marginBottom: 4,
                  boxShadow: "0 -4px 16px rgba(0,0,0,0.08)", zIndex: 100,
                }}>
                  <button onClick={() => { setShowUser(false); setProfileOpen(true); }} style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "9px 14px", background: "none", border: "none",
                    cursor: "pointer", fontSize: 13, color: "#082d1d", fontFamily: "inherit",
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f1f3ef"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
                  >
                    <span>👤</span> Profile
                  </button>
                  <div style={{ height: 1, background: "#e9ede9", margin: "4px 0" }} />
                  <form action={signOut}>
                    <button type="submit" style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "9px 14px", background: "none", border: "none",
                      cursor: "pointer", fontSize: 13, color: "#c23934", fontFamily: "inherit",
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fff0ec"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
                    >
                      <span>→</span> Log out
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {energyModalOpen && (
        <EnergyCheckInModal
          onClose={() => setEnergyModalOpen(false)}
          onSave={(entry: CheckIn) => {
            const store = loadEnergyStore();
            const key = todayKey();
            store[key] = [...(store[key] ?? []), entry];
            saveEnergyStore(store);
          }}
        />
      )}
      <ProfileModal
        open={profileOpen}
        onOpenChange={setProfileOpen}
        name={currentName}
        email={email}
        initial={(currentName.charAt(0) || initial).toUpperCase()}
        onNameUpdate={n => setCurrentName(n)}
        onAvatarUpdate={url => setAvatarSrc(url)}
      />
    </>
  );
}

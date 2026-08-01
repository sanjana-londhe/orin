"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ListChecks, CalendarDays, List, Zap,
  ChevronLeft, Plus,
} from "lucide-react";
import { ProfileModal } from "@/components/ProfileModal";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { EnergyCheckInModal, loadEnergyStore, saveEnergyStore, todayKey, type CheckIn } from "@/components/EnergyCheckInModal";
import { signOut, signInWithGoogle } from "@/app/actions/auth";
import type { TaskWithSubtasks } from "@/lib/types";
import { withTz } from "@/lib/client-tz";
import { useIsMobile } from "@/hooks/useIsMobile";

const VIEWS = [
  { href: "/",         Icon: ListChecks,   label: "Today",    fullLabel: "To-do list" },
  { href: "/energy",   Icon: Zap,          label: "Energy",   fullLabel: "My Energy" },
  { href: "/calendar", Icon: CalendarDays, label: "Calendar", fullLabel: "Calendar" },
  { href: "/all",      Icon: List,         label: "All",      fullLabel: "All Tasks" },
];

interface Props { userName: string; email?: string; initial?: string; isGuest?: boolean }

export function Sidebar({ userName, email = "", initial = "", isGuest = false }: Props) {
  const pathname   = usePathname();
  const isMobile   = useIsMobile();
  const [createOpen, setCreateOpen]   = useState(false);
  function openCreate() { setCreateOpen(true); }
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
      const res = await fetch(withTz("/api/tasks?filter=today"));
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

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
            background: "#0066cc", border: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.14)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#fff",
          }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>

        {/* Bottom nav — 5 views */}
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          height: 60, background: "#f5f5f7",
          borderTop: "1px solid #e0e0e0",
          display: "flex", alignItems: "stretch",
        }}>
          {VIEWS.map(({ href, Icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                flex: 1,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 3, textDecoration: "none",
                color: active ? "#0066cc" : "#86868b",
                background: "transparent",
                borderTop: active ? "2px solid #0066cc" : "2px solid transparent",
                transition: "color 0.1s",
              }}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, letterSpacing: 0 }}>{label}</span>
              </Link>
            );
          })}
        </nav>
        <TaskCreateModal open={createOpen} onOpenChange={setCreateOpen} />
      </>
    );
  }

  // ── Desktop: left sidebar ─────────────────────────────────────────────
  return (
    <>
      <aside style={{
        width: isCollapsed ? 64 : 240,
        flexShrink: 0,
        background: "#f5f5f7",
        borderRight: "1px solid #e0e0e0",
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
          borderBottom: "1px solid #f0f0f0",
        }}>
          {!isCollapsed && (
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <rect width="100" height="100" rx="22" fill="#1d1d1f"/>
                <circle cx="50" cy="41" r="18" fill="#2997ff"/>
                <circle cx="50" cy="59" r="18" fill="#0066cc"/>
              </svg>
              <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.374px", color: "#1d1d1f" }}>orin</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: 26, height: 26, borderRadius: 8, border: "1px solid #f0f0f0",
              background: "#fff", cursor: "pointer", color: "#86868b",
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
                    // Surface change, not chrome: the row lifts to canvas white
                    // against the parchment rail; Action Blue text carries state.
                    background: active ? "#ffffff" : "transparent",
                    color: active ? "#0066cc" : "#86868b",
                    fontWeight: active ? 600 : 400,
                    fontSize: 13, letterSpacing: "-0.08px",
                    justifyContent: isCollapsed ? "center" : "flex-start",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#ffffff"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Icon size={15} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                  {!isCollapsed && (
                    <>
                      <span style={{ flex: 1 }}>{fullLabel}</span>
                      {href === "/" && tasks.length > 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 999,
                          background: active ? "rgba(0, 102, 204,0.15)" : "#f5f5f7",
                          color: active ? "#0066cc" : "#86868b",
                        }}>{tasks.length}</span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Track energy promo — store-utility-card: white on parchment,
              hairline border, no shadow, text-link CTA in Action Blue. */}
          {!isCollapsed && (
            <button
              data-no-press
              onClick={() => setEnergyModalOpen(true)}
              style={{
                width: "100%", textAlign: "left",
                padding: 16, borderRadius: 18,
                border: "1px solid #e0e0e0",
                background: "#ffffff",
                color: "#1d1d1f", cursor: "pointer", fontFamily: "inherit",
                transition: "border-color 0.16s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#d2d2d7"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e0e0e0"; }}
            >
              <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 4px", lineHeight: 1.29, letterSpacing: "-0.224px" }}>Track your energy</p>
              <p style={{ fontSize: 13, margin: "0 0 10px", color: "#86868b", lineHeight: 1.45, letterSpacing: "-0.08px" }}>
                Log how you feel and see patterns over time.
              </p>
              <span style={{ fontSize: 13, color: "#0066cc", letterSpacing: "-0.08px" }}>Check in now ›</span>
            </button>
          )}
        </div>

        {/* Bottom section */}
        <div style={{ padding: isCollapsed ? "10px 6px" : "10px 10px", borderTop: "1px solid #f0f0f0", flexShrink: 0 }}>
          {!isCollapsed && (
            {/* button-primary — the one Action Blue pill in the chrome */}
            <button onClick={openCreate} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
              padding: "9px 16px", borderRadius: 9999, border: "none",
              background: "#0066cc", cursor: "pointer", fontSize: 14, fontWeight: 400,
              letterSpacing: "-0.224px", color: "#ffffff",
              fontFamily: "inherit", marginBottom: 8,
            }}>
              <Plus size={14} /> New task
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
                    cursor: "pointer", fontSize: 11, fontWeight: 500, color: "#1d1d1f",
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
                <p style={{ fontSize: 10, color: "#c7c7cc", textAlign: "center", margin: "6px 0 0", lineHeight: 1.4 }}>
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
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f5f5f7"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", background: "#0066cc",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0, overflow: "hidden",
                }}>
                  {avatarSrc
                    ? <img src={avatarSrc} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : (currentName.charAt(0) || initial).toUpperCase()
                  }
                </div>
                {!isCollapsed && (
                  <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#1d1d1f", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentName}</p>
                    <p style={{ fontSize: 11, color: "#86868b", margin: 0 }}>Free plan</p>
                  </div>
                )}
              </button>

              {showUser && (
                <div style={{
                  position: "absolute", bottom: "100%", left: 0, right: 0,
                  background: "#fff", border: "1px solid #f0f0f0",
                  borderRadius: 11, padding: "4px 0", marginBottom: 4,
                  boxShadow: "0 -4px 16px rgba(0,0,0,0.08)", zIndex: 100,
                }}>
                  <button onClick={() => { setShowUser(false); setProfileOpen(true); }} style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "9px 14px", background: "none", border: "none",
                    cursor: "pointer", fontSize: 12, color: "#1d1d1f", fontFamily: "inherit",
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f5f5f7"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
                  >
                    <span>👤</span> Profile
                  </button>
                  <button onClick={() => { setShowUser(false); window.dispatchEvent(new CustomEvent("orin:show-tour")); }} style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "9px 14px", background: "none", border: "none",
                    cursor: "pointer", fontSize: 12, color: "#1d1d1f", fontFamily: "inherit",
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f5f5f7"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
                  >
                    <span>✨</span> Show intro
                  </button>
                  <div style={{ height: 1, background: "#f0f0f0", margin: "4px 0" }} />
                  <form action={signOut}>
                    <button type="submit" style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "9px 14px", background: "none", border: "none",
                      cursor: "pointer", fontSize: 12, color: "#d70015", fontFamily: "inherit",
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#fdf0f0"}
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

      <TaskCreateModal open={createOpen} onOpenChange={setCreateOpen} />

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

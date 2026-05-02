"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ListChecks, ScatterChart, CalendarDays, List,
  ChevronLeft, Plus, Sun, Moon,
} from "lucide-react";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { ProfileModal } from "@/components/ProfileModal";
import { getEmotion } from "@/lib/emotions";
import { signOut } from "@/app/actions/auth";
import type { TaskWithSubtasks } from "@/lib/types";

const VIEWS = [
  { href: "/",          Icon: ListChecks,   label: "To-do list" },
  { href: "/all",       Icon: List,         label: "All Tasks" },
  { href: "/quadrant",  Icon: ScatterChart, label: "Quadrant" },
  { href: "/calendar",  Icon: CalendarDays, label: "Calendar" },
];

interface Props { userName: string; email?: string; initial?: string }

export function Sidebar({ userName, email = "", initial = "" }: Props) {
  const pathname = usePathname();
  const [modalOpen, setModalOpen]     = useState(false);
  const [collapsed, setCollapsed]     = useState(false);
  const [theme, setTheme]             = useState<"light" | "dark">("light");
  const [profileOpen, setProfileOpen] = useState(false);
  const [showUser, setShowUser]       = useState(false);
  const [currentName, setCurrentName] = useState(userName);
  const [avatarSrc, setAvatarSrc]     = useState<string | null>(null);

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

  return (
    <>
      <aside style={{
        width: collapsed ? 64 : 240,
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
          padding: collapsed ? "0 16px" : "0 14px 0 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #e9ede9",
        }}>
          {!collapsed && (
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <span style={{
                width: 26, height: 26, borderRadius: 7, background: "#059669",
                color: "#fff", fontSize: 12, fontWeight: 800,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>O</span>
              <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em", color: "#082d1d" }}>orin</span>
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
        <div style={{ flex: 1, overflowY: "auto", padding: collapsed ? "10px 8px" : "10px 10px" }}>

          {/* Nav */}
          {!collapsed && (
            <p style={{
              fontSize: 10, fontWeight: 700, color: "#c4cbc2",
              textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "4px 8px 6px", margin: 0,
            }}>Main Menu</p>
          )}
          <nav style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 14 }}>
            {VIEWS.map(({ href, Icon, label }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href}
                  title={collapsed ? label : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: collapsed ? "9px" : "8px 10px",
                    borderRadius: 8, textDecoration: "none",
                    background: active ? "#e8f5f0" : "transparent",
                    color: active ? "#059669" : "#3d5a4a",
                    fontWeight: active ? 600 : 450,
                    fontSize: 13,
                    justifyContent: collapsed ? "center" : "flex-start",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f1f3ef"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Icon size={15} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1 }}>{label}</span>
                      {href === "/" && tasks.length > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999,
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
          {!collapsed && (
            <div style={{
              background: "#fff", border: "1px solid #e9ede9",
              borderRadius: 12, padding: "12px 14px", marginBottom: 14,
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

          {/* Promo card */}
          {!collapsed && (
            <div style={{
              padding: 14, borderRadius: 12,
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#fff", position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -16, right: -16, width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
              <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 5px", lineHeight: 1.3 }}>Track your energy</p>
              <p style={{ fontSize: 11.5, margin: "0 0 10px", opacity: 0.85, lineHeight: 1.5 }}>
                Log how each task feels and Orin learns with you.
              </p>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669", fontWeight: 700, fontSize: 14 }}>→</div>
            </div>
          )}
        </div>

        {/* Bottom section */}
        <div style={{ padding: collapsed ? "10px 8px" : "10px 10px", borderTop: "1px solid #e9ede9", flexShrink: 0 }}>
          {!collapsed && (
            <>
              {/* New task */}
              <button onClick={() => setModalOpen(true)} style={{
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

              {/* Theme toggle */}
              <div style={{ display: "flex", background: "#e9ede9", borderRadius: 8, padding: 3, marginBottom: 6 }}>
                {(["light", "dark"] as const).map(t => (
                  <button key={t} onClick={() => setTheme(t)} style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    padding: "5px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                    fontSize: 11.5, fontWeight: 500,
                    background: theme === t ? "#fff" : "transparent",
                    color: theme === t ? "#082d1d" : "#4a6d47",
                    boxShadow: theme === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s",
                  }}>
                    {t === "light" ? <Sun size={11} /> : <Moon size={11} />}
                    {t === "light" ? "Light" : "Dark"}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* User profile */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowUser(!showUser)}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: collapsed ? "8px" : "7px 10px",
                borderRadius: 8, cursor: "pointer", width: "100%",
                background: "transparent", border: "none", fontFamily: "inherit",
                justifyContent: collapsed ? "center" : "flex-start",
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
              {!collapsed && (
                <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#082d1d", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentName}</p>
                  <p style={{ fontSize: 11, color: "#4a6d47", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Free plan</p>
                </div>
              )}
            </button>

            {showUser && (
              <div style={{
                position: "absolute", bottom: "100%", left: 0, right: 0,
                background: "#fff", border: "1.5px solid #e9ede9",
                borderRadius: 10, padding: "4px 0", marginBottom: 4,
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
        </div>
      </aside>

      <TaskCreateModal open={modalOpen} onOpenChange={setModalOpen} />
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { TaskWithSubtasks } from "@/lib/types";

interface TileConfig {
  href: string;
  label: string;
  icon: string;
  color: string; // active bg colour
  iconBg: string;
}

const TILES: TileConfig[] = [
  { href: "/",          label: "Today",     icon: "☀️", color: "#1e7fe0", iconBg: "#1e7fe0" },
  { href: "/scheduled", label: "Scheduled", icon: "🗓", color: "#e05230", iconBg: "#e05230" },
  { href: "/all",       label: "All",       icon: "📋", color: "#6c6c6c", iconBg: "#6c6c6c" },
  { href: "/flagged",   label: "Flagged",   icon: "🚩", color: "#d4900a", iconBg: "#d4900a" },
  { href: "/completed", label: "Completed", icon: "✅", color: "#4a4a4a", iconBg: "#4a4a4a" },
];

export function Sidebar() {
  const pathname = usePathname();

  const { data: tasks = [] } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", "all"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  const { data: completedTasks = [] } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", "completed"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?filter=completed");
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  const now = new Date();
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const counts: Record<string, number> = {
    "/":          tasks.filter(t => !t.dueAt || new Date(t.dueAt) <= todayEnd).length,
    "/scheduled": tasks.filter(t => t.dueAt && new Date(t.dueAt) > todayEnd).length,
    "/all":       tasks.length,
    "/flagged":   tasks.filter(t => (t.deferredCount ?? 0) > 0).length,
    "/completed": completedTasks.length,
  };

  return (
    <aside style={{
      width: 240, flexShrink: 0,
      background: "#fff",
      borderRight: "1px solid rgba(0,0,0,0.07)",
      display: "flex", flexDirection: "column",
      padding: "16px 12px 24px",
      gap: 14,
    }}>
      {/* Search bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "#F2F2F7", borderRadius: 10,
        padding: "8px 12px",
      }}>
        <span style={{ fontSize: 13, color: "#8e8e93" }}>⌕</span>
        <input
          placeholder="Search"
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            fontSize: 14, color: "#1c1c1e", fontFamily: "inherit",
          }}
        />
      </div>

      {/* 2×2 tile grid + completed below */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {TILES.map((tile, i) => {
          const active = pathname === tile.href;
          const count = counts[tile.href] ?? 0;
          const isFullWidth = i === 4; // Completed spans full width

          return (
            <Link
              key={tile.href}
              href={tile.href}
              style={{
                display: "flex", flexDirection: "column",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 12,
                background: active ? tile.color : "#F2F2F7",
                textDecoration: "none",
                minHeight: 86,
                transition: "background 0.15s, transform 0.1s",
                gridColumn: isFullWidth ? "1 / -1" : undefined,
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "#e5e5ea";
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "#F2F2F7";
              }}
            >
              {/* Top row: icon + count */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: active ? "rgba(255,255,255,0.3)" : tile.iconBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15,
                }}>
                  {tile.icon}
                </div>
                <span style={{
                  fontSize: 26, fontWeight: 800,
                  color: active ? "#fff" : "#1c1c1e",
                  letterSpacing: "-0.04em", lineHeight: 1,
                }}>
                  {count}
                </span>
              </div>
              {/* Label */}
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: active ? "#fff" : "#1c1c1e",
                marginTop: 8,
              }}>
                {tile.label}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

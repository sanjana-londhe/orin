"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { TaskWithSubtasks } from "@/lib/types";

const TILES = [
  {
    href: "/",
    label: "List view",
    icon: "☀️",
    iconBg: "#059669",
    activeBg: "#059669",
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: "🗓",
    iconBg: "#e05230",
    activeBg: "#e05230",
  },
  {
    href: "/quadrant",
    label: "Visual emotion map",
    icon: "⬡",
    iconBg: "#6c4fd8",
    activeBg: "#6c4fd8",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  const { data: tasks = [] } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", "today"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?filter=today");
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  const counts: Record<string, number> = {
    "/": tasks.length,
    "/calendar": tasks.filter(t => t.dueAt).length,
    "/quadrant": tasks.length,
  };

  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      background: "#1c1c1e",
      display: "flex",
      flexDirection: "column",
      padding: "16px 12px",
      gap: 12,
      overflowY: "auto",
    }}>
      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "#2c2c2e", borderRadius: 10,
        padding: "8px 12px",
      }}>
        <span style={{ fontSize: 14, color: "#8e8e93" }}>⌕</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search"
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            fontSize: 14, color: "#fff", fontFamily: "inherit",
          }}
        />
      </div>

      {/* Tile grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
      }}>
        {TILES.map(tile => {
          const active = pathname === tile.href;
          const count = counts[tile.href] ?? 0;
          return (
            <Link
              key={tile.href}
              href={tile.href}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 12,
                background: active ? tile.activeBg : "#2c2c2e",
                textDecoration: "none",
                minHeight: 86,
                transition: "background 0.15s, transform 0.15s",
                gridColumn: tile.href === "/quadrant" ? "1 / -1" : undefined,
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "#3a3a3c";
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "#2c2c2e";
              }}
            >
              {/* Top row: icon + count */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: active ? "rgba(255,255,255,0.25)" : tile.iconBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                }}>
                  {tile.icon}
                </div>
                <span style={{
                  fontSize: 22, fontWeight: 700, color: active ? "#fff" : "#ebebf5",
                  letterSpacing: "-0.03em",
                }}>
                  {count}
                </span>
              </div>
              {/* Label */}
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: active ? "#fff" : "#ebebf5",
                marginTop: 10,
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

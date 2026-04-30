"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { TaskCreateModal } from "@/components/TaskCreateModal";

const NAV_LINKS = [
  { href: "/",         label: "Today" },
  { href: "/calendar", label: "Calendar" },
  { href: "/quadrant", label: "Quadrant" },
];

interface Props { initial: string; }

export function TopNav({ initial }: Props) {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 60,
        background: "rgba(255,255,255,0.93)",
        backdropFilter: "blur(20px) saturate(1.5)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        padding: "0 28px",
        height: 54,
        display: "flex", alignItems: "center", gap: 0,
      }}>
        {/* Logo */}
        <Link href="/" style={{
          fontSize: 17, fontWeight: 900, letterSpacing: "-0.05em",
          color: "#059669", textDecoration: "none",
          marginRight: 28, flexShrink: 0,
        }}>
          orin
        </Link>

        {/* Nav tabs */}
        <div style={{ display: "flex", flex: 1, height: "100%" }}>
          {NAV_LINKS.map(link => {
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} style={{
                display: "flex", alignItems: "center",
                padding: "0 14px", height: "100%",
                fontSize: 13, fontWeight: 500,
                color: active ? "#082d1d" : "#9C9389",
                borderBottom: active ? "2px solid #059669" : "2px solid transparent",
                borderTop: "none", borderLeft: "none", borderRight: "none",
                textDecoration: "none",
                transition: "all 0.14s", whiteSpace: "nowrap",
              }}>
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "#059669", color: "#fff",
              border: "none", borderRadius: 8, padding: "7px 16px",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s, transform 0.15s",
              boxShadow: "0 2px 8px rgba(5,150,105,0.25)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "#047857";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "#059669";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            + Add task
          </button>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "#E8F5F5", border: "1.5px solid rgba(0,0,0,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11.5, fontWeight: 700, color: "#2b6b5e", cursor: "pointer",
          }}>
            {initial}
          </div>
        </div>
      </nav>

      <TaskCreateModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

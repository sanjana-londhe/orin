"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ListChecks, ScatterChart, CalendarDays, List, Zap } from "lucide-react";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { EnergyCheckInModal, loadEnergyStore, saveEnergyStore, todayKey, type CheckIn } from "@/components/EnergyCheckInModal";
import { getEmotion, EMOTION_MAP } from "@/lib/emotions";
import type { TaskWithSubtasks } from "@/lib/types";

const T = {
  stone100:     "#f8f9f5",
  border:       "#dde4de",
  borderStrong: "#c4cbc2",
  accent:       "#059669",
  accentSubtle: "#f2fdec",
  lime:         "#59d10b",
  textPrimary:  "#082d1d",
  textSecondary:"#3d5a4a",
  textTertiary: "#4a6d47",
  surfaceMuted: "#f1f3ef",
  white:        "#ffffff",
};

const VIEWS = [
  { href: "/",        Icon: ListChecks,   label: "To-do list" },
  { href: "/all",     Icon: List,         label: "All Tasks" },
  { href: "/quadrant",Icon: ScatterChart, label: "Quadrant" },
  { href: "/calendar",Icon: CalendarDays, label: "Calendar" },
  { href: "/energy",  Icon: Zap,          label: "My Energy" },
];

interface Props { userName: string }

export function Sidebar({ userName: _userName }: Props) {
  const pathname = usePathname();
  const [modalOpen, setModalOpen]           = useState(false);
  const [energyModalOpen, setEnergyModal]   = useState(false);

  const { data: tasks = [] } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", "today"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?filter=today");
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  const emotionCounts = Object.keys(EMOTION_MAP).reduce<Record<string, number>>((acc, key) => {
    acc[key] = tasks.filter(t => t.emotionalState === key).length;
    return acc;
  }, {});

  const deferred = tasks.filter(t => t.deferredCount > 0).length;
  const pending  = tasks.length;

  return (
    <>
      <aside style={{
        width: 220, flexShrink: 0,
        background: T.stone100,
        borderRight: `1.5px solid ${T.border}`,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>

        {/* Logo */}
        <div style={{ height: 50, padding: "0 20px", display: "flex", alignItems: "center", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: T.accent, border: "1.5px solid #dde4de", color: "#fff", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", marginRight: 8 }}>O</span>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.03em", color: T.textPrimary }}>orin</span>
          </Link>
        </div>

        {/* Views */}
        <div style={{ padding: "16px 12px", borderBottom: `1px solid ${T.border}` }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textTertiary, padding: "0 8px 8px" }}>Views</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {VIEWS.map(v => {
              const active = pathname === v.href;
              return (
                <Link key={v.href} href={v.href} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 8px",
                  borderRadius: 6, fontSize: 12.5, fontWeight: active ? 600 : 450,
                  color: active ? "#1a5c3a" : T.textSecondary,
                  background: active ? "rgba(5,150,105,0.12)" : "none",
                  border: "1px solid transparent",
                  textDecoration: "none", transition: "all 0.12s",
                }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = T.surfaceMuted; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "none"; }}>
                  <v.Icon size={14} strokeWidth={2} style={{ flexShrink: 0, color: active ? "#1a5c3a" : "inherit" }} />
                  <span style={{ flex: 1 }}>{v.label}</span>
                  {v.href === "/" && tasks.length > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: active ? "rgba(5,150,105,0.15)" : T.surfaceMuted, color: active ? "#1a5c3a" : T.textTertiary }}>{tasks.length}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Mood filter */}
        <div style={{ padding: "16px 12px", borderBottom: `1px solid ${T.border}` }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textTertiary, padding: "0 8px 8px" }}>Mood filter</p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 8px 8px" }}>
            {Object.entries(EMOTION_MAP).map(([key, em]) => (
              <div key={key} style={{ flex: 1, height: 3, borderRadius: 999, background: em.strip, opacity: 0.6 }} />
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {Object.entries(EMOTION_MAP).map(([key, em]) => {
              const count = emotionCounts[key] ?? 0;
              return (
                <button key={key} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 8px",
                  borderRadius: 6, fontSize: 12.5, fontWeight: 450, color: T.textSecondary,
                  background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%",
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.surfaceMuted}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: em.strip, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{em.label}</span>
                  {count > 0 && <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: T.surfaceMuted, color: T.textTertiary }}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: "16px 12px", flex: 1 }}>
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.textSecondary, marginBottom: 12 }}>This week</p>
            {[
              { dot: getEmotion("EXCITED").strip,  label: "Completed", val: 0 },
              { dot: getEmotion("DREADING").strip, label: "Deferred",  val: deferred },
              { dot: getEmotion("ANXIOUS").strip,  label: "Pending",   val: pending },
            ].map((row, i, arr) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: i < arr.length - 1 ? 8 : 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: T.textTertiary }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: row.dot }} />{row.label}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary }}>{row.val}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: T.textTertiary }}>Completion</span>
                <span style={{ fontWeight: 700, color: T.accent }}>0%</span>
              </div>
              <div style={{ height: 3, background: T.border, borderRadius: 999 }}>
                <div style={{ height: "100%", borderRadius: 999, background: T.lime, width: "0%" }} />
              </div>
            </div>
          </div>

          {/* Track your energy card */}
          <button
            onClick={() => setEnergyModal(true)}
            style={{
              width: "100%", textAlign: "left", padding: "12px 14px",
              borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${T.accent} 0%, #047857 100%)`,
              color: "#fff", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <p style={{ fontWeight: 700, fontSize: 12.5, margin: "0 0 4px", lineHeight: 1.3 }}>Track your energy</p>
            <p style={{ fontSize: 11, margin: 0, opacity: 0.85 }}>Log how you feel right now →</p>
          </button>
        </div>

        {/* New task */}
        <div style={{ padding: 12, borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
          <button onClick={() => setModalOpen(true)} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "8px 12px", borderRadius: 8, border: `1.5px dashed ${T.borderStrong}`,
            background: "none", cursor: "pointer", fontSize: 12.5, color: T.textTertiary, fontFamily: "inherit",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.accent; (e.currentTarget as HTMLElement).style.color = T.accent; (e.currentTarget as HTMLElement).style.background = T.accentSubtle; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.borderStrong; (e.currentTarget as HTMLElement).style.color = T.textTertiary; (e.currentTarget as HTMLElement).style.background = "none"; }}>
            <span style={{ fontSize: 14 }}>+</span> New task…
          </button>
        </div>
      </aside>

      <TaskCreateModal open={modalOpen} onOpenChange={setModalOpen} />
      {energyModalOpen && (
        <EnergyCheckInModal
          onClose={() => setEnergyModal(false)}
          onSave={(entry: CheckIn) => {
            const store = loadEnergyStore();
            const key   = todayKey();
            store[key]  = [...(store[key] ?? []), entry];
            saveEnergyStore(store);
          }}
        />
      )}
    </>
  );
}

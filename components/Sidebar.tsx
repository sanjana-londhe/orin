"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { cn } from "@/lib/utils";
import type { TaskWithSubtasks } from "@/lib/types";

const EMOTION_COLOUR: Record<string, string> = {
  DREADING: "#c23934",
  ANXIOUS:  "#886a00",
  NEUTRAL:  "#c4cbc2",
  WILLING:  "#2b6b5e",
  EXCITED:  "#59d10b",
};

const EMOTION_EMOJI: Record<string, string> = {
  DREADING: "😮‍💨",
  ANXIOUS:  "😟",
  NEUTRAL:  "😐",
  WILLING:  "🙂",
  EXCITED:  "🤩",
};

const NAV = [
  { href: "/",          icon: "☀️",  label: "Today" },
  { href: "/calendar",  icon: "🗓",  label: "Calendar" },
  { href: "/quadrant",  icon: "⬡",   label: "Quadrant" },
];

function formatSidebarTime(dueAt: Date | string | null): string {
  if (!dueAt) return "No deadline";
  const d = new Date(String(dueAt));
  const overdue = d < new Date();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return overdue ? `${time} · overdue` : time;
}

interface Props {
  userName: string;
}

export function Sidebar({ userName }: Props) {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const now = new Date();

  const { data: tasks = [] } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["tasks", "today"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?filter=today");
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  return (
    <>
      <aside style={{ width: 252, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff", borderRight: "1px solid rgba(0,0,0,0.07)" }}>

        {/* Header — logo + nav */}
        <div className="px-[18px] pt-5 pb-4 border-b border-black/[0.06] flex-shrink-0">
          <span className="block text-[15px] font-extrabold tracking-[-0.05em] text-[#1A1814] mb-4">
            orin
          </span>
          <nav className="flex flex-col gap-px">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "flex items-center gap-[9px] px-[10px] py-[6px] rounded-[7px] text-[12.5px] transition-all",
                    active
                      ? "bg-[#EDE8E0] text-[#1A1814] font-medium"
                      : "text-[#9C9890] hover:bg-[#F3F1EC] hover:text-[#4C4840]"
                  )}>
                  <span className="text-[13px] w-4 text-center flex-shrink-0">{item.icon}</span>
                  {item.label}
                  {item.href === "/" && tasks.length > 0 && (
                    <span className={cn(
                      "ml-auto font-mono text-[9.5px] px-[6px] py-px rounded",
                      active ? "bg-[#E0DBD4] text-[#6C6860]" : "bg-[#EDE8E0] text-[#B0A89E]"
                    )}>
                      {tasks.length}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Divider */}
        <div className="h-px bg-black/[0.06] mx-0" />

        {/* Date widget */}
        <div className="px-[10px] pt-[4px] pb-[10px] flex-shrink-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#B0A89E] mb-1">
            {now.toLocaleDateString("en-US", { weekday: "long" })}
          </p>
          <p className="text-[34px] font-black leading-none tracking-[-0.05em] text-[#1A1814]">
            {now.getDate()}
          </p>
          <p className="text-[11px] text-[#A09890] mt-0.5">
            {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Mood bar */}
        <div className="flex items-center gap-1 px-[10px] pb-[10px]">
          {Object.values(EMOTION_COLOUR).map((c, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-sm opacity-70"
              style={{ background: c }} />
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-black/[0.06]" />

        {/* Mini task list */}
        <div className="flex-1 overflow-y-auto px-2 py-1 [scrollbar-width:thin]">
          {tasks.map((task) => {
            const colour = EMOTION_COLOUR[task.emotionalState] ?? "#c4cbc2";
            const emoji = EMOTION_EMOJI[task.emotionalState] ?? "😐";
            const timeStr = formatSidebarTime(task.dueAt);
            const overdue = task.dueAt ? new Date(String(task.dueAt)) < new Date() : false;
            return (
              <div key={task.id}
                className="flex items-start gap-[9px] px-[10px] py-[9px] rounded-[8px] mb-px hover:bg-[#F3F1EC] cursor-pointer transition-colors border-l-2 border-transparent"
                style={{ "--c": colour } as React.CSSProperties}>
                <span className="text-[14px] flex-shrink-0 mt-px leading-none">{emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "font-mono text-[9px] mb-0.5 whitespace-nowrap",
                    overdue ? "text-[#c23934]" : "text-[#B0A89E]"
                  )}>
                    {overdue && <span>⚑ </span>}{timeStr}
                    {task.recurrenceRule && " · ↺"}
                  </p>
                  <p className="text-[11.5px] text-[#8C8880] leading-[1.36] truncate">
                    {task.title}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer — new task */}
        <div className="px-2 py-[10px] border-t border-black/[0.06] flex-shrink-0">
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 w-full px-[10px] py-2 rounded-[8px] border border-dashed border-[#D8D2CC] text-[12px] text-[#B0A89E] hover:border-[#B0A89E] hover:text-[#4C4840] transition-all">
            <span className="w-[18px] h-[18px] rounded-[5px] bg-[#EDE8E0] flex items-center justify-center text-[13px] text-[#8C8880] flex-shrink-0 leading-none">
              +
            </span>
            New task…
          </button>
        </div>
      </aside>

      <TaskCreateModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

"use client";

import { useState } from "react";
import { TaskCreateModal } from "@/components/TaskCreateModal";

interface Props {
  name: string;
}

function greeting(name: string): string {
  const h = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${time}, ${name} 👋`;
}

function formattedDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function WelcomeView({ name }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">

        {/* Date */}
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--stone-500)] mb-6">
          {formattedDate()}
        </p>

        {/* Greeting */}
        <h1 className="text-[36px] sm:text-[48px] font-extrabold leading-tight tracking-[-0.04em] text-[var(--lime-ink)] mb-3">
          {greeting(name)}
        </h1>

        {/* Nudge */}
        <p className="text-[15px] text-[var(--stone-500)] max-w-[360px] leading-relaxed mb-8">
          You&apos;re all set. Add your first task and let&apos;s figure out how you feel about it.
        </p>

        {/* CTA */}
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-[10px] bg-[hsl(var(--primary))] border border-[var(--stone-400)] px-6 py-3 text-[15px] font-bold text-white transition-all hover:bg-[hsl(var(--primary)/0.9)]  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2"
        >
          + Add your first task
        </button>

        {/* Subtle hint */}
        <p className="mt-5 text-[12px] text-[var(--stone-500)]">
          No judgment. Just a place to put what&apos;s on your mind.
        </p>
      </div>

      <TaskCreateModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

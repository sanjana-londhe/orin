"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeCelebration, prefersReducedMotion, type FanfareEvent } from "@/lib/celebrate";

// Brand greens + the emotion palette — confetti pulls from the same colors
// used across the app so the burst feels native to Orin.
const CONFETTI_COLORS = [
  "#059669", "#59d10b", "#1A9444", "#0E8A7D", // brand / willing / excited
  "#B07A10", "#D14626", "#082d1d",            // anxious / dreading / ink
];

interface Particle {
  id: number;
  left: number;   // vw offset from center origin, in px
  tx: number;     // horizontal drift (px)
  ty: number;     // vertical rise (px, negative = up)
  rot: number;    // final rotation (deg)
  delay: number;  // s
  dur: number;    // s
  size: number;   // px
  color: string;
  round: boolean;
}

function buildParticles(count: number, small: boolean): Particle[] {
  // Per-task bursts are tighter and quicker; day-clear bursts travel farther.
  const baseDist = small ? 50 : 120;
  const spread = small ? 90 : 220;
  return Array.from({ length: count }, (_, id) => {
    const angle = Math.random() * Math.PI;          // upper half-circle
    const dist = baseDist + Math.random() * spread;
    return {
      id,
      left: (Math.random() - 0.5) * (small ? 24 : 80),
      tx: Math.cos(angle) * dist * (Math.random() < 0.5 ? -1 : 1),
      ty: -(Math.sin(angle) * dist + (small ? 18 : 40)),
      rot: (Math.random() - 0.5) * 540,
      delay: Math.random() * (small ? 0.05 : 0.12),
      dur: small ? 0.6 + Math.random() * 0.4 : 0.9 + Math.random() * 0.7,
      size: small ? 5 + Math.random() * 4 : 6 + Math.random() * 6,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      round: Math.random() < 0.4,
    };
  });
}

export function CelebrationOverlay() {
  const [fanfare, setFanfare] = useState<FanfareEvent | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

    const unsub = subscribeCelebration((e) => {
      clearTimers();
      setFanfare(e);

      const reduced = prefersReducedMotion();
      const isTask = e.level === "task";
      if (!reduced && e.intensity !== "calm") {
        const count = isTask
          ? (e.intensity === "celebratory" ? 18 : 12)
          : (e.intensity === "celebratory" ? 44 : 26);
        setParticles(buildParticles(count, isTask));
        timers.current.push(setTimeout(() => setParticles([]), isTask ? 1200 : 2000));
      } else {
        setParticles([]);
      }

      // Day-clear keeps the line up; per-task bursts clear out quickly so
      // rapid completions stay snappy.
      timers.current.push(setTimeout(() => setFanfare(null), isTask ? 1200 : 2600));
    });

    return () => { unsub(); clearTimers(); };
  }, []);

  if (!fanfare) return null;

  // Per-task bursts spring from the checkbox the user tapped; day-clear (and
  // any case where we never captured a pointer) bursts from screen center.
  const burstPos = fanfare.origin
    ? { left: fanfare.origin.x, top: fanfare.origin.y }
    : { left: "50%", top: "42%" };

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        pointerEvents: "none",            // never blocks the next action
        overflow: "hidden",
      }}
    >
      {/* Confetti burst */}
      {particles.length > 0 && (
        <div style={{ position: "absolute", ...burstPos, width: 0, height: 0 }}>
          {particles.map((p) => (
            <span
              key={p.id}
              style={{
                position: "absolute",
                left: p.left, top: 0,
                width: p.size, height: p.round ? p.size : p.size * 0.5,
                background: p.color,
                borderRadius: p.round ? "50%" : 1,
                // custom props consumed by the keyframe
                ["--tx" as string]: `${p.tx}px`,
                ["--ty" as string]: `${p.ty}px`,
                ["--rot" as string]: `${p.rot}deg`,
                animation: `confetti-burst ${p.dur}s cubic-bezier(0.16,0.84,0.44,1) ${p.delay}s forwards`,
                willChange: "transform, opacity",
              }}
            />
          ))}
        </div>
      )}

      {/* Affirming line — day-clear only (per-task bursts carry no message) */}
      {fanfare.message && (
      <div
        style={{
          position: "absolute", top: "calc(42% + 28px)", left: "50%",
          transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px", borderRadius: 999,
          background: "rgba(8,45,29,0.92)",
          boxShadow: "0 8px 32px rgba(5,150,105,0.28)",
          color: "#fff", fontSize: 13, fontWeight: 600,
          letterSpacing: "-0.01em", whiteSpace: "nowrap",
          animation: "fanfare-line 2.6s ease forwards",
        }}
      >
        <span style={{ fontSize: 14 }}>✨</span>
        {fanfare.message}
      </div>
      )}
    </div>
  );
}

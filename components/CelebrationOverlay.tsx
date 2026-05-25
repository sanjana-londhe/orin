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

function buildParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, id) => {
    const angle = Math.random() * Math.PI;          // upper half-circle
    const dist = 120 + Math.random() * 220;
    return {
      id,
      left: (Math.random() - 0.5) * 80,
      tx: Math.cos(angle) * dist * (Math.random() < 0.5 ? -1 : 1),
      ty: -(Math.sin(angle) * dist + 40),
      rot: (Math.random() - 0.5) * 540,
      delay: Math.random() * 0.12,
      dur: 0.9 + Math.random() * 0.7,
      size: 6 + Math.random() * 6,
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
      if (!reduced && e.intensity !== "calm") {
        setParticles(buildParticles(e.intensity === "celebratory" ? 44 : 26));
        timers.current.push(setTimeout(() => setParticles([]), 2000));
      } else {
        setParticles([]);
      }

      // The line lingers a touch longer than the confetti, then fades out.
      timers.current.push(setTimeout(() => setFanfare(null), 2600));
    });

    return () => { unsub(); clearTimers(); };
  }, []);

  if (!fanfare) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        pointerEvents: "none",            // never blocks the next action
        overflow: "hidden",
      }}
    >
      {/* Confetti burst — originates from just above center */}
      {particles.length > 0 && (
        <div style={{ position: "absolute", left: "50%", top: "42%", width: 0, height: 0 }}>
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

      {/* Affirming line */}
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
    </div>
  );
}

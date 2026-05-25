// ── Celebration engine ───────────────────────────────────────────────
// Imperative, fire-and-forget feedback for task completion. Designed around
// three principles:
//   1. Escalate by significance — finishing one task is a "whisper" (haptic +
//      an optional soft tick); clearing the whole day is "fanfare" (a confetti
//      burst + an affirming line).
//   2. Intensity is a setting — calm / standard / celebratory (see store/ui.ts).
//   3. Never block the next action — sound/haptics are async and the visual
//      fanfare is a pointer-events:none overlay that auto-dismisses.

import type { CelebrationIntensity } from "@/store/ui";

export type CelebrationLevel = "task" | "day";

export interface FanfareEvent {
  level: CelebrationLevel;
  intensity: CelebrationIntensity;
  message: string;
}

// ── Affirmations ──────────────────────────────────────────────────────
const DAY_MESSAGES = [
  "That's the whole day, cleared.",
  "Everything's done. Go rest.",
  "Inbox zero for today. Nicely done.",
  "All caught up — that took real effort.",
  "Day's list: empty. You earned this.",
];

function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

// ── Haptics (mobile only; silently no-ops elsewhere) ──────────────────
function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    /* some browsers throw if called without a user gesture — ignore */
  }
}

// ── Sound (Web Audio; lazily created, reused) ─────────────────────────
let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

// Soft sine "tick"/chord. `freqs` are played together; `peak` controls volume.
function tone(freqs: number[], duration: number, peak: number, stagger = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  freqs.forEach((f, i) => {
    const start = now + i * stagger;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    // quick attack, gentle exponential release — never harsh
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  });
}

// ── Subscription for the visual fanfare overlay ───────────────────────
type Listener = (e: FanfareEvent) => void;
const listeners = new Set<Listener>();

export function subscribeCelebration(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function emit(e: FanfareEvent) {
  listeners.forEach((fn) => fn(e));
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ── Public API ────────────────────────────────────────────────────────
export function celebrate(level: CelebrationLevel, intensity: CelebrationIntensity) {
  if (level === "task") {
    // Whisper. The task card's own strike-through/fade is the baseline visual;
    // here we only add a feather-light haptic + (above calm) a soft tick.
    if (intensity === "calm") return;
    vibrate(10);
    if (intensity === "standard") tone([660], 0.12, 0.05);
    else /* celebratory */        tone([880], 0.14, 0.07);
    return;
  }

  // Fanfare — the day is cleared.
  const message = pick(DAY_MESSAGES);

  if (intensity === "calm") {
    // A quiet acknowledgement: gentle double haptic + the line, no sound/confetti.
    vibrate([14, 40, 14]);
  } else if (intensity === "standard") {
    vibrate([18, 50, 18]);
    tone([523.25, 659.25, 783.99], 0.5, 0.05, 0.07); // C–E–G arpeggio
  } else {
    vibrate([20, 50, 20, 50, 30]);
    tone([523.25, 659.25, 783.99, 1046.5], 0.7, 0.07, 0.075); // C–E–G–C rising
  }

  // The overlay decides whether to throw confetti based on intensity +
  // reduced-motion; it always at least shows the line.
  emit({ level, intensity, message });
}

export { prefersReducedMotion };

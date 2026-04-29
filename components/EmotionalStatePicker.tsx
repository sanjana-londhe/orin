"use client";

import { cn } from "@/lib/utils";

export type EmotionalState =
  | "DREADING"
  | "ANXIOUS"
  | "NEUTRAL"
  | "WILLING"
  | "EXCITED";

interface StateOption {
  value: EmotionalState;
  label: string;
  emoji: string;
  // Tailwind classes for idle + selected — both use text label + icon so
  // colour is never the sole differentiator (satisfies WCAG 1.4.1)
  idle: string;
  selected: string;
}

const STATES: StateOption[] = [
  {
    value: "DREADING",
    label: "Dreading",
    emoji: "😮‍💨",
    idle: "border-[hsl(var(--emotion-dreading))] text-[hsl(var(--emotion-dreading-fg))] bg-[hsl(var(--emotion-dreading-bg))]",
    selected:
      "border-[hsl(var(--emotion-dreading))] bg-[hsl(var(--emotion-dreading))] text-white ring-2 ring-[hsl(var(--emotion-dreading))] ring-offset-2",
  },
  {
    value: "ANXIOUS",
    label: "Anxious",
    emoji: "😟",
    idle: "border-[hsl(var(--emotion-anxious))] text-[hsl(var(--emotion-anxious-fg))] bg-[hsl(var(--emotion-anxious-bg))]",
    selected:
      "border-[hsl(var(--emotion-anxious))] bg-[hsl(var(--emotion-anxious))] text-white ring-2 ring-[hsl(var(--emotion-anxious))] ring-offset-2",
  },
  {
    value: "NEUTRAL",
    label: "Neutral",
    emoji: "😐",
    idle: "border-[hsl(var(--emotion-neutral))] text-[hsl(var(--emotion-neutral-fg))] bg-[hsl(var(--emotion-neutral-bg))]",
    selected:
      "border-[hsl(var(--emotion-neutral))] bg-[hsl(var(--emotion-neutral))] text-white ring-2 ring-[hsl(var(--emotion-neutral))] ring-offset-2",
  },
  {
    value: "WILLING",
    label: "Willing",
    emoji: "🙂",
    idle: "border-[hsl(var(--emotion-willing))] text-[hsl(var(--emotion-willing-fg))] bg-[hsl(var(--emotion-willing-bg))]",
    selected:
      "border-[hsl(var(--emotion-willing))] bg-[hsl(var(--emotion-willing))] text-white ring-2 ring-[hsl(var(--emotion-willing))] ring-offset-2",
  },
  {
    value: "EXCITED",
    label: "Excited",
    emoji: "🤩",
    idle: "border-[hsl(var(--emotion-excited))] text-[hsl(var(--emotion-excited-fg))] bg-[hsl(var(--emotion-excited-bg))]",
    selected:
      "border-[hsl(var(--emotion-excited))] bg-[hsl(var(--emotion-excited))] text-white ring-2 ring-[hsl(var(--emotion-excited))] ring-offset-2",
  },
];

interface Props {
  value: EmotionalState;
  onChange: (value: EmotionalState) => void;
  /** Render as a compact row of icon-only buttons */
  compact?: boolean;
  className?: string;
}

export function EmotionalStatePicker({
  value,
  onChange,
  compact = false,
  className,
}: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Emotional state"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {STATES.map((state) => {
        const isSelected = value === state.value;
        return (
          <button
            key={state.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={state.label}
            onClick={() => onChange(state.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              compact ? "px-2" : "px-3",
              isSelected ? state.selected : state.idle,
              !isSelected && "opacity-70 hover:opacity-100"
            )}
          >
            <span aria-hidden="true">{state.emoji}</span>
            {!compact && <span>{state.label}</span>}
            {/* Screen-reader-only checkmark for selected state */}
            {isSelected && (
              <span className="sr-only">(selected)</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

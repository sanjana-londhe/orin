"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

// ── Data ─────────────────────────────────────────────────────────────

export type CheckIn = {
  id: string;
  time: string;
  mood: number;
  contributions: string[];
};

export type EnergyStore = Record<string, CheckIn[]>;

export function loadEnergyStore(): EnergyStore {
  try { return JSON.parse(localStorage.getItem("orin_energy_v2") ?? "{}"); }
  catch { return {}; }
}
export function saveEnergyStore(s: EnergyStore) {
  localStorage.setItem("orin_energy_v2", JSON.stringify(s));
}
export function todayKey() { return new Date().toISOString().slice(0, 10); }

const MOODS = [
  { value: 1, emoji: "😔", label: "Very low" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Pleasant" },
  { value: 5, emoji: "😄", label: "Great" },
];

const CONTRIBUTIONS = [
  { label: "Work",        emoji: "💼" },
  { label: "Health",      emoji: "❤️" },
  { label: "Sleep",       emoji: "😴" },
  { label: "Exercise",    emoji: "🏃" },
  { label: "Food",        emoji: "🥗" },
  { label: "Family",      emoji: "🏠" },
  { label: "Friends",     emoji: "🤝" },
  { label: "Partner",     emoji: "💑" },
  { label: "Money",       emoji: "💰" },
  { label: "News",        emoji: "📰" },
  { label: "Weather",     emoji: "🌤️" },
  { label: "Mindfulness", emoji: "🧘" },
];

// ── Tokens ───────────────────────────────────────────────────────────

const T = {
  surface:       "#ffffff",
  stone100:      "#f8f9f5",
  stone200:      "#f1f3ef",
  border:        "#dde4de",
  borderStrong:  "#c4cbc2",
  accent:        "#059669",
  accentHover:   "#047857",
  accentSubtle:  "#f2fdec",
  lime200:       "#c8f7ae",
  textPrimary:   "#082d1d",
  textSecondary: "#3d5a4a",
  textTertiary:  "#4a6d47",
  textMuted:     "#b9d3c4",
};

// ── Component ────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onSave: (entry: CheckIn) => void;
}

export function EnergyCheckInModal({ onClose, onSave }: Props) {
  const [mood, setMood]                   = useState<number | null>(null);
  const [contributions, setContributions] = useState<string[]>([]);
  const [saved, setSaved]                 = useState(false);
  const isMobile                          = useIsMobile();

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });

  function toggle(label: string) {
    setContributions(prev =>
      prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]
    );
  }

  function handleSave() {
    if (mood === null) return;
    const entry: CheckIn = {
      id: `${Date.now()}`,
      time: new Date().toISOString(),
      mood,
      contributions,
    };
    onSave(entry);
    setSaved(true);
  }

  const selectedMood = MOODS.find(m => m.value === mood);

  // ── Eyebrow style — Fragment Mono per DESIGN.md ──
  const eyebrow: React.CSSProperties = {
    fontFamily: "var(--font-mono), monospace",
    fontSize: 10, fontWeight: 600,
    color: T.textTertiary,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    margin: 0,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex",
      alignItems: isMobile ? "flex-end" : "center",
      justifyContent: "center",
      padding: isMobile ? 0 : "0 20px",
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(8,45,29,0.32)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }} />

      {/* Card */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%",
        maxWidth: isMobile ? "100%" : 460,
        background: T.surface,
        borderRadius: isMobile ? "16px 16px 0 0" : 14,
        border: `1px solid ${T.border}`,
        boxShadow: isMobile
          ? "0 -4px 24px rgba(0,0,0,0.08)"
          : "0 8px 32px rgba(0,0,0,0.10)",
        overflow: "hidden",
        paddingBottom: isMobile ? 20 : 0,
        maxHeight: isMobile ? "92vh" : "auto",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Drag handle on mobile */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: T.border }} />
          </div>
        )}

        {/* Header */}
        <div style={{
          padding: "14px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div>
            <p style={{ ...eyebrow, marginBottom: 2 }}>Mood · {todayLabel}</p>
            <h2 style={{
              fontSize: 15, fontWeight: 700, color: T.textPrimary,
              margin: 0, letterSpacing: "-0.02em",
            }}>
              {saved ? "Check-in saved" : "Quick check-in"}
            </h2>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            border: `1.5px solid ${T.border}`, background: T.stone100,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: T.textTertiary, flexShrink: 0,
          }}>
            <X size={13} />
          </button>
        </div>

        {/* Body — single scroll flow */}
        {!saved ? (
          <div style={{
            padding: "16px 18px 18px",
            overflowY: "auto",
            display: "flex", flexDirection: "column", gap: 18,
          }}>

            {/* Mood */}
            <section>
              <p style={{ ...eyebrow, marginBottom: 8 }}>How are you feeling?</p>
              <div style={{ display: "flex", gap: 6 }}>
                {MOODS.map(m => {
                  const active = mood === m.value;
                  return (
                    <button key={m.value} onClick={() => setMood(m.value)}
                      style={{
                        flex: 1,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                        padding: "10px 2px",
                        borderRadius: 10,
                        border: `1.5px solid ${active ? T.accent : T.border}`,
                        background: active ? T.accentSubtle : T.stone100,
                        cursor: "pointer", fontFamily: "inherit",
                        transition: "background 0.12s, border-color 0.12s",
                      }}>
                      <span style={{ fontSize: 22 }}>{m.emoji}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        color: active ? T.accent : T.textTertiary,
                        whiteSpace: "nowrap",
                      }}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Contributions — only when a mood is picked, to keep flow guided */}
            {mood !== null && (
              <section>
                <p style={{ ...eyebrow, marginBottom: 8 }}>What influenced this? (optional)</p>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 6,
                }}>
                  {CONTRIBUTIONS.map(c => {
                    const active = contributions.includes(c.label);
                    return (
                      <button key={c.label} onClick={() => toggle(c.label)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: `1px solid ${active ? T.accent : T.border}`,
                          background: active ? T.accentSubtle : T.surface,
                          cursor: "pointer", fontFamily: "inherit",
                          transition: "background 0.12s, border-color 0.12s",
                        }}>
                        <span style={{ fontSize: 14 }}>{c.emoji}</span>
                        <span style={{
                          fontSize: 11.5, fontWeight: active ? 600 : 500,
                          color: active ? T.accent : T.textSecondary,
                        }}>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        ) : (
          /* Saved confirmation — calm summary */
          <div style={{ padding: "18px 18px 22px" }}>
            <div style={{
              background: T.accentSubtle,
              border: `1px solid ${T.lime200}`,
              borderRadius: 10,
              padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 14,
              marginBottom: 14,
            }}>
              <span style={{ fontSize: 32, lineHeight: 1 }}>{selectedMood?.emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: 14, fontWeight: 700, color: T.textPrimary,
                  margin: "0 0 2px", letterSpacing: "-0.01em",
                }}>{selectedMood?.label}</p>
                {contributions.length > 0 && (
                  <p style={{ fontSize: 12, color: T.textSecondary, margin: 0, lineHeight: 1.5 }}>
                    {contributions.join(" · ")}
                  </p>
                )}
              </div>
            </div>
            <p style={{ fontSize: 12, color: T.textTertiary, margin: 0, textAlign: "center" }}>
              View patterns over time in <strong style={{ color: T.textPrimary }}>My Energy</strong>.
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: "12px 18px",
          display: "flex", justifyContent: "flex-end", gap: 8,
          borderTop: `1px solid ${T.border}`,
          background: T.stone100,
        }}>
          {!saved ? (
            <>
              <button onClick={onClose} style={{
                padding: "8px 16px", borderRadius: 8,
                border: `1.5px solid ${T.border}`, background: T.surface,
                color: T.textSecondary, fontSize: 13, fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit",
              }}>Cancel</button>
              <SaveButton onClick={handleSave} disabled={mood === null} contributions={contributions.length} />
            </>
          ) : (
            <button onClick={onClose} style={{
              padding: "8px 20px", borderRadius: 8,
              border: "none", background: T.accent, color: "#fff",
              fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveButton({
  onClick, disabled, contributions,
}: {
  onClick: () => void; disabled: boolean; contributions: number;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "8px 20px", borderRadius: 8, border: "none",
        background: disabled ? T.borderStrong : hov ? T.accentHover : T.accent,
        color: "#fff", fontSize: 13, fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit", transition: "background 0.12s",
      }}
    >
      {disabled ? "Pick a mood" : contributions ? `Save · ${contributions} tag${contributions === 1 ? "" : "s"}` : "Save"}
    </button>
  );
}

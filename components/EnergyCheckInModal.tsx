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
  stone100:      "#f5f5f7",
  stone200:      "#f5f5f7",
  border:        "#e0e0e0",
  borderStrong:  "#d2d2d7",
  accent:        "#0066cc",
  accentHover:   "#0071e3",
  accentSubtle:  "#f5f5f7",
  lime200:       "#e0e0e0",
  textPrimary:   "#1d1d1f",
  textSecondary: "#333333",
  textTertiary:  "#86868b",
  textMuted:     "#c7c7cc",
};

// ── Component ────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onSave: (entry: CheckIn) => void;
}

export function EnergyCheckInModal({ onClose, onSave }: Props) {
  const [mood, setMood]                   = useState<number | null>(null);
  const [contributions, setContributions] = useState<string[]>([]);
  const [otherActive, setOtherActive]     = useState(false);
  const [otherText, setOtherText]         = useState("");
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
    const allContributions = otherActive && otherText.trim()
      ? [...contributions, otherText.trim()]
      : contributions;
    const entry: CheckIn = {
      id: `${Date.now()}`,
      time: new Date().toISOString(),
      mood,
      contributions: allContributions,
    };
    onSave(entry);
    onClose();
  }

  const totalSelected = contributions.length + (otherActive && otherText.trim() ? 1 : 0);

  // ── Eyebrow style — Fragment Mono per DESIGN.md ──
  const eyebrow: React.CSSProperties = {
    fontFamily: "inherit",
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
      {/* Backdrop — matches DeferralModal / TaskCreateModal */}
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(29, 29, 31,0.25)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }} />

      {/* Card — DESIGN.md §7 modal style: accent green border + soft drop shadow */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%",
        maxWidth: isMobile ? "100%" : 460,
        background: T.surface,
        borderRadius: isMobile ? "16px 16px 0 0" : 12,
        border: `1px solid ${T.accent}`,
        boxShadow: isMobile
          ? "0 -4px 24px rgba(0, 102, 204,0.10)"
          : "0 8px 32px rgba(0, 102, 204,0.12)",
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
          padding: "16px 18px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ ...eyebrow, marginBottom: 2 }}>Mood · {todayLabel}</p>
            <h2 style={{
              fontSize: 14, fontWeight: 700, color: T.textPrimary,
              margin: 0, letterSpacing: "-0.02em",
            }}>
              Quick check-in
            </h2>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            border: `1px solid ${T.border}`, background: T.stone100,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: T.textTertiary, flexShrink: 0,
          }}>
            <X size={13} />
          </button>
        </div>

        {/* Body — single scroll flow */}
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
                        borderRadius: 8,
                        border: `1px solid ${active ? T.accent : T.border}`,
                        background: active ? T.accentSubtle : T.stone100,
                        cursor: "pointer", fontFamily: "inherit",
                        transition: "background 0.12s, border-color 0.12s",
                      }}>
                      <span style={{ fontSize: 14 }}>{m.emoji}</span>
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
                  gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
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
                        <span style={{ fontSize: 12 }}>{c.emoji}</span>
                        <span style={{
                          fontSize: 11, fontWeight: active ? 600 : 500,
                          color: active ? T.accent : T.textSecondary,
                        }}>{c.label}</span>
                      </button>
                    );
                  })}
                  <button onClick={() => {
                    if (otherActive) { setOtherActive(false); setOtherText(""); }
                    else setOtherActive(true);
                  }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: `1px solid ${otherActive ? T.accent : T.border}`,
                      background: otherActive ? T.accentSubtle : T.surface,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "background 0.12s, border-color 0.12s",
                    }}>
                    <span style={{ fontSize: 12 }}>✏️</span>
                    <span style={{
                      fontSize: 11, fontWeight: otherActive ? 600 : 500,
                      color: otherActive ? T.accent : T.textSecondary,
                    }}>Other</span>
                  </button>
                </div>
                {otherActive && (
                  <input
                    autoFocus
                    value={otherText}
                    onChange={e => setOtherText(e.target.value)}
                    placeholder="Add your own…"
                    style={{
                      marginTop: 8,
                      width: "100%", padding: "9px 12px",
                      borderRadius: 8,
                      border: `1px solid ${T.accent}`,
                      background: T.accentSubtle,
                      fontSize: 12, color: T.textPrimary,
                      fontFamily: "inherit", outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                )}
              </section>
            )}
        </div>

        {/* Footer — sits on white, no stone wash or divider */}
        <div style={{
          padding: "4px 18px 16px",
          display: "flex", justifyContent: "flex-end", gap: 8,
        }}>
          <button onClick={onClose} style={{
            padding: "8px 16px", borderRadius: 8,
            border: `1px solid ${T.border}`, background: T.surface,
            color: T.textSecondary, fontSize: 12, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <SaveButton onClick={handleSave} disabled={mood === null} contributions={totalSelected} />
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
        color: "#fff", fontSize: 12, fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit", transition: "background 0.12s",
      }}
    >
      {disabled ? "Pick a mood" : contributions ? `Save · ${contributions} tag${contributions === 1 ? "" : "s"}` : "Save"}
    </button>
  );
}

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
  { value: 1, emoji: "😔", label: "Very unpleasant" },
  { value: 2, emoji: "😕", label: "Unpleasant" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Pleasant" },
  { value: 5, emoji: "😄", label: "Very pleasant" },
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

// ── Component ────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onSave: (entry: CheckIn) => void;
}

export function EnergyCheckInModal({ onClose, onSave }: Props) {
  const [step, setStep]                   = useState<1 | 2 | 3>(1);
  const [mood, setMood]                   = useState<number | null>(null);
  const [contributions, setContributions] = useState<string[]>([]);
  const isMobile                          = useIsMobile();

  function toggle(label: string) {
    setContributions(prev =>
      prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]
    );
  }

  function handleSave() {
    const entry: CheckIn = {
      id: `${Date.now()}`,
      time: new Date().toISOString(),
      mood: mood ?? 3,
      contributions,
    };
    onSave(entry);
    setStep(3);
  }

  const selectedMood = MOODS.find(m => m.value === mood);

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
        background: "rgba(8,45,29,0.35)",
        backdropFilter: "blur(4px)",
      }} />

      {/* Card */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%",
        maxWidth: isMobile ? "100%" : 520,
        background: "#ffffff",
        borderRadius: isMobile ? "20px 20px 0 0" : 16,
        border: "1.5px solid #059669",
        boxShadow: isMobile
          ? "0 -4px 32px rgba(0,0,0,0.12)"
          : "0 8px 32px rgba(0,0,0,0.12)",
        overflow: "hidden",
        paddingBottom: isMobile ? 24 : 0,
      }}>

        {/* Drag handle on mobile */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: "#dde4de" }} />
          </div>
        )}

        {/* Top bar */}
        <div style={{
          padding: isMobile ? "12px 20px 0" : "16px 20px 0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {step < 3 ? (
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {[1, 2].map(s => (
                <div key={s} style={{
                  height: 4, borderRadius: 999,
                  width: step === s ? 20 : 8,
                  background: step >= s ? "#59d10b" : "#e9ede9",
                  transition: "all 0.2s ease",
                }} />
              ))}
            </div>
          ) : <div />}

          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: "1.5px solid #dde4de",
              background: "#f8f9f5",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#4a6d47",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Step 1: How do you feel? ── */}
        {step === 1 && (
          <div style={{ padding: isMobile ? "14px 20px 20px" : "16px 20px 24px" }}>
            <p style={{
              fontFamily: "monospace",
              fontSize: 10, fontWeight: 700, color: "#059669",
              textTransform: "uppercase", letterSpacing: "0.08em",
              margin: "0 0 6px",
            }}>
              Mood · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>

            <h2 style={{
              fontSize: isMobile ? 20 : 24, fontWeight: 700, color: "#082d1d",
              margin: "0 0 4px", letterSpacing: "-0.03em", lineHeight: 1.2,
            }}>
              How are you feeling right now?
            </h2>
            <p style={{ fontSize: 13, color: "#3d5a4a", margin: "0 0 18px", lineHeight: 1.5 }}>
              Be honest — Orin uses this to spot patterns over time.
            </p>

            {/* Mood picker */}
            <div style={{ display: "flex", gap: isMobile ? 6 : 8, marginBottom: 18 }}>
              {MOODS.map(m => {
                const active = mood === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => setMood(m.value)}
                    style={{
                      flex: 1,
                      display: "flex", flexDirection: "column", alignItems: "center",
                      gap: isMobile ? 5 : 6,
                      padding: isMobile ? "12px 2px" : "14px 4px",
                      borderRadius: 12,
                      border: active ? "1.5px solid #059669" : "1.5px solid #dde4de",
                      background: active ? "#f2fdec" : "#f8f9f5",
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span style={{ fontSize: isMobile ? 22 : 26 }}>{m.emoji}</span>
                    <span style={{
                      fontSize: 9.5, fontWeight: 600, textAlign: "center", lineHeight: 1.25,
                      color: active ? "#059669" : "#4a6d47",
                      whiteSpace: "nowrap",
                    }}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <PrimaryButton
              onClick={() => setStep(2)}
              disabled={mood === null}
              label="Next →"
              isMobile={isMobile}
            />
          </div>
        )}

        {/* ── Step 2: What contributed? ── */}
        {step === 2 && (
          <div style={{ padding: isMobile ? "14px 20px 20px" : "16px 20px 24px" }}>
            <p style={{
              fontFamily: "monospace",
              fontSize: 10, fontWeight: 700, color: "#059669",
              textTransform: "uppercase", letterSpacing: "0.08em",
              margin: "0 0 6px",
            }}>
              Context
            </p>

            <h2 style={{
              fontSize: isMobile ? 20 : 24, fontWeight: 700, color: "#082d1d",
              margin: "0 0 4px", letterSpacing: "-0.03em", lineHeight: 1.2,
            }}>
              What had an influence?
            </h2>
            <p style={{ fontSize: 13, color: "#3d5a4a", margin: "0 0 14px", lineHeight: 1.5 }}>
              Select all that apply — or skip straight to save.
            </p>

            {/* Contribution chips */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: isMobile ? 6 : 8,
              marginBottom: 18,
            }}>
              {CONTRIBUTIONS.map(c => {
                const active = contributions.includes(c.label);
                return (
                  <button
                    key={c.label}
                    onClick={() => toggle(c.label)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 4,
                      padding: isMobile ? "10px 4px" : "10px 6px",
                      borderRadius: 8,
                      border: active ? "1.5px solid #059669" : "1.5px solid #dde4de",
                      background: active ? "#f2fdec" : "#f8f9f5",
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.12s ease",
                    }}
                  >
                    <span style={{ fontSize: isMobile ? 18 : 20 }}>{c.emoji}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: active ? "#059669" : "#3d5a4a",
                    }}>
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <PrimaryButton
              onClick={handleSave}
              label={contributions.length === 0 ? "Save check-in" : `Save  ·  ${contributions.length} selected`}
              isMobile={isMobile}
            />
          </div>
        )}

        {/* ── Step 3: Confirmation ── */}
        {step === 3 && (
          <div style={{ padding: isMobile ? "16px 20px 20px" : "24px 20px 28px" }}>
            <div style={{
              background: "#f2fdec",
              border: "1.5px solid #c8f7ae",
              borderRadius: 12,
              padding: isMobile ? "14px 16px" : "20px 16px",
              display: "flex", alignItems: "center", gap: 16,
              marginBottom: 18,
            }}>
              <span style={{ fontSize: isMobile ? 32 : 40, lineHeight: 1 }}>{selectedMood?.emoji}</span>
              <div>
                <p style={{
                  fontSize: 15, fontWeight: 700, color: "#082d1d",
                  margin: "0 0 2px", letterSpacing: "-0.02em",
                }}>
                  {selectedMood?.label}
                </p>
                {contributions.length > 0 && (
                  <p style={{ fontSize: 12, color: "#3d5a4a", margin: 0, lineHeight: 1.5 }}>
                    Influenced by: {contributions.join(", ")}
                  </p>
                )}
              </div>
            </div>

            <p style={{
              fontFamily: "monospace",
              fontSize: 10, fontWeight: 700, color: "#059669",
              textTransform: "uppercase", letterSpacing: "0.08em",
              margin: "0 0 4px", textAlign: "center",
            }}>
              Logged
            </p>
            <h2 style={{
              fontSize: isMobile ? 18 : 20, fontWeight: 700, color: "#082d1d",
              margin: "0 0 4px", letterSpacing: "-0.03em", textAlign: "center",
            }}>
              Check-in saved
            </h2>
            <p style={{
              fontSize: 12, color: "#c4cbc2",
              margin: "0 0 18px", textAlign: "center",
            }}>
              View your patterns in My Energy
            </p>

            <PrimaryButton onClick={onClose} label="Done" isMobile={isMobile} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared primary button ─────────────────────────────────────────────

function PrimaryButton({
  onClick, disabled, label, isMobile,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  isMobile?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        padding: isMobile ? "14px 0" : "12px 0",
        borderRadius: 8,
        border: "none",
        background: disabled ? "#e9ede9" : hovered ? "#047857" : "#059669",
        color: disabled ? "#c4cbc2" : "#fff",
        fontSize: isMobile ? 15 : 13.5,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit",
        transition: "background 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

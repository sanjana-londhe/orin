"use client";

import { useState } from "react";
import { X } from "lucide-react";

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
  { label: "Work",         emoji: "💼" },
  { label: "Health",       emoji: "❤️" },
  { label: "Sleep",        emoji: "😴" },
  { label: "Exercise",     emoji: "🏃" },
  { label: "Food",         emoji: "🥗" },
  { label: "Family",       emoji: "🏠" },
  { label: "Friends",      emoji: "🤝" },
  { label: "Partner",      emoji: "💑" },
  { label: "Money",        emoji: "💰" },
  { label: "News",         emoji: "📰" },
  { label: "Weather",      emoji: "🌤️" },
  { label: "Mindfulness",  emoji: "🧘" },
];

// ── Component ────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onSave: (entry: CheckIn) => void;
}

export function EnergyCheckInModal({ onClose, onSave }: Props) {
  const [step, setStep]                     = useState<1 | 2 | 3>(1);
  const [mood, setMood]                     = useState<number | null>(null);
  const [contributions, setContributions]   = useState<string[]>([]);

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
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 16px",
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(8,45,29,0.45)", backdropFilter: "blur(6px)",
      }} />

      {/* Card */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 400,
        background: "#fff", borderRadius: 28,
        boxShadow: "0 32px 80px rgba(0,0,0,0.2)",
        overflow: "hidden",
      }}>

        {/* Top bar */}
        <div style={{
          padding: "18px 20px 0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {/* Step dots */}
          {step < 3 && (
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {[1, 2].map(s => (
                <div key={s} style={{
                  height: 4, borderRadius: 999,
                  width: step === s ? 24 : 8,
                  background: step >= s ? "#059669" : "#e9ede9",
                  transition: "all 0.25s ease",
                }} />
              ))}
            </div>
          )}
          {step === 3 && <div />}
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "1px solid #e9ede9", background: "#f8f9f5",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#4a6d47",
          }}>
            <X size={13} />
          </button>
        </div>

        {/* ── Step 1: How do you feel? ── */}
        {step === 1 && (
          <div style={{ padding: "20px 24px 28px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
              Mood · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#082d1d", margin: "0 0 6px", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
              How are you feeling right now?
            </h2>
            <p style={{ fontSize: 13, color: "#4a6d47", margin: "0 0 28px", lineHeight: 1.5 }}>
              Be honest — Orin uses this to spot patterns over time.
            </p>

            {/* Emoji scale */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
              {MOODS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    padding: "14px 4px", borderRadius: 16,
                    border: `2.5px solid ${mood === m.value ? "#059669" : "#f1f3ef"}`,
                    background: mood === m.value ? "#f2fdec" : "#f8f9f5",
                    cursor: "pointer", fontFamily: "inherit",
                    transform: mood === m.value ? "scale(1.06)" : "scale(1)",
                    transition: "all 0.15s ease",
                    boxShadow: mood === m.value ? "0 4px 12px rgba(5,150,105,0.15)" : "none",
                  }}
                >
                  <span style={{ fontSize: 28 }}>{m.emoji}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, textAlign: "center", lineHeight: 1.2,
                    color: mood === m.value ? "#059669" : "#4a6d47",
                  }}>{m.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={mood === null}
              style={{
                width: "100%", marginTop: 8, padding: "14px 0", borderRadius: 14, border: "none",
                background: mood !== null ? "#059669" : "#e9ede9",
                color: mood !== null ? "#fff" : "#c4cbc2",
                fontSize: 15, fontWeight: 700,
                cursor: mood !== null ? "pointer" : "default",
                fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              Next
            </button>
          </div>
        )}

        {/* ── Step 2: What contributed? ── */}
        {step === 2 && (
          <div style={{ padding: "20px 24px 28px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
              Context
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#082d1d", margin: "0 0 6px", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
              What had an influence on how you feel?
            </h2>
            <p style={{ fontSize: 13, color: "#4a6d47", margin: "0 0 20px", lineHeight: 1.5 }}>
              Select all that apply.
            </p>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20,
            }}>
              {CONTRIBUTIONS.map(c => {
                const on = contributions.includes(c.label);
                return (
                  <button
                    key={c.label}
                    onClick={() => toggle(c.label)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      padding: "12px 8px", borderRadius: 14,
                      border: `2px solid ${on ? "#059669" : "#f1f3ef"}`,
                      background: on ? "#f2fdec" : "#f8f9f5",
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.12s",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{c.emoji}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: on ? "#059669" : "#3d5a4a",
                    }}>{c.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleSave}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
                background: "#059669", color: "#fff",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {contributions.length === 0 ? "Save without selecting" : `Save (${contributions.length} selected)`}
            </button>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div style={{ padding: "28px 24px 32px", textAlign: "center" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "linear-gradient(135deg, #f2fdec, #e8f5f0)",
              border: "2.5px solid #c8f7ae",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, margin: "0 auto 20px",
            }}>
              {selectedMood?.emoji}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#082d1d", margin: "0 0 8px", letterSpacing: "-0.03em" }}>
              Logged — {selectedMood?.label}
            </h2>
            {contributions.length > 0 && (
              <p style={{ fontSize: 13, color: "#4a6d47", margin: "0 0 6px", lineHeight: 1.5 }}>
                Influenced by: {contributions.join(", ")}
              </p>
            )}
            <p style={{ fontSize: 12, color: "#c4cbc2", margin: "0 0 24px" }}>
              View your patterns in My Energy
            </p>
            <button onClick={onClose} style={{
              width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
              background: "#082d1d", color: "#fff",
              fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

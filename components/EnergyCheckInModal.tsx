"use client";

import { useState } from "react";
import { X } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

export type CheckIn = {
  id: string;
  time: string;
  energy: number;
  mood: number;
  feelings: string[];
  influences: string[];
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

// ── Question data ────────────────────────────────────────────────────

const ENERGY_LEVELS = [
  { value: 1, emoji: "🪫", label: "Drained",    desc: "Completely exhausted" },
  { value: 2, emoji: "😮‍💨", label: "Low",        desc: "Running on empty" },
  { value: 3, emoji: "😐",  label: "Okay",       desc: "Getting by" },
  { value: 4, emoji: "⚡",  label: "Good",       desc: "Feeling capable" },
  { value: 5, emoji: "🔥",  label: "Peak",       desc: "In full flow" },
];

const MOOD_LEVELS = [
  { value: 1, emoji: "😔", label: "Very low" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
];

const FEELINGS = [
  "Focused", "Anxious", "Motivated", "Tired",
  "Creative", "Stressed", "Calm", "Overwhelmed",
  "Confident", "Distracted", "Grateful", "Restless",
];

const INFLUENCES = [
  "Work", "Sleep", "Exercise", "Food",
  "Social", "Weather", "Health", "Family",
  "Finance", "News", "Mindfulness", "Music",
];

// ── Steps ────────────────────────────────────────────────────────────

const STEPS = ["energy", "mood", "feelings", "influences", "done"] as const;
type Step = typeof STEPS[number];

interface Props {
  onClose: () => void;
  onSave: (entry: CheckIn) => void;
}

export function EnergyCheckInModal({ onClose, onSave }: Props) {
  const [step, setStep]             = useState<Step>("energy");
  const [energy, setEnergy]         = useState<number | null>(null);
  const [mood, setMood]             = useState<number | null>(null);
  const [feelings, setFeelings]     = useState<string[]>([]);
  const [influences, setInfluences] = useState<string[]>([]);

  const stepIndex = STEPS.indexOf(step);
  const total     = STEPS.length - 1; // exclude "done"

  function toggleArr(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }

  function next() { setStep(STEPS[stepIndex + 1]); }

  function handleSave() {
    const entry: CheckIn = {
      id:         `${Date.now()}`,
      time:       new Date().toISOString(),
      energy:     energy ?? 3,
      mood:       mood ?? 3,
      feelings,
      influences,
    };
    onSave(entry);
    next();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(8,45,29,0.4)", backdropFilter: "blur(4px)",
      }} />

      {/* Modal */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 420,
        background: "#fff", borderRadius: 24,
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {step !== "done" ? (
            <>
              <div style={{ display: "flex", gap: 5 }}>
                {STEPS.slice(0, -1).map((s, i) => (
                  <div key={s} style={{
                    height: 3, borderRadius: 999,
                    width: i <= stepIndex ? 20 : 8,
                    background: i <= stepIndex ? "#059669" : "#e9ede9",
                    transition: "all 0.3s ease",
                  }} />
                ))}
              </div>
              <button onClick={onClose} style={{
                width: 28, height: 28, borderRadius: "50%", border: "1px solid #e9ede9",
                background: "#f8f9f5", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#4a6d47",
              }}>
                <X size={13} />
              </button>
            </>
          ) : (
            <div style={{ flex: 1 }} />
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "24px 28px 28px" }}>

          {/* Step 1: Energy */}
          {step === "energy" && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Energy</p>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#082d1d", margin: "0 0 6px", letterSpacing: "-0.03em" }}>
                How&apos;s your energy right now?
              </h2>
              <p style={{ fontSize: 13, color: "#4a6d47", margin: "0 0 28px" }}>
                Be honest — this helps Orin understand your patterns.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ENERGY_LEVELS.map(l => (
                  <button key={l.value} onClick={() => setEnergy(l.value)} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px", borderRadius: 14,
                    border: `2px solid ${energy === l.value ? "#059669" : "#e9ede9"}`,
                    background: energy === l.value ? "#f2fdec" : "#fff",
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    transition: "all 0.15s",
                  }}>
                    <span style={{ fontSize: 26 }}>{l.emoji}</span>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#082d1d", margin: 0 }}>{l.label}</p>
                      <p style={{ fontSize: 12, color: "#4a6d47", margin: 0 }}>{l.desc}</p>
                    </div>
                    {energy === l.value && (
                      <div style={{ marginLeft: "auto", width: 20, height: 20, borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="2 6 5 9 10 3"/></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <button onClick={next} disabled={energy === null} style={{
                width: "100%", marginTop: 20, padding: "13px 0", borderRadius: 12, border: "none",
                background: energy !== null ? "#059669" : "#e9ede9",
                color: energy !== null ? "#fff" : "#c4cbc2",
                fontSize: 14, fontWeight: 700, cursor: energy !== null ? "pointer" : "default",
                fontFamily: "inherit", transition: "all 0.15s",
              }}>Continue</button>
            </div>
          )}

          {/* Step 2: Mood */}
          {step === "mood" && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Mood</p>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#082d1d", margin: "0 0 6px", letterSpacing: "-0.03em" }}>
                How are you feeling?
              </h2>
              <p style={{ fontSize: 13, color: "#4a6d47", margin: "0 0 28px" }}>
                Your emotional state, separate from your energy level.
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                {MOOD_LEVELS.map(l => (
                  <button key={l.value} onClick={() => setMood(l.value)} style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    padding: "16px 8px", borderRadius: 14,
                    border: `2px solid ${mood === l.value ? "#059669" : "#e9ede9"}`,
                    background: mood === l.value ? "#f2fdec" : "#fff",
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  }}>
                    <span style={{ fontSize: 32 }}>{l.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: mood === l.value ? "#059669" : "#4a6d47" }}>{l.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={next} disabled={mood === null} style={{
                width: "100%", marginTop: 20, padding: "13px 0", borderRadius: 12, border: "none",
                background: mood !== null ? "#059669" : "#e9ede9",
                color: mood !== null ? "#fff" : "#c4cbc2",
                fontSize: 14, fontWeight: 700, cursor: mood !== null ? "pointer" : "default",
                fontFamily: "inherit", transition: "all 0.15s",
              }}>Continue</button>
            </div>
          )}

          {/* Step 3: Feelings */}
          {step === "feelings" && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Feelings</p>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#082d1d", margin: "0 0 6px", letterSpacing: "-0.03em" }}>
                What describes you right now?
              </h2>
              <p style={{ fontSize: 13, color: "#4a6d47", margin: "0 0 20px" }}>
                Pick all that apply.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {FEELINGS.map(f => {
                  const on = feelings.includes(f);
                  return (
                    <button key={f} onClick={() => toggleArr(feelings, setFeelings, f)} style={{
                      padding: "8px 16px", borderRadius: 999,
                      border: `2px solid ${on ? "#059669" : "#e9ede9"}`,
                      background: on ? "#f2fdec" : "#fff",
                      color: on ? "#059669" : "#3d5a4a",
                      fontSize: 13, fontWeight: on ? 700 : 450,
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                    }}>{f}</button>
                  );
                })}
              </div>
              <button onClick={next} style={{
                width: "100%", marginTop: 20, padding: "13px 0", borderRadius: 12, border: "none",
                background: "#059669", color: "#fff",
                fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>{feelings.length === 0 ? "Skip" : "Continue"}</button>
            </div>
          )}

          {/* Step 4: Influences */}
          {step === "influences" && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Context</p>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#082d1d", margin: "0 0 6px", letterSpacing: "-0.03em" }}>
                What&apos;s affecting you today?
              </h2>
              <p style={{ fontSize: 13, color: "#4a6d47", margin: "0 0 20px" }}>
                Helps Orin find patterns over time.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {INFLUENCES.map(inf => {
                  const on = influences.includes(inf);
                  return (
                    <button key={inf} onClick={() => toggleArr(influences, setInfluences, inf)} style={{
                      padding: "8px 16px", borderRadius: 999,
                      border: `2px solid ${on ? "#059669" : "#e9ede9"}`,
                      background: on ? "#f2fdec" : "#fff",
                      color: on ? "#059669" : "#3d5a4a",
                      fontSize: 13, fontWeight: on ? 700 : 450,
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                    }}>{inf}</button>
                  );
                })}
              </div>
              <button onClick={handleSave} style={{
                width: "100%", marginTop: 20, padding: "13px 0", borderRadius: 12, border: "none",
                background: "#059669", color: "#fff",
                fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>{influences.length === 0 ? "Save & finish" : "Save & finish"}</button>
            </div>
          )}

          {/* Step 5: Done */}
          {step === "done" && (
            <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "linear-gradient(135deg, #f2fdec, #e8f5f0)",
                border: "2px solid #c8f7ae",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32, margin: "0 auto 16px",
              }}>✓</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#082d1d", margin: "0 0 8px", letterSpacing: "-0.03em" }}>
                Logged!
              </h2>
              <p style={{ fontSize: 13.5, color: "#4a6d47", margin: "0 0 8px", lineHeight: 1.6 }}>
                Energy: <strong>{ENERGY_LEVELS.find(l => l.value === energy)?.emoji} {ENERGY_LEVELS.find(l => l.value === energy)?.label}</strong>
                &nbsp;·&nbsp;
                Mood: <strong>{MOOD_LEVELS.find(l => l.value === mood)?.emoji} {MOOD_LEVELS.find(l => l.value === mood)?.label}</strong>
              </p>
              {feelings.length > 0 && (
                <p style={{ fontSize: 12.5, color: "#4a6d47", margin: "0 0 20px" }}>
                  Feeling: {feelings.join(", ")}
                </p>
              )}
              <p style={{ fontSize: 12, color: "#c4cbc2", margin: "0 0 24px" }}>
                Check your trends in My Energy →
              </p>
              <button onClick={onClose} style={{
                width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                background: "#082d1d", color: "#fff",
                fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

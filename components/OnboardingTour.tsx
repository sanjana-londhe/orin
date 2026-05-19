"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ListChecks, Heart, CalendarClock, Sparkles, ArrowRight, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  open: boolean;
  name: string;
  onClose: () => void;
}

interface Slide {
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
}

function FeelingChips() {
  const chips = [
    { label: "Dreading",  bg: "#fce7e3", fg: "#9c3520" },
    { label: "Anxious",   bg: "#fdecd2", fg: "#8a5b1d" },
    { label: "Neutral",   bg: "#eef0eb", fg: "#4a6d47" },
    { label: "Willing",   bg: "#e2efdc", fg: "#3e6b2e" },
    { label: "Excited",   bg: "#d6f0c9", fg: "#1f5d12" },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
      {chips.map(c => (
        <span key={c.label}
          style={{
            padding: "7px 14px", borderRadius: 999,
            fontSize: 12, fontWeight: 600,
            background: c.bg, color: c.fg,
            fontFamily: "var(--font-mono, ui-monospace), monospace",
            letterSpacing: "-0.01em",
          }}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

function DeferIllustration() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 10,
      width: "100%", maxWidth: 320, margin: "0 auto",
    }}>
      {[
        { title: "Email the landlord", note: "moved → tomorrow", reason: "Need to look up the lease first" },
        { title: "Finish lab report",  note: "moved → Friday",   reason: "Energy too low today" },
      ].map(item => (
        <div key={item.title}
          style={{
            background: "#fff", borderRadius: 10,
            border: "1px solid #e9ede9",
            padding: "10px 12px",
            textAlign: "left",
            boxShadow: "0 1px 2px rgba(8,45,29,0.04)",
          }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#082d1d" }}>{item.title}</span>
            <span style={{ fontSize: 10, color: "#4a6d47", fontWeight: 500 }}>{item.note}</span>
          </div>
          <p style={{ fontSize: 11, color: "#4a6d47", margin: 0, fontStyle: "italic" }}>
            “{item.reason}”
          </p>
        </div>
      ))}
    </div>
  );
}

function ViewsGrid() {
  const views = [
    { label: "Today",       desc: "What's on your plate now" },
    { label: "My Energy",   desc: "Log mood, see patterns"   },
    { label: "Calendar",    desc: "The week at a glance"     },
    { label: "All Tasks",   desc: "Everything in one place"  },
  ];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
      width: "100%", maxWidth: 360, margin: "0 auto",
    }}>
      {views.map(v => (
        <div key={v.label}
          style={{
            background: "#fff", borderRadius: 10,
            border: "1px solid #e9ede9",
            padding: "10px 12px", textAlign: "left",
          }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#082d1d", margin: "0 0 2px" }}>{v.label}</p>
          <p style={{ fontSize: 10, color: "#4a6d47", margin: 0, lineHeight: 1.4 }}>{v.desc}</p>
        </div>
      ))}
    </div>
  );
}

function WelcomeLogo() {
  return (
    <div style={{
      width: 72, height: 72, borderRadius: 18,
      background: "#02382a", margin: "0 auto",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 8px 24px rgba(2,56,42,0.25)",
    }}>
      <svg width="44" height="44" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="41" r="18" fill="#059669"/>
        <circle cx="50" cy="59" r="18" fill="#59d10b"/>
      </svg>
    </div>
  );
}

export function OnboardingTour({ open, name, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (open) setStep(0); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
      if (e.key === "ArrowRight") setStep(s => Math.min(s + 1, slides.length - 1));
      if (e.key === "ArrowLeft")  setStep(s => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const slides: Slide[] = [
    {
      eyebrow: "Welcome",
      title: `Hi ${name} — meet Orin.`,
      body: "A todo app that takes the emotional weight of tasks seriously. Built for the moments where starting is harder than doing.",
      visual: <WelcomeLogo />,
    },
    {
      eyebrow: "Tag how it feels",
      title: "Every task carries a feeling.",
      body: "A 10-minute task you dread feels heavier than a 3-hour task you love. Tag each task so Orin (and you) can see what's actually weighing on you.",
      visual: <FeelingChips />,
    },
    {
      eyebrow: "Defer with intention",
      title: "Nothing moves silently.",
      body: "When you can't get to something, you defer it on purpose — and Orin remembers why. No guilt spirals, no rollovers you didn't choose.",
      visual: <DeferIllustration />,
    },
    {
      eyebrow: "Four ways to look at it",
      title: "Pick the view that fits your headspace.",
      body: "Today for focus, Energy for patterns, Calendar for the week, All Tasks for the full picture. Switch anytime from the sidebar.",
      visual: <ViewsGrid />,
    },
  ];

  async function markComplete() {
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { onboarding_completed_at: new Date().toISOString() },
      });
    } catch { /* non-blocking */ }
  }

  function handleSkip() {
    markComplete();
    onClose();
  }

  function handleNext() {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      markComplete();
      onClose();
    }
  }

  if (!open || !mounted) return null;

  const slide = slides[step];
  const isLast = step === slides.length - 1;
  const stepIcon = [
    <Sparkles key="s" size={14} color="#59d10b" />,
    <Heart key="h" size={14} color="#D14626" />,
    <CalendarClock key="c" size={14} color="#059669" />,
    <ListChecks key="l" size={14} color="#059669" />,
  ][step];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Orin"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(8,45,29,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        animation: "orin-fade-in 0.18s ease-out",
      }}
    >
      <style>{`
        @keyframes orin-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes orin-slide-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div style={{
        position: "relative",
        width: "100%", maxWidth: 520,
        background: "#fcfdfc",
        borderRadius: 20,
        border: "1px solid #dde4de",
        boxShadow: "0 24px 60px rgba(2,56,42,0.25)",
        overflow: "hidden",
      }}>
        {/* Skip / close */}
        <button
          onClick={handleSkip}
          aria-label="Skip intro"
          style={{
            position: "absolute", top: 14, right: 14, zIndex: 2,
            width: 32, height: 32, borderRadius: 8,
            background: "rgba(255,255,255,0.7)",
            border: "1px solid #e9ede9",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#4a6d47",
          }}
        >
          <X size={15} />
        </button>

        {/* Body */}
        <div
          key={step}
          style={{
            padding: "44px 32px 28px",
            textAlign: "center",
            animation: "orin-slide-up 0.22s ease-out",
          }}>
          {/* Eyebrow */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 999,
            background: "#f1f3ef", border: "1px solid #e9ede9",
            fontSize: 10, fontWeight: 700, color: "#3d5a4a",
            textTransform: "uppercase", letterSpacing: "0.12em",
            fontFamily: "var(--font-mono, ui-monospace), monospace",
            marginBottom: 22,
          }}>
            {stepIcon}
            {slide.eyebrow}
          </div>

          {/* Visual */}
          <div style={{ marginBottom: 22, minHeight: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {slide.visual}
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: 26, fontWeight: 700,
            lineHeight: 1.15, letterSpacing: "-0.03em",
            color: "#082d1d",
            margin: "0 0 12px",
          }}>
            {slide.title}
          </h2>

          {/* Body */}
          <p style={{
            fontSize: 14, lineHeight: 1.6,
            color: "#4a6d47",
            maxWidth: 380, margin: "0 auto 28px",
          }}>
            {slide.body}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px 22px",
          borderTop: "1px solid #e9ede9",
          background: "#f8f9f5",
        }}>
          {/* Dots */}
          <div style={{ display: "flex", gap: 6 }}>
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                style={{
                  width: i === step ? 22 : 7, height: 7, borderRadius: 999,
                  background: i === step ? "#059669" : "#c4cbc2",
                  border: "none", padding: 0, cursor: "pointer",
                  transition: "width 0.2s, background 0.2s",
                }}
              />
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!isLast && (
              <button
                onClick={handleSkip}
                style={{
                  background: "none", border: "none",
                  fontSize: 12, color: "#4a6d47",
                  cursor: "pointer", padding: "8px 6px",
                  fontFamily: "inherit",
                }}>
                Skip
              </button>
            )}
            <button
              onClick={handleNext}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 18px", borderRadius: 10,
                background: "#059669", color: "#fff",
                border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700,
                fontFamily: "inherit",
                boxShadow: "0 4px 12px rgba(5,150,105,0.25)",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#047857"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#059669"}
            >
              {isLast ? "Let's go" : "Next"}
              <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

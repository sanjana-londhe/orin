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
    { label: "Dreading", token: "dreading" },
    { label: "Anxious",  token: "anxious"  },
    { label: "Neutral",  token: "neutral"  },
    { label: "Willing",  token: "willing"  },
    { label: "Excited",  token: "excited"  },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {chips.map(c => (
        <span
          key={c.label}
          className="font-mono text-[11px] font-semibold tracking-[-0.01em] px-3 py-[6px] rounded-full border"
          style={{
            background: `hsl(var(--emotion-${c.token}-bg))`,
            color:      `hsl(var(--emotion-${c.token}-fg))`,
            borderColor:`hsl(var(--emotion-${c.token}-border))`,
          }}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

function DeferIllustration() {
  const items = [
    { title: "Email the landlord", note: "moved → tomorrow", reason: "Need to look up the lease first" },
    { title: "Finish lab report",  note: "moved → Friday",   reason: "Energy too low today" },
  ];
  return (
    <div className="flex flex-col gap-2.5 w-full max-w-[320px] mx-auto">
      {items.map(item => (
        <div
          key={item.title}
          className="bg-white rounded-[10px] border border-[var(--stone-300)] px-3 py-2.5 text-left"
          style={{ boxShadow: "0 1px 2px rgba(29, 29, 31,0.04)" }}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--lime-ink)]">{item.title}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#86868b]">{item.note}</span>
          </div>
          <p className="text-[11px] text-[#86868b] italic m-0 leading-relaxed">
            “{item.reason}”
          </p>
        </div>
      ))}
    </div>
  );
}

function ViewsGrid() {
  const views = [
    { label: "Today",     desc: "What's on your plate now" },
    { label: "My Energy", desc: "Log mood, see patterns"   },
    { label: "Calendar",  desc: "The week at a glance"     },
    { label: "All Tasks", desc: "Everything in one place"  },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5 w-full max-w-[360px] mx-auto">
      {views.map(v => (
        <div
          key={v.label}
          className="bg-white rounded-[10px] border border-[var(--stone-300)] px-3 py-2.5 text-left"
        >
          <p className="text-[12px] font-bold tracking-[-0.02em] text-[var(--lime-ink)] m-0">{v.label}</p>
          <p className="text-[10px] text-[#86868b] m-0 mt-0.5 leading-relaxed">{v.desc}</p>
        </div>
      ))}
    </div>
  );
}

function WelcomeLogo() {
  return (
    <div
      className="w-[72px] h-[72px] rounded-[18px] mx-auto flex items-center justify-center"
      style={{ background: "var(--lime-dark)", boxShadow: "0 8px 24px rgba(29, 29, 31,0.22)" }}
    >
      <svg width="44" height="44" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="41" r="18" fill="hsl(var(--primary))"/>
        <circle cx="50" cy="59" r="18" fill="var(--lime)"/>
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
    try { localStorage.setItem("orin:onboarding_v2_done", "1"); } catch { /* ignore */ }
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { onboarding_v2_completed_at: new Date().toISOString() },
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
    <Sparkles      key="s" size={12} className="text-[var(--lime)]"       />,
    <Heart         key="h" size={12} className="text-[#d70015]"            />,
    <CalendarClock key="c" size={12} className="text-[hsl(var(--primary))]" />,
    <ListChecks    key="l" size={12} className="text-[hsl(var(--primary))]" />,
  ][step];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Orin"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{
        background: "rgba(29, 29, 31,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        animation: "orin-fade-in 0.18s ease-out",
      }}
    >
      <style>{`
        @keyframes orin-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes orin-slide-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div
        className="relative w-full max-w-[520px] overflow-hidden rounded-[20px] border border-[var(--stone-400)]"
        style={{
          background: "#ffffff",
          boxShadow: "0 24px 60px rgba(29, 29, 31,0.25)",
        }}
      >
        {/* Skip / close */}
        <button
          onClick={handleSkip}
          aria-label="Skip intro"
          className="absolute top-3.5 right-3.5 z-[2] w-8 h-8 rounded-[8px] flex items-center justify-center cursor-pointer text-[#86868b] hover:bg-[var(--stone-200)] transition-colors"
          style={{ background: "rgba(255,255,255,0.7)", border: "1px solid var(--stone-300)" }}
        >
          <X size={15} />
        </button>

        {/* Body */}
        <div
          key={step}
          className="px-8 pt-11 pb-7 text-center"
          style={{ animation: "orin-slide-up 0.22s ease-out" }}
        >
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-6 rounded-full border border-[var(--stone-300)] bg-[var(--stone-200)] font-mono text-[10px] font-bold text-[#333333] uppercase tracking-[0.12em]"
          >
            {stepIcon}
            {slide.eyebrow}
          </div>

          {/* Visual */}
          <div className="mb-6 min-h-[96px] flex items-center justify-center">
            {slide.visual}
          </div>

          {/* Title */}
          <h2 className="text-[28px] sm:text-[32px] font-bold leading-[1.15] tracking-[-0.04em] text-[var(--lime-ink)] mb-3">
            {slide.title}
          </h2>

          {/* Body */}
          <p className="text-[15px] leading-relaxed text-[#86868b] max-w-[400px] mx-auto mb-0">
            {slide.body}
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 border-t border-[var(--stone-300)]"
          style={{ background: "var(--stone-100)" }}
        >
          {/* Dots */}
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className="h-[7px] rounded-full border-0 p-0 cursor-pointer"
                style={{
                  width: i === step ? 22 : 7,
                  background: i === step ? "hsl(var(--primary))" : "var(--stone-500)",
                  transition: "width 0.2s, background 0.2s",
                }}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            {!isLast && (
              <button
                onClick={handleSkip}
                className="bg-transparent border-0 text-[12px] text-[#86868b] cursor-pointer px-1.5 py-2 hover:text-[var(--lime-ink)] transition-colors"
              >
                Skip
              </button>
            )}
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-[18px] py-2.5 rounded-[10px] border border-[var(--stone-400)] bg-[hsl(var(--primary))] text-white text-[13px] font-bold cursor-pointer transition-all hover:bg-[hsl(var(--primary)/0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2"
              style={{ boxShadow: "0 4px 12px rgba(0, 102, 204,0.25)" }}
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

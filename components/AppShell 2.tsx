"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AIPanel } from "@/components/AIPanel";
import { Sparkles } from "lucide-react";

interface Props {
  userName: string;
  email: string;
  initial: string;
  children: React.ReactNode;
}

export function AppShell({ userName, email, initial, children }: Props) {
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#fcfdfc" }}>
      <Sidebar userName={userName} email={email} initial={initial} />

      <main style={{ flex: 1, overflowY: "auto", minWidth: 0, position: "relative" }}>
        {!aiOpen && (
          <button
            onClick={() => setAiOpen(true)}
            style={{
              position: "fixed", top: 14, right: 20, zIndex: 10,
              display: "flex", alignItems: "center", gap: 7,
              padding: "7px 14px", borderRadius: 20,
              background: "#082d1d", color: "#fff",
              border: "none", cursor: "pointer",
              fontSize: 12.5, fontWeight: 600,
              boxShadow: "0 4px 16px rgba(5,150,105,0.25)",
              letterSpacing: "-0.01em",
            }}
          >
            <Sparkles size={13} color="#59d10b" />
            Orin Insight
          </button>
        )}
        {children}
      </main>

      {aiOpen && <AIPanel onClose={() => setAiOpen(false)} />}
    </div>
  );
}

"use client";

import { useState } from "react";
import { X, Send, Sparkles } from "lucide-react";

const suggestions = [
  '"Why do I keep deferring my deep work tasks?"',
  '"Help me reframe a task I\'ve been dreading"',
  '"What patterns do you see in my task anxiety?"',
];

interface Props {
  onClose: () => void;
}

export function AIPanel({ onClose }: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);

  function handleSend(text: string) {
    if (!text.trim()) return;
    setMessages(m => [...m, { role: "user", text }]);
    setInput("");
    setTimeout(() => {
      setMessages(m => [...m, {
        role: "assistant",
        text: "That's a great question. Let me analyse your task patterns and emotional data to give you a personalised insight...",
      }]);
    }, 800);
  }

  return (
    <aside style={{
      width: 300, flexShrink: 0,
      background: "#fff", borderLeft: "1px solid #e9ede9",
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: "18px 20px 14px",
        borderBottom: "1px solid #e9ede9",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <Sparkles size={15} color="#059669" />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#082d1d", margin: 0, letterSpacing: "-0.01em" }}>
              Orin Insight
            </h2>
          </div>
          <p style={{ fontSize: 12, color: "#4a6d47", margin: 0 }}>
            Emotional patterns, one question away.
          </p>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: 7, border: "1px solid #e9ede9",
          background: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#4a6d47",
        }}>
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {messages.length === 0 ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "linear-gradient(135deg, #f2fdec, #e8f5f0)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 12px", fontSize: 22,
                border: "1.5px solid #c8f7ae",
              }}>🌿</div>
              <p style={{ fontSize: 12, color: "#4a6d47", margin: 0 }}>Hi there,</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#082d1d", margin: "4px 0 0", letterSpacing: "-0.02em" }}>
                How can I help you?
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {suggestions.map(s => (
                <button key={s}
                  onClick={() => handleSend(s.replace(/"/g, ""))}
                  style={{
                    padding: "10px 12px", borderRadius: 10,
                    border: "1px solid #e9ede9", background: "#f8f9f5",
                    cursor: "pointer", fontSize: 12.5, color: "#082d1d",
                    textAlign: "left", lineHeight: 1.4, transition: "all 0.12s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#c8f7ae"; (e.currentTarget as HTMLElement).style.background = "#f2fdec"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e9ede9"; (e.currentTarget as HTMLElement).style.background = "#f8f9f5"; }}
                >{s}</button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%", padding: "9px 12px",
                  borderRadius: m.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                  background: m.role === "user" ? "#059669" : "#f8f9f5",
                  color: m.role === "user" ? "#fff" : "#082d1d",
                  fontSize: 13, lineHeight: 1.5,
                  border: m.role === "assistant" ? "1px solid #e9ede9" : "none",
                }}>{m.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #e9ede9" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#f8f9f5", borderRadius: 10, border: "1px solid #e9ede9", padding: "8px 12px",
        }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = "#c8f7ae")}
          onBlurCapture={e => (e.currentTarget.style.borderColor = "#e9ede9")}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
            placeholder="Ask about your tasks or mood..."
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: 13, color: "#082d1d", fontFamily: "inherit",
            }}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim()}
            style={{
              width: 28, height: 28, borderRadius: "50%", border: "none",
              background: input.trim() ? "#059669" : "#e9ede9",
              cursor: input.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: input.trim() ? "#fff" : "#c4cbc2",
              transition: "background 0.15s", flexShrink: 0,
            }}
          >
            <Send size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}

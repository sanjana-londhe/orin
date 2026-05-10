"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DatePickerField } from "@/components/DatePickerField";
import { TimePickerField } from "@/components/TimePickerField";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ChevronDown } from "lucide-react";

const FEELING_KEYWORDS: Record<string, Emotion> = {
  dreading: "DREADING", dread: "DREADING",
  anxious: "ANXIOUS", anxiety: "ANXIOUS", nervous: "ANXIOUS", worried: "ANXIOUS", stress: "ANXIOUS",
  neutral: "NEUTRAL", okay: "NEUTRAL", fine: "NEUTRAL", meh: "NEUTRAL",
  willing: "WILLING", ready: "WILLING", open: "WILLING", sure: "WILLING",
  excited: "EXCITED", happy: "EXCITED", eager: "EXCITED", pumped: "EXCITED", love: "EXCITED",
};
function detectFeeling(text: string): Emotion | null {
  const lower = text.toLowerCase();
  for (const [kw, emotion] of Object.entries(FEELING_KEYWORDS)) {
    if (lower.includes(kw)) return emotion;
  }
  return null;
}

const FEELINGS = [
  { value: "DREADING", label: "Dreading", emoji: "😮‍💨", bg: "#FFF0EC", fg: "#D14626" },
  { value: "ANXIOUS",  label: "Anxious",  emoji: "😟",   bg: "#FFF8E8", fg: "#B07A10" },
  { value: "NEUTRAL",  label: "Neutral",  emoji: "😐",   bg: "#F3F2F0", fg: "#7A756E" },
  { value: "WILLING",  label: "Willing",  emoji: "🙂",   bg: "#EEF9F7", fg: "#0E8A7D" },
  { value: "EXCITED",  label: "Excited",  emoji: "🤩",   bg: "#EEFAF1", fg: "#1A9444" },
] as const;

type Emotion = typeof FEELINGS[number]["value"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  defaultTitle?: string;
}

function getDefaultDate() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function TaskCreateModal({ open, onOpenChange, defaultDate, defaultTitle }: Props) {
  const [openCount, setOpenCount] = useState(0);
  const isMobile = useIsMobile();
  useEffect(() => { if (open) setOpenCount(c => c + 1); }, [open]);
  if (!open) return null;

  if (isMobile) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#fff", display: "flex", flexDirection: "column" }}>
        <ModalForm
          key={openCount}
          defaultDate={defaultDate}
          defaultTitle={defaultTitle}
          onClose={() => onOpenChange(false)}
          isMobile
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpenChange(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(8,45,29,0.25)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: 80,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, margin: "0 24px" }}>
        <ModalForm
          key={openCount}
          defaultDate={defaultDate}
          defaultTitle={defaultTitle}
          onClose={() => onOpenChange(false)}
          isMobile={false}
        />
      </div>
    </div>
  );
}

function ModalForm({
  defaultDate,
  defaultTitle,
  onClose,
  isMobile,
}: {
  defaultDate?: string;
  defaultTitle?: string;
  onClose: () => void;
  isMobile: boolean;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle]           = useState(defaultTitle ?? "");
  const [emotion, setEmotion]       = useState<Emotion>("NEUTRAL");
  const [note, setNote]             = useState("");
  const [error, setError]           = useState("");
  const [selectedDate, setSelectedDate] = useState(defaultDate ?? getDefaultDate());
  const [selectedTime, setSelectedTime] = useState("");
  const [dateOpen, setDateOpen]     = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);

  // Close date panel on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { mutate, isPending } = useMutation({
    mutationFn: async (vars: { title: string; dueAt: string | null; emotion: string; note?: string }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: vars.title, dueAt: vars.dueAt, emotionalState: vars.emotion }),
      });
      if (!res.ok) {
        let msg = "Failed to create task";
        try { const d = await res.json(); msg = d.error ?? msg; } catch { /* empty */ }
        throw new Error(msg);
      }
      const task = await res.json();
      if (vars.note?.trim()) {
        try { localStorage.setItem(`orin_note_${task.id}`, vars.note.trim()); } catch {}
      }
      return task;
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snap = queryClient.getQueriesData({ queryKey: ["tasks"] });
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        userId: "", title: vars.title,
        dueAt: vars.dueAt ? new Date(vars.dueAt) : null,
        emotionalState: vars.emotion,
        isCompleted: false, deferredCount: 0, sortOrder: 99999,
        lastTouchedAt: new Date(), recurrenceRule: null, parentTaskId: null,
        createdAt: new Date(), updatedAt: new Date(), subtasks: [],
      };
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: unknown) =>
        Array.isArray(old) ? [...old, optimistic] : old
      );
      onClose();
      return { snap };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snap.forEach(([key, data]: [unknown, unknown]) => queryClient.setQueryData(key as Parameters<typeof queryClient.setQueryData>[0], data));
      setError("Failed to create task — please try again");
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); },
  });

  function handleCreate() {
    if (!title.trim()) { setError("Add a title first"); return; }
    setError("");
    mutate({
      title: title.trim(),
      dueAt: selectedDate
        ? (selectedTime ? new Date(`${selectedDate}T${selectedTime}`).toISOString() : `${selectedDate}T00:00:00.000Z`)
        : null,
      emotion,
      note,
    });
  }

  const dateLabel = selectedDate
    ? `${fmtDate(selectedDate)}${selectedTime ? ` · ${fmtTime(selectedTime)}` : " · No time"}`
    : "Set due date & time";

  const formBody = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 20, height: 20, borderRadius: "50%",
          border: "1.5px solid #059669", flexShrink: 0,
        }} />
        <input
          autoFocus
          value={title}
          onChange={e => {
            const val = e.target.value;
            setTitle(val);
            const detected = detectFeeling(val);
            if (detected) setEmotion(detected);
          }}
          onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") onClose(); }}
          placeholder="What needs doing?"
          style={{
            flex: 1, border: "none", outline: "none", fontFamily: "inherit",
            fontSize: 13, fontWeight: 400, color: "#082d1d", background: "transparent",
          }}
        />
      </div>

      {/* Emotion chips */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", margin: "0 0 8px" }}>How are you feeling about this?</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FEELINGS.map(f => {
            const active = emotion === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setEmotion(f.value)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "5px 11px", borderRadius: 999, cursor: "pointer",
                  fontFamily: "inherit", fontSize: 12.5,
                  fontWeight: active ? 600 : 400,
                  border: `1.5px solid ${active ? f.fg : "#e9ede9"}`,
                  background: active ? f.bg : "#fff",
                  color: active ? f.fg : "#4a6d47",
                  transition: "all 0.12s",
                }}
              >
                <span>{f.emoji}</span>{f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Due date + time — single trigger */}
      <div ref={dateRef}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", margin: "0 0 8px" }}>Due date & time</p>
        <button
          type="button"
          onClick={() => setDateOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            width: "100%", padding: "9px 12px", borderRadius: 8,
            border: `1.5px solid ${dateOpen ? "#059669" : "#dde4de"}`,
            background: "#f8f9f5", cursor: "pointer", fontFamily: "inherit",
            fontSize: 13, color: selectedDate ? "#082d1d" : "#b9d3c4",
            textAlign: "left", transition: "border-color 0.14s",
          }}
        >
          <span>📅</span>
          <span style={{ flex: 1 }}>{dateLabel}</span>
          <ChevronDown size={13} color="#4a6d47" style={{ flexShrink: 0, transform: dateOpen ? "rotate(180deg)" : "none", transition: "transform 0.14s" }} />
        </button>
        {dateOpen && (
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
            marginTop: 8, padding: 12,
            background: "#f8f9f5", borderRadius: 8,
            border: "1px solid #e9ede9",
          }}>
            <DatePickerField value={selectedDate} onChange={setSelectedDate} label="Date" />
            <TimePickerField value={selectedTime} onChange={setSelectedTime} label="Time (optional)" selectedDate={selectedDate} />
          </div>
        )}
      </div>

      {/* Note */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", margin: "0 0 8px" }}>Note</p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note or description…"
          rows={isMobile ? 4 : 2}
          style={{
            width: "100%", fontSize: 13, color: "#082d1d",
            background: "#f8f9f5", border: "1.5px solid #dde4de",
            borderRadius: 8, padding: "9px 12px", outline: "none",
            fontFamily: "inherit", resize: "vertical", lineHeight: 1.6,
            boxSizing: "border-box", transition: "border-color 0.14s",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "#059669")}
          onBlur={e => (e.currentTarget.style.borderColor = "#dde4de")}
        />
      </div>

      {error && <p style={{ fontSize: 12.5, color: "#D14626", margin: 0 }}>{error}</p>}
    </div>
  );

  // ── Mobile: full-screen ──────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", height: 54, flexShrink: 0,
          borderBottom: "1px solid #e9ede9", background: "#fff",
        }}>
          <button onClick={onClose} style={{
            padding: "6px 0", background: "none", border: "none",
            cursor: "pointer", fontSize: 14, color: "#3d5a4a", fontFamily: "inherit",
          }}>Cancel</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#082d1d", letterSpacing: "-0.01em" }}>New task</span>
          <button
            onClick={handleCreate}
            disabled={isPending || !title.trim()}
            style={{
              padding: "6px 16px", borderRadius: 8, border: "none",
              background: title.trim() ? "#059669" : "#e9ede9",
              color: title.trim() ? "#fff" : "#c4cbc2",
              fontSize: 14, fontWeight: 700,
              cursor: title.trim() ? "pointer" : "default",
              fontFamily: "inherit", transition: "background 0.12s",
            }}
          >{isPending ? "…" : "Create"}</button>
        </div>
        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px 32px" }}>
          {formBody}
        </div>
      </div>
    );
  }

  // ── Desktop: card ────────────────────────────────────────────────
  return (
    <div style={{
      background: "#fff", borderRadius: 4,
      border: "1.5px solid #059669",
      boxShadow: "0 4px 24px rgba(5,150,105,0.10)",
      padding: "20px 20px 16px",
    }}>
      {formBody}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button onClick={onClose} style={{
          padding: "7px 16px", borderRadius: 8, border: "1.5px solid #dde4de",
          background: "#fff", color: "#3d5a4a", fontSize: 13, fontWeight: 500,
          cursor: "pointer", fontFamily: "inherit",
        }}>Cancel</button>
        <button
          onClick={handleCreate}
          disabled={isPending || !title.trim()}
          style={{
            padding: "7px 20px", borderRadius: 8, border: "none",
            background: title.trim() ? "#059669" : "#c4cbc2",
            color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: title.trim() ? "pointer" : "default",
            fontFamily: "inherit", transition: "background 0.13s",
          }}
          onMouseEnter={e => { if (title.trim()) (e.currentTarget as HTMLElement).style.background = "#047857"; }}
          onMouseLeave={e => { if (title.trim()) (e.currentTarget as HTMLElement).style.background = "#059669"; }}
        >{isPending ? "Creating…" : "Create task"}</button>
      </div>
    </div>
  );
}

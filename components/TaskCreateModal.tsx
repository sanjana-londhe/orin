"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InlineChipBar, type InlineEmotion } from "@/components/InlineChipBar";
import { useIsMobile } from "@/hooks/useIsMobile";

type Emotion = InlineEmotion;

const FEELING_KW: Record<string, Emotion> = {
  dreading:"DREADING", dread:"DREADING", anxious:"ANXIOUS", anxiety:"ANXIOUS",
  nervous:"ANXIOUS", worried:"ANXIOUS", neutral:"NEUTRAL", okay:"NEUTRAL",
  willing:"WILLING", ready:"WILLING", excited:"EXCITED", happy:"EXCITED",
};
function detectEmotion(text: string): Emotion | null {
  const l = text.toLowerCase();
  for (const [k, v] of Object.entries(FEELING_KW)) if (l.includes(k)) return v;
  return null;
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  defaultTitle?: string;
}

export function TaskCreateModal({ open, onOpenChange, defaultDate, defaultTitle }: Props) {
  const [openCount, setOpenCount] = useState(0);
  const isMobile = useIsMobile();
  useEffect(() => { if (open) setOpenCount(c => c + 1); }, [open]);
  if (!open) return null;

  return (
    <div
      onClick={() => onOpenChange(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(8,45,29,0.25)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: isMobile ? "60px 16px 0" : "80px 24px 0",
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520 }}>
        <InlineCreateForm
          key={openCount}
          defaultDate={defaultDate}
          defaultTitle={defaultTitle}
          onClose={() => onOpenChange(false)}
        />
      </div>
    </div>
  );
}

function InlineCreateForm({
  defaultDate,
  defaultTitle,
  onClose,
}: {
  defaultDate?: string;
  defaultTitle?: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isMobile    = useIsMobile();
  const [title, setTitle]           = useState(defaultTitle ?? "");
  const [emotion, setEmotion]       = useState<Emotion>("NEUTRAL");
  const [dueDate, setDueDate]       = useState(defaultDate ?? todayString());
  const [dueTime, setDueTime]       = useState("");
  const [note, setNote]             = useState("");
  const [titleError, setTitleError] = useState(false);
  const [noteOpen, setNoteOpen]     = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setTimeout(() => titleRef.current?.focus(), 20); }, []);

  const { mutate, isPending } = useMutation({
    mutationFn: async (vars: { title: string; dueAt: string | null; emotion: string; note?: string }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: vars.title, dueAt: vars.dueAt, emotionalState: vars.emotion || null }),
      });
      if (!res.ok) throw new Error("Failed to create task");
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
        emotionalState: vars.emotion || "NEUTRAL",
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
      ctx?.snap.forEach(([key, data]: [unknown, unknown]) =>
        queryClient.setQueryData(key as Parameters<typeof queryClient.setQueryData>[0], data)
      );
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); },
  });

  function submit() {
    if (!title.trim()) { setTitleError(true); titleRef.current?.focus(); return; }
    if (isPending) return;
    setTitleError(false);
    const dueAt = dueDate
      ? (dueTime ? new Date(`${dueDate}T${dueTime}`).toISOString() : `${dueDate}T00:00:00.000Z`)
      : null;
    mutate({ title: title.trim(), dueAt, emotion, note });
  }

  return (
    <div style={{
      border: "1px solid #059669", borderRadius: 4, background: "#fff",
      boxShadow: "0 4px 24px rgba(5,150,105,0.10)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px 4px 16px" }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px dashed #c4cbc2", flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <style>{`.task-name-input.is-error::placeholder { color: #c23934; opacity: 1; }`}</style>
          <textarea
            ref={titleRef} value={title} autoFocus
            className={`task-name-input${titleError ? " is-error" : ""}`}
            onChange={e => {
              setTitle(e.target.value);
              if (titleError && e.target.value.trim()) setTitleError(false);
              const d = detectEmotion(e.target.value);
              if (d) setEmotion(d);
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = t.scrollHeight + "px";
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
              if (e.key === "Escape") onClose();
            }}
            placeholder="Task name"
            rows={1}
            style={{
              width: "100%", border: "none", outline: "none", fontFamily: "inherit",
              fontSize: isMobile ? 14 : 12, letterSpacing: "-0.01em", color: "#082d1d",
              background: "transparent", marginBottom: 2,
              resize: "none", lineHeight: 1.4, padding: 0, overflow: "hidden",
              display: "block",
            }}
          />
          {noteOpen ? (
            <textarea
              value={note}
              onChange={e => {
                setNote(e.target.value);
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = t.scrollHeight + "px";
              }}
              placeholder="Notes" rows={2}
              style={{
                width: "100%", border: "none", outline: "none", fontFamily: "inherit",
                fontSize: isMobile ? 14 : 11, color: "#3d5a4a", background: "transparent",
                resize: "none", lineHeight: 1.5, padding: 0, overflow: "hidden",
              }}
            />
          ) : (
            <div
              onClick={() => setNoteOpen(true)}
              style={{ fontSize: isMobile ? 14 : 11, color: "#b9d3c4", cursor: "text" }}
            >
              {note.trim() || "Notes"}
            </div>
          )}
        </div>
      </div>

      <div style={{
        padding: "6px 16px 10px",
        borderTop: "0.5px solid rgba(0,0,0,0.05)", marginTop: 6,
      }}>
        <InlineChipBar
          emotion={emotion} setEmotion={setEmotion}
          dueDate={dueDate} setDueDate={setDueDate}
          dueTime={dueTime} setDueTime={setDueTime}
          trailing={!isMobile && (
            <>
              <div style={{ flex: 1 }} />
              <button
                onClick={submit} disabled={isPending}
                style={{
                  padding: "5px 14px", borderRadius: 6, border: "none",
                  background: "#059669", color: "#fff",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {isPending ? "…" : "Add"}
              </button>
            </>
          )}
        />
      </div>

      {/* Mobile: Cancel + Add CTAs in the same right-aligned, compact pattern
          as the DeferralModal (padding 7px, borderRadius 8, fontSize 12). */}
      {isMobile && (
        <div style={{ padding: "10px 18px 14px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px", borderRadius: 8,
              border: "1.5px solid #dde4de", background: "#fff",
              color: "#3d5a4a", fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >Cancel</button>
          <button
            onClick={submit} disabled={isPending}
            style={{
              padding: "7px 20px", borderRadius: 8, border: "none",
              background: isPending ? "#c4cbc2" : "#059669",
              color: "#fff", fontSize: 12, fontWeight: 700,
              cursor: isPending ? "default" : "pointer", fontFamily: "inherit",
            }}
          >
            {isPending ? "…" : "Add"}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DatePickerField } from "@/components/DatePickerField";
import { TimePickerField } from "@/components/TimePickerField";
import { FeelingPickerField, type Feeling } from "@/components/FeelingPickerField";
import { useIsMobile } from "@/hooks/useIsMobile";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  defaultTitle?: string;
}

function getDefaultDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultTime() {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function TaskCreateModal({ open, onOpenChange, defaultDate, defaultTitle }: Props) {
  const [openCount, setOpenCount] = useState(0);
  const isMobile = useIsMobile();
  useEffect(() => { if (open) setOpenCount(c => c + 1); }, [open]);
  if (!open) return null;

  // Mobile: full-screen (no backdrop, fills viewport)
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

  // Desktop: centered overlay
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
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 580, margin: "0 24px" }}>
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
  const [title, setTitle]     = useState(defaultTitle ?? "");
  const [emotion, setEmotion] = useState<Feeling>("NEUTRAL");
  const [note, setNote]       = useState("");
  const [error, setError]     = useState("");
  const initTime = getDefaultTime();
  const [selectedDate, setSelectedDate] = useState(defaultDate ?? getDefaultDate());
  const [selectedTime, setSelectedTime] = useState("");

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
      dueAt: selectedDate ? new Date(`${selectedDate}T${selectedTime || initTime}`).toISOString() : null,
      emotion: emotion,
      note,
    });
  }

  // ── Mobile: full-screen layout ───────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

        {/* Fixed top bar: Cancel | New task | Create */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", height: 54, flexShrink: 0,
          borderBottom: "1px solid #e9ede9",
          background: "#fff",
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
          >
            {isPending ? "…" : "Create"}
          </button>
        </div>

        {/* Title input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "16px 18px",
          borderBottom: "1px solid #e9ede9",
          flexShrink: 0,
        }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", border: "1.5px solid #059669", flexShrink: 0 }} />
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
            placeholder="What needs doing?"
            style={{
              flex: 1, border: "none", outline: "none", fontFamily: "inherit",
              fontSize: 16, fontWeight: 450, color: "#082d1d", background: "transparent",
            }}
          />
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px 32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <FeelingPickerField value={emotion} onChange={setEmotion} label="Feeling" />
            <DatePickerField value={selectedDate} onChange={setSelectedDate} label="Due date" />
            <TimePickerField value={selectedTime} onChange={setSelectedTime} label="Due time (optional)" selectedDate={selectedDate} />
          </div>

          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", marginBottom: 8 }}>Note</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note or description…"
              rows={4}
              style={{
                width: "100%", fontSize: 14, color: "#082d1d",
                background: "#f8f9f5", border: "1.5px solid #dde4de",
                borderRadius: 10, padding: "12px 14px", outline: "none",
                fontFamily: "inherit", resize: "none", lineHeight: 1.6,
                boxSizing: "border-box", transition: "border-color 0.14s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#059669")}
              onBlur={e => (e.currentTarget.style.borderColor = "#dde4de")}
            />
          </div>

          {error && <p style={{ fontSize: 12, color: "#c23934", marginTop: 10 }}>{error}</p>}
        </div>
      </div>
    );
  }

  // ── Desktop: card layout ─────────────────────────────────────────
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      border: "1.5px solid #059669",
      boxShadow: "0 4px 16px rgba(5,150,105,0.08)",
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid #e9ede9" }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px solid #059669", flexShrink: 0 }} />
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === "Escape") onClose(); }}
          placeholder="What needs doing?"
          style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 14, color: "#082d1d", background: "transparent" }}
        />
      </div>

      <div style={{ padding: "14px 18px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
          <FeelingPickerField value={emotion} onChange={setEmotion} label="Feeling" />
          <DatePickerField value={selectedDate} onChange={setSelectedDate} label="Due date" />
          <TimePickerField value={selectedTime} onChange={setSelectedTime} label="Due time (optional)" selectedDate={selectedDate} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#4a6d47", marginBottom: 8 }}>Note</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note or description…"
            rows={2}
            style={{
              width: "100%", fontSize: 12.5, color: "#082d1d",
              background: "#f8f9f5", border: "1.5px solid #dde4de",
              borderRadius: 8, padding: "8px 10px", outline: "none",
              fontFamily: "inherit", resize: "vertical", lineHeight: 1.5,
              boxSizing: "border-box", transition: "border-color 0.14s",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "#059669")}
            onBlur={e => (e.currentTarget.style.borderColor = "#dde4de")}
          />
        </div>

        {error && <p style={{ fontSize: 11.5, color: "#c23934", marginBottom: 8 }}>{error}</p>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingBottom: 14 }}>
          <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid #dde4de", background: "#fff", color: "#3d5a4a", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
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
          >
            {isPending ? "Creating…" : "Create task"}
          </button>
        </div>
      </div>
    </div>
  );
}

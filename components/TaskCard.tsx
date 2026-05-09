"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { DeferralModal } from "@/components/DeferralModal";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Pencil, Trash2, ChevronRight } from "lucide-react";
import { MiniCalendar } from "@/components/DatePickerField";
import { WheelTimePicker } from "@/components/TimePickerField";

// design.md tokens
const T = {
  textPrimary:   "#082d1d",
  textSecondary: "#3d5a4a",
  textTertiary:  "#4a6d47",
  textMuted:     "#b9d3c4",
  border:        "#dde4de",
  borderStrong:  "#c4cbc2",
  surface:       "#ffffff",
  stone100:      "#f8f9f5",
  stone200:      "#f1f3ef",
  accent:        "#059669",
  accentHover:   "#047857",
  danger:        "#c23934",
  dangerBg:      "#FFF0EC",
  flagged:       "#ff9500",
};

// ── helpers ────────────────────────────────────────────────────────────

// UTC midnight (T00:00:00.000Z) is our sentinel for "date only — no time set"
function fmtDue(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const d   = new Date(dueAt);
  const iso = d.toISOString();

  const hasTime = iso.slice(11) !== "00:00:00.000Z";

  // Canonical YYYY-MM-DD for comparison — avoids timezone drift on date-only tasks
  function localDateIso(offset = 0): string {
    const n = new Date(); n.setDate(n.getDate() + offset);
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  }
  const taskDate = hasTime
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : iso.slice(0, 10);

  const todayIso    = localDateIso(0);
  const yesterdayIso = localDateIso(-1);
  const tomorrowIso = localDateIso(1);

  const isToday    = taskDate === todayIso;
  const isYesterday = taskDate === yesterdayIso;
  const isTomorrow = taskDate === tomorrowIso;
  const overdue    = taskDate < todayIso;

  const dateLabel = isToday ? "Today"
    : isYesterday ? "Yesterday"
    : isTomorrow  ? "Tomorrow"
    : new Date(taskDate + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const timeLabel = hasTime ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;

  return { dateLabel, timeLabel, overdue, isToday, isoDate: taskDate, isoTime: hasTime ? iso.slice(11, 16) : "" };
}

function getIsoDate(dueAt: Date | string | null) {
  if (!dueAt) return "";
  const iso = new Date(dueAt).toISOString();
  // date-only: use UTC date directly; timed: use local date
  const d = new Date(dueAt);
  return iso.slice(11) === "00:00:00.000Z"
    ? iso.slice(0, 10)
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getIsoTime(dueAt: Date | string | null) {
  if (!dueAt) return "";
  const iso = new Date(dueAt).toISOString();
  return iso.slice(11) === "00:00:00.000Z" ? "" : iso.slice(11, 16);
}

function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function getDatePresets() {
  const t = new Date(); t.setHours(0,0,0,0);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return [
    { label: "Today",     sub: fmt(t),                                     value: t.toISOString().slice(0,10) },
    { label: "Tomorrow",  sub: fmt(new Date(t.getTime()+86400000)),         value: new Date(t.getTime()+86400000).toISOString().slice(0,10) },
    { label: "In 2 days", sub: fmt(new Date(t.getTime()+172800000)),        value: new Date(t.getTime()+172800000).toISOString().slice(0,10) },
    { label: "Next week", sub: fmt(new Date(t.getTime()+604800000)),        value: new Date(t.getTime()+604800000).toISOString().slice(0,10) },
  ];
}
function getTimeSlots(isToday: boolean, nowTime: string) {
  if (!isToday) return [
    { label: "Morning", value: "09:00" }, { label: "Noon", value: "12:00" },
    { label: "Afternoon", value: "14:00" }, { label: "Evening", value: "18:00" }, { label: "Night", value: "21:00" },
  ];
  const now = new Date();
  const slots: { label: string; value: string }[] = [];
  [30, 60, 120, 180].forEach(mins => {
    const t = new Date(now.getTime() + mins * 60000);
    const h = t.getHours(), rawM = t.getMinutes();
    const rM = Math.ceil(rawM / 15) * 15, fH = rM >= 60 ? h + 1 : h, fM = rM >= 60 ? 0 : rM;
    if (fH < 24) slots.push({ label: mins < 60 ? `In ${mins} min` : `In ${mins/60} hr${mins > 60 ? "s" : ""}`, value: `${String(fH).padStart(2,"0")}:${String(fM).padStart(2,"0")}` });
  });
  [{ label: "Afternoon", value: "14:00" }, { label: "Evening", value: "18:00" }, { label: "Night", value: "21:00" }]
    .filter(s => s.value > nowTime)
    .forEach(s => { if (!slots.find(x => x.value === s.value)) slots.push(s); });
  return slots;
}

function parseTimeInput(raw: string): string | null {
  const s = raw.trim().toUpperCase();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!m) return null;
  let h = parseInt(m[1]); const min = parseInt(m[2] ?? "0");
  if (isNaN(h) || isNaN(min) || min > 59) return null;
  if (m[3] === "PM" && h < 12) h += 12;
  if (m[3] === "AM" && h === 12) h = 0;
  if (h > 23) return null;
  return `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
}

// ── emotion config ─────────────────────────────────────────────────────

const EMOTIONS = [
  { value: "DREADING", label: "Dreading", emoji: "😰", bg: "#FFF0EC", fg: "#D14626" },
  { value: "ANXIOUS",  label: "Anxious",  emoji: "😟", bg: "#FFF8E8", fg: "#B07A10" },
  { value: "NEUTRAL",  label: "Neutral",  emoji: "😐", bg: "#F3F2F0", fg: "#7A756E" },
  { value: "WILLING",  label: "Willing",  emoji: "🙂", bg: "#EEF9F7", fg: "#0E8A7D" },
  { value: "EXCITED",  label: "Excited",  emoji: "🤩", bg: "#EEFAF1", fg: "#1A9444" },
] as const;

// ── note helpers ───────────────────────────────────────────────────────

function loadNote(id: string) {
  try { return localStorage.getItem(`orin_note_${id}`) ?? ""; } catch { return ""; }
}
function persistNote(id: string, text: string) {
  try { if (text.trim()) localStorage.setItem(`orin_note_${id}`, text); else localStorage.removeItem(`orin_note_${id}`); } catch {}
}

// ── types ──────────────────────────────────────────────────────────────

interface Props {
  task: TaskWithSubtasks;
  featured?: boolean;
  canPushUp?: boolean;
  onPushUp?: (id: string) => void;
  onMarkDone?: (id: string) => void;
  onUncomplete?: (id: string) => void;
  onDefer?: (id: string, newDueAt: Date) => void;
  onUpdate?: (id: string, patch: Partial<Pick<Task, "title" | "dueAt" | "emotionalState">>) => void;
  onDelete?: (id: string) => void;
}

// ── component ──────────────────────────────────────────────────────────

function TaskCardInner({ task, onMarkDone, onUncomplete, onDefer, onUpdate, onDelete }: Props) {
  const done    = task.isCompleted;
  const flagged = (task.deferredCount ?? 0) > 0;
  const em      = EMOTIONS.find(e => e.value === task.emotionalState) ?? EMOTIONS[2];
  const due     = fmtDue(task.dueAt);
  const isMobile = useIsMobile();

  const { nudgedTaskIds, editingTaskId, setEditingTaskId } = useUIStore();
  const isNudged = nudgedTaskIds.has(task.id);

  const [deferOpen, setDeferOpen]     = useState(false);
  const [editing, setEditing]         = useState(false);
  const [completing, setCompleting]         = useState(false);
  const [showUncompletePrompt, setShowUncompletePrompt] = useState(false);
  const [editTitle, setEditTitle]     = useState(task.title);
  const [editDate, setEditDate]       = useState(getIsoDate(task.dueAt));
  const [editTime, setEditTime]       = useState(getIsoTime(task.dueAt));
  const [editEmotion, setEditEmotion] = useState(task.emotionalState as typeof EMOTIONS[number]["value"]);
  const [editNote, setEditNote]       = useState("");
  const [editNoteOpen, setEditNoteOpen] = useState(false);
  const [showEditEmoPicker, setShowEditEmoPicker]   = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [showEditCustomTime, setShowEditCustomTime] = useState(false);
  const [showEditCustomDate, setShowEditCustomDate] = useState(false);
  const [note, setNote]               = useState("");
  const [mounted, setMounted]         = useState(false);
  const [hovered, setHovered]         = useState(false);
  const [checkHov, setCheckHov]       = useState(false);
  const editTitleRef = useRef<HTMLInputElement>(null);
  const editChipBarRef = useRef<HTMLDivElement>(null);

  // Only attach the global mousedown listener while a picker is actually open.
  // With many rows on screen this avoids dozens of always-on listeners running
  // ref.contains() on every click — a measurable INP win.
  const anyEditPickerOpen = showEditEmoPicker || showEditDatePicker || showEditTimePicker;
  useEffect(() => {
    if (!anyEditPickerOpen) return;
    function h(e: MouseEvent) {
      if (editChipBarRef.current && !editChipBarRef.current.contains(e.target as Node)) {
        setShowEditEmoPicker(false); setShowEditDatePicker(false); setShowEditTimePicker(false);
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [anyEditPickerOpen]);

  useEffect(() => { setMounted(true); setNote(loadNote(task.id)); }, [task.id]);
  useEffect(() => {
    if (editing) {
      setEditTitle(task.title);
      setEditDate(getIsoDate(task.dueAt));
      setEditTime(getIsoTime(task.dueAt));
      setEditEmotion(task.emotionalState as typeof EMOTIONS[number]["value"]);
      const savedNote = loadNote(task.id);
      setEditNote(savedNote);
      setEditNoteOpen(!!savedNote.trim());
      setShowEditEmoPicker(false); setShowEditDatePicker(false); setShowEditTimePicker(false);
      setTimeout(() => editTitleRef.current?.focus(), 10);
    }
  }, [editing]);

  // Close this edit form if another task or the create form takes focus
  useEffect(() => {
    if (editing && editingTaskId !== task.id) setEditing(false);
  }, [editingTaskId]);

  function openEdit() { setEditingTaskId(task.id); setEditing(true); }
  function closeEdit() { setEditingTaskId(null); setEditing(false); }

  function saveEdit() {
    if (!editTitle.trim()) return;
    const dueAt = editDate
      ? (editTime ? new Date(`${editDate}T${editTime}`).toISOString() : `${editDate}T00:00:00.000Z`)
      : null;
    onUpdate?.(task.id, { title: editTitle.trim(), dueAt: dueAt as unknown as Date, emotionalState: editEmotion as Task["emotionalState"] });
    persistNote(task.id, editNote);
    setNote(editNote);
    closeEdit();
  }

  // ── Edit form — Reminders-style ──────────────────────────────────────
  if (editing) {
    const editEm = EMOTIONS.find(e => e.value === editEmotion) ?? EMOTIONS[2];
    const editDateLabel = editDate ? fmtEditDate(editDate) : "Set date";

    function fmtEditDate(iso: string) {
      const today = new Date().toISOString().slice(0,10);
      const tmrw  = new Date(Date.now()+86400000).toISOString().slice(0,10);
      if (iso === today) return "Today";
      if (iso === tmrw)  return "Tomorrow";
      return new Date(iso+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
    }
    function fmtEditTime(t: string) {
      const [h,m] = t.split(":").map(Number);
      return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;
    }
    const chip = (fg?: string): React.CSSProperties => ({
      display:"inline-flex", alignItems:"center", gap:5, padding:"4px 9px", borderRadius:6,
      background:"#f8f9f5", border:`0.5px solid ${fg ? fg+"33" : "rgba(0,0,0,0.08)"}`,
      color: fg ?? "#5f5e5a", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit",
    });

    return (
      <div style={{ padding: "4px 8px" }}>
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${T.accent}` }}>

          {/* Title + notes */}
          <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 14px 4px 16px" }}>
            <div style={{ width:18, height:18, borderRadius:"50%", border:`1.5px solid ${T.accent}`, flexShrink:0, marginTop:2 }} />
            <div style={{ flex:1 }}>
              <input ref={editTitleRef} value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") closeEdit(); }}
                style={{ width:"100%", border:"none", outline:"none", fontFamily:"inherit", fontSize:14, fontWeight:400, letterSpacing:"-0.01em", color:T.textPrimary, background:"transparent", marginBottom:2, display:"block" }} />
              {editNoteOpen ? (
                <textarea value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Notes" rows={2}
                  style={{ width:"100%", border:"none", outline:"none", fontFamily:"inherit", fontSize:12, color:"#5f5e5a", background:"transparent", resize:"none", lineHeight:1.5, padding:0, display:"block" }} />
              ) : (
                <div onClick={() => setEditNoteOpen(true)} style={{ fontSize:12, color:"#b9d3c4", cursor:"text", marginBottom:2 }}>
                  {editNote.trim() || "Notes"}
                </div>
              )}
            </div>
          </div>

          {/* Chip bar */}
          <div ref={editChipBarRef} style={{ display:"flex", gap:5, padding:"6px 14px 10px", borderTop:"0.5px solid rgba(0,0,0,0.05)", marginTop:6, flexWrap:"wrap", position:"relative", alignItems:"center" }}>

            {/* Feeling */}
            <div style={{ position:"relative" }}>
              <button onClick={() => { setShowEditEmoPicker(o=>!o); setShowEditDatePicker(false); setShowEditCustomDate(false); setShowEditTimePicker(false); setShowEditCustomTime(false); }}
                style={{ ...chip(editEm.fg), background: editEm.bg }}><span style={{ fontSize: 10 }}>{editEm.emoji}</span> {editEm.label}</button>
              {showEditEmoPicker && (
                <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:0, zIndex:50, background:"#fff", border:"0.5px solid rgba(0,0,0,0.12)", borderRadius:10, boxShadow:"0 -4px 20px rgba(0,0,0,0.1)", minWidth:150, padding:"4px 0", overflow:"hidden" }}>
                  {EMOTIONS.map(f => (
                    <button key={f.value} onClick={() => { setEditEmotion(f.value); setShowEditEmoPicker(false); }}
                      style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 14px", background:editEmotion===f.value?f.bg:"none", border:"none", cursor:"pointer", fontSize:13, color:editEmotion===f.value?f.fg:"#082d1d", fontFamily:"inherit" }}>
                      {f.emoji} {f.label}
                      {editEmotion===f.value && <span style={{ marginLeft:"auto", fontSize:11 }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <div style={{ position:"relative" }}>
              <button onClick={() => { setShowEditDatePicker(o=>!o); setShowEditCustomDate(false); setShowEditEmoPicker(false); setShowEditTimePicker(false); setShowEditCustomTime(false); }}
                style={chip("#059669")}><span style={{ fontSize:10 }}>📅</span> {editDateLabel}</button>
              {showEditDatePicker && (
                <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:0, zIndex:50, display:"flex", gap:8 }}>
                  <div style={{ background:"#fff", border:"0.5px solid rgba(0,0,0,0.12)", borderRadius:10, boxShadow:"0 -4px 20px rgba(0,0,0,0.1)", minWidth:200, padding:"4px 0", overflow:"hidden" }}>
                    {getDatePresets().map(opt=>(
                      <button key={opt.value} onClick={() => { setEditDate(opt.value); setShowEditDatePicker(false); setShowEditCustomDate(false); }}
                        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"8px 14px", background:editDate===opt.value?"#f2fdec":"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                        <span style={{ fontSize:13, color:editDate===opt.value?"#059669":"#082d1d", fontWeight:editDate===opt.value?500:400 }}>{opt.label}</span>
                        <span style={{ fontSize:11, color:editDate===opt.value?"#059669":"#888780" }}>{opt.sub}{editDate===opt.value?" ✓":""}</span>
                      </button>
                    ))}
                    <div style={{ borderTop:"0.5px solid rgba(0,0,0,0.06)" }} />
                    <button onClick={() => { setShowEditCustomDate(s => !s); setShowEditTimePicker(false); setShowEditCustomTime(false); }}
                      style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"8px 14px", background:showEditCustomDate?"#f2fdec":"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                      <span style={{ fontSize:13, color:"#082d1d", fontWeight:showEditCustomDate?500:400 }}>Custom date</span>
                      <ChevronRight size={13} color={showEditCustomDate ? "#059669" : "#888780"} />
                    </button>
                  </div>
                  {showEditCustomDate && (
                    <MiniCalendar selected={editDate} onSelect={iso => { setEditDate(iso); setShowEditDatePicker(false); setShowEditCustomDate(false); }} />
                  )}
                </div>
              )}
            </div>

            {/* Time */}
            <div style={{ position:"relative" }}>
              <button onClick={() => { setShowEditTimePicker(o=>!o); setShowEditCustomTime(false); setShowEditEmoPicker(false); setShowEditDatePicker(false); setShowEditCustomDate(false); }}
                style={chip()}><span style={{ fontSize:10 }}>🕐</span> {editTime ? fmtEditTime(editTime) : "Add time"}</button>
              {showEditTimePicker && (() => {
                const now=new Date(), todayStr=now.toISOString().slice(0,10), isToday=editDate===todayStr;
                const nowTime=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
                const slots = getTimeSlots(isToday, nowTime);
                return (
                  <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:0, zIndex:50, display:"flex", gap:8 }}>
                    <div style={{ background:"#fff", border:"0.5px solid rgba(0,0,0,0.12)", borderRadius:10, boxShadow:"0 -4px 20px rgba(0,0,0,0.1)", minWidth:190, padding:"4px 0", overflow:"hidden" }}>
                      {slots.map(opt=>(
                        <button key={opt.value} onClick={() => { setEditTime(opt.value); setShowEditTimePicker(false); setShowEditCustomTime(false); }}
                          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"8px 14px", background:editTime===opt.value?"#f2fdec":"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                          <span style={{ fontSize:13, color:editTime===opt.value?"#059669":"#082d1d", fontWeight:editTime===opt.value?500:400 }}>{opt.label}</span>
                          <span style={{ fontSize:11, color:editTime===opt.value?"#059669":"#888780" }}>{fmtEditTime(opt.value)}{editTime===opt.value?" ✓":""}</span>
                        </button>
                      ))}
                      <div style={{ borderTop:"0.5px solid rgba(0,0,0,0.06)" }} />
                      <button onClick={() => {
                        const opening = !showEditCustomTime;
                        setShowEditCustomTime(opening);
                        setShowEditDatePicker(false); setShowEditCustomDate(false);
                        if (opening && !editTime) setEditTime("09:00");
                      }}
                        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"8px 14px", background:showEditCustomTime?"#f2fdec":"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                        <span style={{ fontSize:13, color:"#082d1d", fontWeight:showEditCustomTime?500:400 }}>Custom time</span>
                        <ChevronRight size={13} color={showEditCustomTime ? "#059669" : "#888780"} />
                      </button>
                      {editTime && (
                        <button onClick={()=>{ setEditTime(""); setShowEditTimePicker(false); setShowEditCustomTime(false); }}
                          style={{ display:"block", width:"100%", padding:"7px 14px", background:"none", border:"none", borderTop:"0.5px solid rgba(0,0,0,0.06)", cursor:"pointer", fontSize:12, color:"#c23934", fontFamily:"inherit", textAlign:"left" }}>Remove time</button>
                      )}
                    </div>
                    {showEditCustomTime && (
                      <div style={{ background:"#fff", border:"1.5px solid #dde4de", borderRadius:12, boxShadow:"0 -4px 16px rgba(0,0,0,0.09)", padding:"12px 14px" }}>
                        <WheelTimePicker value={editTime || "09:00"} onChange={t => setEditTime(t)} />
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {isMobile && onDelete && (
              <button onClick={()=>{onDelete(task.id);closeEdit();}} style={chip("#c23934")}>Delete</button>
            )}

            <div style={{ flex:1 }} />
            <button onClick={saveEdit}
              style={{ padding:"5px 14px", borderRadius:6, border:"none", background:T.accent, color:"#fff", fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Row ────────────────────────────────────────────────────────────
  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={isMobile && !done ? openEdit : undefined}
        style={{
          display: "flex", alignItems: "flex-start",
          padding: isMobile ? "16px 14px" : "12px 14px 12px 16px",
          cursor: isMobile && !done ? "pointer" : "default",
          background: hovered ? T.stone200 : "transparent",
          opacity: completing ? 0 : 1,
          transform: completing ? "translateX(8px)" : "none",
          transition: completing
            ? "opacity 0.3s ease 0.2s, transform 0.3s ease 0.2s"
            : "background 0.1s",
        }}
      >
        {/* Circle checkbox */}
        <div style={{ paddingTop: 2, paddingRight: 12, flexShrink: 0 }}>
          <div
            onClick={e => {
              e.stopPropagation();
              if (done) {
                const todayIso = new Date().toISOString().slice(0, 10);
                if (due && due.isoDate > todayIso) { setShowUncompletePrompt(true); }
                else { onUncomplete?.(task.id); }
                return;
              }
              setCompleting(true);
              setTimeout(() => { onMarkDone?.(task.id); setCompleting(false); }, 500);
            }}
            onMouseEnter={() => setCheckHov(true)}
            onMouseLeave={() => setCheckHov(false)}
            style={{
              width: isMobile ? 22 : 18, height: isMobile ? 22 : 18, borderRadius: "50%",
              border: done ? `1.5px solid ${T.accent}` : checkHov ? `1.5px solid ${T.accent}` : "1.5px dashed #c4cbc2",
              background: done ? T.accent : "transparent",
              cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            {done && (
              <svg width="9" height="6" viewBox="0 0 11 8" fill="none">
                <path d="M1 4l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <div style={{
            fontSize: 14, fontWeight: 400,
            color: done ? T.textMuted : T.textPrimary,
            lineHeight: 1.45,
            letterSpacing: "-0.01em",
            textDecoration: done ? "line-through" : "none",
            marginBottom: 4,
            position: "relative", display: "inline-block", width: "100%",
          }}>
            {task.title}
            {completing && !done && (
              <span style={{ position: "absolute", left: 0, top: "50%", height: "1.5px", background: T.textPrimary, animation: "strikethrough-draw 0.25s ease forwards" }} />
            )}
          </div>

          {/* Meta chips — feeling → date */}
          {!done && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: note && mounted ? 3 : 0 }}>
              {task.emotionalState && (
                <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:11, fontWeight:500, padding:"2px 7px", borderRadius:5, background:em.bg, color:em.fg }}>
                  {em.emoji} {em.label}
                </span>
              )}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                {/* Date */}
                <span
                  onClick={e => { e.stopPropagation(); setDeferOpen(true); }}
                  style={{ fontSize:11, fontWeight:500, color: due ? (due.overdue ? T.danger : due.isToday ? T.accent : "#888780") : "#c4cbc2", cursor:"pointer" }}>
                  {due ? <>{due.overdue && "⚠ "}{due.dateLabel}</> : "+ date"}
                </span>
                {/* Time — shown separately, only if set */}
                {due?.timeLabel && (
                  <span
                    onClick={e => { e.stopPropagation(); setDeferOpen(true); }}
                    style={{ fontSize:11, fontWeight:500, color: "#888780", cursor:"pointer" }}>
                    {due.timeLabel}
                  </span>
                )}
              </div>
            </div>
          )}

          {mounted && note && (
            <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {note}
            </div>
          )}

          {isNudged && !done && (
            <div style={{ marginTop: 8 }}>
              <NudgeBanner task={task} onDefer={onDefer ? d => onDefer(task.id, d) : undefined} onMarkDone={() => onMarkDone?.(task.id)} />
            </div>
          )}
        </div>

        {/* Right: edit/delete — desktop hover-only; hidden on mobile (tap row instead) */}
        {!isMobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 8, flexShrink: 0, paddingTop: 1, opacity: hovered && !done ? 1 : 0, transition: "opacity 0.15s" }}>
          <button onClick={openEdit} title="Edit"
            style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.stone100, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textTertiary, transition: "background 0.1s, color 0.1s, border-color 0.1s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = T.stone200; el.style.color = T.textSecondary; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = T.stone100; el.style.color = T.textTertiary; }}>
            <Pencil size={11} />
          </button>
          <button onClick={() => onDelete?.(task.id)} title="Delete"
            style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.stone100, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textTertiary, transition: "background 0.1s, color 0.1s, border-color 0.1s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = T.dangerBg; el.style.color = T.danger; el.style.borderColor = "#e9c3c1"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = T.stone100; el.style.color = T.textTertiary; el.style.borderColor = T.border; }}>
            <Trash2 size={11} />
          </button>
        </div>
        )}
      </div>

      <DeferralModal
        open={deferOpen}
        onOpenChange={setDeferOpen}
        task={task}
        defaultTab="defer"
        onConfirm={d => {
          if (onDefer) onDefer(task.id, d);
          else onUpdate?.(task.id, { dueAt: d as unknown as Date });
        }}
      />

      {/* Prompt when uncompleting a future task */}
      {showUncompletePrompt && (
        <>
          <div onClick={() => setShowUncompletePrompt(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(8,45,29,0.2)", backdropFilter: "blur(2px)" }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)", zIndex: 201,
            width: 300, background: "#fff", borderRadius: 12,
            border: "1px solid #dde4de", boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            padding: "20px",
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#082d1d", margin: "0 0 6px" }}>Future task</p>
            <p style={{ fontSize: 13, color: "#3d5a4a", margin: "0 0 16px", lineHeight: 1.5 }}>
              This task is due <strong>{due?.dateLabel}</strong>. Would you like to move it to today?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => {
                  const todayIso = new Date().toISOString().slice(0, 10);
                  onUpdate?.(task.id, { dueAt: new Date(`${todayIso}T00:00:00.000Z`) as unknown as Date });
                  onUncomplete?.(task.id);
                  setShowUncompletePrompt(false);
                }}
                style={{ padding: "10px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Move to today
              </button>
              <button
                onClick={() => { onUncomplete?.(task.id); setShowUncompletePrompt(false); }}
                style={{ padding: "10px", borderRadius: 8, border: "1px solid #dde4de", background: "#fff", color: "#3d5a4a", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                Keep original date
              </button>
              <button
                onClick={() => setShowUncompletePrompt(false)}
                style={{ padding: "6px", borderRadius: 8, border: "none", background: "none", color: "#b9d3c4", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

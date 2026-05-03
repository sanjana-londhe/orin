"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { DeferralModal } from "@/components/DeferralModal";
import { DatePickerField } from "@/components/DatePickerField";
import { TimePickerField } from "@/components/TimePickerField";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { EmotionalStatePicker, type EmotionalState } from "@/components/EmotionalStatePicker";
import { Check } from "lucide-react";

function fmtDue(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const dateLabel = isToday ? "Today" : isTomorrow ? "Tomorrow"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeLabel = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return { dateLabel, timeLabel, overdue: d < now, isoDate: d.toISOString().slice(0,10), isoTime: d.toISOString().slice(11,16) };
}

const EMOTIONS = [
  { value:"DREADING", label:"Dreading", emoji:"😰", bg:"#FFF0EC", fg:"#D14626", activeBg:"#D14626" },
  { value:"ANXIOUS",  label:"Anxious",  emoji:"😟", bg:"#FFF8E8", fg:"#B07A10", activeBg:"#B07A10" },
  { value:"NEUTRAL",  label:"Neutral",  emoji:"😐", bg:"#F3F2F0", fg:"#7A756E", activeBg:"#3a3a3a" },
  { value:"WILLING",  label:"Willing",  emoji:"🙂", bg:"#EEF9F7", fg:"#0E8A7D", activeBg:"#0E8A7D" },
  { value:"EXCITED",  label:"Excited",  emoji:"🤩", bg:"#EEFAF1", fg:"#1A9444", activeBg:"#1A9444" },
] as const;

function loadNote(id: string) {
  try { return localStorage.getItem(`orin_note_${id}`) ?? ""; } catch { return ""; }
}
function persistNote(id: string, text: string) {
  try { if (text) localStorage.setItem(`orin_note_${id}`, text); else localStorage.removeItem(`orin_note_${id}`); } catch {}
}

interface Props {
  task: TaskWithSubtasks;
  featured?: boolean;
  canPushUp?: boolean;
  onPushUp?: (id: string) => void;
  onMarkDone?: (id: string) => void;
  onUncomplete?: (id: string) => void;
  onDefer?: (id: string, newDueAt: Date) => void;
  onUpdate?: (id: string, patch: Partial<Pick<Task, "title"|"dueAt"|"emotionalState">>) => void;
  onDelete?: (id: string) => void;
}

function TaskCardInner({ task, onMarkDone, onUncomplete, onDefer, onUpdate, onDelete }: Props) {
  const done = task.isCompleted;
  const { nudgedTaskIds } = useUIStore();
  const isNudged = nudgedTaskIds.has(task.id);
  const em = EMOTIONS.find(e => e.value === task.emotionalState) ?? EMOTIONS[2];
  const due = fmtDue(task.dueAt);

  const [deferOpen, setDeferOpen]     = useState(false);
  const [editing, setEditing]         = useState(false);
  const [editingEmotion, setEditingEmotion] = useState(false);
  const [note, setNote]               = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft]     = useState("");
  const [mounted, setMounted]         = useState(false);

  const noteRef     = useRef<HTMLTextAreaElement>(null);
  const editTitleRef = useRef<HTMLInputElement>(null);
  const [editTitle, setEditTitle]   = useState(task.title);
  const [editDate, setEditDate]     = useState(due?.isoDate ?? "");
  const [editTime, setEditTime]     = useState(due?.isoTime ?? "");
  const [editEmotion, setEditEmotion] = useState(task.emotionalState as typeof EMOTIONS[number]["value"]);

  useEffect(() => { setMounted(true); setNote(loadNote(task.id)); }, [task.id]);
  useEffect(() => { if (editing) editTitleRef.current?.focus(); }, [editing]);
  useEffect(() => { if (editingNote) noteRef.current?.focus(); }, [editingNote]);

  function openEdit() {
    setEditTitle(task.title); setEditDate(due?.isoDate ?? "");
    setEditTime(due?.isoTime ?? ""); setEditEmotion(task.emotionalState as typeof EMOTIONS[number]["value"]);
    setEditing(true);
  }
  function saveEdit() {
    if (!editTitle.trim()) return;
    const dueAt = editDate ? new Date(`${editDate}T${editTime||"00:00"}`).toISOString() : null;
    onUpdate?.(task.id, { title: editTitle.trim(), dueAt: dueAt as unknown as Date, emotionalState: editEmotion as Task["emotionalState"] });
    setEditing(false);
  }
  function handleSaveNote() { persistNote(task.id, noteDraft); setNote(noteDraft); setEditingNote(false); }
  function openNote() { setNoteDraft(note); setEditingNote(true); }
  function deleteNote() { persistNote(task.id, ""); setNote(""); setEditingNote(false); }

  // ── Edit form ──────────────────────────────────────────────────────
  if (editing) {
    return (
      <div style={{ background:"#fff", border:"1.5px solid #059669", borderRadius:12, padding:"14px 18px", boxShadow:"0 0 0 3px #f2fdec" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <span style={{ color:"#059669", fontSize:14 }}>✦</span>
          <input ref={editTitleRef} value={editTitle} onChange={e=>setEditTitle(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") saveEdit(); if(e.key==="Escape") setEditing(false); }}
            style={{ flex:1, border:"none", outline:"none", fontFamily:"inherit", fontSize:14, fontWeight:600, color:"#082d1d", background:"transparent" }} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
          <DatePickerField value={editDate} onChange={setEditDate} label="Due date" />
          <TimePickerField value={editTime} onChange={setEditTime} label="Due time" selectedDate={editDate} />
        </div>
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:11, fontWeight:600, color:"#4a6d47", marginBottom:8 }}>How do you feel about it?</p>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {EMOTIONS.map(s => { const active = editEmotion === s.value; return (
              <button key={s.value} onClick={()=>setEditEmotion(s.value)} style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:7, fontSize:11, fontWeight:600, background:active?s.activeBg:s.bg, color:active?"#fff":s.fg, border:`1px solid ${s.fg}30`, cursor:"pointer", fontFamily:"inherit" }}>{s.emoji} {s.label}</button>
            ); })}
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button onClick={()=>setEditing(false)} style={{ padding:"7px 16px", borderRadius:8, border:"1.5px solid #dde4de", background:"#fff", color:"#4a6d47", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
          <button onClick={saveEdit} style={{ padding:"7px 20px", borderRadius:8, border:"none", background:"#059669", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#047857"}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#059669"}>Save changes</button>
        </div>
      </div>
    );
  }

  // ── Card ──────────────────────────────────────────────────────────
  return (
    <>
      <div style={{
        background:"white", border:"1.5px solid #e4e9e4", borderRadius:14,
        padding:"14px 16px", opacity:done ? 0.6 : 1,
        transition:"box-shadow 0.15s, border-color 0.15s",
      }}
        onMouseEnter={e=>{ if(!done){ (e.currentTarget as HTMLElement).style.boxShadow="0 2px 10px rgba(8,45,29,0.07)"; (e.currentTarget as HTMLElement).style.borderColor="#c8d5cb"; }}}
        onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.boxShadow="none"; (e.currentTarget as HTMLElement).style.borderColor="#e4e9e4"; }}
      >
        <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>

          {/* Circle — binary toggle */}
          <div
            onClick={() => done ? onUncomplete?.(task.id) : onMarkDone?.(task.id)}
            title={done ? "Mark incomplete" : "Mark complete"}
            style={{
              width:26, height:26, borderRadius:"50%", flexShrink:0,
              border:`2px solid ${done ? "#059669" : "#c8d5cb"}`,
              background: done ? "#059669" : "white",
              cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              marginTop:2, transition:"all 0.15s",
            }}
            onMouseEnter={e=>{
              const el = e.currentTarget as HTMLElement;
              if (done) { el.style.background="#dc2626"; el.style.borderColor="#dc2626"; }
              else { el.style.borderColor="#059669"; el.style.background="#f0fdf4"; }
            }}
            onMouseLeave={e=>{
              const el = e.currentTarget as HTMLElement;
              el.style.background = done ? "#059669" : "white";
              el.style.borderColor = done ? "#059669" : "#c8d5cb";
            }}
          >
            {done && <Check size={11} color="white" strokeWidth={3} />}
          </div>

          {/* Content */}
          <div style={{ flex:1, minWidth:0 }}>

            {/* Top row: date/time + edit/delete */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:12 }}>
                {due ? (
                  <>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:3, color: due.overdue ? "#c23934" : "#6b7280" }}>
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1v4M11 1v4M2 7h12"/></svg>
                      {due.dateLabel}
                    </span>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:3, color:"#6b7280" }}>
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 2"/></svg>
                      {due.timeLabel}
                    </span>
                  </>
                ) : !done && (
                  <button onClick={()=>setDeferOpen(true)} style={{ fontSize:12, color:"#b9d3c4", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", padding:0 }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#059669"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#b9d3c4"}
                  >+ Set deadline</button>
                )}
              </div>

              {!done && (
                <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                  <button onClick={openEdit} title="Edit" style={{ width:26, height:26, borderRadius:7, border:"1px solid #e4e9e4", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#6b7280", transition:"all 0.12s" }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background="#f1f3ef"; (e.currentTarget as HTMLElement).style.borderColor="#c8d5cb"; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="#fff"; (e.currentTarget as HTMLElement).style.borderColor="#e4e9e4"; }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={()=>onDelete?.(task.id)} title="Delete" style={{ width:26, height:26, borderRadius:7, border:"1px solid #e4e9e4", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#6b7280", transition:"all 0.12s" }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background="#fff0ee"; (e.currentTarget as HTMLElement).style.color="#c23934"; (e.currentTarget as HTMLElement).style.borderColor="#f5c6c3"; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="#fff"; (e.currentTarget as HTMLElement).style.color="#6b7280"; (e.currentTarget as HTMLElement).style.borderColor="#e4e9e4"; }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              )}
            </div>

            {/* Title */}
            <div style={{ fontSize:15, fontWeight:700, color:done?"#a0b4a8":"#082d1d", lineHeight:1.35, textDecoration:done?"line-through":"none", marginBottom:10 }}>
              {task.title}
            </div>

            {/* Emotion + deferred */}
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
              {editingEmotion ? (
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <EmotionalStatePicker value={task.emotionalState as EmotionalState} compact
                    onChange={v=>{ if(v!==task.emotionalState) onUpdate?.(task.id,{emotionalState:v}); setEditingEmotion(false); }} />
                  <button onClick={()=>setEditingEmotion(false)} style={{ fontSize:10, color:"#c4cbc2", background:"none", border:"none", cursor:"pointer" }}>✕</button>
                </div>
              ) : (
                <button onClick={()=>!done&&setEditingEmotion(true)} style={{
                  display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px 2px 6px", borderRadius:20,
                  background:em.bg, color:em.fg, fontSize:11, fontWeight:600,
                  border:"none", cursor:done?"default":"pointer", fontFamily:"inherit",
                }}>
                  {em.emoji} {em.label}
                </button>
              )}

              {task.deferredCount > 0 && (
                <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:20, background:"#f8f9f5", border:"1px solid #dde4de", fontSize:10.5, fontWeight:600, color:"#3d5a4a" }}>
                  ↩ {task.deferredCount}×
                </span>
              )}

              {due?.overdue && !done && (
                <span style={{ fontSize:11, color:"#c23934", fontWeight:600 }}>Overdue</span>
              )}
            </div>

            {/* Note */}
            {mounted && (
              <div style={{ marginTop: note || editingNote ? 8 : 0 }}>
                {editingNote ? (
                  <div>
                    <textarea ref={noteRef} value={noteDraft} onChange={e=>setNoteDraft(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Escape") setEditingNote(false); }}
                      placeholder="Add a note…" rows={3}
                      style={{ width:"100%", fontSize:13, color:"#3d5a4a", background:"#f8f9f5", border:"1.5px solid #059669", borderRadius:8, padding:"8px 10px", outline:"none", fontFamily:"inherit", resize:"vertical", lineHeight:1.5, boxSizing:"border-box" }}
                    />
                    <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:6 }}>
                      {note && <button onClick={deleteNote} style={{ fontSize:12, color:"#c23934", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>Delete note</button>}
                      <button onClick={()=>setEditingNote(false)} style={{ fontSize:12, color:"#b9d3c4", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                      <button onClick={handleSaveNote} style={{ fontSize:12, fontWeight:600, color:"#059669", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>Save</button>
                    </div>
                  </div>
                ) : note ? (
                  <div onClick={()=>!done&&openNote()} style={{ fontSize:13, color:"#4a6d47", lineHeight:1.6, background:"#f8f9f5", borderRadius:8, padding:"8px 10px", cursor:done?"default":"pointer", borderLeft:"3px solid #c8f7ae", whiteSpace:"pre-wrap" }}
                    onMouseEnter={e=>{ if(!done) (e.currentTarget as HTMLElement).style.background="#f2fdec"; }}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#f8f9f5"}
                  >{note}</div>
                ) : !done ? (
                  <button onClick={openNote} style={{ fontSize:12, color:"#b9d3c4", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", padding:0 }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#059669"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#b9d3c4"}
                  >+ Add a note</button>
                ) : null}
              </div>
            )}

            {isNudged && !done && (
              <div style={{ marginTop:8 }}>
                <NudgeBanner task={task} onDefer={onDefer?d=>onDefer(task.id,d):undefined} onMarkDone={()=>onMarkDone?.(task.id)} />
              </div>
            )}
          </div>
        </div>
      </div>

      {onDefer && <DeferralModal open={deferOpen} onOpenChange={setDeferOpen} task={task} onConfirm={d=>onDefer(task.id,d)} />}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

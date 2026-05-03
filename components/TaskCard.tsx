"use client";

import { memo, useState, useRef, useEffect } from "react";
import type { Task } from "@prisma/client";
import type { TaskWithSubtasks } from "@/lib/types";
import { DeferralModal } from "@/components/DeferralModal";
import { DatePickerField } from "@/components/DatePickerField";
import { TimePickerField } from "@/components/TimePickerField";
import { NudgeBanner } from "@/components/NudgeBanner";
import { useUIStore } from "@/store/ui";
import { getEmotion } from "@/lib/emotions";
import { EmotionalStatePicker, type EmotionalState } from "@/components/EmotionalStatePicker";
import { Check, Plus, X, Pencil, Trash2, CalendarDays } from "lucide-react";

function fmtDue(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const date = isToday ? "Today" : isTomorrow ? "Tomorrow"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return { label: `${date} · ${time}`, overdue: d < now, isoDate: d.toISOString().slice(0,10), isoTime: d.toISOString().slice(11,16) };
}

function fmtShort(dueAt: Date | string | null) {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  const isToday = d.toDateString() === new Date().toDateString();
  return isToday
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const EMOTIONS = [
  { value:"DREADING", label:"Dreading", emoji:"😰", bg:"#FFF0EC", fg:"#D14626", strip:"#c23934", activeBg:"#D14626" },
  { value:"ANXIOUS",  label:"Anxious",  emoji:"😟", bg:"#FFF8E8", fg:"#B07A10", strip:"#886a00", activeBg:"#B07A10" },
  { value:"NEUTRAL",  label:"Neutral",  emoji:"😐", bg:"#F3F2F0", fg:"#7A756E", strip:"#c4cbc2", activeBg:"#3a3a3a" },
  { value:"WILLING",  label:"Willing",  emoji:"🙂", bg:"#EEF9F7", fg:"#0E8A7D", strip:"#2b6b5e", activeBg:"#0E8A7D" },
  { value:"EXCITED",  label:"Excited",  emoji:"🤩", bg:"#EEFAF1", fg:"#1A9444", strip:"#59d10b", activeBg:"#1A9444" },
] as const;

interface Props {
  task: TaskWithSubtasks;
  featured?: boolean;
  isLocallyCompleted?: boolean;
  canPushUp?: boolean;
  onPushUp?: (id: string) => void;
  onMarkDone?: (id: string) => void;
  onDefer?: (id: string, newDueAt: Date) => void;
  onUpdate?: (id: string, patch: Partial<Pick<Task, "title"|"dueAt"|"emotionalState">>) => void;
  onDelete?: (id: string) => void;
  onAddSubtask?: (parentId: string, title: string) => void;
  onCompleteSubtask?: (id: string) => void;
  onUncompleteSubtask?: (id: string) => void;
  onDeleteSubtask?: (id: string) => void;
}

function TaskCardInner({
  task, isLocallyCompleted=false, onMarkDone, onDefer, onUpdate, onDelete,
  onAddSubtask, onCompleteSubtask, onUncompleteSubtask, onDeleteSubtask,
}: Props) {
  const { nudgedTaskIds } = useUIStore();
  const isNudged = nudgedTaskIds.has(task.id);
  const em = EMOTIONS.find(e => e.value === task.emotionalState) ?? EMOTIONS[2];
  const due = fmtDue(task.dueAt);
  const completedSubs = task.subtasks.filter(s => s.isCompleted).length;
  const totalSubs = task.subtasks.length;

  const [deferOpen, setDeferOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingEmotion, setEditingEmotion] = useState(false);
  const [subInput, setSubInput] = useState("");
  const [showSubInput, setShowSubInput] = useState(false);
  // Per-subtask due editing
  const [editingSubDue, setEditingSubDue] = useState<string | null>(null);
  const [subDueDate, setSubDueDate] = useState("");
  const [subDueTime, setSubDueTime] = useState("");

  const subRef = useRef<HTMLInputElement>(null);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDate, setEditDate] = useState(due?.isoDate ?? "");
  const [editTime, setEditTime] = useState(due?.isoTime ?? "");
  const [editEmotion, setEditEmotion] = useState(task.emotionalState as typeof EMOTIONS[number]["value"]);
  const [newSub, setNewSub] = useState("");
  const editTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (showSubInput) subRef.current?.focus(); }, [showSubInput]);
  useEffect(() => { if (editing) editTitleRef.current?.focus(); }, [editing]);

  function openEdit() {
    setEditTitle(task.title); setEditDate(due?.isoDate ?? "");
    setEditTime(due?.isoTime ?? ""); setEditEmotion(task.emotionalState as typeof EMOTIONS[number]["value"]);
    setNewSub(""); setEditing(true);
  }
  function saveEdit() {
    if (!editTitle.trim()) return;
    const dueAt = editDate ? new Date(`${editDate}T${editTime||"00:00"}`).toISOString() : null;
    onUpdate?.(task.id, { title: editTitle.trim(), dueAt: dueAt as unknown as Date, emotionalState: editEmotion as Task["emotionalState"] });
    setEditing(false);
  }
  function addSubtask() {
    const t = subInput.trim(); if (t) onAddSubtask?.(task.id, t);
    setSubInput(""); setShowSubInput(false);
  }

  // Subtask due date: constrained between parent createdAt → parent dueAt
  const parentMin = task.createdAt ? new Date(task.createdAt).toISOString().slice(0,10) : undefined;
  const parentMax = task.dueAt    ? new Date(task.dueAt).toISOString().slice(0,10)    : undefined;

  function openSubDue(sub: Task) {
    const d = sub.dueAt ? new Date(sub.dueAt) : null;
    setSubDueDate(d ? d.toISOString().slice(0,10) : "");
    setSubDueTime(d ? d.toISOString().slice(11,16) : "");
    setEditingSubDue(sub.id);
  }
  function saveSubDue(subId: string) {
    const dueAt = subDueDate ? new Date(`${subDueDate}T${subDueTime||"00:00"}`).toISOString() : null;
    onUpdate?.(subId, { dueAt: dueAt as unknown as Date });
    setEditingSubDue(null);
  }

  // ── Inline edit form ──────────────────────────────────────────────
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
        {task.subtasks.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <p style={{ fontSize:11, fontWeight:600, color:"#4a6d47", marginBottom:8 }}>Action items</p>
            {task.subtasks.map(sub => (
              <div key={sub.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                <div style={{ width:12, height:12, borderRadius:"50%", border:`1.5px solid ${sub.isCompleted?"#059669":"#dde4de"}`, background:sub.isCompleted?"#059669":"#fff", flexShrink:0 }} />
                <span style={{ flex:1, fontSize:12.5, color:sub.isCompleted?"#b9d3c4":"#3d5a4a", textDecoration:sub.isCompleted?"line-through":"none" }}>{sub.title}</span>
                <button onClick={()=>onDeleteSubtask?.(sub.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#dde4de", padding:0 }} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#c23934"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#dde4de"}><X size={11} /></button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <span style={{ width:10, height:10, borderRadius:3, border:"1.5px dashed #dde4de", flexShrink:0 }} />
          <input value={newSub} onChange={e=>setNewSub(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&newSub.trim()){ onAddSubtask?.(task.id,newSub.trim()); setNewSub(""); }}} placeholder="Add action item…" style={{ flex:1, border:"none", borderBottom:"1px solid #dde4de", outline:"none", fontSize:12.5, color:"#082d1d", background:"transparent", fontFamily:"inherit", paddingBottom:2 }} />
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button onClick={()=>setEditing(false)} style={{ padding:"7px 16px", borderRadius:8, border:"1.5px solid #dde4de", background:"#fff", color:"#4a6d47", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
          <button onClick={saveEdit} style={{ padding:"7px 20px", borderRadius:8, border:"none", background:"#059669", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#047857"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#059669"}>Save changes</button>
        </div>
      </div>
    );
  }

  // ── Card ─────────────────────────────────────────────────────────
  return (
    <>
      <div style={{
        background:"white", border:"1.5px solid #dde4de", borderRadius:12,
        padding:"14px 18px", opacity:isLocallyCompleted?0.65:1,
        transition:"border-color 0.15s, box-shadow 0.15s",
      }}
        onMouseEnter={e=>{ if(!isLocallyCompleted){ (e.currentTarget as HTMLElement).style.borderColor="#c4cbc2"; (e.currentTarget as HTMLElement).style.boxShadow="0 2px 8px rgba(8,45,29,0.05)"; }}}
        onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.borderColor="#dde4de"; (e.currentTarget as HTMLElement).style.boxShadow="none"; }}
      >
        {/* Row 1: circle + title + edit/delete */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <div onClick={()=>onMarkDone?.(task.id)} title={isLocallyCompleted?"Mark as active":"Complete"} style={{
            width:17, height:17, borderRadius:"50%", flexShrink:0,
            border:`1.5px solid ${isLocallyCompleted?"#059669":"#dde4de"}`,
            background:isLocallyCompleted?"#059669":"white",
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            transition:"border-color 0.15s, background 0.15s",
          }}
            onMouseEnter={e=>{ isLocallyCompleted?((e.currentTarget as HTMLElement).style.background="#dc2626",(e.currentTarget as HTMLElement).style.borderColor="#dc2626"):((e.currentTarget as HTMLElement).style.borderColor="#059669",(e.currentTarget as HTMLElement).style.background="#f2fdec"); }}
            onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background=isLocallyCompleted?"#059669":"white"; (e.currentTarget as HTMLElement).style.borderColor=isLocallyCompleted?"#059669":"#dde4de"; }}
          >
            {isLocallyCompleted && <Check size={9} color="white" strokeWidth={3} />}
          </div>

          <span style={{ flex:1, fontSize:15, fontWeight:700, color:isLocallyCompleted?"#b9d3c4":"#082d1d", lineHeight:1.35, textDecoration:isLocallyCompleted?"line-through":"none" }}>
            {task.title}
          </span>

          {!isLocallyCompleted && (
            <div style={{ display:"flex", gap:6, flexShrink:0 }}>
              <button onClick={openEdit} style={{ width:26, height:26, borderRadius:7, border:"1px solid #dde4de", background:"#f8f9f5", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#4a6d47", fontSize:13, transition:"all 0.12s" }}
                onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background="#e4f0eb"; (e.currentTarget as HTMLElement).style.color="#059669"; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="#f8f9f5"; (e.currentTarget as HTMLElement).style.color="#4a6d47"; }}
              >✏</button>
              <button onClick={()=>onDelete?.(task.id)} style={{ width:26, height:26, borderRadius:7, border:"1px solid #fecaca", background:"#fff0f0", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#c23934", fontSize:14, transition:"all 0.12s" }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fee2e2"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#fff0f0"}
              >✕</button>
            </div>
          )}
        </div>

        {/* Row 2: feeling | due date | subtask count | deferred count */}
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom: totalSubs > 0 ? 12 : 0, flexWrap:"wrap" }}>
          {/* Feeling — clickable to change */}
          {editingEmotion ? (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <EmotionalStatePicker value={task.emotionalState as EmotionalState} compact
                onChange={v=>{ if(v!==task.emotionalState) onUpdate?.(task.id,{emotionalState:v}); setEditingEmotion(false); }} />
              <button onClick={()=>setEditingEmotion(false)} style={{ fontSize:10, color:"#c4cbc2", background:"none", border:"none", cursor:"pointer" }}>✕</button>
            </div>
          ) : (
            <button onClick={()=>!isLocallyCompleted&&setEditingEmotion(true)} style={{
              display:"inline-flex", alignItems:"center", gap:5, padding:"3px 9px 3px 7px", borderRadius:20,
              background:em.bg, color:em.fg, fontSize:11, fontWeight:600, letterSpacing:"0.01em",
              border:"none", cursor:isLocallyCompleted?"default":"pointer", fontFamily:"inherit",
            }}>
              {em.emoji} {em.label}
            </button>
          )}

          {/* Due date — clickable to change (= defer) */}
          {due ? (
            <button
              onClick={()=>!isLocallyCompleted&&setDeferOpen(true)}
              style={{
                display:"inline-flex", alignItems:"center", gap:5, padding:"3px 9px", borderRadius:20,
                background:due.overdue?"#FFF0EC":"#f3f4f6",
                border:`1px solid ${due.overdue?"#fecaca":"transparent"}`,
                fontSize:11.5, fontWeight:500, color:due.overdue?"#c23934":"#3d5a4a",
                cursor:isLocallyCompleted?"default":"pointer", fontFamily:"inherit", transition:"background 0.12s",
              }}
              onMouseEnter={e=>{ if(!isLocallyCompleted) (e.currentTarget as HTMLElement).style.background=due.overdue?"#fee2e2":"#e8ece8"; }}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=due.overdue?"#FFF0EC":"#f3f4f6"}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1v4M11 1v4M2 7h12"/></svg>
              {due.label}
            </button>
          ) : (!isLocallyCompleted && (
            <button onClick={()=>setDeferOpen(true)} style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:20, background:"#f3f4f6", border:"1px dashed #dde4de", fontSize:11, fontWeight:500, color:"#b9d3c4", cursor:"pointer", fontFamily:"inherit" }}>
              + Set deadline
            </button>
          ))}

          {/* Subtask count */}
          {totalSubs > 0 && (
            <span style={{ fontSize:11, fontWeight:500, color:"#b9d3c4", padding:"3px 0" }}>
              {completedSubs}/{totalSubs} tasks
            </span>
          )}

          {/* Deferred count — only if > 0 */}
          {task.deferredCount > 0 && (
            <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:20, background:"#f8f9f5", border:"1px solid #dde4de", fontSize:10.5, fontWeight:600, color:"#3d5a4a" }}>
              ↩ {task.deferredCount} deferred
            </span>
          )}
        </div>

        {/* Progress bar */}
        {totalSubs > 0 && (
          <div style={{ display:"flex", gap:3, marginBottom:10 }}>
            {task.subtasks.map((sub,i) => (
              <div key={i} style={{ height:4, flex:1, borderRadius:2, background:sub.isCompleted?em.strip:"#f0f0f0", transition:"background 0.2s" }} />
            ))}
          </div>
        )}

        {/* Divider before subtasks */}
        {totalSubs > 0 && <div style={{ height:1, background:"#f0f0f0", marginBottom:10 }} />}

        {/* Subtasks */}
        {task.subtasks.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:10 }}>
            {task.subtasks.map(sub => (
              <div key={sub.id}>
                <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                  {/* Subtask circle */}
                  <div onClick={()=>sub.isCompleted?onUncompleteSubtask?.(sub.id):onCompleteSubtask?.(sub.id)} style={{
                    width:15, height:15, borderRadius:"50%", flexShrink:0,
                    border:`1.5px solid ${sub.isCompleted?"#059669":"#dde4de"}`,
                    background:sub.isCompleted?"#059669":"white",
                    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"border-color 0.15s, background 0.15s",
                  }}
                    onMouseEnter={e=>{ sub.isCompleted?((e.currentTarget as HTMLElement).style.background="#dc2626",(e.currentTarget as HTMLElement).style.borderColor="#dc2626"):((e.currentTarget as HTMLElement).style.borderColor="#059669"); }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background=sub.isCompleted?"#059669":"white"; (e.currentTarget as HTMLElement).style.borderColor=sub.isCompleted?"#059669":"#dde4de"; }}
                  >
                    {sub.isCompleted && <Check size={8} color="white" strokeWidth={3} />}
                  </div>

                  {/* Subtask title */}
                  <span style={{ flex:1, fontSize:13, fontWeight:500, color:sub.isCompleted?"#b9d3c4":"#3d5a4a", textDecoration:sub.isCompleted?"line-through":"none" }}>
                    {sub.title}
                  </span>

                  {/* Delete subtask */}
                  {!isLocallyCompleted && (
                    <span onClick={()=>onDeleteSubtask?.(sub.id)} style={{ color:"#e8ece8", cursor:"pointer", display:"flex", fontSize:12 }}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#c23934"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#e8ece8"}
                    ><X size={11} /></span>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Add subtask */}
        {!isLocallyCompleted && (
          showSubInput ? (
            <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:4 }}>
              <div style={{ width:15, height:15, borderRadius:"50%", border:"1.5px dashed #dde4de", flexShrink:0 }} />
              <input ref={subRef} value={subInput} onChange={e=>setSubInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") addSubtask(); if(e.key==="Escape"){ setSubInput(""); setShowSubInput(false); }}}
                onBlur={()=>{ if(!subInput.trim()) setShowSubInput(false); else addSubtask(); }}
                placeholder="Add subtask…"
                style={{ flex:1, fontSize:13, color:"#082d1d", background:"transparent", border:"none", borderBottom:"1px solid #059669", outline:"none", fontFamily:"inherit" }}
              />
            </div>
          ) : (
            <button onClick={()=>setShowSubInput(true)} style={{ display:"inline-flex", alignItems:"center", gap:5, background:"none", border:"none", cursor:"pointer", fontSize:12, color:"#b9d3c4", fontFamily:"inherit", padding:0 }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#059669"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#b9d3c4"}
            ><Plus size={11} strokeWidth={2.5} /> Add subtask</button>
          )
        )}

        {isNudged && !isLocallyCompleted && (
          <div style={{ marginTop:8 }}>
            <NudgeBanner task={task} onDefer={onDefer?d=>onDefer(task.id,d):undefined} onMarkDone={()=>onMarkDone?.(task.id)} />
          </div>
        )}
      </div>

      {onDefer && <DeferralModal open={deferOpen} onOpenChange={setDeferOpen} task={task} onConfirm={d=>onDefer(task.id,d)} />}
    </>
  );
}

export const TaskCard = memo(TaskCardInner);

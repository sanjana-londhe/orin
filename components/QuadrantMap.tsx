"use client";

import { useState, useCallback, useMemo } from "react";
import { scaleLinear } from "d3-scale";
import { getEmotion, EMOTION_MAP } from "@/lib/emotions";



export interface QuadrantTask {
  id: string;
  title: string;
  emotionalState: string;
  urgencyScore: number;
  emotionalWeight: number;
  dueAt: string | null;
  deferredCount: number;
  isCompleted: boolean;
}

interface TooltipState {
  taskId: string;
  x: number;
  y: number;
}

interface Props {
  tasks: QuadrantTask[];
}

// Fixed viewBox
const VW = 580;
const VH = 360;
const PAD = { top: 28, right: 20, bottom: 40, left: 18 };
const W = VW - PAD.left - PAD.right;
const H = VH - PAD.top - PAD.bottom;
const TOOLTIP_W = 224;
const TOOLTIP_H = 86;
const DOT_OFFSET = 14;

const xScale = scaleLinear().domain([0, 1]).range([0, W]);
const yScale = scaleLinear().domain([1, 5]).range([H, 0]);

function relativeDeadline(dueAt: string | null): string {
  if (!dueAt) return "No deadline";
  const diffMs = new Date(dueAt).getTime() - Date.now();
  const diffH = diffMs / (1000 * 60 * 60);
  const abs = Math.abs(diffH);
  const past = diffH < 0;

  if (abs < 1) return past ? "just overdue" : "due in < 1 hour";
  if (abs < 24) {
    const h = Math.round(abs);
    return past ? `${h}h overdue` : `in ${h} hour${h !== 1 ? "s" : ""}`;
  }
  const d = Math.round(abs / 24);
  return past ? `${d} day${d !== 1 ? "s" : ""} overdue` : `in ${d} day${d !== 1 ? "s" : ""}`;
}

export function QuadrantMap({ tasks }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const showTooltip = useCallback((id: string, x: number, y: number) => {
    setTooltip({ taskId: id, x, y });
  }, []);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  const activeTask = tooltip ? tasks.find((t) => t.id === tooltip.taskId) ?? null : null;

  // Memoize dot positions — recomputes only when tasks change, not on tooltip hover
  const dotPositions = useMemo(() =>
    tasks.map((t) => ({
      ...t,
      cx: PAD.left + xScale(t.urgencyScore),
      cy: PAD.top + yScale(t.emotionalWeight),
      colour: getEmotion(t.emotionalState).chartColor,
    })),
    [tasks]
  );

  // Edge-flip: offset 14px right, flip left if near right edge
  const ttX = tooltip
    ? tooltip.x + DOT_OFFSET + TOOLTIP_W > VW - PAD.right
      ? tooltip.x - DOT_OFFSET - TOOLTIP_W
      : tooltip.x + DOT_OFFSET
    : 0;
  const ttY = tooltip
    ? Math.max(PAD.top, Math.min(tooltip.y - TOOLTIP_H / 2, VH - PAD.bottom - TOOLTIP_H))
    : 0;

  return (
    <div className="relative w-full">
      {/* Legend — top */}
      <div className="flex flex-wrap gap-4 mb-3 px-1">
        {Object.entries(EMOTION_MAP).map(([state, em]) => (
          <div key={state} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: em.chartColor }} />
            <span className="text-[11.5px] font-medium" style={{ color: "#3d5a4a" }}>{em.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
            <circle cx="5" cy="5" r="4" fill="#fff" stroke="#3d5a4a" strokeWidth="1.5" strokeDasharray="2 1.5" opacity="0.6" />
          </svg>
          <span className="text-[11.5px] font-medium" style={{ color: "#3d5a4a" }}>Completed</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full h-auto"
        aria-label="Emotional task quadrant map"
        // Mobile: tap outside any dot clears tooltip
        onClick={() => hideTooltip()}
      >
        {/* Background — neutral white */}
        <rect x={PAD.left} y={PAD.top} width={W} height={H} fill="#ffffff" rx="8" />

        {/* Quadrant fills — stronger, clearly distinct */}
        {/* Top-right: urgent + dreading = danger (red tint) */}
        <rect x={PAD.left + W / 2} y={PAD.top} width={W / 2} height={H / 2}
          fill="rgba(239,68,68,0.10)" rx="0" />
        {/* Top-left: far + dreading = worry (amber tint) */}
        <rect x={PAD.left} y={PAD.top} width={W / 2} height={H / 2}
          fill="rgba(245,158,11,0.07)" rx="0" />
        {/* Bottom-right: urgent + excited = energised (green tint) */}
        <rect x={PAD.left + W / 2} y={PAD.top + H / 2} width={W / 2} height={H / 2}
          fill="rgba(34,197,94,0.08)" rx="0" />
        {/* Bottom-left: far + excited = safe zone (teal tint) */}
        <rect x={PAD.left} y={PAD.top + H / 2} width={W / 2} height={H / 2}
          fill="rgba(20,184,166,0.10)" rx="0" />

        {/* Centrelines */}
        <line x1={PAD.left} y1={PAD.top + H / 2} x2={PAD.left + W} y2={PAD.top + H / 2}
          stroke="#dde4de" strokeWidth="1.5" strokeDasharray="5 4" />
        <line x1={PAD.left + W / 2} y1={PAD.top} x2={PAD.left + W / 2} y2={PAD.top + H}
          stroke="#dde4de" strokeWidth="1.5" strokeDasharray="5 4" />

        {/* Quadrant corner labels */}
        <text x={PAD.left + W - 10} y={PAD.top + 14}
          textAnchor="end" fontSize="9.5" fontWeight="700" letterSpacing="0.06em"
          fill="#EF4444" fontFamily="monospace" opacity="0.7">
          🔥 ON FIRE
        </text>
        <text x={PAD.left + 10} y={PAD.top + H - 10}
          textAnchor="start" fontSize="9.5" fontWeight="700" letterSpacing="0.06em"
          fill="#14B8A6" fontFamily="monospace" opacity="0.7">
          ✓ SAFE ZONE
        </text>

        {/* ── X axis — bottom ── */}
        {/* Arrow line */}
        <line x1={PAD.left} y1={VH - 14} x2={PAD.left + W} y2={VH - 14}
          stroke="#c4cbc2" strokeWidth="1" />
        <polygon points={`${PAD.left + W},${VH - 17} ${PAD.left + W + 6},${VH - 14} ${PAD.left + W},${VH - 11}`}
          fill="#c4cbc2" />
        {/* Labels */}
        <text x={PAD.left + 2} y={VH - 5}
          textAnchor="start" fontSize="9" fill="#82A898" fontFamily="inherit">
          Far off
        </text>
        <text x={PAD.left + W / 2} y={VH - 5}
          textAnchor="middle" fontSize="9" fontWeight="600" fill="#4a6d47" fontFamily="inherit" letterSpacing="0.04em">
          DEADLINE URGENCY
        </text>
        <text x={PAD.left + W} y={VH - 5}
          textAnchor="end" fontSize="9" fill="#82A898" fontFamily="inherit">
          Imminent
        </text>

        {/* ── Y axis — left ── */}
        {/* Arrow line */}
        <line x1={PAD.left - 2} y1={PAD.top + H} x2={PAD.left - 2} y2={PAD.top}
          stroke="#c4cbc2" strokeWidth="1" />
        <polygon points={`${PAD.left - 5},${PAD.top} ${PAD.left - 2},${PAD.top - 6} ${PAD.left + 1},${PAD.top}`}
          fill="#c4cbc2" />
        {/* Rotated label */}
        <text x={-(PAD.top + H / 2)} y={8}
          textAnchor="middle" fontSize="9" fontWeight="600" fill="#4a6d47"
          fontFamily="inherit" letterSpacing="0.04em"
          transform="rotate(-90)">
          EMOTIONAL WEIGHT
        </text>
        <text x={-(PAD.top + H - 4)} y={8}
          textAnchor="start" fontSize="9" fill="#82A898" fontFamily="inherit"
          transform="rotate(-90)">
          Excited ↓
        </text>
        <text x={-(PAD.top + 12)} y={8}
          textAnchor="end" fontSize="9" fill="#82A898" fontFamily="inherit"
          transform="rotate(-90)">
          ↑ Dreading
        </text>

        {/* Dots — positions memoized, only active state changes on hover */}
        {dotPositions.map((t) => {
          const { cx, cy, colour } = t;
          const active = tooltip?.taskId === t.id;
          const done = t.isCompleted;

          return (
            <circle
              key={t.id}
              cx={cx} cy={cy}
              r={active ? 7 : 5}
              fill={done ? "#ffffff" : colour}
              stroke={colour}
              strokeWidth={done ? 2 : 2}
              strokeDasharray={done ? "3 2" : undefined}
              opacity={done ? 0.55 : 1}
              style={{ cursor: "pointer", transition: "r 0.13s" }}
              aria-label={t.title}
              tabIndex={0}
              onMouseEnter={() => showTooltip(t.id, cx, cy)}
              onMouseLeave={hideTooltip}
              onClick={(e) => {
                e.stopPropagation();
                tooltip?.taskId === t.id ? hideTooltip() : showTooltip(t.id, cx, cy);
              }}
              onFocus={() => showTooltip(t.id, cx, cy)}
              onBlur={hideTooltip}
            />
          );
        })}

        {/* Tooltip */}
        {activeTask && (() => {
          const em = getEmotion(activeTask.emotionalState);
          return (
            <foreignObject x={ttX} y={ttY} width={TOOLTIP_W} height={TOOLTIP_H}
              style={{ pointerEvents: "none" }}>
              <div style={{
                background: "#fff",
                border: "1.5px solid #dde4de",
                borderRadius: 4,
                padding: "9px 12px",
                fontFamily: "inherit",
                lineHeight: 1.45,
                boxShadow: "0 2px 10px rgba(0,0,0,0.09)",
              }}>
                {/* Checkbox + title */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 15, height: 15, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                    border: `1.5px solid ${activeTask.isCompleted ? "#059669" : "#dde4de"}`,
                    background: activeTask.isCompleted ? "#059669" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {activeTask.isCompleted && (
                      <svg width="7" height="5" viewBox="0 0 11 8" fill="none">
                        <path d="M1 4l3 3 6-6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 500, color: "#082d1d",
                    textDecoration: activeTask.isCompleted ? "line-through" : "none",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    flex: 1,
                  }}>
                    {activeTask.title}
                  </div>
                </div>
                {/* Emotion pill + due/status */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 999,
                    background: em.pillBg, color: em.pillText,
                  }}>
                    {em.emoji} {em.label}
                  </span>
                  {activeTask.isCompleted ? (
                    <span style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>· Done</span>
                  ) : activeTask.deferredCount > 0 ? (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 999,
                      background: "#fcf0f3", color: "#c23934", border: "1px solid #e9c3c1",
                    }}>deferred {activeTask.deferredCount}×</span>
                  ) : activeTask.dueAt ? (
                    <span style={{ fontSize: 11, color: "#4a6d47" }}>· {relativeDeadline(activeTask.dueAt)}</span>
                  ) : null}
                </div>
              </div>
            </foreignObject>
          );
        })()}
      </svg>

    </div>
  );
}

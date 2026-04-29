"use client";

import { useState, useCallback, useMemo } from "react";
import { scaleLinear } from "d3-scale";

const EMOTION_COLOUR: Record<string, string> = {
  DREADING: "#c23934",
  ANXIOUS:  "#886a00",
  NEUTRAL:  "#c4cbc2",
  WILLING:  "#2b6b5e",
  EXCITED:  "#59d10b",
};

const EMOTION_LABEL: Record<string, string> = {
  DREADING: "Dreading",
  ANXIOUS:  "Anxious",
  NEUTRAL:  "Neutral",
  WILLING:  "Willing",
  EXCITED:  "Excited",
};

export interface QuadrantTask {
  id: string;
  title: string;
  emotionalState: string;
  urgencyScore: number;
  emotionalWeight: number;
  dueAt: string | null;
  deferredCount: number;
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
const VW = 560;
const VH = 340;
const PAD = { top: 28, right: 28, bottom: 36, left: 36 };
const W = VW - PAD.left - PAD.right;
const H = VH - PAD.top - PAD.bottom;
const TOOLTIP_W = 168;
const TOOLTIP_H = 64;
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
      colour: EMOTION_COLOUR[t.emotionalState] ?? "#c4cbc2",
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
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full h-auto"
        aria-label="Emotional task quadrant map"
        // Mobile: tap outside any dot clears tooltip
        onClick={() => hideTooltip()}
      >
        {/* Background */}
        <rect x={PAD.left} y={PAD.top} width={W} height={H} fill="#f2fdec" rx="8" />

        {/* Quadrant fills */}
        <rect x={PAD.left + W / 2} y={PAD.top}
          width={W / 2} height={H / 2}
          fill="rgba(239,68,68,0.08)" />
        <rect x={PAD.left} y={PAD.top + H / 2}
          width={W / 2} height={H / 2}
          fill="rgba(20,184,166,0.08)" />

        {/* Dashed centrelines */}
        <line x1={PAD.left} y1={PAD.top + H / 2} x2={PAD.left + W} y2={PAD.top + H / 2}
          stroke="#c4cbc2" strokeWidth="1" strokeDasharray="4 4" />
        <line x1={PAD.left + W / 2} y1={PAD.top} x2={PAD.left + W / 2} y2={PAD.top + H}
          stroke="#c4cbc2" strokeWidth="1" strokeDasharray="4 4" />

        {/* Quadrant labels */}
        <text x={PAD.left + W - 8} y={PAD.top + 16}
          textAnchor="end" fontSize="9" fontWeight="600" letterSpacing="0.07em"
          fill="rgba(194,57,52,0.4)" fontFamily="monospace">
          ON FIRE
        </text>
        <text x={PAD.left + 8} y={PAD.top + H - 10}
          textAnchor="start" fontSize="9" fontWeight="600" letterSpacing="0.07em"
          fill="rgba(43,107,94,0.4)" fontFamily="monospace">
          SAFE ZONE
        </text>

        {/* Axis labels */}
        <text x={PAD.left + W / 2} y={VH - 4}
          textAnchor="middle" fontSize="8" fill="#b9d3c4" letterSpacing="0.05em">
          ← far off · DEADLINE URGENCY · imminent →
        </text>
        <text x={10} y={PAD.top + H / 2}
          textAnchor="middle" fontSize="8" fill="#b9d3c4" letterSpacing="0.05em"
          transform={`rotate(-90, 10, ${PAD.top + H / 2})`}>
          dreading ↑ · EMOTIONAL · ↓ excited
        </text>

        {/* Dots — positions memoized, only active state changes on hover */}
        {dotPositions.map((t) => {
          const { cx, cy, colour } = t;
          const active = tooltip?.taskId === t.id;

          return (
            <circle
              key={t.id}
              cx={cx} cy={cy}
              r={active ? 7 : 5}
              fill={colour}
              stroke="#f2fdec"
              strokeWidth="2.5"
              style={{ cursor: "pointer", transition: "r 0.13s" }}
              aria-label={t.title}
              tabIndex={0}
              // Desktop: hover
              onMouseEnter={() => showTooltip(t.id, cx, cy)}
              onMouseLeave={hideTooltip}
              // Mobile: tap toggles
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
        {activeTask && (
          <foreignObject x={ttX} y={ttY} width={TOOLTIP_W} height={TOOLTIP_H}
            style={{ pointerEvents: "none" }}>
            <div style={{
              background: "#fff",
              border: "1.5px solid #dde4de",
              borderRadius: 8,
              padding: "7px 10px",
              boxShadow: "2px 2px 0 #050e11",
              fontSize: 11,
              lineHeight: 1.45,
              color: "#082d1d",
              fontFamily: "inherit",
            }}>
              {/* Title */}
              <div style={{
                fontWeight: 700,
                marginBottom: 3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {activeTask.title}
              </div>
              {/* Coloured state label */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                <span style={{
                  display: "inline-block",
                  width: 6, height: 6,
                  borderRadius: "50%",
                  background: EMOTION_COLOUR[activeTask.emotionalState] ?? "#c4cbc2",
                  flexShrink: 0,
                }} />
                <span style={{ color: EMOTION_COLOUR[activeTask.emotionalState] ?? "#4a6d47", fontWeight: 600 }}>
                  {EMOTION_LABEL[activeTask.emotionalState] ?? activeTask.emotionalState}
                </span>
              </div>
              {/* Relative deadline */}
              <div style={{ color: "#4a6d47", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{relativeDeadline(activeTask.dueAt)}</span>
                {/* Deferred count — only if > 0 */}
                {activeTask.deferredCount > 0 && (
                  <span style={{
                    background: "#fcf0f3",
                    color: "#c23934",
                    border: "1px solid #e9c3c1",
                    borderRadius: 4,
                    padding: "0 5px",
                    fontSize: 10,
                    fontWeight: 600,
                  }}>
                    deferred {activeTask.deferredCount}×
                  </span>
                )}
              </div>
            </div>
          </foreignObject>
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 px-1">
        {Object.entries(EMOTION_COLOUR).map(([state, colour]) => (
          <div key={state} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colour }} />
            <span className="text-[11px] text-[var(--stone-500)]">
              {EMOTION_LABEL[state]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

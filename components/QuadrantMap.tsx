"use client";

import { useState } from "react";
import { scaleLinear } from "d3-scale";

const EMOTION_COLOUR: Record<string, string> = {
  DREADING: "#c23934",
  ANXIOUS:  "#886a00",
  NEUTRAL:  "#c4cbc2",
  WILLING:  "#2b6b5e",
  EXCITED:  "#59d10b",
};

export interface QuadrantTask {
  id: string;
  title: string;
  emotionalState: string;
  urgencyScore: number;
  emotionalWeight: number;
  dueAt: string | null;
}

interface Props {
  tasks: QuadrantTask[];
}

// Fixed viewBox — scales correctly at any container width
const VW = 560;
const VH = 340;
const PAD = { top: 28, right: 28, bottom: 36, left: 36 };
const W = VW - PAD.left - PAD.right;
const H = VH - PAD.top - PAD.bottom;

const xScale = scaleLinear().domain([0, 1]).range([0, W]);
const yScale = scaleLinear().domain([1, 5]).range([H, 0]); // 1=bottom(excited), 5=top(dreading)

export function QuadrantMap({ tasks }: Props) {
  const [tooltip, setTooltip] = useState<{
    task: QuadrantTask; x: number; y: number;
  } | null>(null);

  const cx = PAD.left + W / 2;
  const cy = PAD.top + H / 2;

  return (
    <div className="relative w-full" onMouseLeave={() => setTooltip(null)}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full h-auto"
        aria-label="Emotional task quadrant map"
      >
        {/* ── Background ── */}
        <rect x={PAD.left} y={PAD.top} width={W} height={H}
          fill="#f2fdec" rx="8" />

        {/* ── Quadrant fills ── */}
        {/* top-right — on fire */}
        <rect x={PAD.left + W / 2} y={PAD.top} width={W / 2} height={H / 2}
          fill="rgba(194,57,52,0.08)" rx="0" />
        {/* bottom-left — safe zone */}
        <rect x={PAD.left} y={PAD.top + H / 2} width={W / 2} height={H / 2}
          fill="rgba(43,107,94,0.08)" rx="0" />

        {/* ── Dashed centrelines ── */}
        <line x1={PAD.left} y1={cy} x2={PAD.left + W} y2={cy}
          stroke="#c4cbc2" strokeWidth="1" strokeDasharray="4 4" />
        <line x1={cx} y1={PAD.top} x2={cx} y2={PAD.top + H}
          stroke="#c4cbc2" strokeWidth="1" strokeDasharray="4 4" />

        {/* ── Quadrant labels ── */}
        <text x={PAD.left + W - 8} y={PAD.top + 16}
          textAnchor="end" fontSize="9" fontWeight="600"
          letterSpacing="0.07em" textDecoration="none"
          fill="rgba(194,57,52,0.45)" fontFamily="monospace">
          ON FIRE
        </text>
        <text x={PAD.left + 8} y={PAD.top + H - 10}
          textAnchor="start" fontSize="9" fontWeight="600"
          letterSpacing="0.07em"
          fill="rgba(43,107,94,0.45)" fontFamily="monospace">
          SAFE ZONE
        </text>

        {/* ── Axis labels ── */}
        <text x={PAD.left + W / 2} y={VH - 4}
          textAnchor="middle" fontSize="8" fill="#c4cbc2" letterSpacing="0.05em">
          ← far off · DEADLINE URGENCY · imminent →
        </text>
        <text
          x={10} y={PAD.top + H / 2}
          textAnchor="middle" fontSize="8" fill="#c4cbc2" letterSpacing="0.05em"
          transform={`rotate(-90, 10, ${PAD.top + H / 2})`}>
          dreading ↑ · EMOTIONAL · ↓ excited
        </text>

        {/* ── Dots ── */}
        {tasks.map((t) => {
          const dotX = PAD.left + xScale(t.urgencyScore);
          const dotY = PAD.top + yScale(t.emotionalWeight);
          const colour = EMOTION_COLOUR[t.emotionalState] ?? "#c4cbc2";
          const isHovered = tooltip?.task.id === t.id;

          return (
            <circle
              key={t.id}
              cx={dotX} cy={dotY}
              r={isHovered ? 7 : 5}
              fill={colour}
              stroke="#f2fdec"
              strokeWidth="2.5"
              style={{ cursor: "pointer", transition: "r 0.13s" }}
              aria-label={t.title}
              onMouseEnter={() => setTooltip({ task: t, x: dotX, y: dotY })}
              onFocus={() => setTooltip({ task: t, x: dotX, y: dotY })}
              tabIndex={0}
            />
          );
        })}

        {/* ── Tooltip (SVG foreignObject for styled HTML) ── */}
        {tooltip && (() => {
          const TW = 160;
          const TH = 52;
          // Edge-flip: keep tooltip inside viewBox
          const tx = Math.min(tooltip.x + 14, VW - TW - 4);
          const ty = Math.max(tooltip.y - TH - 8, PAD.top);
          return (
            <foreignObject x={tx} y={ty} width={TW} height={TH}>
              <div
                style={{
                  background: "#fff",
                  border: "1.5px solid #dde4de",
                  borderRadius: 8,
                  padding: "6px 10px",
                  boxShadow: "2px 2px 0 #050e11",
                  fontSize: 11,
                  lineHeight: 1.4,
                  color: "#082d1d",
                  fontFamily: "inherit",
                  pointerEvents: "none",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{tooltip.task.title}</div>
                <div style={{ color: "#4a6d47" }}>
                  {tooltip.task.emotionalState.charAt(0) + tooltip.task.emotionalState.slice(1).toLowerCase()}
                  {tooltip.task.dueAt
                    ? ` · ${new Date(tooltip.task.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : " · no deadline"}
                </div>
              </div>
            </foreignObject>
          );
        })()}
      </svg>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-4 mt-3 px-1">
        {Object.entries(EMOTION_COLOUR).map(([state, colour]) => (
          <div key={state} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: colour }} />
            <span className="text-[11px] text-[var(--stone-500)] capitalize">
              {state.charAt(0) + state.slice(1).toLowerCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

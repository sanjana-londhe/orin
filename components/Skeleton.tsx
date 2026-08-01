"use client";

import { CSSProperties } from "react";

// Shimmer animation via CSS keyframes injected once
const SHIMMER_STYLE = `
@keyframes orin-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.orin-shimmer {
  background: linear-gradient(90deg, #f5f5f7 25%, #f0f0f0 50%, #f5f5f7 75%);
  background-size: 800px 100%;
  animation: orin-shimmer 1.4s ease-in-out infinite;
}
`;

function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("orin-shimmer-style")) return;
  const el = document.createElement("style");
  el.id = "orin-shimmer-style";
  el.textContent = SHIMMER_STYLE;
  document.head.appendChild(el);
}

interface BoxProps {
  width?: string | number;
  height?: number;
  radius?: number;
  style?: CSSProperties;
}

export function SkeletonBox({ width = "100%", height = 16, radius = 6, style }: BoxProps) {
  injectStyles();
  return (
    <div className="orin-shimmer" style={{ width, height, borderRadius: radius, flexShrink: 0, ...style }} />
  );
}

/** Single skeleton row — no border/radius, used inside SkeletonTaskList container */
export function SkeletonTaskRow() {
  injectStyles();
  return (
    <div style={{ display: "flex", alignItems: "center", background: "#fff", padding: "14px 16px", gap: 12 }}>
      {/* Circle checkbox */}
      <SkeletonBox width={18} height={18} radius={999} style={{ flexShrink: 0 }} />
      {/* Text lines */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        <SkeletonBox height={13} width="55%" radius={4} />
        <SkeletonBox height={10} width="35%" radius={4} />
      </div>
      {/* Action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <SkeletonBox width={58} height={24} radius={6} />
        <SkeletonBox width={24} height={24} radius={6} />
      </div>
    </div>
  );
}

/** Multiple skeleton rows — matches TaskGrid's single-card container style */
export function SkeletonTaskList({ count = 5 }: { count?: number }) {
  injectStyles();
  return (
    <div style={{ background: "#fff", borderRadius: 11, border: "1px solid #e0e0e0", overflow: "hidden" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ borderBottom: i < count - 1 ? "1px solid #e0e0e0" : "none" }}>
          <SkeletonTaskRow />
        </div>
      ))}
    </div>
  );
}

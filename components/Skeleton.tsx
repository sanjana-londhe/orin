"use client";

import { CSSProperties } from "react";

// Shimmer animation via CSS keyframes injected once
const SHIMMER_STYLE = `
@keyframes orin-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.orin-shimmer {
  background: linear-gradient(90deg, #f1f3ef 25%, #e9ede9 50%, #f1f3ef 75%);
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

/** Skeleton that matches a compact task row card */
export function SkeletonTaskRow() {
  injectStyles();
  return (
    <div style={{
      display: "flex", overflow: "hidden", borderRadius: 10,
      border: "1px solid #e9ede9", background: "#fff", marginBottom: 6,
    }}>
      {/* Left strip */}
      <div className="orin-shimmer" style={{ width: 4, flexShrink: 0 }} />
      {/* Content */}
      <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <SkeletonBox height={13} width="60%" radius={4} />
        <SkeletonBox height={10} width="40%" radius={4} />
      </div>
      {/* Actions placeholder */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px" }}>
        <SkeletonBox width={42} height={26} radius={6} />
        <SkeletonBox width={28} height={26} radius={6} />
      </div>
    </div>
  );
}

/** Multiple skeleton rows */
export function SkeletonTaskList({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTaskRow key={i} />
      ))}
    </div>
  );
}

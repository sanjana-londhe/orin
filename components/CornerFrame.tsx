"use client";

import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  color?: string;
  size?: number;
  thickness?: number;
  style?: CSSProperties;
}

// L-shaped corner registration marks. Renders 4 absolutely-positioned
// hairlines at the corners of its wrapping <div>; the wrapper has no
// continuous border so just the corner ticks show.
export function CornerFrame({
  children,
  color = "#c4cbc2",
  size = 12,
  thickness = 1.5,
  style,
}: Props) {
  const tick = (
    cornerY: "top" | "bottom",
    cornerX: "left" | "right",
  ): CSSProperties => ({
    position: "absolute",
    [cornerY]: 0,
    [cornerX]: 0,
    width: size,
    height: size,
    pointerEvents: "none",
    [cornerY === "top" ? "borderTop" : "borderBottom"]: `${thickness}px solid ${color}`,
    [cornerX === "left" ? "borderLeft" : "borderRight"]: `${thickness}px solid ${color}`,
  });

  return (
    <div style={{ position: "relative", ...style }}>
      <span style={tick("top", "left")} />
      <span style={tick("top", "right")} />
      <span style={tick("bottom", "left")} />
      <span style={tick("bottom", "right")} />
      {children}
    </div>
  );
}

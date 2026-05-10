"use client";

import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Use compact layout for small cards (e.g. side-panel sections). */
  compact?: boolean;
}

/**
 * Reusable empty-state illustration.
 *
 * Picks colors from the DESIGN.md token palette:
 *   bg     #f2fdec   (accent-subtle)
 *   border #c8f7ae   (lime-200)
 *   icon   #059669   (accent)
 *   title  #082d1d   (text-primary)
 *   desc   #4a6d47   (text-tertiary)
 */
export function EmptyState({ icon: Icon, title, description, compact = false }: Props) {
  const dim = compact ? 44 : 64;
  const iconSize = compact ? 20 : 28;

  return (
    <div style={{
      textAlign: "center",
      padding: compact ? "24px 16px" : "56px 24px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: compact ? 10 : 14,
      fontFamily: "inherit",
    }}>
      <div style={{
        width: dim, height: dim, borderRadius: "50%",
        background: "#f2fdec",
        border: "1px solid #c8f7ae",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#059669",
      }}>
        <Icon size={iconSize} strokeWidth={1.7} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center", maxWidth: 280 }}>
        <p style={{
          fontSize: compact ? 13 : 14,
          fontWeight: 600,
          color: "#082d1d",
          margin: 0,
          letterSpacing: "-0.01em",
        }}>{title}</p>
        {description && (
          <p style={{
            fontSize: compact ? 11.5 : 12.5,
            color: "#4a6d47",
            margin: 0,
            lineHeight: 1.5,
          }}>{description}</p>
        )}
      </div>
    </div>
  );
}

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
 *   bg     #f5f5f7   (accent-subtle)
 *   border #e0e0e0   (lime-200)
 *   icon   #0066cc   (accent)
 *   title  #1d1d1f   (text-primary)
 *   desc   #86868b   (text-tertiary)
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
        background: "#f5f5f7",
        border: "1px solid #e0e0e0",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#0066cc",
      }}>
        <Icon size={iconSize} strokeWidth={1.7} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center", maxWidth: 280 }}>
        <p style={{
          fontSize: compact ? 13 : 14,
          fontWeight: 600,
          color: "#1d1d1f",
          margin: 0,
          letterSpacing: "-0.01em",
        }}>{title}</p>
        {description && (
          <p style={{
            fontSize: compact ? 11.5 : 12.5,
            color: "#86868b",
            margin: 0,
            lineHeight: 1.5,
          }}>{description}</p>
        )}
      </div>
    </div>
  );
}

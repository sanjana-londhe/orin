import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function displayName(user: { email?: string; user_metadata?: { full_name?: string } }): string {
  const meta = user.user_metadata?.full_name;
  if (meta?.trim()) return meta.trim().split(" ")[0];
  const email = user.email ?? "";
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/** Consistent page content padding used across all views */
/** 5.html: content-scroll → content-inner */
export const PAGE_STYLE = {
  maxWidth: 860,
  margin: "0 auto",
  padding: "24px 24px 64px",
} as const;

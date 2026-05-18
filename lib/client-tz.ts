/**
 * Client-side timezone helper. Append `tz` to any request that asks the
 * server for a day-bounded view (`today`, `?date=`, `?from=/?to=`). The
 * server falls back to UTC when missing, so it's safe to call always.
 */

export function clientTz(): string {
  if (typeof Intl === "undefined") return "UTC";
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function withTz(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}tz=${encodeURIComponent(clientTz())}`;
}

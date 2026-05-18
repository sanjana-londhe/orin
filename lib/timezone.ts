/**
 * Timezone helpers for API routes.
 *
 * Convention: the server stores all timestamps as UTC `Date` objects. When a
 * caller asks for "today" or a specific calendar day, they pass an IANA
 * timezone (e.g. `America/Los_Angeles`) via the `?tz=` query param and the
 * server computes the matching UTC instants. If `tz` is missing or invalid,
 * we fall back to `UTC`.
 *
 * Clients should send `Intl.DateTimeFormat().resolvedOptions().timeZone`.
 */

const FALLBACK_TZ = "UTC";

export function resolveTz(raw: string | null | undefined): string {
  if (!raw) return FALLBACK_TZ;
  try {
    // Throws RangeError on unknown zones.
    new Intl.DateTimeFormat("en-US", { timeZone: raw });
    return raw;
  } catch {
    return FALLBACK_TZ;
  }
}

/** Returns YYYY-MM-DD for the current instant in `tz`. */
export function todayInTz(tz: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: tz }).format(new Date());
}

/**
 * Returns the UTC Date corresponding to local-midnight on `dateStr` (YYYY-MM-DD) in `tz`.
 *
 * Strategy: pretend the date is UTC, then subtract `tz`'s offset at that
 * instant. Off-by-one only matters within an hour of a DST jump that crosses
 * midnight, which doesn't occur in real-world zones.
 */
export function startOfDayUtc(dateStr: string, tz: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  return new Date(guess.getTime() - tzOffsetMs(tz, guess));
}

export function endOfDayUtc(dateStr: string, tz: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  return new Date(guess.getTime() - tzOffsetMs(tz, guess));
}

function tzOffsetMs(tz: string, atUtc: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(atUtc).map(p => [p.type, p.value]));
  const asIfUtc = Date.UTC(
    +parts.year, +parts.month - 1, +parts.day,
    +parts.hour, +parts.minute, +parts.second,
  );
  return asIfUtc - atUtc.getTime();
}

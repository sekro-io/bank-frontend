// utils/time.ts

/**
 * DB stores timestamps as "timestamp without time zone"
 * but the DB timezone is UTC.
 *
 * So any timestamp returned from the API MUST be interpreted as UTC
 * before formatting into the user's local timezone.
 */
export function parseDbTimestampAsUtc(ts?: string | null): Date | null {
  if (!ts) return null;

  const raw = String(ts).trim();
  if (!raw) return null;

  // If timestamp already includes timezone info, Date can parse it correctly.
  const hasTimezone =
    raw.includes("Z") || raw.includes("+") || raw.match(/-\d{2}:\d{2}$/);

  if (hasTimezone) {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  // Otherwise treat as UTC:
  const normalized = raw.replace(" ", "T") + "Z";
  const d = new Date(normalized);

  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a DB UTC timestamp into the user's local time string.
 */
export function formatLocalDateTime(
  ts?: string | null,
  opts?: Intl.DateTimeFormatOptions
): string {
  const d = parseDbTimestampAsUtc(ts);
  if (!d) return "—";

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...opts,
  });
}

/**
 * Format only a local date.
 */
export function formatLocalDate(
  ts?: string | null,
  opts?: Intl.DateTimeFormatOptions
): string {
  const d = parseDbTimestampAsUtc(ts);
  if (!d) return "—";

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts,
  });
}

export {};
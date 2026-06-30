const EXPLICIT_TIME_ZONE_RE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

const parseRideStartTimeMs = (value?: string | null): number | null => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || !EXPLICIT_TIME_ZONE_RE.test(text)) return null;

  const ms = Date.parse(text);
  return Number.isFinite(ms) ? ms : null;
};

/**
 * Builds an Intl.DateTimeFormat, returning null instead of throwing on
 * environments where the locale/options are unsupported. Lets call sites keep
 * a `const` formatter without an IIFE try/catch.
 */
export const createDateTimeFormatter = (
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat | null => {
  try {
    return new Intl.DateTimeFormat(locales, options);
  } catch {
    return null;
  }
};

export const isRideUpcomingAt = (
  startTime?: string | null,
  nowMs: number = Date.now(),
): boolean => {
  const startMs = parseRideStartTimeMs(startTime);
  return startMs !== null && startMs >= nowMs;
};

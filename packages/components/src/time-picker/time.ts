/**
 * Pure time parsing, formatting, and range utilities for `<k-time-picker>`.
 * Canonical wire format is 24-hour `HH:mm` or `HH:mm:ss`.
 */

export interface TimeParts {
  readonly hours: number; // 0..23
  readonly minutes: number; // 0..59
  readonly seconds: number; // 0..59
}

export function pad2(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

export function parseTimeValue(raw: string): TimeParts | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(raw.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  const seconds = m[3] !== undefined ? Number(m[3]) : 0;
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }
  return { hours, minutes, seconds };
}

export function formatTimeValue(parts: TimeParts, showSeconds = false): string {
  return showSeconds
    ? `${pad2(parts.hours)}:${pad2(parts.minutes)}:${pad2(parts.seconds)}`
    : `${pad2(parts.hours)}:${pad2(parts.minutes)}`;
}

export function formatTimeDisplay(
  parts: TimeParts,
  options: {
    showSeconds?: boolean;
    use12Hours?: boolean;
    /** Day period labels; default to English `AM` / `PM`. */
    am?: string;
    pm?: string;
    /** Combines the clock time and day period; defaults to `"02:05 PM"` order. */
    join?: (time: string, period: string) => string;
  } = {},
): string {
  const { showSeconds = false, use12Hours = false, am = 'AM', pm = 'PM' } = options;
  if (!use12Hours) return formatTimeValue(parts, showSeconds);
  const period = parts.hours >= 12 ? pm : am;
  const h12 = parts.hours % 12 === 0 ? 12 : parts.hours % 12;
  const core = showSeconds
    ? `${pad2(h12)}:${pad2(parts.minutes)}:${pad2(parts.seconds)}`
    : `${pad2(h12)}:${pad2(parts.minutes)}`;
  return options.join ? options.join(core, period) : `${core} ${period}`;
}

export function toTotalSeconds(parts: TimeParts): number {
  return parts.hours * 3600 + parts.minutes * 60 + parts.seconds;
}

export function compareTimeValues(a: string, b: string): number {
  const pa = parseTimeValue(a);
  const pb = parseTimeValue(b);
  if (!pa || !pb) return a.localeCompare(b);
  const diff = toTotalSeconds(pa) - toTotalSeconds(pb);
  return diff === 0 ? 0 : diff < 0 ? -1 : 1;
}

export function isTimeOutOfBounds(candidate: TimeParts, min: string, max: string): boolean {
  const sec = toTotalSeconds(candidate);
  const pMin = min ? parseTimeValue(min) : null;
  const pMax = max ? parseTimeValue(max) : null;
  if (pMin && sec < toTotalSeconds(pMin)) return true;
  if (pMax && sec > toTotalSeconds(pMax)) return true;
  return false;
}

export function nowTimeParts(): TimeParts {
  const now = new Date();
  return {
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
  };
}

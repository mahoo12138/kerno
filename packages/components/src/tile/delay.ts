/**
 * Parses a CSS `<time>` value (`ms` or `s`) into milliseconds.
 * Invalid, negative, or unitless values return `null`.
 */
export function parseTime(value: string): number | null {
  const match = /^(\d*\.?\d+)(ms|s)$/i.exec(value.trim());
  if (!match) return null;
  const time = Number.parseFloat(match[1]!);
  return match[2]!.toLowerCase() === 's' ? time * 1000 : time;
}

export function parseActivationDelayMax(value: string): number | null {
  return parseTime(value);
}

/** Longest delay a browser timer accepts (`2^31 - 1` ms, ~24.8 days). */
export const MAX_TIMER = 2147483647;

export function parseTimeout(value: string): number | null {
  if (value.trim().toLowerCase() === 'none') return Infinity;
  const time = parseTime(value);
  return time === null ? null : Math.min(time, MAX_TIMER);
}

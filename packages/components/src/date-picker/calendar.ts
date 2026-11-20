/**
 * Timezone-safe pure calendar math for `<k-date-picker>`.
 * All dates are represented as local ISO `YYYY-MM-DD` strings and 1-based months.
 */

export interface CalendarDate {
  readonly year: number;
  readonly month: number; // 1..12
  readonly day: number; // 1..31
}

export interface CalendarCell {
  readonly iso: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly inMonth: boolean;
}

export const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const MONTH_NAMES_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const WEEKDAYS_SUN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
const WEEKDAYS_MON = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

export function getWeekdayLabels(firstDayOfWeek: 0 | 1 = 1): readonly string[] {
  return firstDayOfWeek === 0 ? WEEKDAYS_SUN : WEEKDAYS_MON;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatIsoDate(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(iso: string): CalendarDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return null;
  const maxDay = daysInMonth(year, month);
  if (day < 1 || day > maxDay) return null;
  return { year, month, day };
}

export function todayIso(): string {
  const now = new Date();
  return formatIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function compareIsoDates(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (((total % 12) + 12) % 12) + 1;
  return { year: nextYear, month: nextMonth };
}

export function addDaysIso(iso: string, delta: number): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return iso;
  const d = new Date(parsed.year, parsed.month - 1, parsed.day + delta);
  return formatIsoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function isDateOutOfBounds(iso: string, min: string, max: string): boolean {
  if (min && parseIsoDate(min) && compareIsoDates(iso, min) < 0) return true;
  if (max && parseIsoDate(max) && compareIsoDates(iso, max) > 0) return true;
  return false;
}

/**
 * Builds a fixed 42-cell (6 weeks × 7 columns) calendar matrix for `(year, month)`.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  firstDayOfWeek: 0 | 1 = 1,
): CalendarCell[] {
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun..6=Sat
  const leadCount = (firstDow - firstDayOfWeek + 7) % 7;
  const prev = addMonths(year, month, -1);
  const prevDays = daysInMonth(prev.year, prev.month);
  const currDays = daysInMonth(year, month);
  const next = addMonths(year, month, 1);

  const cells: CalendarCell[] = [];

  for (let i = leadCount - 1; i >= 0; i--) {
    const day = prevDays - i;
    cells.push({
      iso: formatIsoDate(prev.year, prev.month, day),
      year: prev.year,
      month: prev.month,
      day,
      inMonth: false,
    });
  }

  for (let day = 1; day <= currDays; day++) {
    cells.push({
      iso: formatIsoDate(year, month, day),
      year,
      month,
      day,
      inMonth: true,
    });
  }

  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({
      iso: formatIsoDate(next.year, next.month, nextDay),
      year: next.year,
      month: next.month,
      day: nextDay,
      inMonth: false,
    });
    nextDay++;
  }

  return cells;
}

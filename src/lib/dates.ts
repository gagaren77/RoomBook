/** Calendar-date helpers shared by the calendar views and the reports. */

import type { CalendarDate } from './schedule';

export type { CalendarDate };

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function addDays(d: CalendarDate, n: number): CalendarDate {
  const dt = new Date(Date.UTC(d.y, d.m - 1, d.d + n));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function addMonths(d: CalendarDate, n: number): CalendarDate {
  const dt = new Date(Date.UTC(d.y, d.m - 1 + n, 1));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: 1 };
}

export function firstOfMonth(d: CalendarDate): CalendarDate {
  return { y: d.y, m: d.m, d: 1 };
}

export function lastOfMonth(d: CalendarDate): CalendarDate {
  return addDays(addMonths(d, 1), -1);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(d: CalendarDate): number {
  const dow = new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

/** The Monday on or before the date. */
export function mondayOf(d: CalendarDate): CalendarDate {
  return addDays(d, 1 - isoWeekday(d));
}

export function sameDay(a: CalendarDate, b: CalendarDate) {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

export function compareDates(a: CalendarDate, b: CalendarDate) {
  return Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d);
}

/** Days from `from` to `d` (negative when d is earlier). */
export function dayIndex(from: CalendarDate, d: CalendarDate) {
  return Math.round(compareDates(d, from) / 86400000);
}

/** Every date from a to b inclusive. */
export function eachDay(a: CalendarDate, b: CalendarDate): CalendarDate[] {
  const out: CalendarDate[] = [];
  const n = dayIndex(a, b);
  for (let i = 0; i <= n; i++) out.push(addDays(a, i));
  return out;
}

export function isoDate(d: CalendarDate) {
  return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
}

/** "2026-11-02" -> date; null when malformed. */
export function parseIsoDate(s: string | null | undefined): CalendarDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s || '').trim());
  if (!m) return null;
  const d = { y: +m[1], m: +m[2], d: +m[3] };
  const dt = new Date(Date.UTC(d.y, d.m - 1, d.d));
  if (dt.getUTCFullYear() !== d.y || dt.getUTCMonth() !== d.m - 1 || dt.getUTCDate() !== d.d) return null;
  return d;
}

/** Nov 2 / Nov 2, 2026 */
export function monthDay(d: CalendarDate, withYear = false) {
  return new Date(Date.UTC(d.y, d.m - 1, d.d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

/** "Nov 2 – Dec 20, 2026" or "Sep 1 – Dec 18, 2026" */
export function rangeLabel(a: CalendarDate, b: CalendarDate) {
  if (sameDay(a, b)) return monthDay(a, true);
  if (a.y === b.y && a.m === b.m) return `${monthDay(a)} – ${b.d}, ${b.y}`;
  if (a.y === b.y) return `${monthDay(a)} – ${monthDay(b, true)}`;
  return `${monthDay(a, true)} – ${monthDay(b, true)}`;
}

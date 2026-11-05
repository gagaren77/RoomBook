/**
 * Parts of the day used by the term view and the utilization report.
 * Times are minutes past midnight in the campus's own time zone.
 */

export type TimeBlock = { name: string; start: number; end: number };

export const DEFAULT_BLOCKS: TimeBlock[] = [
  { name: 'Morning', start: 7 * 60, end: 12 * 60 },
  { name: 'Afternoon', start: 12 * 60, end: 17 * 60 },
  { name: 'Evening', start: 17 * 60, end: 22 * 60 },
];

/** Minutes two intervals have in common. */
export function overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

/** 7a, 12p, 5:30p */
export function hourLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = h < 12 || h >= 24 ? 'a' : 'p';
  return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

/** 9:00a, 12:45p */
export function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')}${h < 12 || h >= 24 ? 'a' : 'p'}`;
}

/** "Morning 7a–12p" */
export function blockLabel(b: TimeBlock): string {
  return `${b.name} ${hourLabel(b.start)}–${hourLabel(b.end)}`;
}

/** "07:00" -> 420; null when not a time. */
export function parseClock(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const h = +m[1];
  const min = +m[2];
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

/** 420 -> "07:00" (for <input type="time">). */
export function toClockInput(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Merge overlapping or touching intervals, sorted by start. */
export function mergeIntervals(list: { start: number; end: number }[]): { start: number; end: number }[] {
  const sorted = list.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: { start: number; end: number }[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ start: i.start, end: i.end });
  }
  return out;
}

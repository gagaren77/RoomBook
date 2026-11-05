/**
 * Room utilization: how much of the available room time is booked.
 *
 * Utilization = booked room-hours ÷ available room-hours, where "available"
 * is every room in scope × every selected day × the selected time blocks.
 * Overlapping bookings in one room count once, so a room never exceeds 100%.
 */

import { toZoned, CalendarDate } from './schedule';
import { programOf } from './programs';
import { TimeBlock, mergeIntervals, overlapMinutes } from './time-blocks';
import { DAY_NAMES, dayIndex, eachDay, isoDate, isoWeekday, mondayOf } from './dates';

export type UtilizationQuery = {
  start: CalendarDate;
  end: CalendarDate; // inclusive
  /** ISO weekdays to count, 1 = Monday … 7 = Sunday. */
  days: number[];
  blocks: TimeBlock[];
};

export type RoomInput = { id: string; name: string; campusId: string; campusName: string; timeZone: string };
export type BookingInput = {
  roomId: string;
  startTime: Date;
  endTime: Date;
  termId?: string | null;
  courseId?: string | null;
};

export type Measure = { hours: number; available: number; pct: number };

export type UtilizationReport = {
  range: { start: string; end: string };
  days: number[];
  blocks: TimeBlock[];
  dayCount: number;
  roomCount: number;
  total: Measure;
  byBlock: (Measure & { name: string })[];
  weekdays: { day: number; label: string; dates: number; byBlock: Measure[]; total: Measure }[];
  rooms: { id: string; name: string; campusName: string; byBlock: Measure[]; total: Measure; daysUsed: number }[];
  /** Share of rooms in use at each hour of the day (0–23), averaged over the selected days. */
  hours: { hour: number; hours: number; pct: number }[];
  weeks: { start: string; hours: number; available: number; pct: number }[];
  programs: { program: string; hours: number; share: number }[];
  campuses: { id: string; name: string; rooms: number; total: Measure }[];
  busiest: { day: number; label: string; block: string; pct: number } | null;
  /** Day × block slots in which every room had a booking. */
  fullyBooked: { count: number; of: number };
  peak: { rooms: number; of: number; label: string } | null;
  neverUsed: string[];
};

const H = 60;

function measure(minutes: number, availableMinutes: number): Measure {
  const hours = Math.round((minutes / H) * 100) / 100;
  const available = Math.round((availableMinutes / H) * 100) / 100;
  return { hours, available, pct: available ? Math.round((minutes / availableMinutes) * 1000) / 10 : 0 };
}

export function computeUtilization(rooms: RoomInput[], bookings: BookingInput[], q: UtilizationQuery): UtilizationReport {
  const blocks = q.blocks.filter((b) => b.end > b.start);
  const union = mergeIntervals(blocks);
  const unionLen = union.reduce((s, i) => s + (i.end - i.start), 0);
  const blockLen = blocks.map((b) => b.end - b.start);

  const dates = eachDay(q.start, q.end).filter((d) => q.days.includes(isoWeekday(d)));
  const dateIdx = new Map(dates.map((d, i) => [isoDate(d), i]));
  const roomIdx = new Map(rooms.map((r, i) => [r.id, i]));

  // room -> date index -> booked intervals (minutes of that day)
  const intervals: { start: number; end: number }[][][] = rooms.map(() => dates.map(() => []));
  const programMinutes = new Map<string, number>();

  for (const b of bookings) {
    const ri = roomIdx.get(b.roomId);
    if (ri === undefined) continue;
    const tz = rooms[ri].timeZone;
    const s = toZoned(b.startTime, tz);
    const e = toZoned(b.endTime, tz);
    const pieces: { date: CalendarDate; start: number; end: number }[] = [];
    if (isoDate(s.date) === isoDate(e.date)) pieces.push({ date: s.date, start: s.minutes, end: e.minutes });
    else {
      // A class that crosses midnight counts on both days.
      pieces.push({ date: s.date, start: s.minutes, end: 24 * H });
      if (dayIndex(s.date, e.date) === 1) pieces.push({ date: e.date, start: 0, end: e.minutes });
    }
    const program = programOf(b);
    for (const p of pieces) {
      const di = dateIdx.get(isoDate(p.date));
      if (di === undefined || p.end <= p.start) continue;
      intervals[ri][di].push({ start: p.start, end: p.end });
      let m = 0;
      for (const u of union) m += overlapMinutes(p.start, p.end, u.start, u.end);
      if (m) programMinutes.set(program, (programMinutes.get(program) || 0) + m);
    }
  }

  const perRoomBlock = rooms.map(() => blocks.map(() => 0));
  const perRoomTotal = rooms.map(() => 0);
  const perRoomDays = rooms.map(() => 0);
  const perDayBlock = new Map<number, number[]>(); // weekday -> block minutes
  const perDayTotal = new Map<number, number>();
  const perDayDates = new Map<number, number>();
  const perHour = Array.from({ length: 24 }, () => 0);
  const perWeek = new Map<string, number>();
  let fully = 0;
  let peak: UtilizationReport['peak'] = null;

  for (const d of dates) {
    const wd = isoWeekday(d);
    perDayDates.set(wd, (perDayDates.get(wd) || 0) + 1);
  }

  dates.forEach((d, di) => {
    const wd = isoWeekday(d);
    const week = isoDate(mondayOf(d));
    if (!perDayBlock.has(wd)) perDayBlock.set(wd, blocks.map(() => 0));
    const roomsInBlock = blocks.map(() => 0);
    rooms.forEach((_, ri) => {
      const merged = mergeIntervals(intervals[ri][di]);
      if (!merged.length) return;
      let dayTotal = 0;
      blocks.forEach((b, bi) => {
        let m = 0;
        for (const iv of merged) m += overlapMinutes(iv.start, iv.end, b.start, b.end);
        if (m) {
          perRoomBlock[ri][bi] += m;
          perDayBlock.get(wd)![bi] += m;
          roomsInBlock[bi]++;
        }
      });
      for (const u of union) for (const iv of merged) dayTotal += overlapMinutes(iv.start, iv.end, u.start, u.end);
      if (dayTotal) {
        perRoomTotal[ri] += dayTotal;
        perRoomDays[ri]++;
        perDayTotal.set(wd, (perDayTotal.get(wd) || 0) + dayTotal);
        perWeek.set(week, (perWeek.get(week) || 0) + dayTotal);
      }
      for (let h = 0; h < 24; h++) for (const iv of merged) perHour[h] += overlapMinutes(iv.start, iv.end, h * H, (h + 1) * H);
    });
    blocks.forEach((b, bi) => {
      if (rooms.length && roomsInBlock[bi] === rooms.length) fully++;
      if (roomsInBlock[bi] && (!peak || roomsInBlock[bi] > peak.rooms)) {
        peak = { rooms: roomsInBlock[bi], of: rooms.length, label: `${DAY_NAMES[wd - 1]} ${d.m}/${d.d} ${b.name.toLowerCase()}` };
      }
    });
  });

  const nRooms = rooms.length;
  const nDates = dates.length;
  const totalMinutes = perRoomTotal.reduce((s, m) => s + m, 0);

  const byBlock = blocks.map((b, bi) => ({
    name: b.name,
    ...measure(
      perRoomBlock.reduce((s, r) => s + r[bi], 0),
      nRooms * nDates * blockLen[bi]
    ),
  }));

  const weekdays = q.days
    .filter((wd) => perDayDates.has(wd))
    .sort((a, b) => a - b)
    .map((wd) => {
      const n = perDayDates.get(wd) || 0;
      return {
        day: wd,
        label: DAY_NAMES[wd - 1],
        dates: n,
        byBlock: blocks.map((_, bi) => measure(perDayBlock.get(wd)?.[bi] || 0, nRooms * n * blockLen[bi])),
        total: measure(perDayTotal.get(wd) || 0, nRooms * n * unionLen),
      };
    });

  let busiest: UtilizationReport['busiest'] = null;
  for (const w of weekdays) {
    w.byBlock.forEach((m, bi) => {
      if (m.pct > 0 && (!busiest || m.pct > busiest.pct)) busiest = { day: w.day, label: w.label, block: blocks[bi].name, pct: m.pct };
    });
  }

  const roomRows = rooms
    .map((r, ri) => ({
      id: r.id,
      name: r.name,
      campusName: r.campusName,
      byBlock: blocks.map((_, bi) => measure(perRoomBlock[ri][bi], nDates * blockLen[bi])),
      total: measure(perRoomTotal[ri], nDates * unionLen),
      daysUsed: perRoomDays[ri],
    }))
    .sort((a, b) => b.total.hours - a.total.hours || a.name.localeCompare(b.name));

  const hours = perHour.map((m, hour) => ({ hour, hours: Math.round((m / H) * 100) / 100, pct: nRooms && nDates ? Math.round((m / (nRooms * nDates * H)) * 1000) / 10 : 0 }));

  const weekStarts = Array.from(new Set(dates.map((d) => isoDate(mondayOf(d))))).sort();
  const weeks = weekStarts.map((start) => {
    const n = dates.filter((d) => isoDate(mondayOf(d)) === start).length;
    const m = measure(perWeek.get(start) || 0, nRooms * n * unionLen);
    return { start, ...m };
  });

  const programTotal = Array.from(programMinutes.values()).reduce((s, m) => s + m, 0);
  const programs = Array.from(programMinutes.entries())
    .map(([program, m]) => ({ program, hours: Math.round((m / H) * 100) / 100, share: programTotal ? Math.round((m / programTotal) * 1000) / 10 : 0 }))
    .sort((a, b) => b.hours - a.hours);

  const campusMap = new Map<string, { id: string; name: string; rooms: number; minutes: number }>();
  rooms.forEach((r, ri) => {
    const c = campusMap.get(r.campusId) || { id: r.campusId, name: r.campusName, rooms: 0, minutes: 0 };
    c.rooms++;
    c.minutes += perRoomTotal[ri];
    campusMap.set(r.campusId, c);
  });
  const campuses = Array.from(campusMap.values())
    .map((c) => ({ id: c.id, name: c.name, rooms: c.rooms, total: measure(c.minutes, c.rooms * nDates * unionLen) }))
    .sort((a, b) => b.total.pct - a.total.pct || a.name.localeCompare(b.name));

  return {
    range: { start: isoDate(q.start), end: isoDate(q.end) },
    days: q.days,
    blocks,
    dayCount: nDates,
    roomCount: nRooms,
    total: measure(totalMinutes, nRooms * nDates * unionLen),
    byBlock,
    weekdays,
    rooms: roomRows,
    hours,
    weeks,
    programs,
    campuses,
    busiest,
    fullyBooked: { count: fully, of: nDates * blocks.length },
    peak,
    neverUsed: roomRows.filter((r) => r.total.hours === 0).map((r) => r.name),
  };
}

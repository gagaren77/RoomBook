'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toZoned, zonedTime, CalendarDate } from '@/lib/schedule';
import { bookingColors, programOf } from '@/lib/programs';
import { usePrograms } from '@/lib/use-programs';
import { ProgramLegend, countPrograms } from './ProgramLegend';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_START = 9 * 60; // a free cell books at 9:00 AM

interface RoomTimetableProps {
  campus: { id: string; name: string; timeZone?: string } | null;
  rooms: { id: string; name: string }[];
  /** Restrict the table to one room (from the Room filter). */
  roomId?: string;
  onEventClick: (booking: any) => void;
  /** Managers only: click a free cell to start a booking that day. */
  onFreeSlotClick?: (start: Date, room: { id: string }) => void;
  refreshKey?: number;
  hiddenPrograms: Set<string>;
  onToggleProgram: (program: string) => void;
  onShowAllPrograms: () => void;
}

type Cell = { b: any; start: number; end: number; program: string };

function addDays(d: CalendarDate, n: number): CalendarDate {
  const dt = new Date(Date.UTC(d.y, d.m - 1, d.d + n));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/** The Monday on or before the date. */
function mondayOf(d: CalendarDate): CalendarDate {
  const dow = new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay(); // 0 = Sunday
  return addDays(d, dow === 0 ? -6 : 1 - dow);
}

function sameDay(a: CalendarDate, b: CalendarDate) {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

function dayIndex(from: CalendarDate, d: CalendarDate) {
  return Math.round((Date.UTC(d.y, d.m - 1, d.d) - Date.UTC(from.y, from.m - 1, from.d)) / 86400000);
}

/** 9:00a, 12:45p */
function clock(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`;
}

function monthDay(d: CalendarDate, withYear = false) {
  return new Date(Date.UTC(d.y, d.m - 1, d.d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

/**
 * A week, one row per room and one column per day, like a school timetable.
 * A room holds one class at a time, so nothing overlaps and free days show.
 */
export function RoomTimetable({
  campus,
  rooms,
  roomId,
  onEventClick,
  onFreeSlotClick,
  refreshKey,
  hiddenPrograms,
  onToggleProgram,
  onShowAllPrograms,
}: RoomTimetableProps) {
  const tz = campus?.timeZone || 'America/Chicago';
  const [weekStart, setWeekStart] = useState<CalendarDate>(() => mondayOf(toZoned(new Date(), tz).date));
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const programs = usePrograms();

  const today = toZoned(new Date(), tz).date;
  const shownRooms = useMemo(() => (roomId ? rooms.filter((r) => r.id === roomId) : rooms), [rooms, roomId]);

  useEffect(() => {
    if (!campus) return;
    const start = zonedTime(weekStart, 0, tz);
    const end = zonedTime(addDays(weekStart, 7), 0, tz);
    const params = new URLSearchParams({ campusId: campus.id, start: start.toISOString(), end: end.toISOString() });
    if (roomId) params.set('roomId', roomId);
    let cancelled = false;
    setLoading(true);
    fetch(`/api/bookings?${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => !cancelled && setBookings(data))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [campus, weekStart, tz, roomId, refreshKey]);

  // room -> day (0 = Monday) -> bookings, in campus-local time.
  const grid = useMemo(() => {
    const map = new Map<string, Cell[][]>();
    for (const b of bookings) {
      const s = toZoned(new Date(b.startTime), tz);
      const e = toZoned(new Date(b.endTime), tz);
      const day = dayIndex(weekStart, s.date);
      if (day < 0 || day > 6) continue;
      if (!map.has(b.roomId)) map.set(b.roomId, Array.from({ length: 7 }, () => []));
      map.get(b.roomId)![day].push({
        b,
        start: s.minutes,
        end: sameDay(e.date, s.date) ? e.minutes : 24 * 60,
        program: programOf(b),
      });
    }
    for (const days of Array.from(map.values())) days.forEach((list) => list.sort((a, b) => a.start - b.start));
    return map;
  }, [bookings, tz, weekStart]);

  const counts = useMemo(() => countPrograms(bookings), [bookings]);

  // Weekend columns only when something is booked on a weekend.
  const dayCount = useMemo(() => {
    let last = 4;
    for (const days of Array.from(grid.values())) {
      if (days[6].length) last = 6;
      else if (days[5].length) last = Math.max(last, 5);
    }
    return last + 1;
  }, [grid]);

  if (!campus) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-12 text-center text-sm text-slate-500 shadow-card">
        Choose a campus above to see its rooms week by week.
      </div>
    );
  }

  const weekEnd = addDays(weekStart, dayCount - 1);
  const weekLabel =
    weekStart.m === weekEnd.m
      ? `${monthDay(weekStart)} – ${weekEnd.d}, ${weekEnd.y}`
      : `${monthDay(weekStart)} – ${monthDay(weekEnd, true)}`;

  return (
    <div className="relative rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50" onClick={() => setWeekStart(mondayOf(today))}>
            This week
          </button>
          <button className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-slate-900">{weekLabel}</p>
          <p className="text-xs text-slate-500">{campus.name}</p>
        </div>
      </div>

      <ProgramLegend counts={counts} programs={programs} hidden={hiddenPrograms} onToggle={onToggleProgram} onShowAll={onShowAllPrograms} />

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/50">
          <LoadingSpinner className="h-8 w-8 text-blue-600" />
        </div>
      )}

      {shownRooms.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">This campus has no rooms yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-28 bg-white px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Room</th>
                {Array.from({ length: dayCount }, (_, i) => {
                  const d = addDays(weekStart, i);
                  const isToday = sameDay(d, today);
                  return (
                    <th key={i} className={`px-2 py-2 text-center text-xs font-semibold ${isToday ? 'text-indigo-700' : 'text-slate-600'}`}>
                      {DAY_NAMES[i]}{' '}
                      <span className={`font-normal ${isToday ? 'rounded-full bg-indigo-600 px-1.5 py-0.5 text-white' : 'text-slate-400'}`}>
                        {d.m}/{d.d}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {shownRooms.map((room) => {
                const days = grid.get(room.id) || Array.from({ length: 7 }, () => [] as Cell[]);
                return (
                  <tr key={room.id} className="border-t border-slate-100 align-top">
                    <th className="sticky left-0 z-10 bg-white px-2 py-2 text-sm font-semibold text-slate-900">{room.name}</th>
                    {Array.from({ length: dayCount }, (_, i) => {
                      const d = addDays(weekStart, i);
                      const items = days[i];
                      const free = items.length === 0;
                      return (
                        <td
                          key={i}
                          className={`border-l border-slate-100 p-1 ${free ? 'bg-emerald-50/60' : ''} ${
                            free && onFreeSlotClick ? 'cursor-pointer hover:bg-emerald-100' : ''
                          }`}
                          title={free ? `${room.name} is free on ${DAY_NAMES[i]} ${d.m}/${d.d}` : undefined}
                          onClick={free && onFreeSlotClick ? () => onFreeSlotClick(zonedTime(d, DEFAULT_START, tz), room) : undefined}
                        >
                          {free ? (
                            <span className="block px-1 py-1.5 text-[11px] text-emerald-700">Free</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {items.map(({ b, start, end, program }) => {
                                if (hiddenPrograms.has(program)) {
                                  return <div key={b.id} className="h-2 rounded-md bg-slate-200/80" title={`${program} (hidden)`} />;
                                }
                                const c = bookingColors(b, programs);
                                return (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => onEventClick(b)}
                                    style={{ backgroundColor: c.bg, color: c.fg }}
                                    className="w-full rounded-md px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:brightness-95"
                                    title={[b.title, b.courseName, `${clock(start)} – ${clock(end)}`].filter(Boolean).join('\n')}
                                  >
                                    <span className="block truncate font-semibold">{b.courseId || b.termId || b.title}</span>
                                    <span className="block opacity-90">
                                      {clock(start)}–{clock(end)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

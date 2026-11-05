'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toZoned, zonedTime, CalendarDate } from '@/lib/schedule';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BASE_TZ = 'America/Chicago';
const MARGIN_MS = 6 * 3600 * 1000; // campuses in other time zones start their week a little earlier or later

interface CampusOverviewProps {
  campuses: { id: string; name: string; city?: string | null; timeZone?: string | null; _count?: { rooms: number } }[];
  onPickCampus: (campusId: string) => void;
}

type DayStat = { classes: number; rooms: Set<string> };

function addDays(d: CalendarDate, n: number): CalendarDate {
  const dt = new Date(Date.UTC(d.y, d.m - 1, d.d + n));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function mondayOf(d: CalendarDate): CalendarDate {
  const dow = new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay();
  return addDays(d, dow === 0 ? -6 : 1 - dow);
}

function sameDay(a: CalendarDate, b: CalendarDate) {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

function dayIndex(from: CalendarDate, d: CalendarDate) {
  return Math.round((Date.UTC(d.y, d.m - 1, d.d) - Date.UTC(from.y, from.m - 1, from.d)) / 86400000);
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
 * All campuses at a glance: one row per campus, one column per day, each
 * cell the number of classes and how many rooms they use. Click a campus to
 * open its rooms.
 */
export function CampusOverview({ campuses, onPickCampus }: CampusOverviewProps) {
  const [weekStart, setWeekStart] = useState<CalendarDate>(() => mondayOf(toZoned(new Date(), BASE_TZ).date));
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const today = toZoned(new Date(), BASE_TZ).date;

  useEffect(() => {
    const start = new Date(zonedTime(weekStart, 0, BASE_TZ).getTime() - MARGIN_MS);
    const end = new Date(zonedTime(addDays(weekStart, 7), 0, BASE_TZ).getTime() + MARGIN_MS);
    const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
    let cancelled = false;
    setLoading(true);
    fetch(`/api/bookings?${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => !cancelled && setBookings(data))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  // campus -> day (0 = Monday, in that campus's time zone) -> classes and rooms used.
  const stats = useMemo(() => {
    const map = new Map<string, DayStat[]>();
    const tzOf = new Map(campuses.map((c) => [c.id, c.timeZone || BASE_TZ]));
    for (const b of bookings) {
      const campusId = b.room?.campusId || b.room?.campus?.id;
      if (!campusId) continue;
      const tz = tzOf.get(campusId) || b.room?.campus?.timeZone || BASE_TZ;
      const day = dayIndex(weekStart, toZoned(new Date(b.startTime), tz).date);
      if (day < 0 || day > 6) continue;
      if (!map.has(campusId)) map.set(campusId, Array.from({ length: 7 }, () => ({ classes: 0, rooms: new Set<string>() })));
      const cell = map.get(campusId)![day];
      cell.classes += 1;
      cell.rooms.add(b.roomId);
    }
    return map;
  }, [bookings, campuses, weekStart]);

  // Weekend columns only when something is booked on a weekend.
  const dayCount = useMemo(() => {
    let last = 4;
    for (const days of Array.from(stats.values())) {
      if (days[6].classes) last = 6;
      else if (days[5].classes) last = Math.max(last, 5);
    }
    return last + 1;
  }, [stats]);

  const totals = useMemo(() => {
    const out = Array.from({ length: 7 }, () => 0);
    for (const days of Array.from(stats.values())) days.forEach((d, i) => (out[i] += d.classes));
    return out;
  }, [stats]);

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
          <p className="text-xs text-slate-500">All campuses · click a campus to open its rooms</p>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/50">
          <LoadingSpinner className="h-8 w-8 text-blue-600" />
        </div>
      )}

      {campuses.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">No campuses yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className="w-56 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Campus</th>
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
              {campuses.map((campus) => {
                const days = stats.get(campus.id);
                const roomCount = campus._count?.rooms ?? 0;
                return (
                  <tr key={campus.id} className="border-t border-slate-100">
                    <th className="px-2 py-2 align-middle">
                      <button type="button" onClick={() => onPickCampus(campus.id)} className="text-left hover:text-indigo-700">
                        <span className="block text-sm font-semibold text-slate-900">{campus.name}</span>
                        <span className="block text-[11px] font-normal text-slate-500">
                          {roomCount} {roomCount === 1 ? 'room' : 'rooms'}
                          {campus.city ? ` · ${campus.city}` : ''}
                        </span>
                      </button>
                    </th>
                    {Array.from({ length: dayCount }, (_, i) => {
                      const cell = days?.[i];
                      const classes = cell?.classes || 0;
                      const busy = cell?.rooms.size || 0;
                      const ratio = roomCount ? Math.min(1, busy / roomCount) : 0;
                      return (
                        <td key={i} className="border-l border-slate-100 p-1">
                          <button
                            type="button"
                            onClick={() => onPickCampus(campus.id)}
                            title={classes ? `${campus.name}: ${classes} classes in ${busy} of ${roomCount} rooms` : `${campus.name}: nothing booked`}
                            style={classes ? { backgroundColor: `rgba(0, 32, 91, ${(0.08 + 0.3 * ratio).toFixed(2)})` } : undefined}
                            className={`flex h-12 w-full flex-col items-center justify-center rounded-md text-center transition hover:ring-2 hover:ring-indigo-300 ${
                              classes ? 'text-slate-900' : 'bg-emerald-50/60 text-emerald-700'
                            }`}
                          >
                            {classes ? (
                              <>
                                <span className="text-base font-semibold leading-tight">{classes}</span>
                                <span className="text-[11px] leading-tight text-slate-600">
                                  {busy}/{roomCount} rooms
                                </span>
                              </>
                            ) : (
                              <span className="text-[11px]">Free</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 text-xs text-slate-500">
                <th className="px-2 py-2 text-left font-semibold">All campuses</th>
                {Array.from({ length: dayCount }, (_, i) => (
                  <td key={i} className="border-l border-slate-100 px-2 py-2 text-center">
                    {totals[i] ? `${totals[i]} classes` : '–'}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

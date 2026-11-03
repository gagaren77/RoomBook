'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toZoned, zonedTime, CalendarDate } from '@/lib/schedule';
import { bookingColors, programOf } from '@/lib/programs';
import { usePrograms } from '@/lib/use-programs';
import { ProgramLegend, countPrograms } from './ProgramLegend';

const DAY_START = 7 * 60; // 7:00
const DAY_END = 22 * 60; // 22:00
const SLOT = 30; // minutes a free-slot click books from
const VISIBLE = DAY_END - DAY_START;
const HOURS = VISIBLE / 60;

interface RoomAvailabilityProps {
  campus: { id: string; name: string; timeZone?: string } | null;
  rooms: { id: string; name: string }[];
  /** Restrict the timeline to one room (from the Room filter). */
  roomId?: string;
  onEventClick: (booking: any) => void;
  /** Managers only: click free time in a row to start a booking there. */
  onFreeSlotClick?: (start: Date, room: { id: string }) => void;
  refreshKey?: number;
  hiddenPrograms: Set<string>;
  onToggleProgram: (program: string) => void;
  onShowAllPrograms: () => void;
}

function todayIn(tz: string): CalendarDate {
  return toZoned(new Date(), tz).date;
}

function addDays(d: CalendarDate, n: number): CalendarDate {
  const dt = new Date(Date.UTC(d.y, d.m - 1, d.d + n));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function label(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
}

/** 9:00a, 12:45p */
function clock(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`;
}

function hours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Position of a time along the row, as a percentage. */
function pct(minutes: number) {
  return ((Math.min(Math.max(minutes, DAY_START), DAY_END) - DAY_START) / VISIBLE) * 100;
}

/**
 * One day, one row per room, time running left to right: the layout most
 * room-booking tools use. Booked time is a colored bar; what's left is free.
 */
export function RoomAvailability({
  campus,
  rooms,
  roomId,
  onEventClick,
  onFreeSlotClick,
  refreshKey,
  hiddenPrograms,
  onToggleProgram,
  onShowAllPrograms,
}: RoomAvailabilityProps) {
  const tz = campus?.timeZone || 'America/Chicago';
  const [day, setDay] = useState<CalendarDate>(() => todayIn(tz));
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const programs = usePrograms();

  const shownRooms = useMemo(() => (roomId ? rooms.filter((r) => r.id === roomId) : rooms), [rooms, roomId]);

  useEffect(() => {
    if (!campus) return;
    const start = zonedTime(day, 0, tz);
    const end = zonedTime(addDays(day, 1), 0, tz);
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
  }, [campus, day, tz, roomId, refreshKey]);

  // Bookings per room, in campus-local minutes.
  const byRoom = useMemo(() => {
    const map = new Map<string, { b: any; start: number; end: number; program: string }[]>();
    const sameDay = (d: CalendarDate) => d.y === day.y && d.m === day.m && d.d === day.d;
    for (const b of bookings) {
      const s = toZoned(new Date(b.startTime), tz);
      const e = toZoned(new Date(b.endTime), tz);
      const start = sameDay(s.date) ? s.minutes : 0;
      const end = sameDay(e.date) ? e.minutes : 24 * 60;
      if (!map.has(b.roomId)) map.set(b.roomId, []);
      map.get(b.roomId)!.push({ b, start, end, program: programOf(b) });
    }
    return map;
  }, [bookings, tz, day]);

  const counts = useMemo(() => countPrograms(bookings), [bookings]);

  const hourMarks = useMemo(() => {
    const out: number[] = [];
    for (let m = DAY_START; m <= DAY_END; m += 60) out.push(m);
    return out;
  }, []);

  if (!campus) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-12 text-center text-sm text-slate-500 shadow-card">
        Choose a campus above to see which rooms are free.
      </div>
    );
  }

  const dayLabel = new Date(Date.UTC(day.y, day.m - 1, day.d)).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const isFree = (room: string, m: number) => !(byRoom.get(room) || []).some((x) => x.start < m + SLOT && x.end > m);

  // Click on free time in a row: book from the half hour under the pointer.
  const handleLaneClick = (room: { id: string }) => (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onFreeSlotClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 0.999);
    const m = DAY_START + Math.floor((frac * VISIBLE) / SLOT) * SLOT;
    if (isFree(room.id, m)) onFreeSlotClick(zonedTime(day, m, tz), room);
  };

  return (
    <div className="relative rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50" onClick={() => setDay(addDays(day, -1))} aria-label="Previous day">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50" onClick={() => setDay(todayIn(tz))}>
            Today
          </button>
          <button className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50" onClick={() => setDay(addDays(day, 1))} aria-label="Next day">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
          <input
            type="date"
            className="ml-2 w-auto"
            aria-label="Day"
            value={`${day.y}-${String(day.m).padStart(2, '0')}-${String(day.d).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m, d] = e.target.value.split('-').map(Number);
              if (y && m && d) setDay({ y, m, d });
            }}
          />
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-slate-900">{dayLabel}</p>
          <p className="text-xs text-slate-500">{campus.name}</p>
        </div>
      </div>

      <ProgramLegend counts={counts} programs={programs} hidden={hiddenPrograms} onToggle={onToggleProgram} onShowAll={onShowAllPrograms} />

      <div className="mb-3 flex items-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-emerald-200 bg-emerald-50" /> Free
          {onFreeSlotClick ? ' (click to book)' : ''}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-violet-200" /> Booked, colored by program
        </span>
      </div>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/50">
          <LoadingSpinner className="h-8 w-8 text-blue-600" />
        </div>
      )}

      {shownRooms.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">This campus has no rooms yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            {/* hour axis */}
            <div className="flex">
              <div className="w-32 flex-none" />
              <div className="relative h-6 flex-1 text-[11px] text-slate-400">
                {hourMarks.map((m) => (
                  <span
                    key={m}
                    style={{ left: `${pct(m)}%` }}
                    className={`absolute whitespace-nowrap ${m === DAY_END ? '-translate-x-full' : '-translate-x-1/2'}`}
                  >
                    {label(m)}
                  </span>
                ))}
              </div>
            </div>

            {shownRooms.map((room) => {
              const items = byRoom.get(room.id) || [];
              const busy = items.reduce(
                (sum, x) => sum + Math.max(0, Math.min(x.end, DAY_END) - Math.max(x.start, DAY_START)),
                0
              );
              return (
                <div key={room.id} className="flex border-t border-slate-100">
                  <div className="w-32 flex-none py-2 pr-3">
                    <p className="truncate text-sm font-semibold text-slate-900">{room.name}</p>
                    <p className="text-[11px] text-emerald-700">{hours(Math.max(0, VISIBLE - busy))} free</p>
                  </div>
                  <div
                    className={`relative h-12 flex-1 bg-emerald-50/60 ${onFreeSlotClick ? 'cursor-pointer hover:bg-emerald-100/70' : ''}`}
                    style={{
                      backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px)',
                      backgroundSize: `${100 / HOURS}% 100%`,
                    }}
                    onClick={onFreeSlotClick ? handleLaneClick(room) : undefined}
                    title={onFreeSlotClick ? `Click free time to book ${room.name}` : undefined}
                  >
                    {items.map(({ b, start, end, program }) => {
                      const left = pct(start);
                      const width = pct(end) - left;
                      if (width <= 0) return null;
                      if (hiddenPrograms.has(program)) {
                        return (
                          <div
                            key={b.id}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            className="absolute inset-y-1 rounded-md bg-slate-200/80"
                            title={`${program} (hidden)`}
                          />
                        );
                      }
                      const c = bookingColors(b, programs);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(b);
                          }}
                          style={{ left: `${left}%`, width: `${width}%`, backgroundColor: c.bg, color: c.fg }}
                          className="absolute inset-y-1 z-[5] overflow-hidden rounded-md border border-white px-1.5 text-left text-[11px] leading-tight shadow-sm hover:brightness-95"
                          title={[b.title, b.courseName, `${label(start)} – ${label(end)}`].filter(Boolean).join('\n')}
                        >
                          <span className="block truncate font-semibold">{b.courseId || b.termId || b.title}</span>
                          <span className="block truncate opacity-90">
                            {clock(start)}–{clock(end)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toZoned, zonedTime, CalendarDate } from '@/lib/schedule';
import { bookingColors } from '@/lib/programs';
import { usePrograms } from '@/lib/use-programs';

const DAY_START = 7 * 60; // 7:00
const DAY_END = 22 * 60; // 22:00
const SLOT = 30; // minutes per row
const ROW_PX = 28;

interface RoomAvailabilityProps {
  campus: { id: string; name: string; timeZone?: string } | null;
  rooms: { id: string; name: string }[];
  /** Restrict the grid to one room (from the Room filter). */
  roomId?: string;
  onEventClick: (booking: any) => void;
  /** Managers only: click a free slot to start a booking. */
  onFreeSlotClick?: (start: Date, room: { id: string }) => void;
  refreshKey?: number;
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

function hours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function RoomAvailability({ campus, rooms, roomId, onEventClick, onFreeSlotClick, refreshKey }: RoomAvailabilityProps) {
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

  // Bookings per room, in campus-local minutes, clipped to the visible hours.
  const byRoom = useMemo(() => {
    const map = new Map<string, { b: any; start: number; end: number }[]>();
    for (const b of bookings) {
      const s = toZoned(new Date(b.startTime), tz);
      const e = toZoned(new Date(b.endTime), tz);
      const sameDay = (d: CalendarDate) => d.y === day.y && d.m === day.m && d.d === day.d;
      const start = sameDay(s.date) ? s.minutes : 0;
      const end = sameDay(e.date) ? e.minutes : 24 * 60;
      if (!map.has(b.roomId)) map.set(b.roomId, []);
      map.get(b.roomId)!.push({ b, start, end });
    }
    return map;
  }, [bookings, tz, day]);

  const slots = useMemo(() => {
    const out: number[] = [];
    for (let m = DAY_START; m < DAY_END; m += SLOT) out.push(m);
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
  const visible = DAY_END - DAY_START;
  const isFree = (roomId: string, m: number) =>
    !(byRoom.get(roomId) || []).some((x) => x.start < m + SLOT && x.end > m);

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

      <div className="mb-3 flex items-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-emerald-200 bg-emerald-50" /> Free
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-violet-200" /> Booked (colored by program)
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
          <div className="inline-flex min-w-full">
            {/* time axis */}
            <div className="sticky left-0 z-10 w-16 flex-none bg-white">
              <div className="h-12" />
              <div className="relative" style={{ height: slots.length * ROW_PX }}>
                {slots.map((m, i) =>
                  m % 60 === 0 ? (
                    <span
                      key={m}
                      style={{ top: i * ROW_PX - 7 }}
                      className="absolute right-2 text-[11px] leading-none text-slate-400"
                    >
                      {label(m)}
                    </span>
                  ) : null
                )}
              </div>
            </div>

            {shownRooms.map((room) => {
              const items = byRoom.get(room.id) || [];
              const busy = items.reduce(
                (sum, x) => sum + Math.max(0, Math.min(x.end, DAY_END) - Math.max(x.start, DAY_START)),
                0
              );
              return (
                <div key={room.id} className="min-w-[120px] flex-1 border-l border-slate-100">
                  <div className="flex h-12 flex-col items-center justify-center px-1 text-center">
                    <p className="truncate text-sm font-semibold text-slate-900">{room.name}</p>
                    <p className="text-[11px] text-emerald-700">{hours(Math.max(0, visible - busy))} free</p>
                  </div>
                  <div className="relative" style={{ height: slots.length * ROW_PX }}>
                    {slots.map((m, i) => {
                      const free = isFree(room.id, m);
                      return (
                        <div
                          key={m}
                          style={{ top: i * ROW_PX, height: ROW_PX }}
                          className={`absolute inset-x-0 border-t ${m % 60 === 0 ? 'border-slate-200' : 'border-slate-100'} ${
                            free ? 'bg-emerald-50/70' : ''
                          } ${free && onFreeSlotClick ? 'cursor-pointer hover:bg-emerald-100' : ''}`}
                          title={free ? `${room.name} free at ${label(m)}` : undefined}
                          onClick={free && onFreeSlotClick ? () => onFreeSlotClick(zonedTime(day, m, tz), room) : undefined}
                        />
                      );
                    })}
                    {items.map(({ b, start, end }) => {
                      const top = Math.max(start, DAY_START) - DAY_START;
                      const bottom = Math.min(end, DAY_END) - DAY_START;
                      if (bottom <= 0 || top >= visible) return null;
                      const c = bookingColors(b, programs);
                      return (
                        <button
                          key={b.id}
                          onClick={() => onEventClick(b)}
                          style={{
                            top: (top / SLOT) * ROW_PX,
                            height: Math.max(((bottom - top) / SLOT) * ROW_PX - 2, 14),
                            backgroundColor: c.bg,
                            color: c.fg,
                          }}
                          className="absolute inset-x-1 z-[5] overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-sm hover:brightness-95"
                          title={`${b.title}\n${label(start)} – ${label(end)}`}
                        >
                          <span className="block font-semibold">{b.courseId || b.title}</span>
                          <span className="block opacity-90">
                            {label(start)} – {label(end)}
                          </span>
                          {b.courseName && <span className="block truncate opacity-80">{b.courseName}</span>}
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

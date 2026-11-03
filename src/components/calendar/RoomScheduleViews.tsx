'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toZoned, zonedTime, CalendarDate } from '@/lib/schedule';
import { bookingLabel, programOf, programStyle } from '@/lib/programs';

const DAY_START = 7 * 60; // 7:00
const DAY_END = 22 * 60; // 22:00
const SPAN = DAY_END - DAY_START;

interface RoomViewProps {
  campus: { id: string; name: string; timeZone?: string } | null;
  rooms: { id: string; name: string }[];
  /** Restrict the view to one room (from the Room filter). */
  roomId?: string;
  bookings: any[];
  isLoading?: boolean;
  onEventClick: (booking: any) => void;
  /** Managers only: click free space to start a booking. */
  onFreeSlotClick?: (start: Date, room: { id: string }) => void;
  onRangeChange: (start: Date, end: Date) => void;
}

interface Placed {
  b: any;
  day: string;
  start: number;
  end: number;
}

function todayIn(tz: string): CalendarDate {
  return toZoned(new Date(), tz).date;
}

function addDays(d: CalendarDate, n: number): CalendarDate {
  const dt = new Date(Date.UTC(d.y, d.m - 1, d.d + n));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function mondayOf(d: CalendarDate): CalendarDate {
  const weekday = new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay();
  return addDays(d, -((weekday + 6) % 7));
}

function dayKey(d: CalendarDate): string {
  return d.y + '-' + String(d.m).padStart(2, '0') + '-' + String(d.d).padStart(2, '0');
}

function timeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return h12 + (m ? ':' + String(m).padStart(2, '0') : '') + (h < 12 ? 'a' : 'p');
}

function dayLabel(d: CalendarDate, options: Intl.DateTimeFormatOptions): string {
  return new Date(Date.UTC(d.y, d.m - 1, d.d)).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
}

/** Bookings in campus-local time, keyed by room. */
function placeByRoom(bookings: any[], tz: string): Map<string, Placed[]> {
  const map = new Map<string, Placed[]>();
  for (const b of bookings) {
    const s = toZoned(new Date(b.startTime), tz);
    const e = toZoned(new Date(b.endTime), tz);
    const day = dayKey(s.date);
    const item = { b, day, start: s.minutes, end: dayKey(e.date) === day ? e.minutes : 24 * 60 };
    if (!map.has(b.roomId)) map.set(b.roomId, []);
    map.get(b.roomId)!.push(item);
  }
  map.forEach((items) => items.sort((x, y) => x.start - y.start));
  return map;
}

interface DateNavProps {
  title: string;
  subtitle: string;
  value: CalendarDate;
  onPick: (d: CalendarDate) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

function DateNav({ title, subtitle, value, onPick, onPrev, onNext, onToday }: DateNavProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50" onClick={onPrev} aria-label="Previous">
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50" onClick={onToday}>
          Today
        </button>
        <button className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50" onClick={onNext} aria-label="Next">
          <ChevronRightIcon className="h-5 w-5" />
        </button>
        <input
          type="date"
          className="ml-2 w-auto"
          value={dayKey(value)}
          onChange={(e) => {
            const [y, m, d] = e.target.value.split('-').map(Number);
            if (y && m && d) onPick({ y, m, d });
          }}
        />
      </div>
      <div className="text-right">
        <p className="text-base font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function Shell({ isLoading, children }: { isLoading?: boolean; children: React.ReactNode }) {
  return (
    <div className="relative rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card sm:p-6">
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-white/50">
          <LoadingSpinner className="h-8 w-8 text-blue-600" />
        </div>
      )}
      {children}
    </div>
  );
}

function NoCampus() {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-12 text-center text-sm text-slate-500 shadow-card">
      Choose a campus above to see its rooms.
    </div>
  );
}

/** Rooms as rows and weekdays as columns, so sessions never sit on top of each other. */
export function RoomWeekView({ campus, rooms, roomId, bookings, isLoading, onEventClick, onFreeSlotClick, onRangeChange }: RoomViewProps) {
  const tz = campus?.timeZone || 'America/Chicago';
  const [monday, setMonday] = useState<CalendarDate>(() => mondayOf(todayIn(tz)));

  useEffect(() => {
    if (campus) onRangeChange(zonedTime(monday, 0, tz), zonedTime(addDays(monday, 7), 0, tz));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campus?.id, tz, dayKey(monday)]);

  const byRoom = useMemo(() => placeByRoom(bookings, tz), [bookings, tz]);
  const shownRooms = roomId ? rooms.filter((r) => r.id === roomId) : rooms;

  if (!campus) return <NoCampus />;

  // Weekend columns only appear when something is booked on them.
  const week = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday, i));
  const weekend = [dayKey(week[5]), dayKey(week[6])];
  const hasWeekend = bookings.some((b) => weekend.includes(dayKey(toZoned(new Date(b.startTime), tz).date)));
  const days = hasWeekend ? week : week.slice(0, 5);
  const title = dayLabel(days[0], { month: 'short', day: 'numeric' }) + ' – ' + dayLabel(days[days.length - 1], { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Shell isLoading={isLoading}>
      <DateNav
        title={title}
        subtitle={campus.name}
        value={monday}
        onPick={(d) => setMonday(mondayOf(d))}
        onPrev={() => setMonday(addDays(monday, -7))}
        onNext={() => setMonday(addDays(monday, 7))}
        onToday={() => setMonday(mondayOf(todayIn(tz)))}
      />
      {shownRooms.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">This campus has no rooms yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div className="grid" style={{ gridTemplateColumns: '96px repeat(' + days.length + ', minmax(150px, 1fr))' }}>
            <div className="sticky left-0 z-20 border-b border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600">Room</div>
            {days.map((d) => (
              <div key={dayKey(d)} className="border-b border-l border-slate-200 p-3 text-xs font-semibold text-slate-700">
                {dayLabel(d, { weekday: 'short', month: 'numeric', day: 'numeric' })}
              </div>
            ))}
            {shownRooms.map((room) => (
              <React.Fragment key={room.id}>
                <div className="sticky left-0 z-20 flex items-center border-b border-slate-200 bg-white p-3 text-sm font-bold text-slate-900">{room.name}</div>
                {days.map((d) => {
                  const key = dayKey(d);
                  const items = (byRoom.get(room.id) || []).filter((x) => x.day === key);
                  return (
                    <div key={key} className="group flex min-h-[64px] flex-col gap-1 border-b border-l border-slate-200 p-1.5">
                      {items.map(({ b, start, end }) => (
                        <button
                          key={b.id}
                          onClick={() => onEventClick(b)}
                          style={programStyle(programOf(b))}
                          className="rounded-lg border px-2 py-1 text-left hover:opacity-90"
                          title={b.title}
                        >
                          <span className="block break-all text-xs font-bold">{bookingLabel(b)}</span>
                          <span className="block text-[11px]">{timeLabel(start)} – {timeLabel(end)}</span>
                        </button>
                      ))}
                      {onFreeSlotClick && (
                        <button
                          onClick={() => onFreeSlotClick(zonedTime(d, 9 * 60, tz), room)}
                          className="mt-auto rounded-md py-0.5 text-xs text-slate-500 opacity-0 hover:bg-slate-100 focus:opacity-100 group-hover:opacity-100"
                          aria-label={'New booking in ' + room.name}
                        >
                          + Book
                        </button>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

/** One day with rooms as rows and time running left to right; white space is free. */
export function RoomTimelineView({ campus, rooms, roomId, bookings, isLoading, onEventClick, onFreeSlotClick, onRangeChange }: RoomViewProps) {
  const tz = campus?.timeZone || 'America/Chicago';
  const [day, setDay] = useState<CalendarDate>(() => todayIn(tz));

  useEffect(() => {
    if (campus) onRangeChange(zonedTime(day, 0, tz), zonedTime(addDays(day, 1), 0, tz));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campus?.id, tz, dayKey(day)]);

  const byRoom = useMemo(() => placeByRoom(bookings, tz), [bookings, tz]);
  const shownRooms = roomId ? rooms.filter((r) => r.id === roomId) : rooms;

  if (!campus) return <NoCampus />;

  const hours: number[] = [];
  for (let m = DAY_START; m < DAY_END; m += 60) hours.push(m);
  const pct = (minutes: number) => ((minutes - DAY_START) / SPAN) * 100 + '%';

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>, room: { id: string }) => {
    if (!onFreeSlotClick || e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = DAY_START + ((e.clientX - rect.left) / rect.width) * SPAN;
    onFreeSlotClick(zonedTime(day, Math.floor(minutes / 30) * 30, tz), room);
  };

  return (
    <Shell isLoading={isLoading}>
      <DateNav
        title={dayLabel(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        subtitle={campus.name}
        value={day}
        onPick={setDay}
        onPrev={() => setDay(addDays(day, -1))}
        onNext={() => setDay(addDays(day, 1))}
        onToday={() => setDay(todayIn(tz))}
      />
      {shownRooms.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">This campus has no rooms yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div className="min-w-[1000px]">
            <div className="flex border-b border-slate-200">
              <div className="sticky left-0 z-20 w-24 flex-none bg-white p-3 text-xs font-semibold text-slate-600">Room</div>
              <div className="relative h-10 flex-1">
                {hours.map((m) => (
                  <span key={m} className="absolute top-3 border-l border-transparent pl-1 text-[11px] text-slate-500" style={{ left: pct(m) }}>
                    {timeLabel(m)}
                  </span>
                ))}
              </div>
            </div>
            {shownRooms.map((room) => {
              const dayKeyValue = dayKey(day);
              const items = (byRoom.get(room.id) || []).filter((x) => x.day === dayKeyValue);
              // Overlapping sessions in one room get their own lane so none is hidden.
              const laneEnds: number[] = [];
              const placed = items.map((item) => {
                let lane = laneEnds.findIndex((end) => end <= item.start);
                if (lane === -1) lane = laneEnds.length;
                laneEnds[lane] = item.end;
                return { ...item, lane };
              });
              const lanes = Math.max(laneEnds.length, 1);
              const laneHeight = 44;
              return (
                <div key={room.id} className="flex border-b border-slate-200 last:border-b-0">
                  <div className="sticky left-0 z-20 flex w-24 flex-none items-center bg-white p-3 text-sm font-bold text-slate-900">{room.name}</div>
                  <div
                    className={'relative flex-1 ' + (onFreeSlotClick ? 'cursor-pointer hover:bg-slate-50' : '')}
                    style={{ height: lanes * laneHeight + 8 }}
                    onClick={(e) => handleTrackClick(e, room)}
                  >
                    {hours.map((m) => (
                      <div key={m} className="pointer-events-none absolute inset-y-0 border-l border-slate-100" style={{ left: pct(m) }} />
                    ))}
                    {placed.map(({ b, start, end, lane }) => {
                      const from = Math.max(start, DAY_START);
                      const to = Math.min(end, DAY_END);
                      if (to <= from) return null;
                      return (
                        <button
                          key={b.id}
                          onClick={() => onEventClick(b)}
                          title={b.title + ' (' + timeLabel(start) + ' – ' + timeLabel(end) + ')'}
                          style={{
                            ...programStyle(programOf(b)),
                            left: pct(from),
                            width: ((to - from) / SPAN) * 100 + '%',
                            top: 4 + lane * laneHeight,
                            height: laneHeight - 4,
                          }}
                          className="absolute overflow-hidden whitespace-nowrap rounded-lg border px-2 text-left hover:opacity-90"
                        >
                          <span className="block text-xs font-bold leading-tight">{bookingLabel(b)}</span>
                          <span className="block text-[11px] leading-tight">{timeLabel(start)} – {timeLabel(end)}</span>
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
    </Shell>
  );
}

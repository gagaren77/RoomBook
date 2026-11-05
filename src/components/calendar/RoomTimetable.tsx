'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toZoned, zonedTime, CalendarDate } from '@/lib/schedule';
import { bookingColors, programOf } from '@/lib/programs';
import { usePrograms } from '@/lib/use-programs';
import { DEFAULT_BLOCKS, clock, hourLabel, overlapMinutes } from '@/lib/time-blocks';
import {
  DAY_NAMES,
  MONTH_NAMES,
  addDays,
  addMonths,
  dayIndex,
  eachDay,
  firstOfMonth,
  isoDate,
  isoWeekday,
  lastOfMonth,
  mondayOf,
  monthDay,
  parseIsoDate,
  rangeLabel,
  sameDay,
} from '@/lib/dates';
import { ProgramLegend, countPrograms } from './ProgramLegend';

type Mode = 'week' | 'month' | 'custom';
/** 'all' shows a stripe per block; a number picks one block of DEFAULT_BLOCKS. */
type BlockChoice = 'all' | number;

const MODES: { id: Mode; label: string; title: string }[] = [
  { id: 'week', label: 'Week', title: 'One week, every class listed' },
  { id: 'month', label: 'Month', title: 'One month, one cell per room and day' },
  { id: 'custom', label: 'Custom', title: 'Any range up to four months' },
];
const MAX_RANGE_DAYS = 124; // about four months
const DEFAULT_START = 9 * 60; // a free cell books at 9:00 AM
const MODE_KEY = 'roombook.timetableMode';
const BLOCK_KEY = 'roombook.timetableBlock';
const WIDE_COLUMNS = 45; // up to this many day columns every day number is shown

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
type Column = { date: CalendarDate; i: number };

function label(b: any) {
  return b.courseId || b.termId || b.title;
}

/**
 * Rooms by day: one row per room, one column per day. A week lists every
 * class; a month or a custom range (up to four months) shows one small cell
 * per day, filled when the room is booked in the chosen part of the day.
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
  const today = toZoned(new Date(), tz).date;

  const [mode, setMode] = useState<Mode>('week');
  const [block, setBlock] = useState<BlockChoice>('all');
  const [showWeekends, setShowWeekends] = useState(false);
  const [weekStart, setWeekStart] = useState<CalendarDate>(() => mondayOf(today));
  const [monthStart, setMonthStart] = useState<CalendarDate>(() => firstOfMonth(today));
  const [customFrom, setCustomFrom] = useState<CalendarDate>(() => mondayOf(today));
  const [customTo, setCustomTo] = useState<CalendarDate>(() => addDays(mondayOf(today), 16 * 7 - 3));
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const programs = usePrograms();

  // The last mode and part of the day are remembered in this browser.
  useEffect(() => {
    try {
      const m = window.localStorage.getItem(MODE_KEY) as Mode | null;
      if (m && MODES.some((x) => x.id === m)) setMode(m);
      const b = window.localStorage.getItem(BLOCK_KEY);
      if (b === 'all') setBlock('all');
      else if (b && DEFAULT_BLOCKS[Number(b)]) setBlock(Number(b));
    } catch {}
  }, []);
  const chooseMode = (m: Mode) => {
    setMode(m);
    try {
      window.localStorage.setItem(MODE_KEY, m);
    } catch {}
  };
  const chooseBlock = (b: BlockChoice) => {
    setBlock(b);
    try {
      window.localStorage.setItem(BLOCK_KEY, String(b));
    } catch {}
  };

  const shownRooms = useMemo(() => (roomId ? rooms.filter((r) => r.id === roomId) : rooms), [rooms, roomId]);

  // The dates on screen. A custom range is clamped to four months.
  const range = useMemo(() => {
    if (mode === 'week') return { start: weekStart, end: addDays(weekStart, 6) };
    if (mode === 'month') return { start: monthStart, end: lastOfMonth(monthStart) };
    let end = customTo;
    if (dayIndex(customFrom, end) < 0) end = customFrom;
    if (dayIndex(customFrom, end) >= MAX_RANGE_DAYS) end = addDays(customFrom, MAX_RANGE_DAYS - 1);
    return { start: customFrom, end };
  }, [mode, weekStart, monthStart, customFrom, customTo]);
  const rangeKey = `${isoDate(range.start)}_${isoDate(range.end)}`;

  useEffect(() => {
    if (!campus) return;
    const start = zonedTime(range.start, 0, tz);
    const end = zonedTime(addDays(range.end, 1), 0, tz);
    const params = new URLSearchParams({ campusId: campus.id, start: start.toISOString(), end: end.toISOString(), fields: 'compact' });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campus, rangeKey, tz, roomId, refreshKey]);

  const dayCount = dayIndex(range.start, range.end) + 1;

  // room -> day index -> classes, in campus-local time.
  const grid = useMemo(() => {
    const map = new Map<string, Cell[][]>();
    for (const b of bookings) {
      const s = toZoned(new Date(b.startTime), tz);
      const e = toZoned(new Date(b.endTime), tz);
      const day = dayIndex(range.start, s.date);
      if (day < 0 || day >= dayCount) continue;
      if (!map.has(b.roomId)) map.set(b.roomId, Array.from({ length: dayCount }, () => []));
      map.get(b.roomId)![day].push({
        b,
        start: s.minutes,
        end: sameDay(e.date, s.date) ? e.minutes : 24 * 60,
        program: programOf(b),
      });
    }
    for (const days of Array.from(map.values())) days.forEach((list) => list.sort((a, b) => a.start - b.start));
    return map;
  }, [bookings, tz, range.start, dayCount]);

  const counts = useMemo(() => countPrograms(bookings), [bookings]);

  // A week shows weekend columns only when something is booked on a weekend;
  // a month or a custom range shows weekdays unless weekends are switched on.
  const { columns, weekendClasses } = useMemo(() => {
    const days: Column[] = eachDay(range.start, range.end).map((date, i) => ({ date, i }));
    let sat = false;
    let sun = false;
    let weekendClasses = 0;
    for (const rows of Array.from(grid.values())) {
      rows.forEach((list, i) => {
        if (!list.length) return;
        const wd = isoWeekday(days[i].date);
        if (wd === 6) sat = true;
        if (wd === 7) sun = true;
        if (wd >= 6) weekendClasses += list.length;
      });
    }
    if (mode === 'week') {
      const last = sun ? 7 : sat ? 6 : 5;
      return { columns: days.slice(0, last), weekendClasses };
    }
    return { columns: showWeekends ? days : days.filter(({ date }) => isoWeekday(date) <= 5), weekendClasses };
  }, [grid, range.start, range.end, mode, showWeekends]);

  // Month groups for the header of a long range.
  const monthGroups = useMemo(() => {
    const groups: { key: string; label: string; span: number }[] = [];
    for (const { date } of columns) {
      const key = `${date.y}-${date.m}`;
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.span++;
      else groups.push({ key, label: `${MONTH_NAMES[date.m - 1].slice(0, 3)} ${date.y}`, span: 1 });
    }
    return groups;
  }, [columns]);

  const blocks = block === 'all' ? DEFAULT_BLOCKS : [DEFAULT_BLOCKS[block]];

  const busyIn = (items: Cell[], b: { start: number; end: number }) => items.filter((c) => overlapMinutes(c.start, c.end, b.start, b.end) > 0);
  const isBusy = (items: Cell[]) => (block === 'all' ? items.length > 0 : busyIn(items, DEFAULT_BLOCKS[block]).length > 0);

  // Which rooms are free most often in the chosen part of the day.
  const freeRooms = useMemo(() => {
    if (mode === 'week') return [];
    return shownRooms
      .map((room) => {
        const rows = grid.get(room.id);
        let free = 0;
        for (const col of columns) if (!isBusy(rows?.[col.i] || [])) free++;
        return { room, free, total: columns.length };
      })
      .sort((a, b) => b.free - a.free || a.room.name.localeCompare(b.room.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, shownRooms, grid, columns, block]);

  if (!campus) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-12 text-center text-sm text-slate-500 shadow-card">
        Choose a campus above to see its rooms week by week.
      </div>
    );
  }

  const shownEnd = columns.length ? columns[columns.length - 1].date : range.end;
  const weekdayCount = columns.filter((c) => isoWeekday(c.date) <= 5).length;
  const title =
    mode === 'week'
      ? rangeLabel(range.start, shownEnd)
      : mode === 'month'
        ? `${MONTH_NAMES[monthStart.m - 1]} ${monthStart.y}`
        : rangeLabel(range.start, range.end);
  const subtitle =
    mode === 'week'
      ? campus.name
      : `${campus.name} · ${columns.length} days${weekdayCount !== columns.length ? ` (${weekdayCount} weekdays)` : ''}`;
  const blockName = block === 'all' ? 'any time' : DEFAULT_BLOCKS[block].name.toLowerCase() + 's';
  const compact = mode !== 'week';
  const showEveryDay = columns.length <= WIDE_COLUMNS;

  const dateControls =
    mode === 'week' ? (
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
    ) : mode === 'month' ? (
      <div className="flex items-center gap-2">
        <button className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50" onClick={() => setMonthStart(addMonths(monthStart, -1))} aria-label="Previous month">
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50" onClick={() => setMonthStart(firstOfMonth(today))}>
          This month
        </button>
        <button className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50" onClick={() => setMonthStart(addMonths(monthStart, 1))} aria-label="Next month">
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    ) : (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="timetable-from" className="text-slate-500">
          From
        </label>
        <input
          id="timetable-from"
          type="date"
          className="!w-auto !py-1.5 text-sm"
          value={isoDate(customFrom)}
          onChange={(e) => {
            const d = parseIsoDate(e.target.value);
            if (d) setCustomFrom(d);
          }}
        />
        <label htmlFor="timetable-to" className="text-slate-500">
          To
        </label>
        <input
          id="timetable-to"
          type="date"
          className="!w-auto !py-1.5 text-sm"
          value={isoDate(customTo)}
          min={isoDate(customFrom)}
          max={isoDate(addDays(customFrom, MAX_RANGE_DAYS - 1))}
          onChange={(e) => {
            const d = parseIsoDate(e.target.value);
            if (d) setCustomTo(d);
          }}
        />
        <span className="text-xs text-slate-400">up to 4 months</span>
      </div>
    );

  return (
    <div className="relative rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 p-0.5" role="tablist" aria-label="Time frame">
            {MODES.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={mode === m.id}
                title={m.title}
                onClick={() => chooseMode(m.id)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition ${mode === m.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {dateControls}
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      {compact && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Time of day:</span>
          <div className="flex flex-wrap rounded-full border border-slate-200 p-0.5" role="tablist" aria-label="Time of day">
            {([ 'all', 0, 1, 2 ] as BlockChoice[]).map((b) => {
              const active = block === b;
              const text = b === 'all' ? 'All' : `${DEFAULT_BLOCKS[b].name} ${hourLabel(DEFAULT_BLOCKS[b].start)}–${hourLabel(DEFAULT_BLOCKS[b].end)}`;
              return (
                <button
                  key={String(b)}
                  role="tab"
                  aria-selected={active}
                  onClick={() => chooseBlock(b)}
                  className={`rounded-full px-3 py-1 font-medium transition ${active ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {text}
                </button>
              );
            })}
          </div>
          <span className="text-slate-400">
            {block === 'all' ? 'Each cell shows a stripe per part of the day: morning, afternoon, evening.' : 'A filled cell means the room is booked then.'}
          </span>
          {(weekendClasses > 0 || showWeekends) && (
            <button type="button" onClick={() => setShowWeekends(!showWeekends)} className="ml-auto font-medium text-indigo-600 hover:text-indigo-800">
              {showWeekends ? 'Hide weekends' : `Show weekends (${weekendClasses} ${weekendClasses === 1 ? 'class' : 'classes'})`}
            </button>
          )}
        </div>
      )}

      <ProgramLegend counts={counts} programs={programs} hidden={hiddenPrograms} onToggle={onToggleProgram} onShowAll={onShowAllPrograms} />

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/50">
          <LoadingSpinner className="h-8 w-8 text-blue-600" />
        </div>
      )}

      {shownRooms.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">This campus has no rooms yet.</p>
      ) : (
        <div className={compact ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-5' : ''}>
          <div className="overflow-x-auto">
            <table
              className={`w-full table-fixed border-collapse text-left text-sm ${compact ? '' : 'min-w-[760px]'}`}
              style={compact ? { minWidth: `${112 + columns.length * (columns.length > 60 ? 11 : 14)}px` } : undefined}
            >
              <thead>
                {compact && (
                  <tr>
                    <th className="sticky left-0 z-10 w-28 bg-white" />
                    {monthGroups.map((g, gi) => (
                      <th
                        key={g.key}
                        colSpan={g.span}
                        className={`px-1 pb-1 text-left text-xs font-semibold text-slate-700 ${gi ? 'border-l-2 border-slate-300' : ''}`}
                      >
                        {g.label}
                      </th>
                    ))}
                  </tr>
                )}
                <tr>
                  <th className="sticky left-0 z-10 w-28 bg-white px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Room</th>
                  {columns.map(({ date }, ci) => {
                    const isToday = sameDay(date, today);
                    const wd = isoWeekday(date);
                    const weekStartCol = ci > 0 && wd === 1;
                    if (compact) {
                      const show = showEveryDay || wd === 1;
                      return (
                        <th
                          key={ci}
                          title={`${DAY_NAMES[wd - 1]} ${monthDay(date, true)}`}
                          className={`px-0 py-1 text-center text-[10px] font-medium ${weekStartCol ? 'border-l-2 border-slate-300' : ''} ${
                            isToday ? 'text-indigo-700' : wd >= 6 ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {show ? (
                            <span className={isToday ? 'rounded-full bg-indigo-600 px-1 text-white' : ''}>{date.d}</span>
                          ) : (
                            ''
                          )}
                        </th>
                      );
                    }
                    return (
                      <th key={ci} className={`px-2 py-2 text-center text-xs font-semibold ${isToday ? 'text-indigo-700' : 'text-slate-600'}`}>
                        {DAY_NAMES[wd - 1]}{' '}
                        <span className={`font-normal ${isToday ? 'rounded-full bg-indigo-600 px-1.5 py-0.5 text-white' : 'text-slate-400'}`}>
                          {date.m}/{date.d}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {shownRooms.map((room) => {
                  const rows = grid.get(room.id) || [];
                  return (
                    <tr key={room.id} className="border-t border-slate-100 align-top">
                      <th className="sticky left-0 z-10 bg-white px-2 py-2 text-sm font-semibold text-slate-900">{room.name}</th>
                      {columns.map(({ date, i }, ci) => {
                        const items = rows[i] || [];
                        const wd = isoWeekday(date);
                        const weekStartCol = ci > 0 && wd === 1;
                        const dayName = `${DAY_NAMES[wd - 1]} ${monthDay(date)}`;

                        if (compact) {
                          const busy = isBusy(items);
                          const listed = block === 'all' ? items : busyIn(items, DEFAULT_BLOCKS[block]);
                          const tip = [`${room.name} · ${dayName}`]
                            .concat(listed.length ? listed.map((c) => `${label(c.b)} ${clock(c.start)}–${clock(c.end)}`) : [`Free ${blockName === 'any time' ? 'all day' : 'in the ' + DEFAULT_BLOCKS[block as number].name.toLowerCase()}`])
                            .join('\n');
                          const bookAt = block === 'all' ? DEFAULT_START : DEFAULT_BLOCKS[block].start;
                          const onClick = busy
                            ? () => onEventClick(listed[0].b)
                            : onFreeSlotClick
                              ? () => onFreeSlotClick(zonedTime(date, bookAt, tz), room)
                              : undefined;
                          return (
                            <td key={ci} className={`p-[1px] ${weekStartCol ? 'border-l-2 border-slate-300' : ''}`}>
                              <button
                                type="button"
                                title={tip}
                                onClick={onClick}
                                disabled={!onClick}
                                aria-label={tip}
                                className={`flex w-full flex-col gap-[2px] rounded-[3px] p-[2px] transition ${
                                  busy ? 'hover:ring-2 hover:ring-indigo-300' : onFreeSlotClick ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-emerald-50'
                                }`}
                                style={{ height: block === 'all' ? 28 : 24 }}
                              >
                                {blocks.map((bl) => {
                                  const inBlock = busyIn(items, bl);
                                  const first = inBlock.find((c) => !hiddenPrograms.has(c.program)) || inBlock[0];
                                  let bg = 'transparent';
                                  if (first) bg = hiddenPrograms.has(first.program) ? '#cbd5e1' : bookingColors(first.b, programs).dot || bookingColors(first.b, programs).bg;
                                  return <span key={bl.name} className="block w-full flex-1 rounded-[2px]" style={{ backgroundColor: bg }} />;
                                })}
                              </button>
                            </td>
                          );
                        }

                        const free = items.length === 0;
                        return (
                          <td
                            key={ci}
                            className={`border-l border-slate-100 p-1 ${free ? 'bg-emerald-50/60' : ''} ${
                              free && onFreeSlotClick ? 'cursor-pointer hover:bg-emerald-100' : ''
                            }`}
                            title={free ? `${room.name} is free on ${dayName}` : undefined}
                            onClick={free && onFreeSlotClick ? () => onFreeSlotClick(zonedTime(date, DEFAULT_START, tz), room) : undefined}
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
                                      <span className="block truncate font-semibold">{label(b)}</span>
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

          {compact && (
            <aside className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:mt-0">
              <p className="text-sm font-semibold text-slate-900">Free rooms, {blockName}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {rangeLabel(range.start, range.end)} · {columns.length} days. Rooms with the fewest conflicts first.
              </p>
              <ul className="mt-3 space-y-2">
                {freeRooms.map(({ room, free, total }) => {
                  const pct = total ? Math.round((free / total) * 100) : 0;
                  const tone = pct >= 90 ? 'text-emerald-700' : pct >= 60 ? 'text-amber-700' : 'text-rose-700';
                  return (
                    <li key={room.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{room.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {free === total ? `Free every day` : `Booked on ${total - free} of ${total} days`}
                        </p>
                      </div>
                      <span className={`text-sm font-bold ${tone}`}>{pct}% free</span>
                    </li>
                  );
                })}
              </ul>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

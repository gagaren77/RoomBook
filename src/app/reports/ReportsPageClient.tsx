'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowDownTrayIcon, PlusIcon, PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Navigation } from '@/components/layout/Navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { programColor } from '@/lib/programs';
import { usePrograms } from '@/lib/use-programs';
import { DEFAULT_BLOCKS, hourLabel, parseClock, toClockInput } from '@/lib/time-blocks';
import { CalendarDate, DAY_NAMES, addDays, addMonths, firstOfMonth, isoDate, lastOfMonth, parseIsoDate, rangeLabel } from '@/lib/dates';
import type { Measure, UtilizationReport } from '@/lib/utilization';

type BlockDraft = { name: string; start: string; end: string };
type Filters = { campusId: string; roomIds: string[]; from: string; to: string; days: number[]; blocks: BlockDraft[] };

const FILTERS_KEY = 'roombook.reportFilters';
const MAX_BLOCKS = 8;

function localToday(): CalendarDate {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

function defaultFilters(): Filters {
  const today = localToday();
  return {
    campusId: '',
    roomIds: [],
    from: isoDate(firstOfMonth(today)),
    to: isoDate(lastOfMonth(today)),
    days: [1, 2, 3, 4, 5],
    blocks: DEFAULT_BLOCKS.map((b) => ({ name: b.name, start: toClockInput(b.start), end: toClockInput(b.end) })),
  };
}

const QUICK_RANGES: { id: string; label: string; range: (today: CalendarDate) => [CalendarDate, CalendarDate] }[] = [
  { id: 'this-month', label: 'This month', range: (t) => [firstOfMonth(t), lastOfMonth(t)] },
  { id: 'last-month', label: 'Last month', range: (t) => [addMonths(t, -1), lastOfMonth(addMonths(t, -1))] },
  { id: 'next-month', label: 'Next month', range: (t) => [addMonths(t, 1), lastOfMonth(addMonths(t, 1))] },
  { id: 'last-3', label: 'Last 3 months', range: (t) => [addMonths(t, -3), lastOfMonth(addMonths(t, -1))] },
  { id: 'this-3', label: 'This and next 2 months', range: (t) => [firstOfMonth(t), lastOfMonth(addMonths(t, 2))] },
  { id: 'next-4', label: 'Next 4 months', range: (t) => [addMonths(t, 1), lastOfMonth(addMonths(t, 4))] },
  { id: 'ytd', label: 'This year so far', range: (t) => [{ y: t.y, m: 1, d: 1 }, t] },
];

function toQuery(f: Filters): URLSearchParams {
  const params = new URLSearchParams({
    start: f.from,
    end: f.to,
    days: f.days.join(','),
    blocks: f.blocks.map((b) => `${b.name.replace(/[=;]/g, ' ')}=${b.start}-${b.end}`).join(';'),
  });
  if (f.campusId) params.set('campusId', f.campusId);
  if (f.roomIds.length) params.set('roomIds', f.roomIds.join(','));
  return params;
}

/** A problem with the filters, or null when they can run. */
function validate(f: Filters): string | null {
  const from = parseIsoDate(f.from);
  const to = parseIsoDate(f.to);
  if (!from || !to) return 'Pick a start and an end date.';
  if (isoDate(to) < isoDate(from)) return 'The end date is before the start date.';
  if (!f.days.length) return 'Pick at least one weekday.';
  if (!f.blocks.length) return 'Add at least one time block.';
  for (const b of f.blocks) {
    const s = parseClock(b.start);
    const e = parseClock(b.end);
    if (!b.name.trim()) return 'Every time block needs a name.';
    if (s === null || e === null || e <= s) return `${b.name}: the end time must be after the start time.`;
  }
  return null;
}

function pct(m: Measure | { pct: number }) {
  return `${m.pct.toFixed(1)}%`;
}

function hours(h: number) {
  return `${Math.round(h * 10) / 10} h`;
}

function heatStyle(p: number): React.CSSProperties {
  if (!p) return { backgroundColor: '#ecfdf5', color: '#047857' };
  const a = Math.min(0.9, 0.12 + p / 50);
  return { backgroundColor: `rgba(79, 70, 229, ${a.toFixed(2)})`, color: a >= 0.7 ? '#ffffff' : '#0f172a' };
}

function Tile({ label, value, sub, hero, tone }: { label: string; value: string; sub?: string; hero?: boolean; tone?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card ${hero ? 'sm:col-span-2' : ''}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 font-semibold leading-tight text-slate-900 ${hero ? 'text-5xl' : 'text-2xl'} ${tone || ''}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function Bars({ items, height = 128 }: { items: { tick: string; value: number; title: string; label?: boolean }[]; height?: number }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${items.length * 22}px` }}>
        <div className="flex items-end gap-1 border-b border-slate-200" style={{ height }}>
          {items.map((it, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={it.title}>
              <span className="h-3.5 text-[11px] font-semibold text-slate-700">{it.label ? `${Math.round(it.value * 10) / 10}%` : ''}</span>
              <div className="w-full max-w-[22px] rounded-t bg-indigo-600" style={{ height: `${Math.max(it.value > 0 ? 2 : 0, (it.value / max) * (height - 22))}px` }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1">
          {items.map((it, i) => (
            <div key={i} className="flex-1 truncate text-center text-[10px] text-slate-500">
              {it.tick}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReportsPageClient() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [report, setReport] = useState<UtilizationReport | null>(null);
  const [ran, setRan] = useState<Filters | null>(null);
  const [loading, setLoading] = useState(false);
  const [quick, setQuick] = useState('this-month');
  const programs = usePrograms();
  const firstRun = useRef(false);

  // The last filters are remembered in this browser, and the report runs right away.
  useEffect(() => {
    let f = defaultFilters();
    try {
      const saved = window.localStorage.getItem(FILTERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        f = { ...f, ...parsed, blocks: Array.isArray(parsed.blocks) && parsed.blocks.length ? parsed.blocks : f.blocks };
        setQuick('');
      }
    } catch {}
    setFilters(f);
    if (!firstRun.current) {
      firstRun.current = true;
      run(f);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch('/api/campuses')
      .then((r) => (r.ok ? r.json() : []))
      .then(setCampuses)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!filters.campusId) {
      setRooms([]);
      return;
    }
    fetch(`/api/rooms?campusId=${filters.campusId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setRooms)
      .catch(() => {});
  }, [filters.campusId]);

  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  async function run(f: Filters) {
    const problem = validate(f);
    if (problem) {
      toast.error(problem);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/utilization?${toQuery(f)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'The report could not be built');
      setReport(data);
      setRan(f);
      try {
        window.localStorage.setItem(FILTERS_KEY, JSON.stringify(f));
      } catch {}
    } catch (e: any) {
      toast.error(e.message || 'The report could not be built');
    } finally {
      setLoading(false);
    }
  }

  const campusName = ran?.campusId ? campuses.find((c) => c.id === ran.campusId)?.name || 'Campus' : 'All campuses';
  const period = ran ? rangeLabel(parseIsoDate(ran.from)!, parseIsoDate(ran.to)!) : '';

  // Hours of the day between the earliest block start and the latest block end.
  const hourItems = useMemo(() => {
    if (!report) return [];
    const first = Math.floor(Math.min(...report.blocks.map((b) => b.start)) / 60);
    const last = Math.ceil(Math.max(...report.blocks.map((b) => b.end)) / 60);
    const slice = report.hours.slice(first, last);
    const max = Math.max(...slice.map((h) => h.pct));
    return slice.map((h) => ({
      tick: hourLabel(h.hour * 60),
      value: h.pct,
      label: h.pct > 0 && h.pct === max,
      title: `${hourLabel(h.hour * 60)}–${hourLabel((h.hour + 1) * 60)}: ${h.pct}% of rooms in use (${hours(h.hours)} booked)`,
    }));
  }, [report]);

  const weekItems = useMemo(() => {
    if (!report) return [];
    const max = Math.max(...report.weeks.map((w) => w.pct));
    const min = Math.min(...report.weeks.map((w) => w.pct));
    return report.weeks.map((w) => {
      const d = parseIsoDate(w.start)!;
      return {
        tick: `${d.m}/${d.d}`,
        value: w.pct,
        label: report.weeks.length <= 10 || w.pct === max || w.pct === min,
        title: `Week of ${rangeLabel(d, addDays(d, 6))}: ${w.pct}% (${hours(w.hours)} of ${hours(w.available)})`,
      };
    });
  }, [report]);

  const unionHours = report ? Math.round((report.total.available / Math.max(1, report.roomCount * report.dayCount)) * 10) / 10 : 0;
  const showCampusColumn = !ran?.campusId;

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <Navigation />
      </div>

      <main className="py-10 print:py-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PageHeader
            title="Reports · Room utilization"
            subtitle={ran ? `${campusName} · ${period} · ${ran.days.map((d) => DAY_NAMES[d - 1]).join(', ')}` : 'How much of the room time is booked'}
            actions={
              report && ran ? (
                <div className="flex items-center gap-3 print:hidden">
                  <Button variant="secondary" onClick={() => window.print()}>
                    <PrinterIcon className="-ml-1 h-5 w-5" />
                    Print / PDF
                  </Button>
                  <Button variant="secondary" onClick={() => (window.location.href = `/api/reports/utilization?${toQuery(ran)}&format=xlsx`)}>
                    <ArrowDownTrayIcon className="-ml-1 h-5 w-5" />
                    Export Excel
                  </Button>
                </div>
              ) : undefined
            }
          />

          <form
            className="mb-6 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card print:hidden"
            onSubmit={(e) => {
              e.preventDefault();
              run(filters);
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="report-campus" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Campus
                </label>
                <select id="report-campus" value={filters.campusId} onChange={(e) => update({ campusId: e.target.value, roomIds: [] })}>
                  <option value="">All campuses</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="report-quick" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Period
                </label>
                <select
                  id="report-quick"
                  value={quick}
                  onChange={(e) => {
                    const q = QUICK_RANGES.find((r) => r.id === e.target.value);
                    setQuick(e.target.value);
                    if (q) {
                      const [a, b] = q.range(localToday());
                      update({ from: isoDate(a), to: isoDate(b) });
                    }
                  }}
                >
                  <option value="">Custom dates</option>
                  {QUICK_RANGES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="report-from" className="mb-1.5 block text-sm font-medium text-slate-700">
                  From
                </label>
                <input
                  id="report-from"
                  type="date"
                  value={filters.from}
                  onChange={(e) => {
                    setQuick('');
                    update({ from: e.target.value });
                  }}
                />
              </div>
              <div>
                <label htmlFor="report-to" className="mb-1.5 block text-sm font-medium text-slate-700">
                  To
                </label>
                <input
                  id="report-to"
                  type="date"
                  value={filters.to}
                  min={filters.from}
                  onChange={(e) => {
                    setQuick('');
                    update({ to: e.target.value });
                  }}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-start gap-x-8 gap-y-4">
              <div>
                <p className="mb-1.5 text-sm font-medium text-slate-700">Days</p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Weekdays to count">
                  {DAY_NAMES.map((name, i) => {
                    const day = i + 1;
                    const on = filters.days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={on}
                        onClick={() => update({ days: on ? filters.days.filter((d) => d !== day) : [...filters.days, day].sort((a, b) => a - b) })}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${on ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filters.campusId && rooms.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-slate-700">
                    Rooms <span className="font-normal text-slate-400">({filters.roomIds.length ? `${filters.roomIds.length} of ${rooms.length}` : `all ${rooms.length}`})</span>
                  </p>
                  <div className="flex max-w-xl flex-wrap gap-1.5" role="group" aria-label="Rooms to include">
                    {rooms.map((r) => {
                      const on = !filters.roomIds.length || filters.roomIds.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => {
                            const all = rooms.map((x) => x.id);
                            const current = filters.roomIds.length ? filters.roomIds : all;
                            const next = on ? current.filter((id) => id !== r.id) : [...current, r.id];
                            update({ roomIds: next.length === all.length ? [] : next });
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${on ? 'bg-slate-800 text-white' : 'border border-slate-200 bg-white text-slate-400 line-through hover:bg-slate-50'}`}
                        >
                          {r.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <p className="mb-1.5 text-sm font-medium text-slate-700">Time blocks</p>
              <div className="flex flex-wrap items-center gap-2">
                {filters.blocks.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
                    <input
                      type="text"
                      aria-label={`Block ${i + 1} name`}
                      value={b.name}
                      onChange={(e) => update({ blocks: filters.blocks.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                      className="!w-28 !py-1 text-sm"
                    />
                    <input
                      type="time"
                      aria-label={`${b.name || 'Block'} starts`}
                      value={b.start}
                      onChange={(e) => update({ blocks: filters.blocks.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)) })}
                      className="!w-auto !py-1 text-sm"
                    />
                    <span className="text-slate-400">–</span>
                    <input
                      type="time"
                      aria-label={`${b.name || 'Block'} ends`}
                      value={b.end}
                      onChange={(e) => update({ blocks: filters.blocks.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)) })}
                      className="!w-auto !py-1 text-sm"
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${b.name || 'block'}`}
                      onClick={() => update({ blocks: filters.blocks.filter((_, j) => j !== i) })}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {filters.blocks.length < MAX_BLOCKS && (
                  <button
                    type="button"
                    onClick={() => {
                      const last = filters.blocks[filters.blocks.length - 1];
                      const start = last ? last.end : '08:00';
                      const s = parseClock(start) ?? 8 * 60;
                      update({ blocks: [...filters.blocks, { name: `Block ${filters.blocks.length + 1}`, start, end: toClockInput(Math.min(24 * 60, s + 180)) }] });
                    }}
                    className="flex items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add block
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => update({ blocks: defaultFilters().blocks })}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Reset blocks
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">
                Utilization = booked hours ÷ available hours. Available = every room × every selected day × the time blocks. Overlapping classes in one room count once.
              </p>
              <Button type="submit" loading={loading}>
                Run report
              </Button>
            </div>
          </form>

          {loading && !report && (
            <div className="flex justify-center py-16">
              <LoadingSpinner className="h-8 w-8 text-blue-600" />
            </div>
          )}

          {report && ran && (
            <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
              {report.roomCount === 0 ? (
                <div className="rounded-2xl border border-slate-200/70 bg-white p-12 text-center text-sm text-slate-500 shadow-card">No active rooms match these filters.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                    <Tile
                      hero
                      label="Overall utilization"
                      value={pct(report.total)}
                      sub={`${hours(report.total.hours)} of ${hours(report.total.available)} · ${report.roomCount} rooms × ${report.dayCount} days × ${unionHours} h`}
                    />
                    {report.byBlock.map((b) => (
                      <Tile key={b.name} label={`${b.name} ${hourLabel(report.blocks.find((x) => x.name === b.name)!.start)}–${hourLabel(report.blocks.find((x) => x.name === b.name)!.end)}`} value={pct(b)} sub={`${hours(b.hours)} of ${hours(b.available)}`} />
                    ))}
                    <Tile
                      label="Busiest block"
                      value={report.busiest ? `${report.busiest.label} ${report.busiest.block.toLowerCase()}` : '–'}
                      sub={report.busiest ? `${report.busiest.pct}% booked` : 'Nothing booked'}
                    />
                    <Tile
                      label="Slots with every room busy"
                      value={`${report.fullyBooked.count} of ${report.fullyBooked.of}`}
                      sub={report.peak ? `Peak: ${report.peak.rooms} of ${report.peak.of} rooms, ${report.peak.label}` : 'No bookings in this period'}
                    />
                    <Tile
                      label="Rooms never used"
                      value={`${report.neverUsed.length} of ${report.roomCount}`}
                      sub={report.neverUsed.length ? report.neverUsed.slice(0, 4).join(', ') + (report.neverUsed.length > 4 ? ` +${report.neverUsed.length - 4}` : '') : 'Every room was used'}
                      tone={report.neverUsed.length ? 'text-rose-700' : undefined}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                    <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card">
                      <h2 className="text-base font-semibold text-slate-900">When are the rooms busy?</h2>
                      <p className="mb-3 text-xs text-slate-500">Share of room-hours booked, by weekday and time block. Darker is busier.</p>
                      <div className="overflow-x-auto">
                        <table className="w-full border-separate border-spacing-1 text-center text-sm">
                          <thead>
                            <tr className="text-xs font-semibold text-slate-500">
                              <th className="w-16" />
                              {report.blocks.map((b) => (
                                <th key={b.name} className="pb-1 font-semibold">
                                  {b.name}
                                </th>
                              ))}
                              <th className="pb-1 font-semibold">Whole day</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.weekdays.map((w) => (
                              <tr key={w.day}>
                                <th className="text-left text-xs font-semibold text-slate-700">{w.label}</th>
                                {[...w.byBlock, w.total].map((m, i) => (
                                  <td key={i} className="rounded-md px-1 py-2" style={heatStyle(m.pct)} title={`${w.label} ${i < report.blocks.length ? report.blocks[i].name : 'whole day'}: ${hours(m.hours)} of ${hours(m.available)}`}>
                                    <span className="block text-base font-bold leading-tight">{Math.round(m.pct)}%</span>
                                    <span className="block text-[11px] leading-tight opacity-80">{m.pct ? hours(m.hours) : 'free'}</span>
                                  </td>
                                ))}
                              </tr>
                            ))}
                            <tr>
                              <th className="text-left text-xs font-semibold text-slate-700">All days</th>
                              {[...report.byBlock, report.total].map((m, i) => (
                                <td key={i} className="rounded-md px-1 py-2" style={heatStyle(m.pct)}>
                                  <span className="block text-base font-bold leading-tight">{Math.round(m.pct)}%</span>
                                  <span className="block text-[11px] leading-tight opacity-80">{m.pct ? hours(m.hours) : 'free'}</span>
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="text-base font-semibold text-slate-900">Rooms, busiest first</h2>
                        {report.neverUsed.length > 0 && (
                          <span className="text-xs font-semibold text-rose-700">
                            {report.neverUsed.length} of {report.roomCount} rooms never used
                          </span>
                        )}
                      </div>
                      <p className="mb-3 text-xs text-slate-500">Each room has {hours(report.rooms[0]?.total.available || 0)} available in this period.</p>
                      <div className="max-h-[480px] overflow-auto">
                        <table className="w-full min-w-[560px] border-collapse text-sm tabular-nums">
                          <thead className="sticky top-0 bg-white">
                            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              <th className="px-1 py-1.5">Room</th>
                              {showCampusColumn && <th className="px-1 py-1.5">Campus</th>}
                              <th className="w-[30%] px-1 py-1.5">Utilization</th>
                              <th className="px-1 py-1.5 text-right">Hours</th>
                              {report.blocks.map((b) => (
                                <th key={b.name} className="px-1 py-1.5 text-right">
                                  {b.name.slice(0, 5)}
                                </th>
                              ))}
                              <th className="px-1 py-1.5 text-right">Days used</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.rooms.map((r) => (
                              <tr key={r.id} className="border-t border-slate-100">
                                <td className={`px-1 py-2 font-semibold ${r.total.hours ? 'text-slate-900' : 'text-rose-700'}`}>{r.name}</td>
                                {showCampusColumn && <td className="px-1 py-2 text-xs text-slate-500">{r.campusName}</td>}
                                <td className="px-1 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2.5 flex-1 overflow-hidden rounded-r bg-indigo-100">
                                      <div className="h-2.5 rounded-r bg-indigo-600" style={{ width: `${Math.min(100, r.total.pct)}%` }} />
                                    </div>
                                    <span className="w-14 text-right font-semibold">{pct(r.total)}</span>
                                  </div>
                                </td>
                                <td className="px-1 py-2 text-right">{hours(r.total.hours)}</td>
                                {r.byBlock.map((m, i) => (
                                  <td key={i} className="px-1 py-2 text-right text-slate-600">
                                    {Math.round(m.pct)}%
                                  </td>
                                ))}
                                <td className="px-1 py-2 text-right text-slate-600">
                                  {r.daysUsed} / {report.dayCount}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card">
                      <h2 className="text-base font-semibold text-slate-900">By hour of day</h2>
                      <p className="mb-3 text-xs text-slate-500">Share of the {report.roomCount} rooms in use, averaged over the {report.dayCount} days.</p>
                      <Bars items={hourItems} />
                    </section>
                    <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card">
                      <h2 className="text-base font-semibold text-slate-900">Week by week</h2>
                      <p className="mb-3 text-xs text-slate-500">Utilization per week, {hours(report.weeks[0]?.available || 0)} available in a full week.</p>
                      <Bars items={weekItems} />
                    </section>
                    <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card">
                      <h2 className="text-base font-semibold text-slate-900">Who uses the rooms</h2>
                      <p className="mb-3 text-xs text-slate-500">Share of booked hours by program, in the calendar&apos;s colors.</p>
                      {report.programs.length === 0 ? (
                        <p className="py-6 text-center text-sm text-slate-500">No classes in this period.</p>
                      ) : (
                        <>
                          <div className="flex h-7 gap-0.5" role="img" aria-label={report.programs.map((p) => `${p.program} ${p.share}%`).join(', ')}>
                            {report.programs.map((p) => (
                              <div
                                key={p.program}
                                className="flex items-center overflow-hidden rounded px-1.5 text-[11px] font-semibold text-slate-900"
                                style={{ width: `${p.share}%`, backgroundColor: programColor(p.program, programs).bg, borderLeft: `4px solid ${programColor(p.program, programs).dot}` }}
                                title={`${p.program}: ${p.share}% (${hours(p.hours)})`}
                              >
                                {p.share >= 8 ? `${Math.round(p.share)}%` : ''}
                              </div>
                            ))}
                          </div>
                          <ul className="mt-3 space-y-1.5 text-sm">
                            {report.programs.slice(0, 8).map((p) => (
                              <li key={p.program} className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: programColor(p.program, programs).dot }} />
                                <span className="font-semibold text-slate-800">{p.program}</span>
                                <span className="ml-auto text-slate-500">
                                  {hours(p.hours)} · {Math.round(p.share)}%
                                </span>
                              </li>
                            ))}
                            {report.programs.length > 8 && <li className="text-xs text-slate-400">and {report.programs.length - 8} more in the Excel export</li>}
                          </ul>
                        </>
                      )}
                    </section>
                  </div>

                  {report.campuses.length > 1 && (
                    <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card">
                      <h2 className="text-base font-semibold text-slate-900">Campus comparison</h2>
                      <p className="mb-3 text-xs text-slate-500">Same period and time blocks, each campus in its own time zone.</p>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                        {report.campuses.map((c) => (
                          <div key={c.id} className="rounded-xl border border-slate-200 p-3">
                            <p className="truncate text-sm font-semibold text-slate-900" title={c.name}>
                              {c.name}
                            </p>
                            <p className="mt-1 text-2xl font-semibold text-slate-900">{pct(c.total)}</p>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-r bg-indigo-100">
                              <div className="h-1.5 rounded-r bg-indigo-600" style={{ width: `${Math.min(100, c.total.pct)}%` }} />
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {c.rooms} {c.rooms === 1 ? 'room' : 'rooms'} · {hours(c.total.hours)} booked
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

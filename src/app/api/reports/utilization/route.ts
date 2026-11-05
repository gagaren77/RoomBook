import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import ExcelJS from 'exceljs';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions-server';
import { DEFAULT_BLOCKS, TimeBlock, hourLabel, parseClock } from '@/lib/time-blocks';
import { DAY_NAMES, dayIndex, parseIsoDate, rangeLabel } from '@/lib/dates';
import { computeUtilization, UtilizationReport } from '@/lib/utilization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_DAYS = 366;

/**
 * GET /api/reports/utilization
 *   ?start=YYYY-MM-DD&end=YYYY-MM-DD        period, inclusive (up to a year)
 *   &campusId=…                              one campus, or every campus when empty
 *   &roomIds=a,b                             only these rooms
 *   &days=1,2,3,4,5                          ISO weekdays to count (Mon = 1)
 *   &blocks=Morning=07:00-12:00;Evening=17:00-22:00
 *   &format=json|xlsx
 * Admins and schedulers only.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await can(session.user.role, 'reports'))) {
      return NextResponse.json({ error: 'Your role may not run reports' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const start = parseIsoDate(searchParams.get('start'));
    const end = parseIsoDate(searchParams.get('end'));
    if (!start || !end) return NextResponse.json({ error: 'start and end must be dates like 2026-11-02' }, { status: 400 });
    if (dayIndex(start, end) < 0) return NextResponse.json({ error: 'The end date is before the start date' }, { status: 400 });
    if (dayIndex(start, end) >= MAX_DAYS) return NextResponse.json({ error: 'A report covers at most one year' }, { status: 400 });

    const days = parseDays(searchParams.get('days'));
    if (!days.length) return NextResponse.json({ error: 'Pick at least one weekday' }, { status: 400 });
    const blocks = parseBlocks(searchParams.get('blocks'));
    if (!blocks) return NextResponse.json({ error: 'Each time block needs a name and an end after its start' }, { status: 400 });

    const campusId = searchParams.get('campusId') || undefined;
    const roomIds = (searchParams.get('roomIds') || '').split(',').map((s) => s.trim()).filter(Boolean);

    const rooms = await prisma.room.findMany({
      where: {
        isActive: true,
        campus: { isActive: true },
        ...(campusId ? { campusId } : {}),
        ...(roomIds.length ? { id: { in: roomIds } } : {}),
      },
      select: { id: true, name: true, campusId: true, campus: { select: { id: true, name: true, timeZone: true } } },
      orderBy: [{ campus: { name: 'asc' } }, { name: 'asc' }],
    });

    // Two days of slack either side covers every campus time zone.
    const windowStart = new Date(Date.UTC(start.y, start.m - 1, start.d - 2));
    const windowEnd = new Date(Date.UTC(end.y, end.m - 1, end.d + 3));
    const bookings = rooms.length
      ? await prisma.booking.findMany({
          where: {
            roomId: { in: rooms.map((r) => r.id) },
            status: { not: 'CANCELLED' },
            startTime: { lt: windowEnd },
            endTime: { gt: windowStart },
          },
          select: { roomId: true, startTime: true, endTime: true, termId: true, courseId: true },
        })
      : [];

    const report = computeUtilization(
      rooms.map((r) => ({ id: r.id, name: r.name, campusId: r.campusId, campusName: r.campus.name, timeZone: r.campus.timeZone || 'America/Chicago' })),
      bookings,
      { start, end, days, blocks }
    );

    if (searchParams.get('format') !== 'xlsx') return NextResponse.json(report);

    const campusName = campusId ? rooms[0]?.campus.name || 'Campus' : 'All campuses';
    const buffer = await toWorkbook(report, campusName);
    const stamp = `${report.range.start}_${report.range.end}`;
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="room-utilization-${stamp}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Failed to build the utilization report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function parseDays(v: string | null): number[] {
  if (!v) return [1, 2, 3, 4, 5];
  const out = Array.from(new Set(v.split(',').map((s) => Number(s.trim())).filter((n) => n >= 1 && n <= 7)));
  return out.sort((a, b) => a - b);
}

/** "Morning=07:00-12:00;Evening=17:00-22:00" */
function parseBlocks(v: string | null): TimeBlock[] | null {
  if (!v) return DEFAULT_BLOCKS;
  const out: TimeBlock[] = [];
  for (const part of v.split(';')) {
    if (!part.trim()) continue;
    const m = /^(.*?)=(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(part.trim());
    if (!m) return null;
    const start = parseClock(m[2]);
    const end = parseClock(m[3]);
    if (start === null || end === null || end <= start) return null;
    out.push({ name: m[1].trim().slice(0, 40) || `${hourLabel(start)}–${hourLabel(end)}`, start, end });
  }
  return out.length && out.length <= 8 ? out : null;
}

async function toWorkbook(r: UtilizationReport, campusName: string): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Room calendar';
  const pct = (m: { pct: number }) => m.pct / 100;
  const pctFmt = '0.0%';
  const start = parseIsoDate(r.range.start)!;
  const end = parseIsoDate(r.range.end)!;

  const summary = wb.addWorksheet('Summary');
  summary.columns = [{ width: 34 }, { width: 28 }, { width: 24 }];
  const put = (a: string, b: string | number, fmt?: string) => {
    const row = summary.addRow([a, b]);
    if (fmt) row.getCell(2).numFmt = fmt;
    row.getCell(1).font = { bold: true };
  };
  put('Room utilization report', '');
  put('Campus', campusName);
  put('Period', rangeLabel(start, end));
  put('Days counted', r.days.map((d) => DAY_NAMES[d - 1]).join(', '));
  put('Time blocks', r.blocks.map((b) => `${b.name} ${hourLabel(b.start)}–${hourLabel(b.end)}`).join('; '));
  put('Rooms', r.roomCount);
  put('Days in period', r.dayCount);
  summary.addRow([]);
  put('Utilization = booked hours ÷ available hours', '');
  put('Overall utilization', pct(r.total), pctFmt);
  put('Booked room-hours', r.total.hours);
  put('Available room-hours', r.total.available);
  for (const b of r.byBlock) put(`${b.name} utilization`, pct(b), pctFmt);
  put('Busiest block', r.busiest ? `${r.busiest.label} ${r.busiest.block.toLowerCase()} (${r.busiest.pct}%)` : '–');
  put('Slots with every room busy', `${r.fullyBooked.count} of ${r.fullyBooked.of}`);
  put('Peak rooms in use at once', r.peak ? `${r.peak.rooms} of ${r.peak.of} (${r.peak.label})` : '–');
  put('Rooms never used', r.neverUsed.length ? r.neverUsed.join(', ') : 'none');

  const wd = wb.addWorksheet('By weekday');
  wd.addRow(['Weekday', 'Dates', ...r.blocks.map((b) => `${b.name} %`), 'Whole day %', ...r.blocks.map((b) => `${b.name} hours`), 'Booked hours', 'Available hours']).font = { bold: true };
  for (const w of r.weekdays) {
    const row = wd.addRow([w.label, w.dates, ...w.byBlock.map(pct), pct(w.total), ...w.byBlock.map((m) => m.hours), w.total.hours, w.total.available]);
    for (let c = 3; c <= 3 + r.blocks.length; c++) row.getCell(c).numFmt = pctFmt;
  }
  wd.columns.forEach((c) => (c.width = 14));

  const rooms = wb.addWorksheet('By room');
  rooms.addRow(['Room', 'Campus', 'Utilization %', 'Booked hours', 'Available hours', ...r.blocks.map((b) => `${b.name} %`), 'Days used']).font = { bold: true };
  for (const room of r.rooms) {
    const row = rooms.addRow([room.name, room.campusName, pct(room.total), room.total.hours, room.total.available, ...room.byBlock.map(pct), room.daysUsed]);
    row.getCell(3).numFmt = pctFmt;
    for (let c = 6; c < 6 + r.blocks.length; c++) row.getCell(c).numFmt = pctFmt;
  }
  rooms.columns.forEach((c, i) => (c.width = i < 2 ? 24 : 14));

  const hours = wb.addWorksheet('By hour');
  hours.addRow(['Hour', 'Room-hours booked', 'Share of rooms in use %']).font = { bold: true };
  for (const h of r.hours) {
    const row = hours.addRow([hourLabel(h.hour * 60), h.hours, h.pct / 100]);
    row.getCell(3).numFmt = pctFmt;
  }
  hours.columns.forEach((c) => (c.width = 22));

  const weeks = wb.addWorksheet('By week');
  weeks.addRow(['Week of', 'Booked hours', 'Available hours', 'Utilization %']).font = { bold: true };
  for (const w of r.weeks) {
    const row = weeks.addRow([w.start, w.hours, w.available, w.pct / 100]);
    row.getCell(4).numFmt = pctFmt;
  }
  weeks.columns.forEach((c) => (c.width = 16));

  const programs = wb.addWorksheet('By program');
  programs.addRow(['Program', 'Booked hours', 'Share %']).font = { bold: true };
  for (const p of r.programs) {
    const row = programs.addRow([p.program, p.hours, p.share / 100]);
    row.getCell(3).numFmt = pctFmt;
  }
  programs.columns.forEach((c) => (c.width = 16));

  const campuses = wb.addWorksheet('By campus');
  campuses.addRow(['Campus', 'Rooms', 'Booked hours', 'Available hours', 'Utilization %']).font = { bold: true };
  for (const c of r.campuses) {
    const row = campuses.addRow([c.name, c.rooms, c.total.hours, c.total.available, pct(c.total)]);
    row.getCell(5).numFmt = pctFmt;
  }
  campuses.columns.forEach((c, i) => (c.width = i ? 16 : 28));

  const out = await wb.xlsx.writeBuffer();
  return out as ArrayBuffer;
}


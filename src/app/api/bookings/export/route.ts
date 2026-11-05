import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import ExcelJS from 'exceljs';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions-server';
import { SCHEDULE_COLUMNS, formatTimeSlot, formatUsDate, toCsv, toZoned } from '@/lib/schedule';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/export?format=csv|xlsx&campusId=&roomId=&termId=&start=&end=
 * Same columns as the import file. Admins and schedulers only.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await can(session.user.role, 'bookings.import'))) {
      return NextResponse.json({ error: 'Your role may not export bookings' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';
    const where: any = { status: { not: 'CANCELLED' } };
    const campusId = searchParams.get('campusId');
    const roomId = searchParams.get('roomId');
    const termId = searchParams.get('termId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    if (roomId) where.roomId = roomId;
    if (campusId) where.room = { campusId };
    if (termId) where.termId = termId;
    if (start || end) {
      where.startTime = {};
      if (start) where.startTime.gte = new Date(start);
      if (end) where.startTime.lte = new Date(end);
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: { room: { include: { campus: true } } },
      orderBy: [{ startTime: 'asc' }],
    });

    const rows = bookings.map((b) => {
      const tz = b.room.campus.timeZone || 'America/Chicago';
      const local = toZoned(b.startTime, tz);
      return {
        date: local.date,
        values: {
          SessionDate: formatUsDate(local.date),
          CampusID: b.room.campus.code || b.room.campus.name,
          TermID: b.termId || '',
          CourseID: b.courseId || '',
          SectionID: b.sectionId || '',
          CourseName: b.courseName || b.title,
          SessionID: b.sessionId || '',
          TimeSlots: b.timeSlots || formatTimeSlot(b.startTime, b.endTime, tz),
          RoomID: b.room.name,
        } as Record<string, string>,
      };
    });

    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      const csv = toCsv([[...SCHEDULE_COLUMNS], ...rows.map((r) => SCHEDULE_COLUMNS.map((c) => r.values[c]))]);
      return new NextResponse('﻿' + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="bookings-${stamp}.csv"`,
        },
      });
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Bookings');
    ws.columns = SCHEDULE_COLUMNS.map((c) => ({
      header: c,
      key: c,
      width: c === 'CourseName' ? 36 : c === 'TimeSlots' ? 24 : 14,
      style: c === 'SessionDate' ? { numFmt: 'm/d/yyyy' } : undefined,
    }));
    ws.getRow(1).font = { bold: true };
    for (const r of rows) {
      ws.addRow({
        ...r.values,
        SessionDate: new Date(Date.UTC(r.date.y, r.date.m - 1, r.date.d)),
        SectionID: /^\d+$/.test(r.values.SectionID) ? Number(r.values.SectionID) : r.values.SectionID,
      });
    }
    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="bookings-${stamp}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Failed to export bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

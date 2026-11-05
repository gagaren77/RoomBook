import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions-server';
import { ensureCampuses } from '@/lib/campuses';
import { readScheduleFile } from '@/lib/schedule-file';
import { bookingTitle, normalizeRows, SKIP_LABELS, ScheduleSession } from '@/lib/schedule';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_BYTES = 15 * 1024 * 1024;
const CHUNK = 250;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Overlapping sessions in the same room within the uploaded file. */
function findOverlaps(sessions: ScheduleSession[]) {
  const byRoom = new Map<string, ScheduleSession[]>();
  for (const s of sessions) {
    const k = `${s.campus.id}|${s.roomName.toLowerCase()}`;
    if (!byRoom.has(k)) byRoom.set(k, []);
    byRoom.get(k)!.push(s);
  }
  const overlaps: { rows: [number, number]; room: string; campus: string; courses: string; start: string }[] = [];
  let count = 0;
  for (const list of Array.from(byRoom.values())) {
    list.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    let latest = list[0];
    for (let i = 1; i < list.length; i++) {
      const cur = list[i];
      if (cur.startTime < latest.endTime) {
        count++;
        if (overlaps.length < 50) {
          overlaps.push({
            rows: [latest.rowNumber, cur.rowNumber],
            room: cur.roomName,
            campus: cur.campus.name,
            courses: `${latest.courseId} / ${cur.courseId}`,
            start: cur.startTime.toISOString(),
          });
        }
      }
      if (cur.endTime > latest.endTime) latest = cur;
    }
  }
  return { count, examples: overlaps };
}

/**
 * POST multipart/form-data { file, mode: "preview" | "commit" }
 * Admins and schedulers only.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await can(session.user.role, 'bookings.import'))) {
      return NextResponse.json({ error: 'Only admins and schedulers can import bookings' }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get('file');
    const commit = form.get('mode') === 'commit';
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Choose a CSV or XLSX file to upload' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 15 MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let parsed;
    try {
      parsed = await readScheduleFile(file.name, buffer);
    } catch (e) {
      console.error('Failed to read schedule file:', e);
      return NextResponse.json({ error: 'Could not read the file. Upload a .csv or .xlsx file.' }, { status: 400 });
    }
    if (parsed.missing.length) {
      return NextResponse.json(
        { error: `Missing required column(s): ${parsed.missing.join(', ')}` },
        { status: 400 }
      );
    }

    await ensureCampuses(prisma);
    const campuses = await prisma.campus.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, timeZone: true },
    });

    const { sessions, skipped, issues, dayMismatches } = normalizeRows(parsed.rows, campuses);
    const overlaps = findOverlaps(sessions);

    // Rooms: match by campus + name (case-insensitive), create any missing.
    const existingRooms = await prisma.room.findMany({
      where: { campusId: { in: campuses.map((c) => c.id) } },
      select: { id: true, name: true, campusId: true, isActive: true },
    });
    const roomKey = (campusId: string, name: string) => `${campusId}|${name.trim().toLowerCase()}`;
    const roomMap = new Map(existingRooms.map((r) => [roomKey(r.campusId, r.name), r.id]));
    const newRooms = new Map<string, { campusId: string; name: string }>();
    for (const s of sessions) {
      const k = roomKey(s.campus.id, s.roomName);
      if (!roomMap.has(k) && !newRooms.has(k)) newRooms.set(k, { campusId: s.campus.id, name: s.roomName });
    }

    // Existing bookings for these sessions
    const existing = new Map<string, { id: string; roomId: string; startTime: Date; endTime: Date; status: string; courseName: string | null; timeSlots: string | null }>();
    for (const keys of chunk(sessions.map((s) => s.importKey), 1000)) {
      const found = await prisma.booking.findMany({
        where: { importKey: { in: keys } },
        select: { id: true, importKey: true, roomId: true, startTime: true, endTime: true, status: true, courseName: true, timeSlots: true },
      });
      for (const b of found) existing.set(b.importKey!, b);
    }

    const toCreate = sessions.filter((s) => !existing.has(s.importKey));
    const toUpdate = sessions.filter((s) => existing.has(s.importKey));

    const summary = {
      sheet: parsed.sheet,
      totalRows: parsed.rows.length,
      importable: sessions.length,
      created: toCreate.length,
      updated: 0,
      unchanged: 0,
      newRooms: Array.from(newRooms.values()).map((r) => ({
        campus: campuses.find((c) => c.id === r.campusId)?.name,
        room: r.name,
      })),
      skipped: Object.entries(skipped)
        .filter(([, n]) => n > 0)
        .map(([reason, count]) => ({ reason, label: SKIP_LABELS[reason as keyof typeof SKIP_LABELS], count })),
      issues,
      dayMismatches,
      overlaps,
      committed: false,
    };

    if (!commit) {
      summary.updated = toUpdate.length;
      return NextResponse.json(summary);
    }

    for (const r of Array.from(newRooms.values())) {
      const room = await prisma.room.create({
        data: { name: r.name, campusId: r.campusId, description: 'Created by schedule import', amenities: [] },
      });
      roomMap.set(roomKey(r.campusId, r.name), room.id);
    }

    const data = (s: ScheduleSession) => ({
      title: bookingTitle(s.courseId, s.courseName),
      startTime: s.startTime,
      endTime: s.endTime,
      roomId: roomMap.get(roomKey(s.campus.id, s.roomName))!,
      termId: s.termId || null,
      courseId: s.courseId || null,
      sectionId: s.sectionId || null,
      courseName: s.courseName || null,
      sessionId: s.sessionId || null,
      timeSlots: s.timeSlots || null,
    });

    for (const part of chunk(toCreate, CHUNK)) {
      await prisma.booking.createMany({
        data: part.map((s) => ({
          ...data(s),
          importKey: s.importKey,
          createdById: session.user.id,
          attendees: [],
          status: 'CONFIRMED' as const,
        })),
      });
    }

    const changed = toUpdate.filter((s) => {
      const b = existing.get(s.importKey)!;
      const d = data(s);
      return (
        b.roomId !== d.roomId ||
        b.startTime.getTime() !== d.startTime.getTime() ||
        b.endTime.getTime() !== d.endTime.getTime() ||
        b.courseName !== d.courseName ||
        b.timeSlots !== d.timeSlots ||
        b.status === 'CANCELLED'
      );
    });
    for (const part of chunk(changed, CHUNK)) {
      await prisma.$transaction(
        part.map((s) =>
          prisma.booking.update({
            where: { id: existing.get(s.importKey)!.id },
            data: { ...data(s), status: 'CONFIRMED' },
          })
        )
      );
    }

    summary.updated = changed.length;
    summary.unchanged = toUpdate.length - changed.length;
    summary.committed = true;
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to import bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

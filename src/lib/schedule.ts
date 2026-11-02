/**
 * Course schedule import/export helpers.
 *
 * Spreadsheet layout (CSV or XLSX), one row per class session:
 *   SessionDate | CampusID | TermID | CourseID | SectionID | CourseName | SessionID | TimeSlots | RoomID
 */

export const SCHEDULE_COLUMNS = [
  'SessionDate',
  'CampusID',
  'TermID',
  'CourseID',
  'SectionID',
  'CourseName',
  'SessionID',
  'TimeSlots',
  'RoomID',
] as const;

export type ScheduleColumn = (typeof SCHEDULE_COLUMNS)[number];
export type CellValue = string | number | Date | null | undefined;
export type RawRow = Partial<Record<ScheduleColumn, CellValue>>;

const REQUIRED: ScheduleColumn[] = ['SessionDate', 'CampusID', 'CourseID', 'CourseName', 'TimeSlots', 'RoomID'];

/** Rooms that are not physical rooms: never shown on the calendar. */
export function isVirtualRoom(roomId: string) {
  return /virtual|online/i.test(roomId);
}

/** Physical-room placeholders that we can't place on a room calendar. */
const NON_ROOM_VALUES = ['clinical site', 'tba', 'tbd', 'n/a', 'na'];
export function isNonRoom(roomId: string) {
  return roomId.trim() === '' || NON_ROOM_VALUES.includes(roomId.trim().toLowerCase());
}

const DAY_CODES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ---------------------------------------------------------------------------
// Header / table handling
// ---------------------------------------------------------------------------

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Map a header row to column indexes. Returns null if required columns are missing. */
export function mapHeader(header: CellValue[]): { map: Partial<Record<ScheduleColumn, number>>; missing: string[] } {
  const map: Partial<Record<ScheduleColumn, number>> = {};
  header.forEach((h, i) => {
    const key = norm(cellToString(h));
    const col = SCHEDULE_COLUMNS.find((c) => norm(c) === key);
    if (col && map[col] === undefined) map[col] = i;
  });
  const missing = REQUIRED.filter((c) => map[c] === undefined);
  return { map, missing };
}

/** Find the header row in a table (first row containing the required columns) and return objects. */
export function tableToRows(table: CellValue[][]): { rows: { rowNumber: number; data: RawRow }[]; missing: string[] } {
  let lastMissing: string[] = [...REQUIRED];
  for (let h = 0; h < Math.min(table.length, 20); h++) {
    const { map, missing } = mapHeader(table[h] || []);
    if (missing.length === 0) {
      const rows: { rowNumber: number; data: RawRow }[] = [];
      for (let r = h + 1; r < table.length; r++) {
        const line = table[r] || [];
        if (line.every((v) => cellToString(v) === '')) continue;
        const data: RawRow = {};
        for (const col of SCHEDULE_COLUMNS) {
          const idx = map[col];
          if (idx !== undefined) data[col] = line[idx];
        }
        rows.push({ rowNumber: r + 1, data });
      }
      return { rows, missing: [] };
    }
    if (missing.length < lastMissing.length) lastMissing = missing;
  }
  return { rows: [], missing: lastMissing };
}

export function cellToString(v: CellValue): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

/** Minimal RFC 4180 CSV parser (also handles tab- or semicolon-separated files). */
export function parseCsv(text: string): string[][] {
  text = text.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const counts = [',', '\t', ';'].map((d) => [d, firstLine.split(d).length] as const);
  const delim = counts.sort((a, b) => b[1] - a[1])[0][0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delim) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function toCsv(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------------------
// Dates and time slots
// ---------------------------------------------------------------------------

export type CalendarDate = { y: number; m: number; d: number };

/** Parse SessionDate from an Excel date, Excel serial number, M/D/YYYY or YYYY-MM-DD. */
export function parseSessionDate(v: CellValue): CalendarDate | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    // Excel dates arrive as UTC midnight
    return { y: v.getUTCFullYear(), m: v.getUTCMonth() + 1, d: v.getUTCDate() };
  }
  if (typeof v === 'number') {
    const date = new Date(Math.round((v - 25569) * 86400000));
    return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
  }
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validDate(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})(?!\d)/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return validDate(y, +m[1], +m[2]);
  }
  if (/^\d+(\.\d+)?$/.test(s)) return parseSessionDate(Number(s));
  return null;
}

function validDate(y: number, m: number, d: number): CalendarDate | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return { y, m, d };
}

export function dateKey(d: CalendarDate) {
  return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
}

export function weekdayCode(d: CalendarDate) {
  return DAY_CODES[new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay()];
}

export type TimeSegment = { days: string[]; start: number; end: number }; // minutes from midnight

/**
 * Parse a TimeSlots value such as "Tu/Th 9:00a-12:00p" or
 * "Mo 5:00-9:30p    Su 12:00-1:30a" (several segments separated by 2+ spaces).
 * When the start time has no a/p suffix it takes the end's suffix, unless that
 * would put it after the end (then it is a.m.).
 */
export function parseTimeSlots(value: string): TimeSegment[] {
  const segments: TimeSegment[] = [];
  const re = /((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*\/\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))*)\s+(\d{1,2})(?::(\d{2}))?\s*([ap])?m?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*([ap])m?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) {
    const days = m[1].split('/').map((d) => d.trim().slice(0, 1).toUpperCase() + d.trim().slice(1, 2).toLowerCase());
    const endSuffix = m[7].toLowerCase();
    const end = to24(+m[5], +(m[6] || 0), endSuffix);
    let start: number;
    if (m[4]) start = to24(+m[2], +(m[3] || 0), m[4].toLowerCase());
    else {
      start = to24(+m[2], +(m[3] || 0), endSuffix);
      if (start >= end) start = to24(+m[2], +(m[3] || 0), 'a');
    }
    if (end > start) segments.push({ days, start, end });
  }
  return segments;
}

function to24(h: number, min: number, suffix: string) {
  let hour = h % 12;
  if (suffix === 'p') hour += 12;
  return hour * 60 + min;
}

/** Choose the segment that applies to the given date. */
export function pickSegment(segments: TimeSegment[], date: CalendarDate): { segment: TimeSegment; dayMatched: boolean } | null {
  if (!segments.length) return null;
  const wd = weekdayCode(date);
  const match = segments.find((s) => s.days.includes(wd));
  return match ? { segment: match, dayMatched: true } : { segment: segments[0], dayMatched: false };
}

/** Offset (ms) of a time zone from UTC at the given instant. */
function tzOffset(instant: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(new Date(instant))) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Convert a wall-clock time at a campus to a UTC Date. */
export function zonedTime(date: CalendarDate, minutes: number, timeZone: string): Date {
  const wall = Date.UTC(date.y, date.m - 1, date.d, 0, minutes);
  let utc = wall - tzOffset(wall, timeZone);
  const second = wall - tzOffset(utc, timeZone);
  if (second !== utc) utc = second;
  return new Date(utc);
}

/** Calendar date + minutes past midnight of a UTC instant, in a time zone. */
export function toZoned(instant: Date, timeZone: string): { date: CalendarDate; minutes: number } {
  const local = new Date(instant.getTime() + tzOffset(instant.getTime(), timeZone));
  return {
    date: { y: local.getUTCFullYear(), m: local.getUTCMonth() + 1, d: local.getUTCDate() },
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

function fmtTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? 'p' : 'a';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

/** Build a TimeSlots value like "Tu 9:00a-12:00p" for bookings made in the portal. */
export function formatTimeSlot(start: Date, end: Date, timeZone: string) {
  const s = toZoned(start, timeZone);
  const e = toZoned(end, timeZone);
  return `${weekdayCode(s.date)} ${fmtTime(s.minutes)}-${fmtTime(e.minutes)}`;
}

export function formatUsDate(d: CalendarDate) {
  return `${d.m}/${d.d}/${d.y}`;
}

// ---------------------------------------------------------------------------
// Row normalization
// ---------------------------------------------------------------------------

export type SkipReason = 'virtual' | 'noRoom' | 'unknownCampus' | 'badDate' | 'badTime' | 'duplicate';

export const SKIP_LABELS: Record<SkipReason, string> = {
  virtual: 'Online / Virtual (not shown on calendar)',
  noRoom: 'No physical room (blank or e.g. "Clinical Site")',
  unknownCampus: 'Unknown CampusID',
  badDate: 'Invalid SessionDate',
  badTime: 'Invalid TimeSlots',
  duplicate: 'Duplicate row in file',
};

export type CampusRef = { id: string; code: string | null; name: string; timeZone: string };

export type ScheduleSession = {
  rowNumber: number;
  importKey: string;
  campus: CampusRef;
  roomName: string;
  termId: string;
  courseId: string;
  sectionId: string;
  courseName: string;
  sessionId: string;
  timeSlots: string;
  startTime: Date;
  endTime: Date;
  dayMismatch: boolean;
};

export type NormalizeResult = {
  sessions: ScheduleSession[];
  skipped: Record<SkipReason, number>;
  issues: { row: number; reason: SkipReason; detail: string }[];
  dayMismatches: number;
};

export function normalizeRows(rows: { rowNumber: number; data: RawRow }[], campuses: CampusRef[]): NormalizeResult {
  const byKey = new Map<string, CampusRef>();
  for (const c of campuses) {
    if (c.code) byKey.set(norm(c.code), c);
  }
  for (const c of campuses) {
    if (!byKey.has(norm(c.name))) byKey.set(norm(c.name), c);
  }

  const skipped: Record<SkipReason, number> = { virtual: 0, noRoom: 0, unknownCampus: 0, badDate: 0, badTime: 0, duplicate: 0 };
  const issues: NormalizeResult['issues'] = [];
  const sessions: ScheduleSession[] = [];
  const seen = new Set<string>();
  let dayMismatches = 0;

  const skip = (row: number, reason: SkipReason, detail: string) => {
    skipped[reason]++;
    if (reason !== 'virtual' && reason !== 'noRoom' && issues.length < 200) issues.push({ row, reason, detail });
  };

  for (const { rowNumber, data } of rows) {
    const s = (c: ScheduleColumn) => cellToString(data[c]);
    const roomName = s('RoomID');
    if (isVirtualRoom(roomName)) {
      skip(rowNumber, 'virtual', roomName);
      continue;
    }
    if (isNonRoom(roomName)) {
      skip(rowNumber, 'noRoom', roomName || '(blank)');
      continue;
    }
    const campusId = s('CampusID');
    const campus = byKey.get(norm(campusId));
    if (!campus) {
      skip(rowNumber, 'unknownCampus', campusId || '(blank)');
      continue;
    }
    const date = parseSessionDate(data.SessionDate);
    if (!date) {
      skip(rowNumber, 'badDate', s('SessionDate') || '(blank)');
      continue;
    }
    const timeSlots = s('TimeSlots');
    const picked = pickSegment(parseTimeSlots(timeSlots), date);
    if (!picked) {
      skip(rowNumber, 'badTime', timeSlots || '(blank)');
      continue;
    }
    const termId = s('TermID');
    const courseId = s('CourseID');
    const sectionId = s('SectionID');
    const sessionId = s('SessionID');
    const importKey = [termId, courseId, sectionId, sessionId, dateKey(date)].join('|').toLowerCase();
    if (seen.has(importKey)) {
      skip(rowNumber, 'duplicate', importKey);
      continue;
    }
    seen.add(importKey);
    if (!picked.dayMatched) dayMismatches++;

    sessions.push({
      rowNumber,
      importKey,
      campus,
      roomName,
      termId,
      courseId,
      sectionId,
      courseName: s('CourseName'),
      sessionId,
      timeSlots,
      startTime: zonedTime(date, picked.segment.start, campus.timeZone),
      endTime: zonedTime(date, picked.segment.end, campus.timeZone),
      dayMismatch: !picked.dayMatched,
    });
  }

  return { sessions, skipped, issues, dayMismatches };
}

export function bookingTitle(courseId: string, courseName: string) {
  return [courseId, courseName].filter(Boolean).join(' – ') || 'Class session';
}

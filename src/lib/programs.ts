/**
 * Program colors for the calendar views.
 *
 * Imported bookings carry a TermID such as ESLD2609CM1 or BUSA2608CM1; the
 * letters in front of the digits identify the program. Every view colors a
 * booking by that program, so the same program always looks the same.
 */

export type ProgramColor = { bg: string; fg: string; dot: string };

// Tinted backgrounds with dark text of the same hue (all above 4.5:1), ordered
// so that neighbours in the list look clearly different.
export const PALETTE: ProgramColor[] = [
  { bg: '#DBEAFE', fg: '#1E3A8A', dot: '#2563EB' }, // blue
  { bg: '#FEF3C7', fg: '#92400E', dot: '#D97706' }, // amber
  { bg: '#EDE9FE', fg: '#5B21B6', dot: '#7C3AED' }, // violet
  { bg: '#D1FAE5', fg: '#065F46', dot: '#059669' }, // emerald
  { bg: '#FFE4E6', fg: '#9F1239', dot: '#E11D48' }, // rose
  { bg: '#CFFAFE', fg: '#155E75', dot: '#0891B2' }, // cyan
  { bg: '#FFEDD5', fg: '#9A3412', dot: '#EA580C' }, // orange
  { bg: '#FAE8FF', fg: '#86198F', dot: '#C026D3' }, // fuchsia
  { bg: '#ECFCCB', fg: '#3F6212', dot: '#65A30D' }, // lime
  { bg: '#FEE2E2', fg: '#991B1B', dot: '#DC2626' }, // red
  { bg: '#E0E7FF', fg: '#3730A3', dot: '#4F46E5' }, // indigo
  { bg: '#FEF9C3', fg: '#854D0E', dot: '#CA8A04' }, // yellow
  { bg: '#CCFBF1', fg: '#115E59', dot: '#0D9488' }, // teal
  { bg: '#FCE7F3', fg: '#9D174D', dot: '#DB2777' }, // pink
  { bg: '#E0F2FE', fg: '#075985', dot: '#0284C7' }, // sky
  { bg: '#F5F5F4', fg: '#44403C', dot: '#78716C' }, // stone
];

export const OTHER_PROGRAM = 'Other';
const OTHER_COLOR: ProgramColor = { bg: '#E2E8F0', fg: '#1E293B', dot: '#475569' };

/** The program a booking belongs to: the letters of its TermID, else of its CourseID. */
export function programOf(booking: { termId?: string | null; courseId?: string | null }): string {
  const key = letters(booking.termId) || letters(booking.courseId);
  return key || OTHER_PROGRAM;
}

function letters(v: string | null | undefined): string {
  const m = (v || '').trim().toUpperCase().match(/^[A-Z]+/);
  return m ? m[0] : '';
}

/**
 * The color of a program. With the sorted list of all programs (from
 * /api/programs) each one gets its own slot; without it, a stable fallback
 * from the name.
 */
export function programColor(program: string, programs?: string[]): ProgramColor {
  if (!program || program === OTHER_PROGRAM) return OTHER_COLOR;
  const i = programs ? programs.indexOf(program) : -1;
  if (i >= 0) return PALETTE[i % PALETTE.length];
  let h = 0;
  for (let k = 0; k < program.length; k++) h = (h * 31 + program.charCodeAt(k)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Colors for a booking: a hand-picked color wins, otherwise its program's. */
export function bookingColors(
  booking: { color?: string | null; termId?: string | null; courseId?: string | null },
  programs?: string[]
): ProgramColor {
  if (booking.color) return { bg: booking.color, fg: '#ffffff', dot: booking.color };
  return programColor(programOf(booking), programs);
}

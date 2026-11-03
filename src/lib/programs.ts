/** Colors for imported sessions, grouped by the letters at the start of the TermID (ESLD2609CM1 -> ESLD). */
const PALETTE = [
  { backgroundColor: '#E0E7FF', color: '#312E81', borderColor: '#A5B4FC' },
  { backgroundColor: '#FFE4E6', color: '#881337', borderColor: '#FDA4AF' },
  { backgroundColor: '#CCFBF1', color: '#134E4A', borderColor: '#5EEAD4' },
  { backgroundColor: '#DBEAFE', color: '#1E3A8A', borderColor: '#93C5FD' },
  { backgroundColor: '#F3E8FF', color: '#581C87', borderColor: '#D8B4FE' },
  { backgroundColor: '#FEF3C7', color: '#78350F', borderColor: '#FCD34D' },
  { backgroundColor: '#DCFCE7', color: '#14532D', borderColor: '#86EFAC' },
  { backgroundColor: '#FCE7F3', color: '#831843', borderColor: '#F9A8D4' },
  { backgroundColor: '#FFEDD5', color: '#7C2D12', borderColor: '#FDBA74' },
  { backgroundColor: '#CFFAFE', color: '#164E63', borderColor: '#67E8F9' },
  { backgroundColor: '#ECFCCB', color: '#365314', borderColor: '#BEF264' },
  { backgroundColor: '#EDE9FE', color: '#4C1D95', borderColor: '#C4B5FD' },
];

const OTHER_STYLE = { backgroundColor: '#F1F5F9', color: '#1E293B', borderColor: '#CBD5E1' };

export const OTHER_PROGRAM = 'Other';

/** The program a booking belongs to; bookings without a TermID are grouped as Other. */
export function programOf(booking: any): string {
  const match = /^[A-Za-z]+/.exec(booking.termId || '');
  return match ? match[0].toUpperCase() : OTHER_PROGRAM;
}

export function programStyle(program: string) {
  if (program === OTHER_PROGRAM) return OTHER_STYLE;
  let hash = 0;
  for (let i = 0; i < program.length; i++) hash = (hash * 31 + program.charCodeAt(i)) % 2147483647;
  return PALETTE[hash % PALETTE.length];
}

/** The short text shown on calendar blocks. */
export function bookingLabel(booking: any): string {
  return booking.termId || booking.title;
}

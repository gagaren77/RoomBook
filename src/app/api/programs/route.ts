import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { programOf } from '@/lib/programs';

export const dynamic = 'force-dynamic';

/**
 * Every program that has bookings, sorted. The calendar views give each one a
 * color by its position in this list, so a program keeps its color on every
 * page and every week.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.booking.findMany({
    where: { OR: [{ termId: { not: null } }, { courseId: { not: null } }] },
    distinct: ['termId', 'courseId'],
    select: { termId: true, courseId: true },
  });
  const programs = Array.from(new Set(rows.map(programOf))).sort();
  return NextResponse.json({ programs });
}

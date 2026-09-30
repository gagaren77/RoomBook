import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendICSInvite } from '@/lib/ics';
import { sendOutlookInvite } from '@/lib/graph';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { bookingId, method } = body;

    if (!bookingId || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: { include: { campus: true } },
        createdBy: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (session.user.role === 'INSTRUCTOR' && booking.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let methods: string[] = [];
    let errors: string[] = [];

    if (method === 'ics' || method === 'both') {
      try {
        await sendICSInvite(booking);
        methods.push('ics');
      } catch (e: any) {
        console.error('ICS invite error:', e);
        errors.push(`ICS failed: ${e.message}`);
      }
    }

    if (method === 'graph' || method === 'both') {
      try {
        await sendOutlookInvite(booking);
        methods.push('graph');
      } catch (e: any) {
        console.error('Graph invite error:', e);
        errors.push(`Graph failed: ${e.message}`);
      }
    }

    return NextResponse.json({ success: true, methods, errors }, { status: 200 });
  } catch (error) {
    console.error('Failed to send invites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

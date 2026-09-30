import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendICSInvite } from '@/lib/ics';
import { sendOutlookInvite } from '@/lib/graph';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const campusId = searchParams.get('campusId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const mine = searchParams.get('mine');

    let whereClause: any = {};

    if (roomId) whereClause.roomId = roomId;
    if (campusId) whereClause.room = { campusId };
    if (mine === 'true') whereClause.createdById = session.user.id;
    
    if (start || end) {
      whereClause.startTime = {};
      if (start) whereClause.startTime.gte = new Date(start);
      if (end) whereClause.startTime.lte = new Date(end);
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        room: {
          include: {
            campus: true
          }
        },
        createdBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Failed to get bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, roomId, startTime, endTime, attendees, description, color, notes } = body;

    if (!title || !roomId || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || !room.isActive) {
      return NextResponse.json({ error: 'Room not found or inactive' }, { status: 400 });
    }

    // Check overlaps
    const overlap = await prisma.booking.findFirst({
      where: {
        roomId,
        status: 'CONFIRMED',
        AND: [
          { startTime: { lt: end } },
          { endTime: { gt: start } }
        ]
      }
    });

    if (overlap) {
      return NextResponse.json({ error: 'Room is already booked for this time' }, { status: 409 });
    }

    const booking = await prisma.booking.create({
      data: {
        title,
        roomId,
        startTime: start,
        endTime: end,
        attendees: attendees || [],
        description,
        color,
        notes,
        createdById: session.user.id
      },
      include: {
        room: { include: { campus: true } },
        createdBy: true
      }
    });

    // Send invites (non-blocking)
    Promise.resolve().then(async () => {
      try {
        await sendICSInvite(booking);
      } catch (e) {
        console.error('Failed to send ICS invite:', e);
      }
      try {
        if (process.env.GRAPH_CLIENT_ID && process.env.GRAPH_CLIENT_SECRET) {
          await sendOutlookInvite(booking);
        }
      } catch (e) {
        console.error('Failed to send Outlook invite:', e);
      }
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Failed to create booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);

    const room = await prisma.room.findUnique({
      where: { id: params.id },
      include: {
        campus: true,
        bookings: {
          where: {
            status: 'CONFIRMED',
            startTime: {
              gte: new Date(),
              lte: next30Days
            }
          },
          orderBy: { startTime: 'asc' }
        }
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error('Failed to get room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    const room = await prisma.room.update({
      where: { id: params.id },
      data: body
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error('Failed to update room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for future bookings
    const futureBookings = await prisma.booking.findFirst({
      where: {
        roomId: params.id,
        startTime: { gt: new Date() },
        status: 'CONFIRMED'
      }
    });

    if (futureBookings) {
      return NextResponse.json(
        { error: 'Cannot delete room with future confirmed bookings' }, 
        { status: 409 }
      );
    }

    const room = await prisma.room.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error('Failed to delete room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

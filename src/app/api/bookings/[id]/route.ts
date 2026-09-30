import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendICSInvite } from '@/lib/ics';
import { cancelOutlookEvent } from '@/lib/graph';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        room: { include: { campus: true } },
        createdBy: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Failed to get booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingBooking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        room: { include: { campus: true } },
        createdBy: true
      }
    });

    if (!existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (session.user.role === 'INSTRUCTOR' && existingBooking.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, startTime, endTime, attendees, color, notes, status } = body;

    let updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    if (attendees !== undefined) updateData.attendees = attendees;

    // Time change overlap check
    if (startTime || endTime) {
      const newStart = startTime ? new Date(startTime) : existingBooking.startTime;
      const newEnd = endTime ? new Date(endTime) : existingBooking.endTime;

      if (newStart >= newEnd) {
        return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
      }

      const overlap = await prisma.booking.findFirst({
        where: {
          roomId: existingBooking.roomId,
          status: 'CONFIRMED',
          id: { not: params.id },
          AND: [
            { startTime: { lt: newEnd } },
            { endTime: { gt: newStart } }
          ]
        }
      });

      if (overlap) {
        return NextResponse.json({ error: 'Room is already booked for this time' }, { status: 409 });
      }

      if (startTime) updateData.startTime = newStart;
      if (endTime) updateData.endTime = newEnd;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: updateData,
      include: {
        room: { include: { campus: true } },
        createdBy: true
      }
    });

    if (attendees !== undefined) {
      Promise.resolve().then(async () => {
        try {
          await sendICSInvite(updatedBooking);
        } catch (e) {
          console.error('Failed to send updated ICS invite:', e);
        }
      });
    }

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('Failed to update booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingBooking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        room: { include: { campus: true } },
        createdBy: true
      }
    });

    if (!existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (session.user.role === 'INSTRUCTOR' && existingBooking.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (existingBooking.outlookEventId) {
      try {
        await cancelOutlookEvent(existingBooking.outlookEventId, existingBooking.createdBy.email);
      } catch (e) {
        console.error('Failed to cancel Outlook event:', e);
      }
    }

    const cancelledBooking = await prisma.booking.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
      include: {
        room: { include: { campus: true } },
        createdBy: true
      }
    });

    Promise.resolve().then(async () => {
      try {
        await sendICSInvite(cancelledBooking, 'CANCEL');
      } catch (e) {
        console.error('Failed to send cancellation ICS:', e);
      }
    });

    return NextResponse.json(cancelledBooking);
  } catch (error) {
    console.error('Failed to delete booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

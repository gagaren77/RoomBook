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

    const campus = await prisma.campus.findUnique({
      where: { id: params.id },
      include: {
        rooms: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!campus) {
      return NextResponse.json({ error: 'Campus not found' }, { status: 404 });
    }

    return NextResponse.json(campus);
  } catch (error) {
    console.error('Failed to get campus:', error);
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
    
    const campus = await prisma.campus.update({
      where: { id: params.id },
      data: body
    });

    return NextResponse.json(campus);
  } catch (error) {
    console.error('Failed to update campus:', error);
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
        room: { campusId: params.id },
        startTime: { gt: new Date() },
        status: 'CONFIRMED'
      }
    });

    if (futureBookings) {
      return NextResponse.json(
        { error: 'Cannot delete campus with future confirmed bookings' }, 
        { status: 409 }
      );
    }

    const campus = await prisma.campus.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    return NextResponse.json(campus);
  } catch (error) {
    console.error('Failed to delete campus:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

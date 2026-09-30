import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get('campusId');
    const available = searchParams.get('available');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    let whereClause: any = { isActive: true };
    
    if (campusId) {
      whereClause.campusId = campusId;
    }

    if (available === 'true' && start && end) {
      const startTime = new Date(start);
      const endTime = new Date(end);
      
      whereClause.bookings = {
        none: {
          status: 'CONFIRMED',
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gt: startTime } }
          ]
        }
      };
    }

    const rooms = await prisma.room.findMany({
      where: whereClause,
      include: {
        campus: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('Failed to get rooms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, campusId, capacity, description, amenities, floor, building } = body;

    if (!name || !campusId) {
      return NextResponse.json({ error: 'Name and campusId are required' }, { status: 400 });
    }

    const room = await prisma.room.create({
      data: {
        name,
        campusId,
        capacity,
        description,
        amenities: amenities || [],
        floor,
        building
      }
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('Failed to create room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const campuses = await prisma.campus.findMany({
      include: {
        _count: {
          select: { rooms: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(campuses);
  } catch (error) {
    console.error('Failed to get campuses:', error);
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
    const { name, address, city, state, zipCode, phone, lat, lng } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const campus = await prisma.campus.create({
      data: {
        name,
        address: address || '',
        city: city || '',
        state: state || '',
        zipCode: zipCode || '',
        phone,
        lat,
        lng
      }
    });

    return NextResponse.json(campus, { status: 201 });
  } catch (error) {
    console.error('Failed to create campus:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Failed to get current user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, role } = body;

    let updateData: any = {};
    if (name !== undefined) updateData.name = name;
    
    // Only admins can change roles, and this route is for the user themselves.
    // If an INSTRUCTOR tries to change role, block it or ignore it.
    // Let's just block role updates for non-admins.
    if (role && session.user.role !== 'ADMIN') {
       return NextResponse.json({ error: 'Forbidden to change role' }, { status: 403 });
    } else if (role && session.user.role === 'ADMIN') {
       updateData.role = role;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Failed to update current user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

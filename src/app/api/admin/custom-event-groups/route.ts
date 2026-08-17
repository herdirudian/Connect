import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token) as any;
  if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const groups = await prisma.customEventGroup.findMany({
      include: {
        _count: {
          select: { events: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(groups);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch event groups' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token) as any;
  if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, eventDate, logos, description, startTime, endTime } = await req.json();

    if (!name || !eventDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const group = await prisma.customEventGroup.create({
      data: {
        name,
        description,
        startTime,
        endTime,
        eventDate: new Date(eventDate),
        logos: logos ? JSON.stringify(logos) : null
      }
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'CREATE_CUSTOM_EVENT_GROUP',
        entityType: 'CustomEventGroup',
        entityId: group.id,
        details: JSON.stringify({ name, eventDate, startTime, endTime })
      }
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error creating custom event group:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}

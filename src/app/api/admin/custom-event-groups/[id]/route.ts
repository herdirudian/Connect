import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token) as any;
  if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const group = await prisma.customEventGroup.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch group details' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token) as any;
  if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const { name, eventDate, logos } = await req.json();

    if (!name || !eventDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const group = await prisma.customEventGroup.update({
      where: { id },
      data: {
        name,
        eventDate: new Date(eventDate),
        logos: logos ? JSON.stringify(logos) : null
      }
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'UPDATE_CUSTOM_EVENT_GROUP',
        entityType: 'CustomEventGroup',
        entityId: id,
        details: JSON.stringify({ name, eventDate })
      }
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token) as any;
  if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    
    const group = await prisma.customEventGroup.findUnique({
      where: { id }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    await prisma.customEventGroup.delete({
      where: { id }
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'DELETE_CUSTOM_EVENT_GROUP',
        entityType: 'CustomEventGroup',
        entityId: id,
        details: JSON.stringify({ name: group.name })
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}

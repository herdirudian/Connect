import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const payload = verifyToken(token) as any;
  if (!payload || payload.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if event exists
    const event = await prisma.customEvent.findUnique({
      where: { id }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete the event
    await prisma.customEvent.delete({
      where: { id }
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'DELETE_CUSTOM_EVENT',
        entityType: 'CustomEvent',
        entityId: id,
        details: JSON.stringify({ 
          eventName: event.eventName, 
          participantName: event.participantName,
          voucherCode: event.voucherCode 
        })
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
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
  if (!payload || payload.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { participantName, pax, email, phoneNumber } = await req.json();

    if (!participantName || !email || !phoneNumber) {
      return NextResponse.json({ error: 'Missing required participant fields' }, { status: 400 });
    }

    const event = await prisma.customEvent.update({
      where: { id },
      data: {
        participantName,
        pax: parseInt(pax) || 1,
        email,
        phoneNumber
      }
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'UPDATE_CUSTOM_EVENT_PARTICIPANT',
        entityType: 'CustomEvent',
        entityId: id,
        details: JSON.stringify({ participantName, pax, email, phoneNumber })
      }
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error updating participant:', error);
    return NextResponse.json({ error: 'Failed to update participant' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token) as any;
  if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const events = await prisma.customEvent.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token) as any;
  if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { eventName, eventDate, participantName, pax, email, phoneNumber } = await req.json();

    if (!eventName || !eventDate || !participantName || !email || !phoneNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate a unique voucher code
    const voucherCode = 'EV' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const event = await prisma.customEvent.create({
      data: {
        eventName,
        eventDate: new Date(eventDate),
        participantName,
        pax: parseInt(pax) || 1,
        email,
        phoneNumber,
        voucherCode,
        status: 'ACTIVE'
      }
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'CREATE_CUSTOM_EVENT',
        entityType: 'CustomEvent',
        entityId: event.id,
        details: JSON.stringify({ eventName, participantName, voucherCode })
      }
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error creating custom event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

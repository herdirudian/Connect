import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';
import { sendCustomEventVoucherEmail } from '@/lib/email';

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
    const { eventName, eventDate, participantName, pax, email, phoneNumber, logos, groupId } = await req.json();

    if (!participantName || !email || !phoneNumber) {
      return NextResponse.json({ error: 'Missing required participant fields' }, { status: 400 });
    }

    if (!groupId && (!eventName || !eventDate)) {
      return NextResponse.json({ error: 'Event name and date are required if no group is selected' }, { status: 400 });
    }

    // Generate a unique voucher code
    const voucherCode = 'EV' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const event = await prisma.customEvent.create({
      data: {
        groupId,
        eventName: eventName || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        participantName,
        pax: parseInt(pax) || 1,
        email,
        phoneNumber,
        voucherCode,
        logos: logos ? JSON.stringify(logos) : null,
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

    // Send Auto Email if email is provided
    try {
      let groupInfo = null;
      if (groupId) {
        groupInfo = await prisma.customEventGroup.findUnique({
          where: { id: groupId }
        });
      }

      await sendCustomEventVoucherEmail(
        email,
        participantName,
        voucherCode,
        parseInt(pax) || 1,
        {
          name: groupInfo?.name || eventName || 'Event Voucher',
          eventDate: groupInfo?.eventDate || eventDate || new Date(),
          startTime: groupInfo?.startTime,
          endTime: groupInfo?.endTime,
          description: groupInfo?.description,
          logos: groupInfo?.logos || logos,
          emailSubject: groupInfo?.emailSubject,
          emailBody: groupInfo?.emailBody,
          emailAttachments: groupInfo?.emailAttachments
        }
      );
    } catch (emailError) {
      console.error('Failed to send auto email after participant creation:', emailError);
      // We don't return error here because the participant is already created
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error creating custom event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

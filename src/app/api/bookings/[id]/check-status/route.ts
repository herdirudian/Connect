import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { Invoice } from '@/lib/xendit';
import { sendBookingSuccessEmail, sendBookingNotificationToReception } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Only verify if user owns the booking or is admin
    if (booking.userId !== decoded.userId && decoded.role !== 'ADMIN') {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (booking.paymentStatus === 'PAID') {
        return NextResponse.json({ status: 'PAID' });
    }

    // Check Xendit Invoice Status
    let invoice;
    try {
        if (!booking.paymentId) {
             return NextResponse.json({ status: booking.paymentStatus });
        }
        invoice = await Invoice.getInvoiceById({ invoiceId: booking.paymentId });
    } catch (e) {
        console.error("Xendit Check Error", e);
        return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
    }

    if (invoice && invoice.status === 'PAID') {
        // Update DB
        const updated = await prisma.booking.update({
            where: { id: booking.id },
            data: {
                status: 'CONFIRMED',
                paymentStatus: 'PAID'
            }
        });

        // Record Transaction if not exists
        const existingTx = await prisma.transaction.findFirst({
            where: { source: `BOOKING:${booking.id}` }
        });

        if (!existingTx) {
            await prisma.transaction.create({
                data: {
                    userId: booking.userId,
                    amount: booking.amount,
                    type: 'EARN',
                    description: `Payment for booking ${booking.id}`,
                    source: `BOOKING:${booking.id}`,
                }
            });

            // Determine email recipient
            let targetEmail = booking.user.email;
            try {
                const details = JSON.parse(booking.details);
                if (details.recipientEmail) {
                    targetEmail = details.recipientEmail;
                }
            } catch (e) {
                // ignore parsing error
            }

             // Send Success Email with QR Code
             await sendBookingSuccessEmail(
                booking.user.email,
                booking.user.name,
                booking.id,
                booking.type,
                booking.amount
            );

            // Send Notification to Reception (if GLAMPING)
            if (booking.type === 'GLAMPING') {
                try {
                    const details = JSON.parse(booking.details);
                    if (details.items && Array.isArray(details.items)) {
                        const accommodationIds = details.items.map((i: any) => i.id);
                        const accommodations = await prisma.accommodation.findMany({
                            where: { id: { in: accommodationIds } },
                            select: { id: true, receptionEmail: true }
                        });

                        const emailSet = new Set<string>();
                        accommodations.forEach(acc => {
                            if (acc.receptionEmail) emailSet.add(acc.receptionEmail);
                        });

                        // Parallel execution for better performance
                        await Promise.all(Array.from(emailSet).map(email => 
                             sendBookingNotificationToReception(
                                email,
                                booking.user.name,
                                booking.user.phoneNumber || '-',
                                booking.id,
                                new Date(booking.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                                details.items
                            )
                        ));
                    }
                } catch (e) {
                    console.error('Error sending reception notification:', e);
                }
            }

            // Send in-app notification
            await createNotification(
                booking.userId,
                'Payment Confirmed',
                `Your booking for ${booking.type} has been confirmed! Enjoy your adventure.`
            );
        }

        return NextResponse.json({ status: 'PAID' });
    } else if (invoice && invoice.status === 'EXPIRED') {
         await prisma.booking.update({
            where: { id: booking.id },
            data: {
                status: 'CANCELLED',
                paymentStatus: 'EXPIRED'
            }
        });
        return NextResponse.json({ status: 'EXPIRED' });
    }

    return NextResponse.json({ status: booking.paymentStatus });

  } catch (error: any) {
    console.error('Check Status Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

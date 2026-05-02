import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { Invoice, PaymentRequest as XenditPaymentRequest } from '@/lib/xendit';
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

    let isPaid = false;
    let isExpired = false;

    if (booking.paymentStatus === 'PAID') {
        // Self-healing: Check if transaction exists (in case points were missed)
        const existingTx = await prisma.transaction.findFirst({
            where: { source: `BOOKING:${booking.id}` }
        });

        if (existingTx) {
            return NextResponse.json({ status: 'PAID' });
        }
        // If no transaction exists but booking is PAID, proceed to calculate points
        isPaid = true;
    } else {
        // Check Xendit Status
        try {
            if (!booking.paymentId) {
             return NextResponse.json({ status: booking.paymentStatus });
        }

        // Check if Payment Request
        let isPaymentRequest = false;
        try {
            const details = JSON.parse(booking.details);
            if (details.paymentInfo && details.paymentInfo.isPaymentRequest) {
                isPaymentRequest = true;
            }
        } catch (e) {}

        if (isPaymentRequest) {
             const pr = await XenditPaymentRequest.getPaymentRequestByID({ paymentRequestId: booking.paymentId });
             if (pr) {
                 if (pr.status === 'SUCCEEDED') isPaid = true;
                 else if (pr.status === 'EXPIRED' || pr.status === 'FAILED') isExpired = true;
             }
        } else {
             // Fallback to Invoice
             const invoice = await Invoice.getInvoiceById({ invoiceId: booking.paymentId });
             if (invoice) {
                 if (invoice.status === 'PAID') isPaid = true;
                 else if (invoice.status === 'EXPIRED') isExpired = true;
             }
        }
    } catch (e) {
        console.error("Xendit Check Error", e);
        return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
    }
    }

    if (isPaid) {
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
            // Calculate Points Logic
            let earnedPoints = Math.floor(booking.amount); // Default behavior

            if (booking.type === 'WAHANA') {
                try {
                    const details = JSON.parse(booking.details);
                    if (details.items && Array.isArray(details.items)) {
                        const itemIds = details.items.map((i: any) => i.id);
                        const attractions = await prisma.attraction.findMany({
                            where: { id: { in: itemIds } },
                            select: { id: true, points: true }
                        });
                        
                        const pointsMap = new Map(attractions.map(a => [a.id, a.points]));
                        
                        let totalPoints = 0;
                        for (const item of details.items) {
                            const pts = pointsMap.get(item.id) || 0;
                            const qty = item.qty || 1;
                            totalPoints += (pts * qty);
                        }
                        
                        // Use the calculated points from Attraction settings
                        earnedPoints = totalPoints;
                    }
                } catch (e) {
                    console.error('Error calculating attraction points:', e);
                }
            } else if (booking.type === 'GLAMPING') {
                 try {
                    const details = JSON.parse(booking.details);
                    if (details.items && Array.isArray(details.items)) {
                        const itemIds = details.items.map((i: any) => i.id);
                        const accommodations = await prisma.accommodation.findMany({
                            where: { id: { in: itemIds } },
                            select: { id: true, points: true }
                        });
                        
                        const pointsMap = new Map(accommodations.map(a => [a.id, a.points]));
                        
                        let totalPoints = 0;
                        for (const item of details.items) {
                            const pts = pointsMap.get(item.id) || 0;
                            const qty = item.qty || 1;
                            totalPoints += (pts * qty);
                        }
                        
                        // Use the calculated points from Accommodation settings
                        earnedPoints = totalPoints;
                    }
                } catch (e) {
                    console.error('Error calculating accommodation points:', e);
                }
            }

            await prisma.transaction.create({
                data: {
                    userId: booking.userId,
                    amount: earnedPoints,
                    type: 'EARN',
                    description: `Payment for booking ${booking.id}`,
                    source: `BOOKING:${booking.id}`,
                }
            });

            // Update User Points
            await prisma.user.update({
                where: { id: booking.userId },
                data: { points: { increment: earnedPoints } }
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
                targetEmail,
                booking.user.name,
                booking.id,
                booking.type,
                booking.amount,
                (() => {
                  try {
                    const d = JSON.parse(booking.details);
                    return Array.isArray(d.items) ? d.items : undefined;
                  } catch { return undefined; }
                })(),
                (() => {
                  try {
                    const d = JSON.parse(booking.details);
                    return d?.ktpPromo ? { ktpPromo: d.ktpPromo } : undefined;
                  } catch { return undefined; }
                })()
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
    } else if (isExpired) {
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

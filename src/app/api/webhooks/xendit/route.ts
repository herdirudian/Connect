import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { sendBookingSuccessEmail, sendBookingNotificationToReception } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const callbackToken = req.headers.get('x-callback-token');
    
    // Verify token if set in env
    if (process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN && callbackToken !== process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { status, external_id, id } = body;

    // We use booking ID as external_id
    if (status === 'PAID') {
      if (external_id.startsWith('FOOD-')) {
          const orderId = external_id.replace('FOOD-', '');
          const order = await prisma.foodOrder.findUnique({
              where: { id: orderId },
              include: { user: true }
          });

          if (order) {
              await prisma.foodOrder.update({
                  where: { id: orderId },
                  data: {
                      status: 'CONFIRMED',
                      paymentStatus: 'PAID',
                      paymentId: id
                  }
              });

              // Record Transaction
              await prisma.transaction.create({
                  data: {
                      userId: order.userId,
                      amount: order.totalAmount,
                      type: 'EARN', 
                      description: `Payment for Food Order #${order.id.substring(0,8)}`,
                      source: `FOOD:${order.id}`,
                  }
              });

              await createNotification(
                  order.userId,
                  'Order Paid',
                  `Your food order #${order.id.substring(0,8)} has been paid and is being prepared.`
              );
          }
      } else {
        const booking = await prisma.booking.findUnique({
            where: { id: external_id },
            include: { user: true }
        });

        if (booking) {
            // Update booking status
            await prisma.booking.update({
            where: { id: external_id },
            data: {
                status: 'CONFIRMED',
                paymentStatus: 'PAID',
                paymentId: id,
            }
            });

            // Record Transaction
            await prisma.transaction.create({
            data: {
                userId: booking.userId,
                amount: booking.amount,
                type: 'EARN', 
                description: `Payment for booking ${booking.id}`,
                source: `BOOKING:${booking.id}`,
            }
            });

            // Send in-app notification
            await createNotification(
            booking.userId,
            'Payment Successful',
            `Your payment for booking ${booking.id} has been received.`
            );

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
        }
      }
    } else if (status === 'EXPIRED') {
       if (external_id.startsWith('FOOD-')) {
            const orderId = external_id.replace('FOOD-', '');
            await prisma.foodOrder.update({
                where: { id: orderId },
                data: {
                    status: 'CANCELLED',
                    paymentStatus: 'EXPIRED'
                }
            });
       } else {
            await prisma.booking.update({
                where: { id: external_id },
                data: {
                    status: 'CANCELLED',
                    paymentStatus: 'EXPIRED',
                }
            });
       }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

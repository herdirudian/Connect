import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { sendBookingSuccessEmail, sendBookingNotificationToReception } from '@/lib/email';
import { notifyRoomServiceOrderPaid } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ message: 'Xendit Webhook Endpoint Active' });
}

export async function POST(req: Request) {
  try {
    const callbackToken = req.headers.get('x-callback-token');
    
    // Verify token if set in env
    if (process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN && callbackToken !== process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN) {
      console.warn('Webhook Unauthorized: Invalid Token', { received: callbackToken, expected: process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('Xendit Webhook Received:', JSON.stringify(body, null, 2));

    let { status, external_id, id } = body;

    // Handle Payment Request V2 Events
    if (body.event === 'payment.succeeded') {
        status = 'PAID';
        external_id = body.data.reference_id;
        id = body.data.id;
        console.log(`[Xendit Webhook] Payment Request Succeeded: ${external_id} (${id})`);
    } else if (body.event === 'payment.failed' || body.event === 'payment.expired') {
        status = 'EXPIRED';
        external_id = body.data.reference_id;
        id = body.data.id;
        console.log(`[Xendit Webhook] Payment Request Failed/Expired: ${external_id}`);
    }

    console.log(`[Xendit Webhook] Processing - Status: ${status}, ExternalID: ${external_id}`);

    // We use booking/food order ID as external_id
    if (status === 'PAID') {
      if (external_id && external_id.startsWith('RS-COMBO:')) {
          const parts = external_id.split(':');
          const foodId = parts[1] !== 'NONE' ? parts[1] : null;
          const hkId = parts[2] !== 'NONE' ? parts[2] : null;
          let shouldNotifyFood = false;
          let shouldNotifyHK = false;

          console.log(`[Xendit Webhook] Handling RS-COMBO: FoodID=${foodId}, HKID=${hkId}`);

          if (foodId) {
            const current = await prisma.foodOrder.findUnique({
              where: { id: foodId },
              select: { paymentStatus: true }
            });
            if (current?.paymentStatus !== 'PAID') {
              await prisma.foodOrder.update({
                where: { id: foodId },
                data: { status: 'CONFIRMED', paymentStatus: 'PAID', paymentId: id }
              });
              shouldNotifyFood = true;
              console.log(`[Xendit Webhook] RS-COMBO: FoodOrder ${foodId} updated to PAID`);
            }
          }
          if (hkId) {
            const current = await prisma.housekeepingOrder.findUnique({
              where: { id: hkId },
              select: { paymentStatus: true }
            });
            if (current?.paymentStatus !== 'PAID') {
              await prisma.housekeepingOrder.update({
                where: { id: hkId },
                data: { status: 'CONFIRMED', paymentStatus: 'PAID', paymentId: id }
              });
              shouldNotifyHK = true;
              console.log(`[Xendit Webhook] RS-COMBO: HKOrder ${hkId} updated to PAID`);
            }
          }
          if (shouldNotifyFood || shouldNotifyHK) {
            await notifyRoomServiceOrderPaid({
              foodOrderId: shouldNotifyFood ? foodId : null,
              hkOrderId: shouldNotifyHK ? hkId : null
            });
          }
      } else if (external_id && external_id.startsWith('FOOD-')) {
          const orderId = external_id.replace('FOOD-', '');
          console.log(`[Xendit Webhook] Handling FOOD Order: ${orderId}`);
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

              // Record Transaction & notify only if associated user exists
              if (order.userId) {
                await prisma.transaction.create({
                    data: {
                        userId: order.userId!,
                        amount: order.totalAmount,
                        type: 'EARN', 
                        description: `Payment for Food Order #${order.id.substring(0,8)}`,
                        source: `FOOD:${order.id}`,
                    }
                });

                await prisma.user.update({
                    where: { id: order.userId! },
                    data: { points: { increment: Math.floor(order.totalAmount) } }
                });

                await createNotification(
                    order.userId!,
                    'Order Paid',
                    `Your food order #${order.id.substring(0,8)} has been paid and is being prepared.`
                );
              }
              console.log(`[Xendit Webhook] FoodOrder ${orderId} updated to PAID`);
          }
      } else if (external_id && external_id.startsWith('ROOM-')) {
          const orderId = external_id.replace('ROOM-', '');
          console.log(`[Xendit Webhook] Handling ROOM Order: ${orderId}`);
          const order = await prisma.foodOrder.findUnique({
              where: { id: orderId }
          });
          if (order) {
              if (order.paymentStatus !== 'PAID') {
                await prisma.foodOrder.update({
                    where: { id: orderId },
                    data: {
                        status: 'CONFIRMED',
                        paymentStatus: 'PAID',
                        paymentId: id
                    }
                });
                await notifyRoomServiceOrderPaid({ foodOrderId: orderId, hkOrderId: null });
                console.log(`[Xendit Webhook] RoomService Order ${orderId} updated to PAID`);
              }
          }
      } else if (external_id && external_id.startsWith('HK-')) {
          const orderId = external_id.replace('HK-', '');
          console.log(`[Xendit Webhook] Handling HK Order: ${orderId}`);
          const order = await prisma.housekeepingOrder.findUnique({
              where: { id: orderId }
          });
          if (order) {
              if (order.paymentStatus !== 'PAID') {
                await prisma.housekeepingOrder.update({
                    where: { id: orderId },
                    data: {
                        status: 'CONFIRMED',
                        paymentStatus: 'PAID',
                        paymentId: id
                    }
                });
                await notifyRoomServiceOrderPaid({ foodOrderId: null, hkOrderId: orderId });
                console.log(`[Xendit Webhook] Housekeeping Order ${orderId} updated to PAID`);
              }
          }
      } else if (external_id) {
        console.log(`[Xendit Webhook] Handling Booking: ${external_id}`);
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
            console.log(`[Xendit Webhook] Booking ${external_id} updated to PAID`);

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

            // Record Transaction
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
        }
      }
    } else if (status === 'EXPIRED') {
       if (external_id && external_id.startsWith('RS-COMBO:')) {
            const parts = external_id.split(':');
            const foodId = parts[1] !== 'NONE' ? parts[1] : null;
            const hkId = parts[2] !== 'NONE' ? parts[2] : null;
            if (foodId) {
              await prisma.foodOrder.update({
                where: { id: foodId },
                data: { status: 'CANCELLED', paymentStatus: 'EXPIRED' }
              });
            }
            if (hkId) {
              await prisma.housekeepingOrder.update({
                where: { id: hkId },
                data: { status: 'CANCELLED', paymentStatus: 'EXPIRED' }
              });
            }
       } else
       if (external_id.startsWith('FOOD-')) {
            const orderId = external_id.replace('FOOD-', '');
            await prisma.foodOrder.update({
                where: { id: orderId },
                data: {
                    status: 'CANCELLED',
                    paymentStatus: 'EXPIRED'
                }
            });
       } else if (external_id.startsWith('ROOM-')) {
            const orderId = external_id.replace('ROOM-', '');
            await prisma.foodOrder.update({
                where: { id: orderId },
                data: {
                    status: 'CANCELLED',
                    paymentStatus: 'EXPIRED'
                }
            });
       } else if (external_id.startsWith('HK-')) {
            const orderId = external_id.replace('HK-', '');
            await prisma.housekeepingOrder.update({
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

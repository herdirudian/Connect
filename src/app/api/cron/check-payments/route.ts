import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Invoice, PaymentRequest as XenditPaymentRequest } from '@/lib/xendit';
import { sendBookingSuccessEmail, sendBookingNotificationToReception } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import { notifyRoomServiceOrderPaid } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    
    // Optional secret check
    // if (secret !== process.env.CRON_SECRET) { ... }

    // Find pending bookings from the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const pendingBookings = await prisma.booking.findMany({
      where: {
        paymentStatus: 'PENDING',
        paymentId: { not: null },
        createdAt: { gte: yesterday }
      },
      include: {
        user: true
      }
    });

    // Find pending food orders from the last 24 hours (Room Service + Member food)
    const pendingFoodOrders = await prisma.foodOrder.findMany({
      where: {
        paymentStatus: 'PENDING',
        paymentId: { not: null },
        createdAt: { gte: yesterday }
      },
      include: {
        user: true,
        restaurant: true
      }
    });

    console.log(`[Cron] Found ${pendingFoodOrders.length} pending food orders to check`);

    // Find pending housekeeping orders from the last 24 hours
    const pendingHKOrders = await prisma.housekeepingOrder.findMany({
      where: {
        paymentStatus: 'PENDING',
        paymentId: { not: null },
        createdAt: { gte: yesterday }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[Cron] Found ${pendingHKOrders.length} pending HK orders to check`);

    const results = [];

    for (const booking of pendingBookings) {
      if (!booking.paymentId) continue;

      try {
        // Detect whether this booking used Payment Request V2
        let isPaymentRequest = false;
        try {
          const details = typeof booking.details === 'string' ? JSON.parse(booking.details) : booking.details;
          if (details?.paymentInfo?.isPaymentRequest) isPaymentRequest = true;
        } catch {}

        let isPaid = false;
        let isExpired = false;

        if (isPaymentRequest) {
          const pr = await XenditPaymentRequest.getPaymentRequestByID({ paymentRequestId: booking.paymentId });
          if (pr) {
            if (pr.status === 'SUCCEEDED') isPaid = true;
            else if (pr.status === 'FAILED' || pr.status === 'EXPIRED' ) isExpired = true;
          }
        } else {
          const invoice = await Invoice.getInvoiceById({ invoiceId: booking.paymentId });
          if (invoice) {
            if (invoice.status === 'PAID' || invoice.status === 'SETTLED') isPaid = true;
            else if (invoice.status === 'EXPIRED') isExpired = true;
          }
        }

        if (isPaid) {
          // Check if already paid in DB (race condition)
          const currentBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
          if (currentBooking?.paymentStatus === 'PAID') continue;

          // Update to PAID
          await prisma.$transaction(async (tx) => {
             // 1. Update Booking
             await tx.booking.update({
               where: { id: booking.id },
               data: {
                 status: 'CONFIRMED',
                 paymentStatus: 'PAID',
               }
             });

             // 2. Calculate Points Logic
             let earnedPoints = Math.floor(booking.amount); // Default fallback

             try {
                const details = typeof booking.details === 'string' ? JSON.parse(booking.details) : booking.details;
                
                if (booking.type === 'WAHANA' && details.items && Array.isArray(details.items)) {
                    const itemIds = details.items.map((i: any) => i.id);
                    const attractions = await tx.attraction.findMany({
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
                    if (totalPoints > 0) earnedPoints = totalPoints;

                } else if (booking.type === 'GLAMPING' && details.items && Array.isArray(details.items)) {
                    const itemIds = details.items.map((i: any) => i.id);
                    const accommodations = await tx.accommodation.findMany({
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
                    if (totalPoints > 0) earnedPoints = totalPoints;
                }
             } catch (e) {
                 console.error('Error calculating points in cron:', e);
             }

             // 3. Create Transaction Record
             await tx.transaction.create({
               data: {
                 userId: booking.userId,
                 amount: earnedPoints,
                 type: 'EARN', 
                 description: `Points from booking ${booking.id}`,
                 source: `BOOKING:${booking.id}`
               }
             });
          });

          // Send Notifications (Non-Transactional)
          try {
              // 1. In-App Notification
              await createNotification(
                booking.userId,
                'Payment Confirmed',
                `Your booking for ${booking.type} has been confirmed via Auto-Check.`
              );

              // 2. Email to User
              let targetEmail = booking.user.email;
              const details = typeof booking.details === 'string' ? JSON.parse(booking.details) : booking.details;
              if (details.recipientEmail) targetEmail = details.recipientEmail;

              await sendBookingSuccessEmail(
                targetEmail,
                booking.user.name,
                booking.id,
                booking.type,
                booking.amount,
                (() => {
                  try {
                    const d = typeof booking.details === 'string' ? JSON.parse(booking.details) : booking.details;
                    return Array.isArray(d.items) ? d.items : undefined;
                  } catch { return undefined; }
                })(),
                (() => {
                  try {
                    const d = typeof booking.details === 'string' ? JSON.parse(booking.details) : booking.details;
                    return d?.ktpPromo ? { ktpPromo: d.ktpPromo } : undefined;
                  } catch { return undefined; }
                })()
              );

              // 3. Email to Reception (Glamping only)
              if (booking.type === 'GLAMPING' && details.items) {
                 const accommodationIds = details.items.map((i: any) => i.id);
                 const accommodations = await prisma.accommodation.findMany({
                     where: { id: { in: accommodationIds } },
                     select: { id: true, receptionEmail: true }
                 });

                 const emailSet = new Set<string>();
                 accommodations.forEach(acc => {
                     if (acc.receptionEmail) emailSet.add(acc.receptionEmail);
                 });

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

          } catch (notifyErr) {
              console.error('Error sending notifications in cron:', notifyErr);
          }

          results.push({ id: booking.id, status: 'UPDATED_TO_PAID' });

        } else if (isExpired) {
          if (booking.type === 'WAHANA') {
            try {
              const details = typeof booking.details === 'string' ? JSON.parse(booking.details) : booking.details;
              if (details.items && Array.isArray(details.items)) {
                  for (const item of details.items) {
                      const attraction = await prisma.attraction.findUnique({ where: { id: item.id } });
                      if (attraction?.isEvent) {
                          await prisma.attraction.update({
                              where: { id: item.id },
                              data: { eventSoldQuota: { decrement: item.qty || 1 } }
                          });
                      }
                  }
              }
            } catch(e) {
                console.error('Error decrementing event quota in cron:', e);
            }
          }

          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: 'CANCELLED',
              paymentStatus: 'EXPIRED'
            }
          });
          results.push({ id: booking.id, status: 'UPDATED_TO_EXPIRED' });
        } else {
          results.push({ id: booking.id, status: 'STILL_PENDING' });
        }

      } catch (err: any) {
        console.error(`Error checking booking ${booking.id}:`, err);
        results.push({ id: booking.id, error: err.message });
      }
    }

    // Check Food Orders
    for (const order of pendingFoodOrders) {
      if (!order.paymentId) continue;
      try {
        let isPaid = false;
        let isExpired = false;

        const invoice = await Invoice.getInvoiceById({ invoiceId: order.paymentId });
        if (invoice) {
          if (invoice.status === 'PAID' || invoice.status === 'SETTLED') isPaid = true;
          else if (invoice.status === 'EXPIRED') isExpired = true;
        }

        if (isPaid) {
          const current = await prisma.foodOrder.findUnique({ where: { id: order.id } });
          if (current?.paymentStatus === 'PAID') {
            results.push({ id: order.id, type: 'FOOD', status: 'ALREADY_PAID' });
            continue;
          }

          await prisma.foodOrder.update({
            where: { id: order.id },
            data: {
              status: 'CONFIRMED',
              paymentStatus: 'PAID'
            }
          });

          if (order.channel === 'ROOM_SERVICE') {
            await notifyRoomServiceOrderPaid({ foodOrderId: order.id, hkOrderId: null });
          }

          // Record points if user exists
          if (order.userId) {
            await prisma.transaction.create({
              data: {
                userId: order.userId!,
                amount: Math.floor(order.totalAmount),
                type: 'EARN',
                description: `Points from food order ${order.id.substring(0,8)}`,
                source: `FOOD:${order.id}`
              }
            });
          }
          results.push({ id: order.id, type: 'FOOD', status: 'UPDATED_TO_PAID' });
        } else if (isExpired) {
          await prisma.foodOrder.update({
            where: { id: order.id },
            data: {
              status: 'CANCELLED',
              paymentStatus: 'EXPIRED'
            }
          });
          results.push({ id: order.id, type: 'FOOD', status: 'UPDATED_TO_EXPIRED' });
        } else {
          results.push({ id: order.id, type: 'FOOD', status: 'STILL_PENDING' });
        }
      } catch (err: any) {
        console.error(`Error checking food order ${order.id}:`, err);
        results.push({ id: order.id, type: 'FOOD', error: err.message });
      }
    }

    // Check Housekeeping Orders
    for (const order of pendingHKOrders) {
      if (!order.paymentId) continue;
      try {
        let isPaid = false;
        let isExpired = false;
        const invoice = await Invoice.getInvoiceById({ invoiceId: order.paymentId });
        if (invoice) {
          if (invoice.status === 'PAID' || invoice.status === 'SETTLED') isPaid = true;
          else if (invoice.status === 'EXPIRED') isExpired = true;
        }
        if (isPaid) {
          const current = await prisma.housekeepingOrder.findUnique({ where: { id: order.id } });
          if (current?.paymentStatus === 'PAID') {
            results.push({ id: order.id, type: 'HK', status: 'ALREADY_PAID' });
            continue;
          }
          await prisma.housekeepingOrder.update({
            where: { id: order.id },
            data: {
              status: 'CONFIRMED',
              paymentStatus: 'PAID'
            }
          });
          await notifyRoomServiceOrderPaid({ foodOrderId: null, hkOrderId: order.id });
          results.push({ id: order.id, type: 'HK', status: 'UPDATED_TO_PAID' });
        } else if (isExpired) {
          await prisma.housekeepingOrder.update({
            where: { id: order.id },
            data: {
              status: 'CANCELLED',
              paymentStatus: 'EXPIRED'
            }
          });
          results.push({ id: order.id, type: 'HK', status: 'UPDATED_TO_EXPIRED' });
        } else {
          results.push({ id: order.id, type: 'HK', status: 'STILL_PENDING' });
        }
      } catch (err: any) {
        console.error(`Error checking housekeeping order ${order.id}:`, err);
        results.push({ id: order.id, type: 'HK', error: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      checked: pendingBookings.length + pendingFoodOrders.length + pendingHKOrders.length,
      results 
    });

  } catch (error: any) {
    console.error('Cron Job Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

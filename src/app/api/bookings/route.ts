import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { Invoice } from '@/lib/xendit';
import { PAYMENT_METHODS } from '@/lib/fees';
import { sendBookingPendingEmail } from '@/lib/email';

import { Prisma } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, date, details, amount, items, paymentMethod } = body;
    // items could be an array of { id, name, price, quantity }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Start Transaction with Serializable Isolation Level
    const booking = await prisma.$transaction(async (tx) => {
      // Check Availability for GLAMPING
      if (type === 'GLAMPING' && details?.items) {
        const bookingDate = new Date(date);

        for (const item of details.items) {
          const accommodationId = item.id;
          const qty = item.qty || 1;

          // 1. Get Accommodation Stock and Allotment
          const accommodation = await tx.accommodation.findUnique({
            where: { id: accommodationId },
            include: {
              allotments: {
                where: { date: bookingDate }
              }
            }
          });

          if (!accommodation) {
             throw new Error(`Accommodation not found: ${item.name}`);
          }

          // Determine Total Capacity for this date
          const dailyQuota = accommodation.allotments.length > 0 
            ? accommodation.allotments[0].quota 
            : accommodation.stock;

          // 2. Count existing bookings
          const existingBookings = await tx.booking.findMany({
            where: {
              type: 'GLAMPING',
              date: bookingDate,
              status: { not: 'CANCELLED' },
              paymentStatus: { not: 'EXPIRED' }
            }
          });

          let usedStock = 0;
          for (const b of existingBookings) {
            try {
              const bDetails = JSON.parse(b.details);
              if (bDetails.items) {
                const match = bDetails.items.find((i: any) => i.id === accommodationId);
                if (match) {
                  usedStock += (match.qty || 1);
                }
              }
            } catch (e) {
              // Ignore malformed details
            }
          }

          if (usedStock + qty > dailyQuota) {
             throw new Error(`Not enough stock for ${accommodation.name} on ${bookingDate.toLocaleDateString()}. Available: ${dailyQuota - usedStock}`);
          }
        }
      }

      // Create Booking
      return tx.booking.create({
        data: {
          userId: user.id,
          type, // "WAHANA" or "GLAMPING"
          date: new Date(date),
          details: JSON.stringify(details || {}),
          status: 'PENDING',
          paymentStatus: 'PENDING',
          amount: parseFloat(amount),
        }
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000
    });

    // Create Xendit Invoice

    // Create Xendit Invoice
    let invoice;
    let xenditPaymentMethods: string[] | undefined;
    
    if (paymentMethod) {
      const methodConfig = PAYMENT_METHODS.find(m => m.id === paymentMethod);
      if (methodConfig) {
        xenditPaymentMethods = methodConfig.xenditCodes;
      }
    }

    try {
      invoice = await Invoice.createInvoice({
        data: {
          externalId: booking.id,
          amount: booking.amount,
          payerEmail: user.email,
          description: `Booking ${type} - ${user.name}`,
          invoiceDuration: 86400, // 24 hours
          currency: 'IDR',
          paymentMethods: xenditPaymentMethods,
        }
      });
    } catch (xenditError: any) {
      console.error('Xendit Invoice Creation Failed:', xenditError);
      // Delete booking if invoice creation fails
      await prisma.booking.delete({ where: { id: booking.id } });
      return NextResponse.json({ 
        error: 'Payment gateway error. Please check your Xendit API Key (Secret Key required).',
        details: xenditError.message 
      }, { status: 500 });
    }

    // Update Booking with Invoice Info
    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentId: invoice.id,
        paymentUrl: invoice.invoiceUrl,
      }
    });

    // Send Pending Payment Email
    const targetEmail = (details && details.recipientEmail) ? details.recipientEmail : user.email;
    await sendBookingPendingEmail(
      targetEmail,
      user.name,
      booking.id,
      booking.amount,
      invoice.invoiceUrl
    );

    return NextResponse.json({ 
      booking: updatedBooking, 
      paymentUrl: invoice.invoiceUrl 
    });

  } catch (error: any) {
    console.error('Booking Error:', error);
    const status = error.message?.includes('Not enough stock') ? 400 : 500;
    return NextResponse.json({ 
      error: status === 400 ? error.message : 'Failed to create booking',
      details: error.message 
    }, { status });
  }
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookings = await prisma.booking.findMany({
      where: { userId: decoded.userId },
      include: { review: { select: { id: true, rating: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error('Fetch Bookings Error:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

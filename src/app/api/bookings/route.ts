import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, hashPassword, generateReferralCode } from '@/lib/auth';
import { cookies } from 'next/headers';
import { Invoice } from '@/lib/xendit';
import { createXenditPaymentRequest } from '@/lib/xendit-payment';
import { PAYMENT_METHODS, calculateFee } from '@/lib/fees';
import { sendBookingPendingEmail } from '@/lib/email';

import { Prisma } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, date, details, amount, items, paymentMethod, promoCode } = body;
    
    // items could be an array of { id, name, price, quantity }

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;
    
    let user = null;

    if (decoded && decoded.userId) {
       user = await prisma.user.findUnique({
         where: { id: decoded.userId }
       });
    }

    // Handle Guest Booking if no user logged in
    if (!user) {
        const guestEmail = details?.recipientEmail || details?.guestEmail;
        const guestName = details?.guestName || 'Guest';
        const guestPhone = details?.guestPhone;

        if (!guestEmail) {
            return NextResponse.json({ error: 'Unauthorized or missing guest email' }, { status: 401 });
        }

        // Check if user exists
        user = await prisma.user.findUnique({
            where: { email: guestEmail }
        });

        if (!user) {
            // Create new guest user
            const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'; // Simple random password
            const hashedPassword = await hashPassword(tempPassword);
            
            let newReferralCode = generateReferralCode(guestName);
            // Ensure unique referral code (simple retry)
            let retries = 0;
            while (retries < 5 && await prisma.user.findUnique({ where: { referralCode: newReferralCode } })) {
                newReferralCode = generateReferralCode(guestName);
                retries++;
            }

            user = await prisma.user.create({
                data: {
                    name: guestName,
                    email: guestEmail,
                    password: hashedPassword,
                    phoneNumber: guestPhone,
                    role: 'MEMBER',
                    referralCode: newReferralCode,
                    isVerified: false,
                }
            });
            // Note: We are not sending the password to the user. 
            // They can use "Forgot Password" to access their account later.
        }
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found and could not be created' }, { status: 500 });
    }

    // Calculate amount and apply promo code (server-side validation)
    if (!details?.items || !Array.isArray(details.items) || details.items.length === 0) {
      return NextResponse.json({ error: 'No booking items provided' }, { status: 400 });
    }

    // Override item prices for date-based pricing (WAHANA)
    let effectiveItems = details.items;
    if (type === 'WAHANA' && Array.isArray(details.items)) {
      const itemIds = details.items.map((i: any) => i.id);
      const schedules = await prisma.attractionPriceSchedule.findMany({
        where: {
          attractionId: { in: itemIds },
          validFrom: { lte: new Date(date) },
          validUntil: { gte: new Date(date) },
        },
      });
      const scheduleMap = new Map<string, number>();
      schedules.forEach(ps => scheduleMap.set(ps.attractionId, ps.price));
      effectiveItems = details.items.map((i: any) => ({
        ...i,
        price: scheduleMap.has(i.id) ? scheduleMap.get(i.id) : i.price,
      }));
    }

    const subtotal = effectiveItems.reduce(
      (sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.qty) || 1),
      0
    );
    const adminFee = calculateFee(subtotal, paymentMethod);

    let discount = 0;
    let appliedPromo: any = null;

    // Use booking date for date-range evaluation
    const bookingDateObj = new Date(date);

    if (promoCode) {
      const normalizedCode = String(promoCode).trim().toUpperCase();
      
      // 1. Check in regular PromoCode
      const promo = await prisma.promoCode.findUnique({
        where: { code: normalizedCode },
      });

      if (promo && promo.active) {
        const withinDate =
          (!promo.validFrom || promo.validFrom <= bookingDateObj) &&
          (!promo.validUntil || promo.validUntil >= bookingDateObj);

        const typeMatch =
          promo.applicableTo === 'ALL' || promo.applicableTo === type;

        const baseAmount = subtotal + adminFee;
        const minOk =
          !promo.minAmount || baseAmount >= promo.minAmount;

        if (withinDate && typeMatch && minOk) {
          if (promo.discountType === 'PERCENT') {
            discount = (subtotal * promo.value) / 100;
          } else if (promo.discountType === 'FIXED') {
            discount = promo.value;
          }

          if (promo.maxDiscount && discount > promo.maxDiscount) {
            discount = promo.maxDiscount;
          }

          if (discount > 0) {
            appliedPromo = {
              code: promo.code,
              discount,
              discountType: promo.discountType,
              value: promo.value,
            };
          }
        }
      } 
      // 2. If not found in PromoCode, check in VoucherClaim
      else if (!promo) {
        const voucherClaim = await prisma.voucherClaim.findUnique({
          where: { voucherCode: normalizedCode },
        });

        if (voucherClaim && !voucherClaim.isUsed) {
          const expiryDate = new Date('2026-07-31T23:59:59');
          if (new Date() <= expiryDate) {
            // Validate items in cart for 20% discount
            let totalVoucherDiscount = 0;
            
            for (const item of effectiveItems) {
              const attraction = await prisma.attraction.findUnique({
                where: { id: item.id }
              });

              if (attraction && attraction.allowVoucherClaim) {
                // Check dynamic expiry
                const itemExpiry = attraction.voucherExpiry ? new Date(attraction.voucherExpiry) : new Date('2026-07-31T23:59:59');
                if (new Date() > itemExpiry) {
                  throw new Error(`Voucher untuk ${attraction.name} sudah kedaluwarsa`);
                }

                // Limit by maxVoucherPax
                if (item.qty > (attraction.maxVoucherPax || 10)) {
                  throw new Error(`Maksimal ${attraction.maxVoucherPax || 10} pax untuk tiket ${attraction.name} per voucher`);
                }
                const itemTotal = attraction.price * item.qty;
                totalVoucherDiscount += itemTotal * 0.20;
              }
            }

            if (totalVoucherDiscount > 0) {
              discount = totalVoucherDiscount;
              appliedPromo = {
                code: normalizedCode,
                discount,
                discountType: 'PERCENTAGE',
                value: 20,
                isVoucherClaim: true
              };
            }
          }
        }
      }
    }

    const finalAmount = subtotal + adminFee - discount;
    if (!finalAmount || finalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid final amount after promo' }, { status: 400 });
    }

    const bookingDetails = {
      ...(details || {}),
      items: effectiveItems,
      adminFee,
      promo: appliedPromo || undefined,
      originalSubtotal: subtotal,
      originalAmount: subtotal + adminFee,
    };

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

      // Check Availability and update quotas for WAHANA (Events)
      if (type === 'WAHANA' && details?.items) {
        for (const item of details.items) {
          const attractionId = item.id;
          const qty = item.qty || 1;

          const attraction = await tx.attraction.findUnique({
            where: { id: attractionId }
          });

          if (attraction?.isEvent) {
            // Check quota
            if (attraction.eventMaxQuota) {
              const newSoldQuota = attraction.eventSoldQuota + qty;
              if (newSoldQuota > attraction.eventMaxQuota) {
                const available = Math.max(0, attraction.eventMaxQuota - attraction.eventSoldQuota);
                throw new Error(`Kuota tidak mencukupi untuk tiket event ${attraction.name}. Sisa kuota: ${available}`);
              }
            }
            // Increment sold quota
            await tx.attraction.update({
              where: { id: attractionId },
              data: { eventSoldQuota: { increment: qty } }
            });
          }
        }
      }

      // Mark VoucherClaim as used if applicable
      if (appliedPromo?.isVoucherClaim) {
        await tx.voucherClaim.update({
          where: { voucherCode: appliedPromo.code },
          data: { isUsed: true }
        });
      }

      // Create Booking
      return tx.booking.create({
        data: {
          userId: user.id,
          type, // "WAHANA" or "GLAMPING"
          date: new Date(date),
          details: JSON.stringify(bookingDetails),
          status: 'PENDING',
          paymentStatus: 'PENDING',
          amount: finalAmount,
        }
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000
    });

    // Create Xendit Invoice

    // Create Payment (Payment Request V2 or Invoice Fallback)
    let paymentId = '';
    let paymentUrl = '';
    let paymentInfo: any = null;
    let paymentRequest = null;
    let invoice = null;

    // Define Success/Failure URLs based on User Type (Guest vs Member)
    const isGuest = !decoded;
    const successRedirectUrl = isGuest 
        ? 'https://thelodgegroup.id' 
        : `https://family.thelodgegroup.id/dashboard/bookings?status=success&bookingId=${booking.id}`;
    
    const failureRedirectUrl = isGuest
        ? `https://family.thelodgegroup.id/booking/status?status=failed&bookingId=${booking.id}`
        : `https://family.thelodgegroup.id/dashboard/bookings?status=failed&bookingId=${booking.id}`;

    // 1. Try Payment Request V2 first (if method is specific)
    if (paymentMethod) {
        try {
            const pr = await createXenditPaymentRequest(
                booking.id, 
                booking.amount, 
                paymentMethod, 
                { id: user.id, email: user.email, name: user.name, phone: user.phoneNumber || undefined }, 
                `Booking ${type} - ${user.name}`,
                { success: successRedirectUrl, failure: failureRedirectUrl }
            );
            
            if (pr) {
                paymentRequest = pr;
                paymentId = pr.id;
                
                // Extract Payment Info
                let vaNumber = '';
                let qrString = '';
                let otcCode = '';

                // Check actions for Redirect URL (E-Wallet, Card)
                const action = pr.actions?.find((a: any) => a.action === 'PRESENT_TO_CUSTOMER');
                if (action?.url) {
                    paymentUrl = action.url;
                }

                // Check for VA Number
                if (pr.paymentMethod?.virtualAccount?.channelProperties?.virtualAccountNumber) {
                    vaNumber = pr.paymentMethod.virtualAccount.channelProperties.virtualAccountNumber;
                }

                // Check for QR String
                if (pr.paymentMethod?.qrCode?.channelProperties?.qrString) {
                    qrString = pr.paymentMethod.qrCode.channelProperties.qrString;
                }

                // Check for OTC Code
                if (pr.paymentMethod?.overTheCounter && (pr.paymentMethod.overTheCounter as any).channelProperties?.paymentCode) {
                     otcCode = (pr.paymentMethod.overTheCounter as any).channelProperties.paymentCode;
                }

                // If no redirect URL, point to dashboard
                if (!paymentUrl) {
                    paymentUrl = 'https://family.thelodgegroup.id/dashboard/bookings';
                }

                paymentInfo = {
                    method: paymentMethod,
                    vaNumber,
                    qrString,
                    otcCode,
                    isPaymentRequest: true
                };
            }
        } catch (e) {
            console.error('Payment Request V2 Failed, falling back to Invoice:', e);
            // Fallback to Invoice logic below
        }
    }

    // 2. Fallback to Invoice if Payment Request was not created
    if (!paymentRequest) {
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
                    successRedirectUrl: successRedirectUrl,
                    failureRedirectUrl: failureRedirectUrl,
                }
            });
            paymentId = invoice.id || '';
            paymentUrl = invoice.invoiceUrl || '';
        } catch (xenditError: any) {
             console.error('Xendit Invoice Creation Failed:', xenditError);
             await prisma.booking.delete({ where: { id: booking.id } });
             return NextResponse.json({ 
                error: 'Payment gateway error. Please check your Xendit API Key (Secret Key required).',
                details: xenditError.message 
             }, { status: 500 });
        }
    }

    // Update Booking with Invoice Info
    const detailsObj = JSON.parse(booking.details);
    if (paymentInfo) {
        detailsObj.paymentInfo = paymentInfo;
    }

    const updatedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
            paymentId: paymentId,
            paymentUrl: paymentUrl,
            details: JSON.stringify(detailsObj)
        }
    });

    // Send Pending Payment Email
    const targetEmail = (details && details.recipientEmail) ? details.recipientEmail : user.email;
    await sendBookingPendingEmail(
        targetEmail,
        user.name,
        booking.id,
        booking.amount,
        paymentUrl
    );

    return NextResponse.json({ 
        booking: updatedBooking, 
        paymentUrl: paymentUrl,
        paymentInfo: paymentInfo
    });

  } catch (error: any) {
    console.error('Booking Error:', error);
    const status = error.message?.includes('Not enough stock') ? 400 : 500;
    return NextResponse.json({ 
      error: error.message || 'Failed to create booking',
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

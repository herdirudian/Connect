import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { Invoice, PaymentRequest as XenditPaymentRequest } from '@/lib/xendit';
import { sendBookingSuccessEmail, sendBookingNotificationToReception } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return false;
  const payload = verifyToken(token) as any;
  if (!payload || payload.role !== 'ADMIN') return false;
  return true;
}

export async function GET(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const paymentStatus = searchParams.get('paymentStatus');
    const type = searchParams.get('type');
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');
    const page = Math.max(1, Number(pageParam || 1) || 1);
    const pageSizeRaw = Math.max(1, Number(pageSizeParam || 10) || 10);
    const pageSize = Math.min(100, pageSizeRaw);
    
    const where: any = {};
    if (paymentStatus && paymentStatus !== 'ALL') where.paymentStatus = paymentStatus;
    if (type && type !== 'ALL') where.type = type;

    // Reconcile recent pending bookings before returning list (up to 10 most recent)
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const pendings = await prisma.booking.findMany({
        where: {
          paymentStatus: 'PENDING',
          paymentId: { not: null },
          createdAt: { gte: since },
        },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      
      for (const b of pendings) {
        try {
          let isPR = false;
          try {
            const d = typeof b.details === 'string' ? JSON.parse(b.details) : b.details;
            if (d?.paymentInfo?.isPaymentRequest) isPR = true;
          } catch {}
          
          let paid = false;
          let expired = false;
          if (isPR) {
            const pr = await XenditPaymentRequest.getPaymentRequestByID({ paymentRequestId: b.paymentId! });
            if (pr) {
              if (pr.status === 'SUCCEEDED') paid = true;
              else if (pr.status === 'FAILED' || pr.status === 'EXPIRED') expired = true;
            }
          } else {
            const inv = await Invoice.getInvoiceById({ invoiceId: b.paymentId! });
            if (inv) {
              if (inv.status === 'PAID' || inv.status === 'SETTLED') paid = true;
              else if (inv.status === 'EXPIRED') expired = true;
            }
          }
          
          if (paid) {
            const current = await prisma.booking.findUnique({ where: { id: b.id } });
            if (current?.paymentStatus === 'PAID') continue;
            
            await prisma.$transaction(async (tx) => {
              await tx.booking.update({
                where: { id: b.id },
                data: { status: 'CONFIRMED', paymentStatus: 'PAID' }
              });
              
              // Calculate points (same logic as cron)
              let earnedPoints = Math.floor(b.amount);
              try {
                const details = typeof b.details === 'string' ? JSON.parse(b.details) : b.details;
                if (b.type === 'WAHANA' && details.items && Array.isArray(details.items)) {
                  const itemIds = details.items.map((i: any) => i.id);
                  const attractions = await tx.attraction.findMany({ where: { id: { in: itemIds } }, select: { id: true, points: true } });
                  const map = new Map(attractions.map(a => [a.id, a.points]));
                  let total = 0;
                  for (const it of details.items) total += (map.get(it.id) || 0) * (it.qty || 1);
                  if (total > 0) earnedPoints = total;
                } else if (b.type === 'GLAMPING' && details.items && Array.isArray(details.items)) {
                  const itemIds = details.items.map((i: any) => i.id);
                  const accs = await tx.accommodation.findMany({ where: { id: { in: itemIds } }, select: { id: true, points: true } });
                  const map = new Map(accs.map(a => [a.id, a.points]));
                  let total = 0;
                  for (const it of details.items) total += (map.get(it.id) || 0) * (it.qty || 1);
                  if (total > 0) earnedPoints = total;
                }
              } catch {}
              
              await tx.transaction.create({
                data: {
                  userId: b.userId,
                  amount: earnedPoints,
                  type: 'EARN',
                  description: `Points from booking ${b.id}`,
                  source: `BOOKING:${b.id}`
                }
              });
            });
            
            try {
              await createNotification(b.userId, 'Payment Confirmed', `Your booking for ${b.type} has been confirmed.`);
              let targetEmail = b.user.email;
              try {
                const det = typeof b.details === 'string' ? JSON.parse(b.details) : b.details;
                if (det?.recipientEmail) targetEmail = det.recipientEmail;
              } catch {}
              await sendBookingSuccessEmail(
                targetEmail,
                b.user.name,
                b.id,
                b.type,
                b.amount,
                (() => {
                  try {
                    const d = typeof b.details === 'string' ? JSON.parse(b.details) : b.details;
                    return Array.isArray(d.items) ? d.items : undefined;
                  } catch { return undefined; }
                })(),
                (() => {
                  try {
                    const d = typeof b.details === 'string' ? JSON.parse(b.details) : b.details;
                    return d?.ktpPromo ? { ktpPromo: d.ktpPromo } : undefined;
                  } catch { return undefined; }
                })()
              );
              
              if (b.type === 'GLAMPING') {
                const det = typeof b.details === 'string' ? JSON.parse(b.details) : b.details;
                if (det?.items) {
                  const ids = det.items.map((i: any) => i.id);
                  const accs = await prisma.accommodation.findMany({ where: { id: { in: ids } }, select: { receptionEmail: true } });
                  const set = new Set<string>();
                  accs.forEach(a => { if (a.receptionEmail) set.add(a.receptionEmail); });
                  await Promise.all(Array.from(set).map(email => 
                    sendBookingNotificationToReception(
                      email,
                      b.user.name,
                      b.user.phoneNumber || '-',
                      b.id,
                      new Date(b.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                      det.items
                    )
                  ));
                }
              }
            } catch (e) {
              console.error('Recon notify error:', e);
            }
          } else if (expired) {
            await prisma.booking.update({
              where: { id: b.id },
              data: { status: 'CANCELLED', paymentStatus: 'EXPIRED' }
            });
          }
        } catch (e) {
          console.error('Recon error for', b.id, e);
        }
      }
    } catch (e) {
      console.warn('Recon step skipped:', e);
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phoneNumber: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const enrichedBookings = bookings.map((b) => {
      let details: any = {};
      try {
        details = typeof b.details === 'string' ? JSON.parse(b.details) : b.details;
      } catch (e) {
        details = {};
      }

      const items = details.items || [];
      const itemNames = items.map((i: any) => `${i.name} (x${i.qty || 1})`).join(', ');
      const discount = details.promo?.discount || 0;
      const promoCode = details.promo?.code || '';

      return {
        ...b,
        items: itemNames,
        discount: discount,
        promoCode: promoCode,
      };
    });

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return NextResponse.json({
      items: enrichedBookings,
      page,
      pageSize,
      total,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, status, paymentStatus } = await request.json();

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const data: any = {};
    if (status) data.status = status;
    if (paymentStatus) data.paymentStatus = paymentStatus;

    // If payment is marked as PAID manually, ensure status is CONFIRMED
    if (paymentStatus === 'PAID') {
        data.status = 'CONFIRMED';
    }
    
    // If cancelled
    if (status === 'CANCELLED') {
        data.paymentStatus = 'CANCELLED'; // Or EXPIRED/FAILED depending on logic, but CANCELLED is fine
    }

    const booking = await prisma.booking.update({
      where: { id },
      data
    });

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

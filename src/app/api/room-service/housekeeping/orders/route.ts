import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Invoice } from '@/lib/xendit';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, roomNumber, roomSlug, guestName, guestPhone, deliveryNotes, paymentMethod } = body as {
      items: Array<{ itemId: string; quantity: number; requestNote?: string }>;
      roomNumber?: string;
      roomSlug?: string;
      guestName?: string;
      guestPhone?: string;
      deliveryNotes?: string;
      paymentMethod?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Tidak ada item housekeeping' }, { status: 400 });
    }

    const catalogIds = items.map(i => i.itemId);
    const catalog = await prisma.housekeepingItem.findMany({
      where: { id: { in: catalogIds }, active: true, available: true },
      select: { id: true, price: true, stock: true }
    });
    if (catalog.length !== catalogIds.length) {
      return NextResponse.json({ error: 'Ada item housekeeping yang tidak tersedia' }, { status: 400 });
    }
    const priceMap = new Map(catalog.map(c => [c.id, c.price]));
    for (const it of items) {
      if (!priceMap.has(it.itemId) || !Number.isFinite(it.quantity) || it.quantity <= 0) {
        return NextResponse.json({ error: 'Item housekeeping tidak valid' }, { status: 400 });
      }
    }
    const subtotal = items.reduce((sum, it) => sum + (priceMap.get(it.itemId) || 0) * it.quantity, 0);
    let adminFee = 0;
    try {
      const { calculateFee } = await import('@/lib/fees');
      if (paymentMethod) adminFee = calculateFee(subtotal, paymentMethod);
    } catch {}
    const totalAmount = subtotal + adminFee;

    // If roomSlug provided, override roomNumber from DB and ensure active
    let finalRoomNumber = roomNumber || '';
    if (roomSlug) {
      const [room] = await prisma.$queryRaw<Array<{ number: string; active: number | boolean }>>`SELECT number, active FROM RoomServiceRoom WHERE slug = ${roomSlug} LIMIT 1`;
      if (!room || (room.active !== 1 && room.active !== true)) {
        return NextResponse.json({ error: 'Kamar tidak valid atau tidak aktif' }, { status: 400 });
      }
      finalRoomNumber = room.number;
    }

    const order = await prisma.housekeepingOrder.create({
      data: {
        status: 'PENDING',
        paymentStatus: 'PENDING',
        totalAmount,
        guestName,
        roomNumber: finalRoomNumber,
        guestPhone,
        items: {
          create: items.map(it => ({
            itemId: it.itemId,
            quantity: it.quantity,
            price: priceMap.get(it.itemId)!,
            requestNote: it.requestNote?.slice(0,200) || undefined
          }))
        }
      }
    });

    try {
      const envUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const defaultUrl = 'https://family.thelodgegroup.id';
      const appUrl = /connect\.thelodgegroup\.id/.test(envUrl) || !envUrl ? defaultUrl : envUrl;
      const digits = String(guestPhone || '').replace(/\D/g, '');
      const invoice = await Invoice.createInvoice({
        data: {
          externalId: `HK-${order.id}`,
          amount: order.totalAmount,
          description: `Housekeeping order - Kamar ${finalRoomNumber}`,
          invoiceDuration: 3600,
          currency: 'IDR',
          successRedirectUrl: `${appUrl}/room-service/track?phone=${encodeURIComponent(digits)}&last4=${encodeURIComponent(digits.slice(-4))}`,
          failureRedirectUrl: `${appUrl}/room-service/track?phone=${encodeURIComponent(digits)}&last4=${encodeURIComponent(digits.slice(-4))}`,
        }
      });
      await prisma.housekeepingOrder.update({
        where: { id: order.id },
        data: {
          paymentId: invoice.id,
          paymentUrl: invoice.invoiceUrl,
          paymentStatus: 'PENDING'
        }
      });
      return NextResponse.json({ ...order, paymentUrl: invoice.invoiceUrl });
    } catch (e: any) {
      await prisma.housekeepingOrderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.housekeepingOrder.delete({ where: { id: order.id } });
      return NextResponse.json({ error: 'Gagal membuat pembayaran' }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Gagal membuat pesanan housekeeping' }, { status: 500 });
  }
}

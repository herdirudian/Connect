import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Xendit from 'xendit-node';

const xenditClient = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY as string,
});
const { Invoice } = xenditClient;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, items, roomNumber, roomSlug, guestName, guestPhone, deliveryNotes, paymentMethod } = body as {
      restaurantId: string;
      items: Array<{ menuItemId: string; quantity: number; requestNote?: string }>;
      roomNumber: string;
      roomSlug?: string;
      guestName: string;
      guestPhone?: string;
      deliveryNotes?: string;
      paymentMethod?: string;
    };

    try {
      const settings = await prisma.systemSetting.findMany({
        where: { key: { in: ['ROOM_SERVICE_OPEN', 'ROOM_SERVICE_CLOSE'] } },
        select: { key: true, value: true }
      });
      const map = new Map(settings.map(s => [s.key, s.value]));
      const open = (map.get('ROOM_SERVICE_OPEN') as string) || '07:00';
      const close = (map.get('ROOM_SERVICE_CLOSE') as string) || '22:00';
      const [oh, om] = open.split(':').map(Number);
      const [ch, cm] = close.split(':').map(Number);
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = oh * 60 + om;
      const closeMinutes = ch * 60 + cm;
      if (!(nowMinutes >= openMinutes && nowMinutes < closeMinutes)) {
        return NextResponse.json({ error: `Pemesanan room service hanya tersedia pukul ${open}-${close}` }, { status: 400 });
      }
    } catch {}

    if (!restaurantId || !Array.isArray(items) || items.length === 0 || !roomNumber || !guestName) {
      return NextResponse.json({ error: 'Data pemesanan tidak lengkap' }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { allowOrders: true, name: true },
    });
    if (!restaurant) {
      return NextResponse.json({ error: 'Restoran tidak ditemukan' }, { status: 404 });
    }
    if (!restaurant.allowOrders) {
      return NextResponse.json({ error: 'Pemesanan makanan sedang tidak tersedia' }, { status: 400 });
    }

    // Fetch item prices from DB to prevent tampering
    const menuIds = items.map(i => i.menuItemId);
    const menuMap = new Map<string, { name: string; price: number; available: boolean; soldOut: boolean; stock: number | null; minOrderQty: number }>();
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuIds }, restaurantId },
      select: { id: true, name: true, price: true, available: true, soldOut: true, stock: true, minOrderQty: true },
    });
    for (const mi of menuItems) menuMap.set(mi.id, { name: mi.name, price: mi.price, available: mi.available, soldOut: mi.soldOut, stock: mi.stock ?? null, minOrderQty: mi.minOrderQty ?? 1 });

    // Validate all items exist
    for (const it of items) {
      const meta = menuMap.get(it.menuItemId);
      if (!meta || !Number.isFinite(it.quantity) || it.quantity <= 0) {
        return NextResponse.json({ error: 'Item menu tidak valid' }, { status: 400 });
      }
      const minQty = Math.max(1, Number(meta.minOrderQty) || 1);
      if (it.quantity > 0 && it.quantity < minQty) {
        return NextResponse.json({ error: `Minimal order untuk ${meta.name} adalah ${minQty}` }, { status: 400 });
      }
      if (!meta.available || meta.soldOut) {
        return NextResponse.json({ error: 'Ada item yang tidak tersedia/sold' }, { status: 400 });
      }
      if (meta.stock !== null && it.quantity > meta.stock) {
        return NextResponse.json({ error: 'Jumlah melebihi stok untuk salah satu item' }, { status: 400 });
      }
    }

    const subtotal = items.reduce((sum, it) => {
      const price = menuMap.get(it.menuItemId)!.price;
      return sum + price * it.quantity;
    }, 0);
    let adminFee = 0;
    try {
      // Lazy import to avoid heavy client types
      const { calculateFee } = await import('@/lib/fees');
      if (paymentMethod) {
        adminFee = calculateFee(subtotal, paymentMethod);
      }
    } catch {}
    const totalAmount = subtotal + adminFee;

    // If roomSlug provided, override roomNumber from DB and ensure active
    let finalRoomNumber = roomNumber;
    if (roomSlug) {
      const [room] = await prisma.$queryRaw<Array<{ number: string; active: number | boolean }>>`SELECT number, active FROM RoomServiceRoom WHERE slug = ${roomSlug} LIMIT 1`;
      if (!room || (room.active !== 1 && room.active !== true)) {
        return NextResponse.json({ error: 'Kamar tidak valid atau tidak aktif' }, { status: 400 });
      }
      finalRoomNumber = room.number;
    }

    const order = await prisma.foodOrder.create({
      data: {
        userId: null,
        restaurantId,
        status: 'PENDING',
        totalAmount,
        channel: 'ROOM_SERVICE',
        guestName,
        roomNumber: finalRoomNumber,
        guestPhone,
        deliveryNotes,
        items: {
          create: items.map((it) => ({
            menuItemId: it.menuItemId,
            quantity: it.quantity,
            price: menuMap.get(it.menuItemId)!.price,
            requestNote: it.requestNote?.slice(0, 200) || undefined,
          })),
        },
      },
    });

    // Create Xendit Invoice
    try {
      let xenditPaymentMethods: string[] | undefined;
      try {
        if (paymentMethod) {
          const { PAYMENT_METHODS } = await import('@/lib/fees');
          const methodConfig = PAYMENT_METHODS.find(m => m.id === paymentMethod);
          if (methodConfig) {
            xenditPaymentMethods = methodConfig.xenditCodes;
          }
        }
      } catch {}
      const envUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const defaultUrl = 'https://family.thelodgegroup.id';
      const appUrl = /connect\.thelodgegroup\.id/.test(envUrl) || !envUrl ? defaultUrl : envUrl;
      const phoneDigits = String(guestPhone || '').replace(/\D/g, '');
      const externalId = `ROOM-${order.id}`;
      console.log(`[Room Service] Creating Xendit Invoice: ${externalId}`);
      
      const invoice = await Invoice.createInvoice({
        data: {
          externalId,
          amount: order.totalAmount,
          description: `Room Service - Kamar ${finalRoomNumber}`,
          invoiceDuration: 3600, // 1 hour
          currency: 'IDR',
          paymentMethods: xenditPaymentMethods,
          successRedirectUrl: `${appUrl}/room-service/track?phone=${encodeURIComponent(phoneDigits)}&last4=${encodeURIComponent(phoneDigits.slice(-4))}`,
          failureRedirectUrl: `${appUrl}/room-service/track?phone=${encodeURIComponent(phoneDigits)}&last4=${encodeURIComponent(phoneDigits.slice(-4))}`,
        },
      });

      console.log(`[Room Service] Invoice Created: ${invoice.id} for ${externalId}`);

      await prisma.foodOrder.update({
        where: { id: order.id },
        data: {
          paymentId: invoice.id,
          paymentUrl: invoice.invoiceUrl,
          paymentStatus: 'PENDING',
        },
      });

      return NextResponse.json({ ...order, paymentUrl: invoice.invoiceUrl });
    } catch (e: unknown) {
      console.error('Xendit Error (Room Service):', e);
      // If payment creation fails, delete the order to avoid orphan PENDING
      try {
        await prisma.foodOrderItem.deleteMany({ where: { orderId: order.id } });
        await prisma.foodOrder.delete({ where: { id: order.id } });
      } catch (delErr) {
        console.error('Cleanup Error (Room Service):', delErr);
      }
      return NextResponse.json({ error: 'Gagal membuat pembayaran' }, { status: 500 });
    }
  } catch (error) {
    const message = (error as Error)?.message || 'Gagal membuat pesanan';
    console.error('Room Service Order Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

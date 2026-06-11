import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Invoice } from '@/lib/xendit';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      restaurantId,
      foodItems,
      hkItems,
      roomNumber,
      roomSlug,
      guestName,
      guestPhone,
      deliveryNotes,
      paymentMethod
    } = body as {
      restaurantId?: string;
      foodItems?: Array<{ menuItemId: string; quantity: number; requestNote?: string }>;
      hkItems?: Array<{ itemId: string; quantity: number; requestNote?: string }>;
      roomNumber?: string;
      roomSlug?: string;
      guestName?: string;
      guestPhone?: string;
      deliveryNotes?: string;
      paymentMethod?: string;
    };

    const hasFood = Array.isArray(foodItems) && foodItems.length > 0;
    const hasHK = Array.isArray(hkItems) && hkItems.length > 0;
    if (!hasFood && !hasHK) {
      return NextResponse.json({ error: 'Tidak ada item untuk dipesan' }, { status: 400 });
    }
    if (!guestName || !(roomNumber || roomSlug)) {
      return NextResponse.json({ error: 'Data kamar/tamu wajib diisi' }, { status: 400 });
    }

    // Resolve room number by slug if provided
    let finalRoomNumber = roomNumber || '';
    if (roomSlug) {
      const [room] = await prisma.$queryRaw<Array<{ number: string; active: number | boolean }>>`SELECT number, active FROM RoomServiceRoom WHERE slug = ${roomSlug} LIMIT 1`;
      if (!room || (room.active !== 1 && room.active !== true)) {
        return NextResponse.json({ error: 'Kamar tidak valid atau tidak aktif' }, { status: 400 });
      }
      finalRoomNumber = room.number;
    }

    // Compute subtotals
    let foodSubtotal = 0;
    let hkSubtotal = 0;
    let menuMap: Map<string, { name: string; price: number; available: boolean; soldOut: boolean; stock: number | null; minOrderQty: number }> = new Map();
    let hkMap: Map<string, number> = new Map();

    // Prepare food price map
    if (hasFood) {
      if (!restaurantId) return NextResponse.json({ error: 'Restaurant ID wajib untuk pesanan makanan' }, { status: 400 });
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { allowOrders: true }
      });
      if (!restaurant) return NextResponse.json({ error: 'Restoran tidak ditemukan' }, { status: 404 });
      if (!restaurant.allowOrders) return NextResponse.json({ error: 'Pemesanan makanan sedang tidak tersedia' }, { status: 400 });
      const menuIds = foodItems!.map(i => i.menuItemId);
      const menuItems = await prisma.menuItem.findMany({
        where: { id: { in: menuIds }, restaurantId },
        select: { id: true, name: true, price: true, available: true, soldOut: true, stock: true, minOrderQty: true },
      });
      menuMap = new Map(menuItems.map(mi => [mi.id, { name: mi.name, price: mi.price, available: mi.available, soldOut: mi.soldOut, stock: mi.stock ?? null, minOrderQty: mi.minOrderQty ?? 1 }]));
      for (const it of foodItems!) {
        const meta = menuMap.get(it.menuItemId);
        if (!meta || !meta.available || meta.soldOut || !Number.isFinite(it.quantity) || it.quantity <= 0) {
          return NextResponse.json({ error: 'Item makanan tidak valid/tersedia' }, { status: 400 });
        }
        const minQty = Math.max(1, Number(meta.minOrderQty) || 1);
        if (it.quantity > 0 && it.quantity < minQty) {
          return NextResponse.json({ error: `Minimal order untuk ${meta.name} adalah ${minQty}` }, { status: 400 });
        }
        if (meta.stock !== null && it.quantity > (meta.stock ?? 0)) {
          return NextResponse.json({ error: 'Jumlah melebihi stok untuk salah satu item makanan' }, { status: 400 });
        }
        foodSubtotal += (meta.price || 0) * it.quantity;
      }
    }

    // Prepare HK price map
    if (hasHK) {
      const hkIds = hkItems!.map(i => i.itemId);
      const hkCatalog = await prisma.housekeepingItem.findMany({
        where: { id: { in: hkIds }, active: true, available: true },
        select: { id: true, price: true }
      });
      hkMap = new Map(hkCatalog.map(c => [c.id, c.price]));
      for (const it of hkItems!) {
        const price = hkMap.get(it.itemId);
        if (price === undefined || !Number.isFinite(it.quantity) || it.quantity <= 0) {
          return NextResponse.json({ error: 'Item housekeeping tidak valid/tersedia' }, { status: 400 });
        }
        hkSubtotal += price * it.quantity;
      }
    }

    const subtotal = foodSubtotal + hkSubtotal;
    let adminFee = 0;
    try {
      const { calculateFee } = await import('@/lib/fees');
      if (paymentMethod) adminFee = calculateFee(subtotal, paymentMethod);
    } catch {}

    // Create orders in transaction-ish sequence
    let foodOrderId: string | null = null;
    let hkOrderId: string | null = null;

    try {
      if (hasFood) {
        const order = await prisma.foodOrder.create({
          data: {
            userId: null,
            restaurantId: restaurantId!,
            status: 'PENDING',
            totalAmount: foodSubtotal, // store own subtotal; combined fee handled in invoice
            channel: 'ROOM_SERVICE',
            guestName,
            roomNumber: finalRoomNumber,
            guestPhone,
            deliveryNotes,
            items: {
              create: foodItems!.map((it) => ({
                menuItemId: it.menuItemId,
                quantity: it.quantity,
                price: (menuMap.get(it.menuItemId)?.price ?? 0),
                requestNote: it.requestNote?.slice(0, 200) || undefined
              }))
            }
          }
        });
        foodOrderId = order.id;
      }

      if (hasHK) {
        const hkOrder = await prisma.housekeepingOrder.create({
          data: {
            status: 'PENDING',
            paymentStatus: 'PENDING',
            totalAmount: hkSubtotal,
            guestName,
            roomNumber: finalRoomNumber,
            guestPhone,
            items: {
              create: hkItems!.map((it) => ({
                itemId: it.itemId,
                quantity: it.quantity,
                price: (hkMap.get(it.itemId) ?? 0),
                requestNote: it.requestNote?.slice(0,200) || undefined
              }))
            }
          }
        });
        hkOrderId = hkOrder.id;
      }

      // Create single invoice for combined amount
      const appUrl = 'https://family.thelodgegroup.id';
      const digits = String(guestPhone || '').replace(/\D/g, '');

      let xenditPaymentMethods: string[] | undefined;
      try {
        if (paymentMethod) {
          const { PAYMENT_METHODS } = await import('@/lib/fees');
          const methodConfig = PAYMENT_METHODS.find(m => m.id === paymentMethod);
          if (methodConfig) xenditPaymentMethods = methodConfig.xenditCodes;
        }
      } catch {}

      const invoice = await Invoice.createInvoice({
        data: {
          externalId: `RS-COMBO:${foodOrderId ?? 'NONE'}:${hkOrderId ?? 'NONE'}`,
          amount: subtotal + adminFee,
          description: `Room Service - Combined order (${finalRoomNumber})`,
          invoiceDuration: 3600,
          currency: 'IDR',
          paymentMethods: xenditPaymentMethods,
          successRedirectUrl: `${appUrl}/room-service/track?phone=${encodeURIComponent(digits)}&last4=${encodeURIComponent(digits.slice(-4))}`,
          failureRedirectUrl: `${appUrl}/room-service/track?phone=${encodeURIComponent(digits)}&last4=${encodeURIComponent(digits.slice(-4))}`,
        }
      });

      // Attach payment info to child orders
      if (foodOrderId) {
        await prisma.foodOrder.update({
          where: { id: foodOrderId },
          data: { paymentId: invoice.id, paymentUrl: invoice.invoiceUrl, paymentStatus: 'PENDING' }
        });
      }
      if (hkOrderId) {
        await prisma.housekeepingOrder.update({
          where: { id: hkOrderId },
          data: { paymentId: invoice.id, paymentUrl: invoice.invoiceUrl, paymentStatus: 'PENDING' }
        });
      }

      return NextResponse.json({ paymentUrl: invoice.invoiceUrl, foodOrderId, hkOrderId });
    } catch (e: any) {
      // Cleanup on error
      if (foodOrderId) {
        await prisma.foodOrderItem.deleteMany({ where: { orderId: foodOrderId } });
        await prisma.foodOrder.delete({ where: { id: foodOrderId } });
      }
      if (hkOrderId) {
        await prisma.housekeepingOrderItem.deleteMany({ where: { orderId: hkOrderId } });
        await prisma.housekeepingOrder.delete({ where: { id: hkOrderId } });
      }
      return NextResponse.json({ error: e.message || 'Gagal membuat pesanan gabungan' }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Gagal memproses pesanan gabungan' }, { status: 500 });
  }
}

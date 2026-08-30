import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Invoice } from '@/lib/xendit';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      restaurantId,
      items,
      tableNumber,
      tableSlug,
      guestName,
      guestPhone,
      paymentMethod
    } = body as {
      restaurantId?: string;
      items?: Array<{ menuItemId: string; quantity: number; requestNote?: string }>;
      tableNumber?: string;
      tableSlug?: string;
      guestName?: string;
      guestPhone?: string;
      paymentMethod?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Tidak ada item untuk dipesan' }, { status: 400 });
    }
    if (!guestName || !(tableNumber || tableSlug)) {
      return NextResponse.json({ error: 'Data meja/tamu wajib diisi' }, { status: 400 });
    }
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID wajib untuk pesanan makanan' }, { status: 400 });
    }

    // Resolve table number by slug if provided
    let finalTableNumber = tableNumber || '';
    if (tableSlug) {
      const table = await prisma.dineInTable.findUnique({
        where: { slug: tableSlug },
        select: { number: true, active: true }
      });
      if (!table || !table.active) {
        return NextResponse.json({ error: 'Meja tidak valid atau tidak aktif' }, { status: 400 });
      }
      finalTableNumber = table.number;
    }

    // Prepare food price map
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { allowOrders: true, allowDineIn: true, openingTime: true, closingTime: true }
    });
    if (!restaurant) return NextResponse.json({ error: 'Restoran tidak ditemukan' }, { status: 404 });

    // Validate operating hours
    if (restaurant.openingTime && restaurant.closingTime) {
      const [oh, om] = restaurant.openingTime.split(':').map(Number);
      const [ch, cm] = restaurant.closingTime.split(':').map(Number);
      const nowJakarta = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const nowMinutes = nowJakarta.getHours() * 60 + nowJakarta.getMinutes();
      const openMinutes = oh * 60 + om;
      const closeMinutes = ch * 60 + cm;
      if (nowMinutes < openMinutes || nowMinutes >= closeMinutes) {
        return NextResponse.json({ error: `Restoran sedang tutup. Jam operasional: ${restaurant.openingTime} - ${restaurant.closingTime}` }, { status: 400 });
      }
    }

    if (!restaurant.allowOrders) return NextResponse.json({ error: 'Pemesanan makanan sedang tidak tersedia' }, { status: 400 });
    if (restaurant.allowDineIn === false) return NextResponse.json({ error: 'Restoran ini tidak tersedia untuk layanan Dine In' }, { status: 400 });

    const menuIds = items.map(i => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuIds }, restaurantId },
      select: { id: true, name: true, price: true, available: true, soldOut: true, stock: true, minOrderQty: true },
    });
    const menuMap = new Map(menuItems.map(mi => [mi.id, { name: mi.name, price: mi.price, available: mi.available, soldOut: mi.soldOut, stock: mi.stock ?? null, minOrderQty: mi.minOrderQty ?? 1 }]));
    
    let subtotal = 0;
    for (const it of items) {
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
      subtotal += (meta.price || 0) * it.quantity;
    }

    let adminFee = 0;
    try {
      const { calculateFee } = await import('@/lib/fees');
      if (paymentMethod) adminFee = calculateFee(subtotal, paymentMethod);
    } catch {}

    let foodOrderId: string | null = null;

    try {
      const order = await prisma.foodOrder.create({
        data: {
          userId: null,
          restaurantId: restaurantId,
          status: 'PENDING',
          totalAmount: subtotal,
          channel: 'DINE_IN',
          guestName,
          tableNumber: finalTableNumber,
          guestPhone,
          items: {
            create: items.map((it) => ({
              menuItemId: it.menuItemId,
              quantity: it.quantity,
              price: (menuMap.get(it.menuItemId)?.price ?? 0),
              requestNote: it.requestNote?.slice(0, 200) || undefined
            }))
          }
        }
      });
      foodOrderId = order.id;

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
          externalId: `DINEIN:${foodOrderId}`,
          amount: subtotal + adminFee,
          description: `Dine In Order - Table ${finalTableNumber}`,
          invoiceDuration: 3600,
          currency: 'IDR',
          paymentMethods: xenditPaymentMethods,
          successRedirectUrl: `${appUrl}/dine-in/track?phone=${encodeURIComponent(digits)}&last4=${encodeURIComponent(digits.slice(-4))}`,
          failureRedirectUrl: `${appUrl}/dine-in/track?phone=${encodeURIComponent(digits)}&last4=${encodeURIComponent(digits.slice(-4))}`,
        }
      });

      await prisma.foodOrder.update({
        where: { id: foodOrderId },
        data: { paymentId: invoice.id, paymentUrl: invoice.invoiceUrl, paymentStatus: 'PENDING' }
      });

      return NextResponse.json({ paymentUrl: invoice.invoiceUrl, foodOrderId });
    } catch (e: any) {
      if (foodOrderId) {
        await prisma.foodOrderItem.deleteMany({ where: { orderId: foodOrderId } });
        await prisma.foodOrder.delete({ where: { id: foodOrderId } });
      }
      return NextResponse.json({ error: e.message || 'Gagal membuat pesanan Dine In' }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Gagal memproses pesanan Dine In' }, { status: 500 });
  }
}
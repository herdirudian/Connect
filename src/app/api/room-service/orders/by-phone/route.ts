import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone') || '';
    const last4 = searchParams.get('last4') || '';
    const digits = phone.replace(/\D/g, '');
    const l4 = last4.replace(/\D/g, '');
    if (!digits || digits.length < 6) {
      return NextResponse.json({ error: 'Masukkan nomor telepon lengkap' }, { status: 400 });
    }
    if (l4.length !== 4) {
      return NextResponse.json({ error: 'Masukkan 4 digit terakhir nomor telepon' }, { status: 400 });
    }

    const foodOrders = await prisma.foodOrder.findMany({
      where: {
        channel: 'ROOM_SERVICE',
        guestPhone: { contains: l4 }
      },
      include: {
        restaurant: true,
        items: { include: { menuItem: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const filteredFood = foodOrders.filter(o => {
      const stored = String(o.guestPhone || '').replace(/\D/g, '');
      return stored === digits && stored.slice(-4) === l4;
    });

    const mappedFood = filteredFood.map(o => ({
      type: 'FOOD',
      id: o.id,
      restaurant: o.restaurant?.name || '-',
      roomNumber: o.roomNumber,
      guestName: o.guestName,
      guestPhone: o.guestPhone ? `******${String(o.guestPhone).slice(-3)}` : null,
      deliveryNotes: o.deliveryNotes,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentUrl: o.paymentUrl,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      items: o.items.map(it => ({
        id: it.id,
        name: it.menuItem?.name || 'Item',
        quantity: it.quantity,
        price: it.price,
        requestNote: it.requestNote || null
      }))
    }));

    const hkOrders = await prisma.housekeepingOrder.findMany({
      where: {
        guestPhone: { contains: l4 }
      },
      include: {
        items: { include: { item: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const filteredHK = hkOrders.filter(o => {
      const stored = String(o.guestPhone || '').replace(/\D/g, '');
      return stored === digits && stored.slice(-4) === l4;
    });

    const mappedHK = filteredHK.map(o => ({
      type: 'HK',
      id: o.id,
      restaurant: 'Housekeeping',
      roomNumber: o.roomNumber,
      guestName: o.guestName,
      guestPhone: o.guestPhone ? `******${String(o.guestPhone).slice(-3)}` : null,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentUrl: o.paymentUrl,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      items: o.items.map(it => ({
        id: it.id,
        name: it.item?.name || 'Item',
        quantity: it.quantity,
        price: it.price,
        requestNote: it.requestNote || null
      }))
    }));

    return NextResponse.json([...mappedFood, ...mappedHK].sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime()));
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch orders' }, { status: 500 });
  }
}

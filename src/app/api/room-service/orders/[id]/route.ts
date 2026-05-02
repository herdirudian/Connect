import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone') || undefined;

    const order = await prisma.foodOrder.findUnique({
      where: { id },
      include: {
        restaurant: true,
        items: { include: { menuItem: true } }
      }
    });

    if (!order || order.channel !== 'ROOM_SERVICE') {
      return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
    }

    // Optional phone check (basic validation for privacy)
    if (phone) {
      const clean = String(phone).replace(/\D/g, '').slice(-3);
      const target = String(order.guestPhone || '').replace(/\D/g, '').slice(-3);
      if (target && clean && target !== clean) {
        return NextResponse.json({ error: 'Verifikasi nomor tidak cocok' }, { status: 403 });
      }
    }

    // Shape response
    return NextResponse.json({
      id: order.id,
      restaurant: order.restaurant?.name || '-',
      roomNumber: order.roomNumber,
      guestName: order.guestName,
      guestPhone: order.guestPhone ? `******${String(order.guestPhone).slice(-3)}` : null,
      deliveryNotes: order.deliveryNotes,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentUrl: order.paymentUrl,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map(it => ({
        id: it.id,
        name: it.menuItem?.name || 'Item',
        quantity: it.quantity,
        price: it.price,
        requestNote: it.requestNote || null
      }))
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch order' }, { status: 500 });
  }
}

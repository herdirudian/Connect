import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;

    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since');

    if (!since) {
      return NextResponse.json({ hasNew: false, count: 0, paidOrders: [] });
    }

    const sinceDate = new Date(since);

    // Fetch newly created or updated paid FoodOrders (Dine-In & Room Service)
    const paidFoodOrders = await prisma.foodOrder.findMany({
      where: {
        paymentStatus: 'PAID',
        updatedAt: { gt: sinceDate }
      },
      select: {
        id: true,
        guestName: true,
        tableNumber: true,
        roomNumber: true,
        totalAmount: true,
        updatedAt: true,
        restaurant: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 10
    });

    // Fetch newly created or updated paid HousekeepingOrders
    const paidHousekeepingOrders = await prisma.housekeepingOrder.findMany({
      where: {
        paymentStatus: 'PAID',
        updatedAt: { gt: sinceDate }
      },
      select: {
        id: true,
        guestName: true,
        roomNumber: true,
        totalAmount: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 10
    });

    // Fetch new bookings
    const newBookingsCount = await prisma.booking.count({
      where: {
        createdAt: { gt: sinceDate }
      }
    });

    // Format paid order details for staff notifications
    const formattedPaidOrders = [
      ...paidFoodOrders.map(order => {
        let orderTypeLabel = 'Food Order';
        if (order.tableNumber) {
          orderTypeLabel = `Dine-In (Meja ${order.tableNumber})`;
        } else if (order.roomNumber) {
          orderTypeLabel = `Room Service (Kamar ${order.roomNumber})`;
        }

        return {
          id: order.id,
          category: 'FOOD',
          typeLabel: orderTypeLabel,
          guestName: order.guestName || 'Tamu',
          tableNumber: order.tableNumber,
          roomNumber: order.roomNumber,
          amount: order.totalAmount,
          restaurantName: order.restaurant?.name || 'Restaurant',
          updatedAt: order.updatedAt
        };
      }),
      ...paidHousekeepingOrders.map(order => ({
        id: order.id,
        category: 'HOUSEKEEPING',
        typeLabel: `Housekeeping (Kamar ${order.roomNumber || '-'})`,
        guestName: order.guestName || 'Tamu',
        tableNumber: null,
        roomNumber: order.roomNumber,
        amount: order.totalAmount,
        restaurantName: 'Housekeeping',
        updatedAt: order.updatedAt
      }))
    ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const totalCount = newBookingsCount + formattedPaidOrders.length;

    return NextResponse.json({
      hasNew: totalCount > 0,
      count: totalCount,
      paidOrdersCount: formattedPaidOrders.length,
      latestPaidOrder: formattedPaidOrders[0] || null,
      paidOrders: formattedPaidOrders,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Notification check error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

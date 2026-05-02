
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return false;
  try {
    const payload = verifyToken(token) as any;
    return payload && payload.role === 'ADMIN';
  } catch (error) {
    return false;
  }
}

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'revenue', 'bookings', 'food'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter.lte = endOfDay;
    }

    const limit = dateFilter.gte || dateFilter.lte ? undefined : 50;

    let data;

    switch (type) {
      case 'bookings':
        data = await prisma.booking.findMany({
          where: { paymentStatus: 'PAID', ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }) },
          select: { id: true, createdAt: true, amount: true, type: true, details: true, user: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        break;
      case 'food':
        data = await prisma.foodOrder.findMany({
          where: { paymentStatus: 'PAID', ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }) },
          select: { id: true, createdAt: true, totalAmount: true, items: { include: { menuItem: true } }, user: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        break;
      case 'revenue':
      default:
        const bookings = await prisma.booking.findMany({
          where: { paymentStatus: 'PAID', ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }) },
          select: { id: true, createdAt: true, amount: true, type: true, details: true, user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        const foodOrders = await prisma.foodOrder.findMany({
            where: { paymentStatus: 'PAID', ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }) },
            select: { id: true, createdAt: true, totalAmount: true, items: { include: { menuItem: true } }, user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        const combined = [
            ...bookings.map(b => ({ ...b, source: b.type, amount: b.amount, user: b.user?.name || 'N/A' })),
            ...foodOrders.map(f => ({ ...f, source: 'FOOD', amount: f.totalAmount, user: f.user?.name || 'N/A' }))
        ];

        data = combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Analytics Details API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

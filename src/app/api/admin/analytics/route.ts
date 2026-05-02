
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
    const daysParam = searchParams.get('days') || '30';
    const days = parseInt(daysParam, 10);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // 1. Total Revenue (Bookings + Food Orders)
    const bookingRevenue = await prisma.booking.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        paymentStatus: 'PAID',
      },
    });

    const foodOrderRevenue = await prisma.foodOrder.aggregate({
        _sum: {
            totalAmount: true,
        },
        where: {
            paymentStatus: 'PAID',
        }
    });

    const totalRevenue = (bookingRevenue._sum.amount || 0) + (foodOrderRevenue._sum.totalAmount || 0);

    // 2. Total Counts
    const totalBookings = await prisma.booking.count({
      where: { paymentStatus: 'PAID' },
    });
    
    const totalFoodOrders = await prisma.foodOrder.count({
        where: { paymentStatus: 'PAID' },
    });

    // 3. Revenue and Bookings over time
    const bookingsOverTime = await prisma.booking.findMany({
      where: {
        paymentStatus: 'PAID',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        amount: true,
      },
    });

    const foodOrdersOverTime = await prisma.foodOrder.findMany({
        where: {
            paymentStatus: 'PAID',
            createdAt: {
                gte: startDate,
                lte: endDate,
            }
        },
        select: {
            createdAt: true,
            totalAmount: true,
        }
    });

    const dailyData: { [key: string]: { revenue: number; bookings: number, foodOrders: number } } = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      dailyData[dateString] = { revenue: 0, bookings: 0, foodOrders: 0 };
    }

    bookingsOverTime.forEach((b) => {
      const dateString = b.createdAt.toISOString().split('T')[0];
      if (dailyData[dateString]) {
        dailyData[dateString].revenue += b.amount;
        dailyData[dateString].bookings += 1;
      }
    });

    foodOrdersOverTime.forEach((fo) => {
        const dateString = fo.createdAt.toISOString().split('T')[0];
        if (dailyData[dateString]) {
            dailyData[dateString].revenue += fo.totalAmount;
            dailyData[dateString].foodOrders += 1;
        }
    });

    const revenueOverTime = Object.keys(dailyData).map((date) => ({
      date,
      revenue: dailyData[date].revenue,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const bookingsCountOverTime = Object.keys(dailyData).map((date) => ({
        date,
        count: dailyData[date].bookings,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const foodOrdersCountOverTime = Object.keys(dailyData).map((date) => ({
        date,
        count: dailyData[date].foodOrders,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    return NextResponse.json({
      totalRevenue,
      totalBookings,
      totalFoodOrders,
      revenueOverTime,
      bookingsCountOverTime,
      foodOrdersCountOverTime,
    });

  } catch (error: any) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

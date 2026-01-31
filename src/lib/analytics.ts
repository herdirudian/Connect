import { prisma } from '@/lib/prisma';
import { startOfMonth, subMonths, format, endOfMonth } from 'date-fns';

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export async function getMonthlyRevenue(monthsToLookBack: number = 6): Promise<MonthlyRevenue[]> {
  const endDate = new Date();
  const startDate = startOfMonth(subMonths(endDate, monthsToLookBack - 1));

  // 1. Fetch Bookings (Accommodations, Tickets, Wahana)
  const bookings = await prisma.booking.findMany({
    where: {
      paymentStatus: 'PAID',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amount: true,
      createdAt: true,
    },
  });

  // 2. Fetch Food Orders
  const foodOrders = await prisma.foodOrder.findMany({
    where: {
      paymentStatus: 'PAID', // Assuming PAID is the status for successful payment
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      totalAmount: true,
      createdAt: true,
    },
  });

  // 3. Aggregate by Month
  const monthlyData: Record<string, number> = {};

  // Initialize all months with 0
  for (let i = 0; i < monthsToLookBack; i++) {
    const d = subMonths(endDate, i);
    const monthKey = format(d, 'MMM yyyy'); // e.g. "Jan 2024"
    monthlyData[monthKey] = 0;
  }

  // Sum Bookings
  bookings.forEach((b) => {
    const monthKey = format(b.createdAt, 'MMM yyyy');
    if (monthlyData[monthKey] !== undefined) {
      monthlyData[monthKey] += b.amount;
    }
  });

  // Sum Food Orders
  foodOrders.forEach((o) => {
    const monthKey = format(o.createdAt, 'MMM yyyy');
    if (monthlyData[monthKey] !== undefined) {
      monthlyData[monthKey] += o.totalAmount;
    }
  });

  // Convert to array and reverse to show oldest first
  const result = Object.entries(monthlyData)
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => {
      // Sort chronologically. 
      // Since keys are formatted strings, we might need original dates for strict sorting, 
      // but if we iterate backwards from now, the keys are inserted in reverse order.
      // However, we initialized the map based on dates.
      // Let's rely on the order of keys if we constructed it carefully, or parse dates.
      // Better: Re-map based on the generated months loop.
      return 0; 
    });
    
  // Re-generate correct order
  const finalResult: MonthlyRevenue[] = [];
  for (let i = monthsToLookBack - 1; i >= 0; i--) {
    const d = subMonths(endDate, i);
    const monthKey = format(d, 'MMM yyyy');
    finalResult.push({
      month: monthKey,
      revenue: monthlyData[monthKey] || 0
    });
  }

  return finalResult;
}

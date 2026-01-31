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
        return NextResponse.json({ hasNew: false, count: 0 });
    }

    const sinceDate = new Date(since);

    const newBookings = await prisma.booking.count({
        where: {
            createdAt: {
                gt: sinceDate
            }
        }
    });

    const newFoodOrders = await prisma.foodOrder.count({
        where: {
            createdAt: {
                gt: sinceDate
            }
        }
    });
    
    const totalNew = newBookings + newFoodOrders;

    return NextResponse.json({ 
        hasNew: totalNew > 0, 
        count: totalNew,
        timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Notification check error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

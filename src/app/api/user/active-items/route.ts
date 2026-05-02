import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const payload = verifyToken(token) as any;

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId;

    // 1. Fetch Active Vouchers (Rewards)
    const vouchers = await prisma.userReward.findMany({
      where: {
        userId: userId,
        status: 'ACTIVE',
      },
      include: {
        reward: {
          select: {
            name: true,
            type: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Fetch Active/Upcoming Bookings (Attractions, Accommodation)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookings = await prisma.booking.findMany({
      where: {
        userId: userId,
        OR: [
          { status: 'CONFIRMED' },
          { status: 'PAID' }
        ],
        date: {
          gte: today
        }
      },
      orderBy: { date: 'asc' }
    });

    // Format for display
    const items = [
      ...vouchers.map(v => ({
        id: v.id,
        type: 'VOUCHER',
        name: v.reward.name,
        category: v.reward.type,
        date: null, // Vouchers might not have a specific date unless expiry
        status: v.status,
        details: null
      })),
      ...bookings.map(b => ({
        id: b.id,
        type: 'BOOKING',
        name: b.type === 'GLAMPING' ? 'Glamping Stay' : 
              b.type === 'ACCOMMODATION' ? 'Accommodation' : 
              'Ticket/Wahana', // We could parse details for better name
        category: b.type,
        date: b.date,
        status: b.status,
        details: b.details // Include details to parse name if needed
      }))
    ];

    // Refine Booking Names from details
    const refinedItems = items.map(item => {
      if (item.type === 'BOOKING' && item.details) {
        try {
          const details = JSON.parse(item.details as string);
          if (details.items && details.items.length > 0) {
            item.name = details.items.map((i: any) => i.name).join(', ');
          }
        } catch (e) {
          // keep default name
        }
      }
      return item;
    });

    return NextResponse.json(refinedItems);
  } catch (error) {
    console.error('Failed to fetch active items', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');

    const accommodations = await prisma.accommodation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        allotments: dateParam ? {
          where: { date: new Date(dateParam) }
        } : false
      }
    });

    if (dateParam) {
      const checkDate = new Date(dateParam);
      console.log('Checking availability for date:', checkDate.toISOString());

      // Fetch existing bookings for this date to calculate availability
      const existingBookings = await prisma.booking.findMany({
        where: {
          type: 'GLAMPING',
          date: checkDate,
          status: { not: 'CANCELLED' },
          paymentStatus: { not: 'EXPIRED' }
        }
      });

      const accommodationsWithAvailability = accommodations.map(acc => {
        // 1. Determine Total Quota
        // Note: allotments array will have 0 or 1 item due to the where clause
        // Use type assertion or check existence
        const allotments = (acc as any).allotments || [];
        const dailyQuota = allotments.length > 0 ? allotments[0].quota : acc.stock;
        
        console.log(`Acc: ${acc.name}, Stock: ${acc.stock}, DailyQuota: ${dailyQuota}, Allotments: ${allotments.length}`);

        // Determine Price (Daily Allotment Price takes precedence)
        let currentPrice = acc.price;
        
        if (allotments.length > 0 && allotments[0].price !== null) {
            currentPrice = allotments[0].price;
        }

        // 2. Calculate Used Stock
        let usedStock = 0;
        for (const b of existingBookings) {
          try {
            const bDetails = JSON.parse(b.details);
            if (bDetails.items) {
              const match = bDetails.items.find((i: any) => i.id === acc.id);
              if (match) {
                usedStock += (match.qty || 1);
              }
            }
          } catch (e) {
            // Ignore malformed details
          }
        }

        return {
          ...acc,
          price: currentPrice, // Override with daily price
          availability: Math.max(0, dailyQuota - usedStock)
        };
      });

      return NextResponse.json(accommodationsWithAvailability);
    }

    return NextResponse.json(accommodations);
  } catch (error) {
    console.error('Error fetching accommodations:', error);
    return NextResponse.json({ error: 'Failed to fetch accommodations' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token || '');
    
    if (!decoded || (decoded as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('Creating accommodation:', body);
    const { name, capacity, price, originalPrice, stock, description, rating, benefits, imageUrl, images, active, receptionEmail } = body;

    const accommodation = await prisma.accommodation.create({
      data: {
        name,
        capacity,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        stock: parseInt(stock) || 0,
        description,
        rating: parseFloat(rating),
        benefits: JSON.stringify(benefits || []),
        imageUrl,
        images: images || [],
        active: active ?? true,
        receptionEmail: receptionEmail || null,
      },
    });

    return NextResponse.json(accommodation);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create accommodation' }, { status: 500 });
  }
}

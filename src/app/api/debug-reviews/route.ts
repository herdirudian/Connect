import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const attractions = await prisma.attraction.findMany({
      select: { id: true, name: true }
    });

    const reviews = await prisma.review.findMany({
      include: {
        booking: true
      }
    });

    const debugData = {
        attractions,
        reviews: reviews.map(r => ({
            id: r.id,
            rating: r.rating,
            attractionId: r.attractionId,
            accommodationId: r.accommodationId,
            bookingId: r.bookingId,
            bookingType: r.booking?.type,
            bookingDetails: r.booking ? JSON.parse(r.booking.details) : null
        }))
    };

    return NextResponse.json(debugData);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

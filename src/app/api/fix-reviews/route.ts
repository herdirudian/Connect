import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reviews = await prisma.review.findMany({
      where: {
        AND: [
          { attractionId: null },
          { accommodationId: null },
          { bookingId: { not: null } }
        ]
      },
      include: {
        booking: true
      }
    });

    let updatedCount = 0;

    for (const review of reviews) {
      if (!review.booking) continue;

      try {
        const details = JSON.parse(review.booking.details);
        if (details.items && details.items.length > 0) {
          const itemId = details.items[0].id;
          
          if (review.booking.type === 'GLAMPING' || review.booking.type === 'ACCOMMODATION') {
             await prisma.review.update({
               where: { id: review.id },
               data: { accommodationId: itemId }
             });
             updatedCount++;
          } else {
             // Assume WAHANA/TICKET
             await prisma.review.update({
               where: { id: review.id },
               data: { attractionId: itemId }
             });
             updatedCount++;
          }
        }
      } catch (e) {
        console.error(`Failed to parse booking details for review ${review.id}`, e);
      }
    }

    return NextResponse.json({ 
      message: 'Reviews fixed successfully', 
      processed: reviews.length, 
      updated: updatedCount 
    });
  } catch (error) {
    console.error('Fix reviews error:', error);
    return NextResponse.json({ error: 'Failed to fix reviews' }, { status: 500 });
  }
}

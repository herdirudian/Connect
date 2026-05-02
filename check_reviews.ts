import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const attractions = await prisma.attraction.findMany({
      select: { id: true, name: true }
    });
    console.log('ATTRACTIONS:');
    console.log(JSON.stringify(attractions, null, 2));

    const reviews = await prisma.review.findMany({
      include: { booking: true }
    });
    
    const simplifiedReviews = reviews.map(r => ({
      id: r.id,
      attractionId: r.attractionId,
      bookingDetails: r.booking ? r.booking.details : 'NO_BOOKING'
    }));

    console.log('REVIEWS:');
    console.log(JSON.stringify(simplifiedReviews, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting data fix and rating recalculation...');

  // 1. Fix Orphan AND Mismatched Reviews
  console.log('Scanning for orphan or mismatched reviews...');
  const reviews = await prisma.review.findMany({
    where: {
      bookingId: { not: null }
    },
    include: { booking: true }
  });

  let fixedCount = 0;
  for (const review of reviews) {
    if (!review.booking) continue;
    try {
      const details = JSON.parse(review.booking.details);
      if (details.items && details.items.length > 0) {
        const itemId = details.items[0].id;
        const type = review.booking.type;
        
        let needsUpdate = false;
        let updateData = {};

        if (type === 'GLAMPING' || type === 'ACCOMMODATION') {
            // Should have accommodationId = itemId, and attractionId = null
            if (review.accommodationId !== itemId || review.attractionId !== null) {
                updateData = { accommodationId: itemId, attractionId: null, restaurantId: null };
                needsUpdate = true;
            }
        } else if (type === 'WAHANA' || type === 'TICKET' || type === 'EVENT') {
            // Should have attractionId = itemId, and accommodationId = null
            if (review.attractionId !== itemId || review.accommodationId !== null) {
                updateData = { attractionId: itemId, accommodationId: null, restaurantId: null };
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            console.log(`Fixing review ${review.id} (Type: ${type})`);
            await prisma.review.update({ where: { id: review.id }, data: updateData });
            fixedCount++;
        }
      }
    } catch (e) {
        console.error(`Error processing review ${review.id}:`, e.message);
    }
  }
  console.log(`Fixed ${fixedCount} reviews.`);

  // 2. Recalculate Ratings
  console.log('Recalculating ratings...');
  
  // Attractions
  const attractions = await prisma.attraction.findMany({ select: { id: true } });
  for (const attr of attractions) {
    const agg = await prisma.review.aggregate({ where: { attractionId: attr.id }, _avg: { rating: true } });
    if (agg._avg.rating) {
        await prisma.attraction.update({ where: { id: attr.id }, data: { rating: agg._avg.rating } });
    }
  }

  // Accommodations
  const accommodations = await prisma.accommodation.findMany({ select: { id: true } });
  for (const acc of accommodations) {
    const agg = await prisma.review.aggregate({ where: { accommodationId: acc.id }, _avg: { rating: true } });
    if (agg._avg.rating) {
        await prisma.accommodation.update({ where: { id: acc.id }, data: { rating: agg._avg.rating } });
    }
  }

  console.log('Done.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://root:@localhost:3306/familythelodge"
    }
  }
});

async function check() {
  const attractions = await prisma.attraction.findMany({
    select: { name: true, imageUrl: true }
  });
  const restaurants = await prisma.restaurant.findMany({
    select: { name: true, imageUrl: true }
  });
  console.log('--- Attractions ---');
  attractions.forEach(a => console.log(`${a.name}: ${a.imageUrl}`));
  console.log('\n--- Restaurants ---');
  restaurants.forEach(r => console.log(`${r.name}: ${r.imageUrl}`));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

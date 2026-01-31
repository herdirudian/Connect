const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const created = await prisma.accommodation.create({
      data: {
        name: 'Test Accommodation',
        capacity: '2',
        price: 100000,
        stock: 5,
        description: 'Test Description',
        rating: 4.5,
        active: true,
      },
    });
    console.log('Created:', created);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();

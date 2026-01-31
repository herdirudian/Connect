const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAvailability() {
  try {
    // 1. Fetch accommodations with allotments for today
    const dateParam = new Date().toISOString().split('T')[0]; // Today
    const checkDate = new Date(dateParam);
    
    console.log('Checking date:', dateParam);

    const accommodations = await prisma.accommodation.findMany({
      include: {
        allotments: {
          where: { date: checkDate }
        }
      }
    });

    const acc = accommodations.find(a => a.name === 'Test Accommodation');
    if (acc) {
        console.log('Found Test Accommodation:', acc);
        
        const allotments = acc.allotments || [];
        const dailyQuota = allotments.length > 0 ? allotments[0].quota : acc.stock;
        
        console.log('Stock:', acc.stock);
        console.log('Allotments:', allotments);
        console.log('Daily Quota:', dailyQuota);
        
        // Assume 0 used stock
        const usedStock = 0;
        const availability = Math.max(0, dailyQuota - usedStock);
        
        console.log('Availability:', availability);
    } else {
        console.log('Test Accommodation not found');
    }

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

testAvailability();

const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function seed() { 
  await prisma.passport.create({ 
    data: { 
      name: 'Wellness Passport', 
      description: 'Ikuti kelas wellness dan nikmati ketenangan alam untuk mendapatkan badge dan poin ekstra.', 
      imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=600&auto=format&fit=crop', 
      missions: { 
        create: [ 
          { name: 'Join Yoga 4x', targetCount: 4, pointsReward: 100 }, 
          { name: 'Forest Bathing', targetCount: 1, pointsReward: 50 }, 
          { name: 'Trekking 4x', targetCount: 4, pointsReward: 100 }, 
          { name: 'Meditation Session', targetCount: 1, pointsReward: 50 } 
        ] 
      } 
    } 
  }); 

  await prisma.passport.create({ 
    data: { 
      name: 'Adventure Passport', 
      description: 'Taklukkan semua wahana ekstrem kami dan dapatkan badge Petualang Sejati.', 
      imageUrl: 'https://images.unsplash.com/photo-1533561052604-c3beb6d55b8d?q=80&w=600&auto=format&fit=crop', 
      missions: { 
        create: [ 
          { name: 'Funicular', targetCount: 1, pointsReward: 20 }, 
          { name: 'Zip Bike', targetCount: 1, pointsReward: 30 }, 
          { name: 'Sky Tree', targetCount: 1, pointsReward: 30 }, 
          { name: 'Valley Swing', targetCount: 1, pointsReward: 50 } 
        ] 
      } 
    } 
  }); 

  await prisma.badge.create({ 
    data: { 
      name: 'Wellness Master', 
      description: 'Telah menyelesaikan semua misi di Wellness Passport', 
      condition: 'COMPLETE_WELLNESS_PASSPORT', 
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/5759/5759160.png' 
    }
  }); 

  await prisma.badge.create({ 
    data: { 
      name: 'Adventure King', 
      description: 'Telah menaklukkan semua misi di Adventure Passport', 
      condition: 'COMPLETE_ADVENTURE_PASSPORT', 
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/5759/5759146.png' 
    }
  }); 

  console.log('Seeded successfully!'); 
} 

seed().catch(e => console.error(e)).finally(() => prisma.$disconnect());

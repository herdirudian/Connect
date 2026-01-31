const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Seeding catalog data...');

    // Seed Attractions
    const attractions = [
      {
        name: 'Hot Air Balloon',
        description: 'Enjoy the view from above with our signature Hot Air Balloon experience.',
        price: 50000,
        benefits: JSON.stringify(['Safety equipment included', '5-minute ride', 'Photo opportunity']),
      },
      {
        name: 'Zip Bike',
        description: 'Ride a bike on a wire high above the ground. Thrilling and safe!',
        price: 35000,
        benefits: JSON.stringify(['Safety harness included', 'Guide instructor', 'Helmet provided']),
      },
      {
        name: 'Sky Tree',
        description: 'Dining on a tree platform with a breathtaking view of the pine forest.',
        price: 75000,
        benefits: JSON.stringify(['Private table', '1-hour session', 'Welcome drink']),
      },
    ];

    for (const item of attractions) {
      await prisma.attraction.create({ data: item });
    }
    console.log(`Seeded ${attractions.length} attractions.`);

    // Seed Restaurants
    const restaurants = [
      {
        name: 'Omah Bamboo Restaurant',
        type: 'Buffet & A la Carte',
        description: 'Traditional Sundanese cuisine in a bamboo architectural masterpiece.',
        status: 'Open',
      },
      {
        name: 'The Pines Café',
        type: 'Coffee & Snacks',
        description: 'Enjoy premium coffee and light bites surrounded by pine trees.',
        status: 'Open',
      },
      {
        name: 'Dapur Hawu',
        type: 'Traditional Kitchen',
        description: 'Experience authentic village-style cooking with wood-fired stoves.',
        status: 'Closed',
      },
    ];

    for (const item of restaurants) {
      await prisma.restaurant.create({ data: item });
    }
    console.log(`Seeded ${restaurants.length} restaurants.`);

    // Seed Accommodations
    const accommodations = [
      {
        name: 'Fun Camp',
        capacity: '2-3 Persons',
        price: 500000,
        description: 'Unique camping experience in pumpkin-shaped tents. Perfect for small families.',
        rating: 4.8,
        benefits: JSON.stringify(['Breakfast included', 'Shared bathroom', 'Bonfire access']),
      },
      {
        name: 'Village House',
        capacity: '4-6 Persons',
        price: 1200000,
        description: 'Traditional wooden houses with modern amenities. Great for larger groups.',
        rating: 4.9,
        benefits: JSON.stringify(['Private bathroom', 'Hot water', 'Breakfast for 4', 'TV']),
      },
      {
        name: 'Standard Camp',
        capacity: '2 Persons',
        price: 350000,
        description: 'Classic camping experience with comfortable bedding.',
        rating: 4.5,
        benefits: JSON.stringify(['Sleeping bag', 'Mat provided', 'Shared bathroom']),
      },
    ];

    for (const item of accommodations) {
      await prisma.accommodation.create({ data: item });
    }
    console.log(`Seeded ${accommodations.length} accommodations.`);

  } catch (e) {
    console.error('Error seeding data:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "mysql://root:@localhost:3306/familythelodge"
        }
    }
});

async function main() {
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Successfully connected to database!');
    
    const count = await prisma.user.count();
    console.log(`User count: ${count}`);
    
  } catch (e) {
    console.error('Database connection error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
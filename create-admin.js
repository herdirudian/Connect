const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@thelodge.com';
  const password = 'password123';
  const name = 'Super Admin';
  
  try {
    console.log('Creating admin user...');
    
    // Check if admin exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log('Admin user already exists.');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate a simple referral code for admin
    const referralCode = 'ADMIN001';

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN',
        tier: 'LODGE_GUARDIAN', // Highest tier
        referralCode,
        phoneNumber: '081234567890',
      },
    });

    console.log('Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    
  } catch (e) {
    console.error('Error creating admin:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
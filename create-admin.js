
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@thelodge.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.upsert({
      where: { email: email },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true,
      },
      create: {
        email: email,
        name: 'Super Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true,
        phoneNumber: '081234567890', // Dummy phone
        referralCode: 'ADMIN' + Math.floor(1000 + Math.random() * 9000),
      },
    });

    console.log(`\nSUCCESS!`);
    console.log(`Admin user '${email}' is ready.`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${user.role}`);
  } catch (e) {
    console.error('Error creating admin:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

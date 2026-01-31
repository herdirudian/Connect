import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

// Helper to check admin
async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return false;
  const payload = verifyToken(token) as any;
  if (!payload || payload.role !== 'ADMIN') return false;
  return true;
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Use raw queries to bypass Prisma Client generation issues
    const referrerPointsData: any[] = await prisma.$queryRaw`SELECT value FROM SystemSetting WHERE \`key\` = 'referral_points_referrer'`;
    const refereePointsData: any[] = await prisma.$queryRaw`SELECT value FROM SystemSetting WHERE \`key\` = 'referral_points_referee'`;

    const referrerPoints = referrerPointsData[0]?.value;
    const refereePoints = refereePointsData[0]?.value;

    return NextResponse.json({
      referrerPoints: parseInt(referrerPoints || '50'),
      refereePoints: parseInt(refereePoints || '20'),
    });
  } catch (error: any) {
    console.error('Error fetching referral settings:', error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { referrerPoints, refereePoints } = await req.json();

    // Use raw queries for upsert
    await prisma.$executeRaw`
      INSERT INTO SystemSetting (\`key\`, value, description, updatedAt, createdAt)
      VALUES ('referral_points_referrer', ${String(referrerPoints)}, 'Points awarded to the referrer', NOW(), NOW())
      ON DUPLICATE KEY UPDATE value = ${String(referrerPoints)}, updatedAt = NOW()
    `;

    await prisma.$executeRaw`
      INSERT INTO SystemSetting (\`key\`, value, description, updatedAt, createdAt)
      VALUES ('referral_points_referee', ${String(refereePoints)}, 'Points awarded to the new user', NOW(), NOW())
      ON DUPLICATE KEY UPDATE value = ${String(refereePoints)}, updatedAt = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving referral settings:', error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}

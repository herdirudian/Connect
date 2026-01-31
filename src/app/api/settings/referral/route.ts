import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Use raw queries to bypass potential Prisma Client generation issues
    // and ensuring we get the latest data
    const referrerPointsData: any[] = await prisma.$queryRaw`SELECT value FROM SystemSetting WHERE \`key\` = 'referral_points_referrer'`;
    const refereePointsData: any[] = await prisma.$queryRaw`SELECT value FROM SystemSetting WHERE \`key\` = 'referral_points_referee'`;

    const referrerPoints = referrerPointsData[0]?.value ? parseInt(referrerPointsData[0].value) : 50;
    const refereePoints = refereePointsData[0]?.value ? parseInt(refereePointsData[0].value) : 20;

    return NextResponse.json({
      referrerPoints,
      refereePoints
    });
  } catch (error: any) {
    console.error('Error fetching referral settings:', error);
    // Return defaults on error
    return NextResponse.json({
      referrerPoints: 50,
      refereePoints: 20
    });
  }
}

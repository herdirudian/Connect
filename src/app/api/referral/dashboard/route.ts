import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value || '';
  const payload = verifyToken(token) as any;
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true,
        points: true,
        createdAt: true,
        referrals: {
          select: { id: true, name: true, email: true, createdAt: true }
        }
      }
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const rows: Array<{ total: number }> = await prisma.$queryRaw`
      SELECT COALESCE(SUM(amount),0) AS total FROM Transaction WHERE userId = ${user.id} AND source = 'REFERRAL_BONUS'
    `;
    const bonusPoints = Number(rows[0]?.total || 0);
    return NextResponse.json({
      user,
      stats: {
        totalReferrals: user.referrals.length,
        bonusPoints
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load dashboard' }, { status: 500 });
  }
}

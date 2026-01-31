import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRewards = await prisma.userReward.findMany({
      where: { userId: decoded.userId },
      include: { reward: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(userRewards);
  } catch (error) {
    console.error('Fetch vouchers error:', error);
    return NextResponse.json({ error: 'Failed to fetch vouchers' }, { status: 500 });
  }
}

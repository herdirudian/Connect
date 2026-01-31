import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyToken(token) as any;
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const [activeTickets, availableRewards, transactionCount, recentTransactions] = await Promise.all([
      prisma.ticket.count({
        where: { 
          userId: payload.userId,
          status: 'ACTIVE'
        }
      }),
      prisma.reward.count({
        where: { active: true }
      }),
      prisma.transaction.count({
        where: { userId: payload.userId }
      }),
      prisma.transaction.findMany({
        where: { userId: payload.userId },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    return NextResponse.json({
      activeTickets,
      availableRewards,
      transactionCount,
      recentTransactions
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

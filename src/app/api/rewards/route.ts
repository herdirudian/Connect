import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    let userId = null;
    
    if (token) {
       const decoded = verifyToken(token) as any;
       userId = decoded?.userId;
    }

    const rewards = await prisma.reward.findMany({
      orderBy: { name: 'asc' },
    });

    let result = rewards;
    if (userId) {
       const claims = await prisma.transaction.findMany({
          where: {
             userId: userId,
             source: { startsWith: 'REWARD:' }
          },
          select: { source: true }
       });
       const claimedIds = new Set(claims.map(c => c.source?.split(':')[1]));
       result = rewards.map(r => ({
          ...r,
          claimed: claimedIds.has(r.id)
       }));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Fetch rewards error:', error);
    return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    
    let payload = null;
    if (token) {
        payload = verifyToken(token) as any;
    }

    if (!payload || payload.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, cost, type, imageUrl, active } = body;

    const reward = await prisma.reward.create({
      data: {
        name,
        description,
        cost: Number(cost),
        type,
        imageUrl,
        active: active ?? true,
      },
    });
    return NextResponse.json(reward);
  } catch (error) {
    console.error('Create reward error:', error);
    return NextResponse.json({ error: 'Failed to create reward' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    
    let userId = null;
    let isAdmin = false;
    if (token) {
      try {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = (decoded as any).id;
          isAdmin = (decoded as any).role === 'ADMIN';
        }
      } catch (e) {
        // ignore
      }
    }

    const badges = await prisma.badge.findMany({
      where: isAdmin ? undefined : { active: true }
    });

    let userBadges: any[] = [];
    if (userId) {
      userBadges = await prisma.userBadge.findMany({
        where: { userId }
      });
    }

    const badgesWithStatus = badges.map(badge => {
      const earned = userBadges.find(ub => ub.badgeId === badge.id);
      return {
        ...badge,
        isEarned: !!earned,
        earnedAt: earned ? earned.earnedAt : null
      };
    });

    return NextResponse.json(badgesWithStatus);
  } catch (error: any) {
    console.error('Error fetching badges:', error);
    return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const decoded = verifyToken(cookieStore.get('token')?.value || '');
    if (!decoded || (decoded as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const created = await prisma.badge.create({ data: {
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        condition: body.condition,
        active: body.active
    } });
    return NextResponse.json(created);
  } catch (e) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    
    let userId = null;
    if (token) {
      try {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = (decoded as any).id;
        }
      } catch (e) {
        // ignore
      }
    }

    const badges = await prisma.badge.findMany({
      where: { active: true }
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

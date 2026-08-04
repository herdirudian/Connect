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

    const passports = await prisma.passport.findMany({
      where: isAdmin ? undefined : { active: true },
      include: {
        missions: true
      }
    });

    // If user is logged in, fetch their progress
    let userMissions: any[] = [];
    if (userId) {
      userMissions = await prisma.userPassportMission.findMany({
        where: { userId }
      });
    }

    // Merge progress into missions
    const passportsWithProgress = passports.map(passport => {
      return {
        ...passport,
        missions: passport.missions.map(mission => {
          const progress = userMissions.find(um => um.missionId === mission.id);
          return {
            ...mission,
            currentCount: progress ? progress.currentCount : 0,
            isCompleted: progress ? progress.isCompleted : false
          };
        })
      };
    });

    return NextResponse.json(passportsWithProgress);
  } catch (error: any) {
    console.error('Error fetching passports:', error);
    return NextResponse.json({ error: 'Failed to fetch passports' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const decoded = verifyToken(cookieStore.get('token')?.value || '');
    if (!decoded || (decoded as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const created = await prisma.passport.create({ data: {
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        active: body.active
    } });
    return NextResponse.json(created);
  } catch (e) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}

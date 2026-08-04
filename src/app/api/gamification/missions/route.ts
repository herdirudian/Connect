import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const decoded = verifyToken(cookieStore.get('token')?.value || '');
    if (!decoded || (decoded as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const created = await prisma.passportMission.create({ data: {
        name: body.name,
        passportId: body.passportId,
        targetCount: parseInt(body.targetCount),
        pointsReward: parseInt(body.pointsReward)
    } });
    return NextResponse.json(created);
  } catch (e) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}
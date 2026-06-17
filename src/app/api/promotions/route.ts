import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const promotions = await prisma.promotion.findMany({
      where: { active: true },
      orderBy: { priority: 'desc' },
    });
    return NextResponse.json(promotions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token);
    if (!decoded || (decoded as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, imageUrl, linkUrl, active, priority } = body;

    const promotion = await prisma.promotion.create({
      data: {
        title,
        description,
        imageUrl,
        linkUrl,
        active: active !== undefined ? active : true,
        priority: priority ? parseInt(priority) : 0,
      },
    });

    return NextResponse.json(promotion);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 });
  }
}

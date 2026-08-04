import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const groups = await prisma.communityGroup.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { members: true }
        }
      }
    });
    return NextResponse.json(groups);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = verifyToken(token) as any;
  if (payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const data = await req.json();
    const group = await prisma.communityGroup.create({
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        color: data.color || 'bg-brand-50 text-brand',
        active: data.active ?? true
      }
    });
    return NextResponse.json(group);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const gallery = await prisma.communityGallery.findMany({
      orderBy: { createdAt: 'desc' },
      where: { active: true }
    });
    return NextResponse.json(gallery);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
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
    const item = await prisma.communityGallery.create({
      data: {
        title: data.title,
        imageUrl: data.imageUrl,
        active: data.active ?? true,
        likes: data.likes || 0
      }
    });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create gallery item' }, { status: 500 });
  }
}

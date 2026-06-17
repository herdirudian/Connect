import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.attraction.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token);
    if (!decoded || (decoded as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, price, originalPrice, points, benefits, imageUrl, videoUrl, status, waitTime, tags, active, rating } = body;
    const { id } = await params;

    console.log(`[Attractions API] Updating attraction ${id}:`, JSON.stringify(body));

    const updated = await prisma.attraction.update({
      where: { id },
      data: {
        name,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        originalPrice: originalPrice !== undefined ? (originalPrice ? parseFloat(originalPrice) : null) : undefined,
        points: points !== undefined ? parseInt(points) : undefined,
        rating: rating !== undefined ? parseFloat(rating) : undefined,
        benefits: benefits ? (typeof benefits === 'string' ? benefits : JSON.stringify(benefits)) : undefined,
        imageUrl,
        videoUrl,
        status,
        waitTime,
        tags,
        active,
      },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`[Attractions API] Error updating attraction:`, error);
    return NextResponse.json({ 
        error: 'Failed to update',
        message: error.message,
        stack: error.stack,
        prismaError: error.code
    }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token);
    if (!decoded || (decoded as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { id } = await params;
    await prisma.attraction.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}


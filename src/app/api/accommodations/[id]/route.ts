import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.accommodation.findUnique({ where: { id } });
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
    if (!decoded || (decoded as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, capacity, price, originalPrice, points, stock, description, rating, benefits, imageUrl, images, active, receptionEmail } = body;
    const { id } = await params;

    const updated = await prisma.accommodation.update({
      where: { id },
      data: {
        name,
        capacity: capacity !== undefined ? capacity : undefined,
        price: price !== undefined ? (parseFloat(price) || 0) : undefined,
        originalPrice: originalPrice !== undefined ? (originalPrice ? parseFloat(originalPrice) : null) : undefined,
        points: points !== undefined ? (parseInt(points) || 0) : undefined,
        stock: stock !== undefined ? (parseInt(stock) || 0) : undefined,
        description,
        rating: rating !== undefined ? (parseFloat(rating) || 0) : undefined,
        benefits: benefits ? JSON.stringify(benefits) : undefined,
        imageUrl,
        images: images !== undefined ? images : undefined,
        active,
        receptionEmail: receptionEmail !== undefined ? receptionEmail : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token);
    if (!decoded || (decoded as any).role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { id } = await params;
    await prisma.accommodation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}


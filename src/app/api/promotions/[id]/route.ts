import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token);
    if (!decoded || (decoded as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, description, imageUrl, linkUrl, active, priority } = body;

    const updated = await prisma.promotion.update({
      where: { id },
      data: {
        title,
        description,
        imageUrl,
        linkUrl,
        active,
        priority: priority ? parseInt(priority) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token);
    if (!decoded || (decoded as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.promotion.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 });
  }
}

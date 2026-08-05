import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const reward = await prisma.reward.findUnique({ where: { id } });
    if (!reward) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(reward);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch reward' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    
    let payload = null;
    if (token) {
        payload = verifyToken(token) as any;
    }

    if (!payload || payload.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, cost, type, imageUrl, active } = body;
    const { id } = await params;

    const updated = await prisma.reward.update({
      where: { id },
      data: {
        name,
        description,
        cost: cost !== undefined ? Number(cost) : undefined,
        type,
        imageUrl,
        active,
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'UPDATE_REWARD',
        entityType: 'Reward',
        entityId: id,
        details: JSON.stringify({ name, description, cost, type, active })
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update reward error:', error);
    return NextResponse.json({ error: 'Failed to update reward' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    
    let payload = null;
    if (token) {
        payload = verifyToken(token) as any;
    }

    if (!payload || payload.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    await prisma.reward.delete({ where: { id } });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'DELETE_REWARD',
        entityType: 'Reward',
        entityId: id,
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete reward error:', error);
    return NextResponse.json({ error: 'Failed to delete reward' }, { status: 500 });
  }
}


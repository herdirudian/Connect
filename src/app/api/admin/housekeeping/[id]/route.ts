import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getAuthUser } from '@/lib/serverAuth';

async function canEdit() {
  const auth = await getAuthUser();
  if (!auth) return false;
  if (auth.role === 'ADMIN') return true;
  return auth.permissions.includes(PERMISSIONS.MANAGE_HK_CATALOG) || auth.permissions.includes(PERMISSIONS.MANAGE_FOOD);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await canEdit())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const { name, category, price, available, active, stock } = body as any;
    const item = await prisma.housekeepingItem.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(available !== undefined ? { available: Boolean(available) } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        ...(stock !== undefined ? { stock: stock === null ? null : Number(stock) } : {}),
      }
    });
    return NextResponse.json(item);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await canEdit())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await prisma.housekeepingItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to delete item' }, { status: 500 });
  }
}

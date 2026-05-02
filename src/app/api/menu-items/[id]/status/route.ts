import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getAuthUser } from '@/lib/serverAuth';

async function canUpdateStatus() {
  const auth = await getAuthUser();
  if (!auth) return false;
  if (auth.role === 'ADMIN') return true;
  return auth.permissions.includes(PERMISSIONS.MANAGE_FOOD) || auth.permissions.includes(PERMISSIONS.PROCESS_RS_ORDERS);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await canUpdateStatus())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as { available?: boolean; soldOut?: boolean; stock?: number | string | null };
    const data: any = {};
    if (typeof body.available === 'boolean') data.available = body.available;
    if (typeof body.soldOut === 'boolean') data.soldOut = body.soldOut;
    if ('stock' in body) {
      const s = body.stock;
      if (s === '' || s === null) {
        data.stock = null;
      } else {
        const n = parseInt(String(s), 10);
        data.stock = Number.isFinite(n) ? n : null;
      }
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data
    });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

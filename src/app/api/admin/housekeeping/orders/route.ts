import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getAuthUser } from '@/lib/serverAuth';

export async function GET() {
  try {
    const auth = await getAuthUser();
    const allowed = !!auth && (
      auth.role === 'ADMIN' ||
      auth.permissions.includes(PERMISSIONS.VIEW_RS_ORDERS) ||
      auth.permissions.includes(PERMISSIONS.PROCESS_RS_ORDERS)
    );
    if (!allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orders = await prisma.housekeepingOrder.findMany({
      include: {
        items: { include: { item: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(orders);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch housekeeping orders' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await getAuthUser();
    const allowed = !!auth && (auth.role === 'ADMIN' || auth.permissions.includes(PERMISSIONS.PROCESS_RS_ORDERS));
    if (!allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, status } = body as { id: string; status: string };
    const order = await prisma.housekeepingOrder.update({
      where: { id },
      data: { status }
    });
    return NextResponse.json(order);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update order' }, { status: 500 });
  }
}

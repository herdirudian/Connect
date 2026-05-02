import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getAuthUser } from '@/lib/serverAuth';

function canViewCatalog(role: string, perms: string[]) {
  return role === 'ADMIN' || perms.includes(PERMISSIONS.MANAGE_HK_CATALOG) || perms.includes(PERMISSIONS.MANAGE_FOOD);
}

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth || !canViewCatalog(auth.role, auth.permissions)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const items = await prisma.housekeepingItem.findMany({
      orderBy: { category: 'asc' }
    });
    return NextResponse.json(items);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser();
    if (!auth || !canViewCatalog(auth.role, auth.permissions)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { name, category, price, available = true, active = true, stock = null } = body as any;
    if (!name || !category || !Number.isFinite(Number(price))) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }
    const item = await prisma.housekeepingItem.create({
      data: { name, category, price: Number(price), available: Boolean(available), active: Boolean(active), stock: stock === null ? null : Number(stock) }
    });
    return NextResponse.json(item);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create item' }, { status: 500 });
  }
}

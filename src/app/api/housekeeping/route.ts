import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const items = await prisma.housekeepingItem.findMany({
      where: { active: true, available: true },
      orderBy: { category: 'asc' }
    });
    return NextResponse.json(items);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch housekeeping items' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const [table] = await prisma.$queryRaw<any[]>`SELECT id, number, slug, active FROM DineInTable WHERE slug = ${slug} LIMIT 1`;
    if (!table || (table.active !== 1 && table.active !== true)) {
      return NextResponse.json({ error: 'Table not found or inactive' }, { status: 404 });
    }
    return NextResponse.json(table);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch table' }, { status: 500 });
  }
}
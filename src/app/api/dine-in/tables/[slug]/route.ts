import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const table = await prisma.dineInTable.findUnique({
      where: { slug },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            status: true,
            openingTime: true,
            closingTime: true,
            allowDineIn: true,
            allowOrders: true,
          }
        }
      }
    });

    if (!table || !table.active) {
      return NextResponse.json({ error: 'Table not found or inactive' }, { status: 404 });
    }

    return NextResponse.json(table);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch table' }, { status: 500 });
  }
}
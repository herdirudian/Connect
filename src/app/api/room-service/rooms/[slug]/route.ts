import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const [room] = await prisma.$queryRaw<any[]>`SELECT id, number, slug, active FROM RoomServiceRoom WHERE slug = ${slug} LIMIT 1`;
    if (!room || room.active !== 1 && room.active !== true) {
      return NextResponse.json({ error: 'Room not found or inactive' }, { status: 404 });
    }
    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 });
  }
}

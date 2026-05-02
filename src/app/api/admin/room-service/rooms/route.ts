import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rooms = await prisma.$queryRaw<any[]>`SELECT id, number, slug, active, createdAt, updatedAt FROM RoomServiceRoom ORDER BY number ASC`;
    return NextResponse.json(rooms);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { number } = await req.json() as { number: string };
    if (!number) {
      return NextResponse.json({ error: 'Nomor kamar wajib diisi' }, { status: 400 });
    }

    const slugBase = number.toString().trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const slug = `${slugBase}-${uniqueSuffix}`;

    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      'INSERT INTO RoomServiceRoom (id, number, slug, active, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
      id,
      number,
      slug,
      true
    );
    const [room] = await prisma.$queryRaw<any[]>`SELECT id, number, slug, active, createdAt, updatedAt FROM RoomServiceRoom WHERE id = ${id} LIMIT 1`;
    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create room', details: (error as any)?.message }, { status: 500 });
  }
}

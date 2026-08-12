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

    const tables = await prisma.$queryRaw<any[]>`SELECT id, number, slug, active, createdAt, updatedAt FROM DineInTable ORDER BY number ASC`;
    return NextResponse.json(tables);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
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
      return NextResponse.json({ error: 'Nomor meja wajib diisi' }, { status: 400 });
    }

    const slugBase = number.toString().trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const slug = `${slugBase}-${uniqueSuffix}`;

    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      'INSERT INTO DineInTable (id, number, slug, active, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
      id,
      number,
      slug,
      true
    );
    const [table] = await prisma.$queryRaw<any[]>`SELECT id, number, slug, active, createdAt, updatedAt FROM DineInTable WHERE id = ${id} LIMIT 1`;
    return NextResponse.json(table);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create table', details: (error as any)?.message }, { status: 500 });
  }
}
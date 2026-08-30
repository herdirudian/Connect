import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    const tables = await prisma.dineInTable.findMany({
      where: restaurantId ? { restaurantId } : {},
      orderBy: { number: 'asc' },
    });
    
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

    const { number, restaurantId } = await req.json() as { number: string; restaurantId?: string };
    if (!number) {
      return NextResponse.json({ error: 'Nomor meja wajib diisi' }, { status: 400 });
    }

    const slugBase = number.toString().trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const slug = `${slugBase}-${uniqueSuffix}`;

    const table = await prisma.dineInTable.create({
      data: {
        number,
        slug,
        restaurantId,
        active: true,
      }
    });

    return NextResponse.json(table);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create table', details: (error as any)?.message }, { status: 500 });
  }
}
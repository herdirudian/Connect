import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(restaurants);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token || '');
    
    if (!decoded || (decoded as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, type, description, status, imageUrl, menuUrl, active, allowReservations, allowOrders } = body;

    let restaurant;
    try {
      restaurant = await prisma.restaurant.create({
        data: {
          name,
          type,
          description,
          status,
          imageUrl,
          menuUrl,
          active: active ?? true,
          allowReservations: allowReservations ?? true,
          allowOrders: allowOrders ?? true,
        },
      });
    } catch (createError) {
      console.warn('Full create failed, retrying without new fields:', createError);
      restaurant = await prisma.restaurant.create({
        data: {
          name,
          type,
          description,
          status,
          imageUrl,
          menuUrl,
          active: active ?? true,
        },
      });
    }

    return NextResponse.json(restaurant);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create restaurant' }, { status: 500 });
  }
}

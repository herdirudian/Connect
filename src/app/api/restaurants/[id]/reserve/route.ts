import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if reservations are allowed
    const restaurant = await prisma.restaurant.findUnique({
        where: { id },
        select: { allowReservations: true }
    });

    if (!restaurant) {
        return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    if (!restaurant.allowReservations) {
        return NextResponse.json({ error: 'Reservations are currently disabled for this restaurant' }, { status: 400 });
    }

    const body = await req.json();
    const { date, time, pax, notes } = body;

    const reservation = await prisma.restaurantReservation.create({
      data: {
        userId: decoded.userId,
        restaurantId: id,
        date: new Date(date),
        time,
        pax: parseInt(pax),
        status: 'PENDING',
        notes
      }
    });

    return NextResponse.json(reservation);
  } catch (error) {
    console.error('Reservation Error:', error);
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
  }
}

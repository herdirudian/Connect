import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return false;
  const payload = verifyToken(token) as any;
  if (!payload || payload.role !== 'ADMIN') return false;
  return true;
}

export async function GET(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const paymentStatus = searchParams.get('paymentStatus');
    const type = searchParams.get('type');
    
    const where: any = {};
    if (paymentStatus && paymentStatus !== 'ALL') where.paymentStatus = paymentStatus;
    if (type && type !== 'ALL') where.type = type;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phoneNumber: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, status, paymentStatus } = await request.json();

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const data: any = {};
    if (status) data.status = status;
    if (paymentStatus) data.paymentStatus = paymentStatus;

    // If payment is marked as PAID manually, ensure status is CONFIRMED
    if (paymentStatus === 'PAID') {
        data.status = 'CONFIRMED';
    }
    
    // If cancelled
    if (status === 'CANCELLED') {
        data.paymentStatus = 'CANCELLED'; // Or EXPIRED/FAILED depending on logic, but CANCELLED is fine
    }

    const booking = await prisma.booking.update({
      where: { id },
      data
    });

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

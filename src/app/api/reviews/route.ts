import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accommodationId = searchParams.get('accommodationId');
  const restaurantId = searchParams.get('restaurantId');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!accommodationId && !restaurantId) {
    return NextResponse.json({ error: 'Target ID required' }, { status: 400 });
  }

  try {
    const reviews = await prisma.review.findMany({
      where: {
        OR: [
          { accommodationId: accommodationId || undefined },
          { restaurantId: restaurantId || undefined }
        ]
      },
      include: {
        user: {
          select: {
            name: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyToken(token) as any;
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { rating, comment, bookingId, foodOrderId, accommodationId, restaurantId } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }

    if (!bookingId && !foodOrderId) {
      return NextResponse.json({ error: 'Transaction reference required' }, { status: 400 });
    }

    // Verify transaction ownership and status
    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId }
      });

      if (!booking || booking.userId !== payload.userId) {
        return NextResponse.json({ error: 'Booking not found or unauthorized' }, { status: 403 });
      }

      if (booking.paymentStatus !== 'PAID') {
         return NextResponse.json({ error: 'Booking must be PAID to review' }, { status: 400 });
      }

      const existingReview = await prisma.review.findUnique({
        where: { bookingId }
      });
      if (existingReview) {
        return NextResponse.json({ error: 'Review already exists' }, { status: 409 });
      }
    }

    if (foodOrderId) {
      const order = await prisma.foodOrder.findUnique({
        where: { id: foodOrderId }
      });

      if (!order || order.userId !== payload.userId) {
        return NextResponse.json({ error: 'Order not found or unauthorized' }, { status: 403 });
      }

      if (order.status !== 'COMPLETED' && order.paymentStatus !== 'PAID') {
          return NextResponse.json({ error: 'Order must be COMPLETED or PAID' }, { status: 400 });
      }

      const existingReview = await prisma.review.findUnique({
        where: { foodOrderId }
      });
      if (existingReview) {
        return NextResponse.json({ error: 'Review already exists' }, { status: 409 });
      }
    }

    // Create Review
    const review = await prisma.review.create({
      data: {
        userId: payload.userId,
        rating,
        comment,
        bookingId,
        foodOrderId,
        accommodationId,
        restaurantId
      }
    });

    // Update Average Rating (Background-ish)
    if (accommodationId) {
      const agg = await prisma.review.aggregate({
        where: { accommodationId },
        _avg: { rating: true }
      });
      await prisma.accommodation.update({
        where: { id: accommodationId },
        data: { rating: agg._avg.rating || 0 }
      });
    }

    if (restaurantId) {
      const agg = await prisma.review.aggregate({
        where: { restaurantId },
        _avg: { rating: true }
      });
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { rating: agg._avg.rating || 0 }
      });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}

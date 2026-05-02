import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [userRewards, partnerPromoClaims, bookings] = await Promise.all([
      prisma.userReward.findMany({
        where: { userId: decoded.userId },
        include: { reward: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.partnerPromoClaim.findMany({
        where: { userId: decoded.userId },
        include: { promo: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.booking.findMany({
        where: { 
          userId: decoded.userId,
          paymentStatus: 'PAID'
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Map PartnerPromoClaims to match UserReward structure
    const promoRewards = partnerPromoClaims.map(claim => ({
      id: claim.id,
      userId: claim.userId,
      rewardId: claim.promoId,
      status: claim.status,
      createdAt: claim.createdAt,
      usedAt: claim.usedAt,
      reward: {
        id: claim.promoId,
        name: claim.promo.title,
        description: claim.promo.description,
        cost: 0,
        type: 'PARTNER_PROMO',
        imageUrl: claim.promo.imageUrl,
        active: claim.promo.active
      }
    }));

    // Map Bookings to match UserReward structure
    const bookingRewards = bookings.map(booking => {
        let title = `Booking ${booking.type}`;
        let description = `Date: ${booking.date.toLocaleDateString()}`;
        
        try {
            const details = JSON.parse(booking.details);
            if (details.items && Array.isArray(details.items)) {
                title = details.items.map((i: any) => i.name).join(', ');
                description = `${details.items.length} Items - ${booking.date.toLocaleDateString()}`;
            }
        } catch (e) {}

        let status = 'ACTIVE';
        if (booking.status === 'COMPLETED' || booking.status === 'USED') {
            status = 'USED';
        } else if (booking.status === 'CANCELLED') {
            status = 'CANCELLED';
        }

        return {
            id: booking.id,
            userId: booking.userId,
            rewardId: booking.id, // Use booking ID as fake reward ID
            status: status,
            createdAt: booking.createdAt,
            usedAt: booking.updatedAt, // Approximate
            reward: {
                id: booking.id,
                name: title,
                description: description,
                cost: booking.amount,
                type: 'BOOKING',
                imageUrl: null, // Could add a default booking icon
                active: true
            }
        };
    });

    // Combine and sort by createdAt desc
    const allVouchers = [...userRewards, ...promoRewards, ...bookingRewards].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(allVouchers);
  } catch (error) {
    console.error('Fetch vouchers error:', error);
    return NextResponse.json({ error: 'Failed to fetch vouchers' }, { status: 500 });
  }
}

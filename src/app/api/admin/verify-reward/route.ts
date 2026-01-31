import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });

    const searchId = code.trim();

    if (searchId.startsWith('PROMO:')) {
      const parts = searchId.split(':');
      if (parts.length === 3) {
        const promoId = parts[1];
        const userId = parts[2];

        const claim = await prisma.partnerPromoClaim.findFirst({
          where: { promoId, userId },
          include: { user: true, promo: true }
        });

        if (claim) {
          const tx = await prisma.transaction.findFirst({
             where: { userId: claim.userId, source: `PROMO_REDEEM:${claim.id}` }
          });
          const status = tx ? 'USED' : 'ACTIVE';
          
          return NextResponse.json({
            voucher: {
              id: claim.id,
              userId: claim.userId,
              rewardId: claim.promoId,
              status,
              createdAt: claim.createdAt,
              usedAt: tx?.createdAt || null,
              user: claim.user,
              reward: {
                id: claim.promo.id,
                name: claim.promo.title,
                description: claim.promo.description,
                cost: 0,
                type: 'PROMO',
                imageUrl: claim.promo.imageUrl,
                active: claim.promo.active
              },
              isPromo: true
            }
          });
        }
      }
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;
    // Ideally check for ADMIN role here
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const voucher = await prisma.userReward.findFirst({
      where: { 
        OR: [
          { id: searchId },
          { id: { startsWith: searchId } },
          { id: searchId.toLowerCase() },
          { id: { startsWith: searchId.toLowerCase() } }
        ]
      },
      include: { user: true, reward: true }
    });

    if (!voucher) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });

    return NextResponse.json({ voucher });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { code } = body;
    const searchId = code.trim();

    if (searchId.startsWith('PROMO:')) {
      const parts = searchId.split(':');
      if (parts.length === 3) {
        const promoId = parts[1];
        const userId = parts[2];

        const claim = await prisma.partnerPromoClaim.findFirst({
          where: { promoId, userId },
          include: { user: true, promo: true }
        });

        if (claim) {
          const tx = await prisma.transaction.findFirst({
             where: { userId: claim.userId, source: `PROMO_REDEEM:${claim.id}` }
          });
          
          if (tx) {
             return NextResponse.json({ error: 'Promo already redeemed' }, { status: 400 });
          }

          const newTx = await prisma.transaction.create({
            data: {
              userId: claim.userId,
              amount: 0,
              type: 'REDEEM',
              description: `Partner promo redeemed: ${claim.promo.title}`,
              source: `PROMO_REDEEM:${claim.id}`,
            },
          });

          return NextResponse.json({
            success: true,
            voucher: {
              id: claim.id,
              userId: claim.userId,
              rewardId: claim.promoId,
              status: 'USED',
              createdAt: claim.createdAt,
              usedAt: newTx.createdAt,
              user: claim.user,
              reward: {
                id: claim.promo.id,
                name: claim.promo.title,
                description: claim.promo.description,
                cost: 0,
                type: 'PROMO',
                imageUrl: claim.promo.imageUrl,
                active: claim.promo.active
              },
              isPromo: true
            }
          });
        }
      }
    }

    const voucher = await prisma.userReward.findFirst({
      where: { 
        OR: [
          { id: searchId },
          { id: { startsWith: searchId } },
          { id: searchId.toLowerCase() },
          { id: { startsWith: searchId.toLowerCase() } }
        ]
      }
    });

    if (!voucher) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    if (voucher.status === 'USED') return NextResponse.json({ error: 'Voucher already used' }, { status: 400 });

    const updated = await prisma.userReward.update({
      where: { id: voucher.id }, // Use the found voucher ID (full UUID)
      data: {
        status: 'USED',
        usedAt: new Date()
      },
      include: { user: true, reward: true }
    });

    return NextResponse.json({ success: true, voucher: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to redeem' }, { status: 500 });
  }
}

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

    let searchId = code.trim();

    // URL handling
    if (searchId.startsWith('http')) {
        try {
            const url = new URL(searchId);
            const codeParam = url.searchParams.get('code');
            if (codeParam) {
                searchId = codeParam.trim();
            }
        } catch (e) {
            // invalid url, ignore
        }
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;
    // Ideally check for ADMIN role here
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Check PartnerPromoClaim (By UniqueCode, ID, or PROMO:ID)
    let promoClaim = await prisma.partnerPromoClaim.findFirst({
      where: {
        OR: [
          { uniqueCode: searchId },
          { id: searchId },
          { id: searchId.replace(/^PROMO:/, '') }
        ]
      },
      include: { user: true, promo: true }
    });

    // 2. Legacy Check: PROMO:promoId:userId
    if (!promoClaim && searchId.startsWith('PROMO:') && searchId.split(':').length === 3) {
      const parts = searchId.split(':');
      const promoId = parts[1];
      const userId = parts[2];

      promoClaim = await prisma.partnerPromoClaim.findFirst({
        where: { promoId, userId },
        include: { user: true, promo: true }
      });
    }

    if (promoClaim) {
      const tx = await prisma.transaction.findFirst({
         where: { userId: promoClaim.userId, source: `PROMO_REDEEM:${promoClaim.id}` }
      });
      // Also check internal status
      const isUsed = tx || promoClaim.status === 'USED';
      const status = isUsed ? 'USED' : 'ACTIVE';
      
      return NextResponse.json({
        voucher: {
          id: promoClaim.id,
          userId: promoClaim.userId,
          rewardId: promoClaim.promoId,
          status,
          createdAt: promoClaim.createdAt,
          usedAt: promoClaim.usedAt || tx?.createdAt || null,
          user: promoClaim.user,
          reward: {
            id: promoClaim.promo.id,
            name: promoClaim.promo.title,
            description: promoClaim.promo.description,
            cost: 0,
            type: 'PROMO',
            imageUrl: promoClaim.promo.imageUrl,
            active: promoClaim.promo.active
          },
          isPromo: true
        }
      });
    }

    // 3. Check UserReward (Regular Vouchers)
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
    console.error('Verify Reward Error:', error);
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
    let searchId = code.trim();

    // URL handling
    if (searchId.startsWith('http')) {
        try {
            const url = new URL(searchId);
            const codeParam = url.searchParams.get('code');
            if (codeParam) {
                searchId = codeParam.trim();
            }
        } catch (e) {
            // invalid url, ignore
        }
    }

    // 1. Check PartnerPromoClaim (By UniqueCode, ID, or PROMO:ID)
    let promoClaim = await prisma.partnerPromoClaim.findFirst({
      where: {
        OR: [
          { uniqueCode: searchId },
          { id: searchId },
          { id: searchId.replace(/^PROMO:/, '') }
        ]
      },
      include: { user: true, promo: true }
    });

    // 2. Legacy Check: PROMO:promoId:userId
    if (!promoClaim && searchId.startsWith('PROMO:') && searchId.split(':').length === 3) {
      const parts = searchId.split(':');
      const promoId = parts[1];
      const userId = parts[2];

      promoClaim = await prisma.partnerPromoClaim.findFirst({
        where: { promoId, userId },
        include: { user: true, promo: true }
      });
    }

    if (promoClaim) {
        // Check if already redeemed
        const tx = await prisma.transaction.findFirst({
             where: { userId: promoClaim.userId, source: `PROMO_REDEEM:${promoClaim.id}` }
        });
          
        if (tx || promoClaim.status === 'USED') {
             return NextResponse.json({ error: 'Promo already redeemed' }, { status: 400 });
        }

        // Create Transaction Record
        const newTx = await prisma.transaction.create({
            data: {
              userId: promoClaim.userId,
              amount: 0,
              type: 'REDEEM',
              description: `Partner promo redeemed: ${promoClaim.promo.title}`,
              source: `PROMO_REDEEM:${promoClaim.id}`,
            },
        });

        // Update Promo Claim Status
        await prisma.partnerPromoClaim.update({
            where: { id: promoClaim.id },
            data: {
                status: 'USED',
                usedAt: new Date()
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                userId: decoded.userId,
                action: 'VERIFY_PARTNER_PROMO',
                entityType: 'PartnerPromoClaim',
                entityId: promoClaim.id,
            }
        });

        return NextResponse.json({
            success: true,
            voucher: {
              id: promoClaim.id,
              userId: promoClaim.userId,
              rewardId: promoClaim.promoId,
              status: 'USED',
              createdAt: promoClaim.createdAt,
              usedAt: newTx.createdAt,
              user: promoClaim.user,
              reward: {
                id: promoClaim.promo.id,
                name: promoClaim.promo.title,
                description: promoClaim.promo.description,
                cost: 0,
                type: 'PROMO',
                imageUrl: promoClaim.promo.imageUrl,
                active: promoClaim.promo.active
              },
              isPromo: true
            }
        });
    }

    // 3. Check UserReward (Regular Vouchers)
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
      where: { id: voucher.id }, 
      data: {
        status: 'USED',
        usedAt: new Date()
      },
      include: { user: true, reward: true }
    });

    // Audit Log
    await prisma.auditLog.create({
        data: {
            userId: decoded.userId,
            action: 'VERIFY_USER_REWARD',
            entityType: 'UserReward',
            entityId: voucher.id,
        }
    });

    return NextResponse.json({ success: true, voucher: updated });
  } catch (error) {
    console.error('Redeem Error:', error);
    return NextResponse.json({ error: 'Failed to redeem' }, { status: 500 });
  }
}

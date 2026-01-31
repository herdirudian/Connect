'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type TicketValidationResult = {
  success: boolean;
  message: string;
  type?: 'TICKET' | 'VOUCHER' | 'PROMO' | 'LIST';
  data?: any;
  ticket?: any;
  items?: any[];
};

export type RedemptionHistoryItem = {
  id: string;
  type: 'TICKET' | 'VOUCHER' | 'PROMO';
  title: string;
  description?: string;
  userName: string;
  usedAt: Date;
};

export async function getTicketDetails(id: string): Promise<TicketValidationResult> {
  if (!id) {
    return { success: false, message: 'ID is required' };
  }

  const searchId = id.trim();

  try {
    // 0. Handle JSON (User QR - Access Pass)
    try {
        if (searchId.startsWith('{') && searchId.endsWith('}')) {
            const parsed = JSON.parse(searchId);
            if (parsed.type === 'MEMBER' && parsed.id) {
                const userId = parsed.id;
                
                // Fetch all items
                const [tickets, vouchers, promoClaims] = await Promise.all([
                    prisma.ticket.findMany({
                        where: { userId, status: 'ACTIVE', validUntil: { gte: new Date() } },
                        include: { user: { select: { name: true, email: true, tier: true } } }
                    }),
                    prisma.userReward.findMany({
                        where: { userId, status: 'ACTIVE' },
                        include: { 
                            user: { select: { name: true, email: true, tier: true } },
                            reward: true
                        }
                    }),
                    prisma.partnerPromoClaim.findMany({
                        where: { userId },
                        include: {
                            user: { select: { name: true, email: true, tier: true } },
                            promo: true
                        }
                    })
                ]);

                // Process promo claims to check status
                const activePromos = [];
                for (const claim of promoClaims) {
                    const tx = await prisma.transaction.findFirst({
                        where: { userId: claim.userId, source: `PROMO_REDEEM:${claim.id}` }
                    });
                    if (!tx) {
                        activePromos.push({
                            id: claim.id,
                            type: 'PROMO',
                            status: 'ACTIVE',
                            user: claim.user,
                            reward: { name: claim.promo.title, description: claim.promo.description }, // Normalized for UI
                            promo: claim.promo
                        });
                    }
                }

                const allItems = [
                    ...tickets.map(t => ({ 
                        ...t, 
                        type: 'TICKET', 
                        reward: { name: t.title, description: t.description || 'Entry Ticket' } 
                    })),
                    ...vouchers.map(v => ({ ...v, type: 'VOUCHER' })),
                    ...activePromos
                ];

                if (allItems.length === 0) {
                     return { success: false, message: 'No active tickets or vouchers found for this user.' };
                }

                return {
                    success: true,
                    message: `Found ${allItems.length} active items`,
                    type: 'LIST',
                    items: allItems
                };
            }
        }
    } catch (e) {
        // Not JSON, ignore
    }

    // 0.5 Handle PROMO: prefix
    if (searchId.startsWith('PROMO:')) {
      const parts = searchId.split(':');
      
      // Case A: PROMO:claimId (New QR format)
      if (parts.length === 2) {
        const claimId = parts[1];
        const claim = await prisma.partnerPromoClaim.findUnique({
            where: { id: claimId },
            include: {
                user: { select: { name: true, email: true, tier: true } },
                promo: true
            }
        });

        if (claim) {
            return await formatPromoResult(claim);
        }
      }

      // Case B: PROMO:promoId:userId (Legacy QR format)
      if (parts.length === 3) {
        const promoId = parts[1];
        const userId = parts[2];

        const claim = await prisma.partnerPromoClaim.findFirst({
          where: { promoId, userId },
          include: {
            user: {
              select: {
                name: true,
                email: true,
                tier: true,
              },
            },
            promo: true,
          },
        });

        if (claim) {
          return await formatPromoResult(claim);
        }
      }
    }

    // 1. Try to find as Ticket
    const ticket = await prisma.ticket.findFirst({
      where: { 
        OR: [
          { id: searchId },
          { id: { startsWith: searchId } },
          { id: searchId.toLowerCase() },
          { id: { startsWith: searchId.toLowerCase() } }
        ]
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            tier: true
          }
        }
      }
    });

    if (ticket) {
      return { success: true, message: 'Ticket found', type: 'TICKET', ticket, data: ticket };
    }

    // 2. Try to find as Voucher (UserReward)
    const voucher = await prisma.userReward.findFirst({
      where: { 
        OR: [
          { id: searchId },
          { id: { startsWith: searchId } },
          { id: searchId.toLowerCase() },
          { id: { startsWith: searchId.toLowerCase() } }
        ]
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            tier: true
          }
        },
        reward: true
      }
    });

    if (voucher) {
      return { success: true, message: 'Voucher found', type: 'VOUCHER', data: voucher };
    }

    // 3. Try to find as PartnerPromoClaim (Manual entry support)
    const promoClaim = await prisma.partnerPromoClaim.findFirst({
        where: {
            OR: [
                { id: searchId },
                { id: { startsWith: searchId } },
                { id: searchId.toLowerCase() },
                { id: { startsWith: searchId.toLowerCase() } }
            ]
        },
        include: {
            user: { select: { name: true, email: true, tier: true } },
            promo: true
        }
    });

    if (promoClaim) {
        return await formatPromoResult(promoClaim);
    }

    return { success: false, message: 'Ticket, Voucher, or Partner Promo not found' };
  } catch (error) {
    console.error('Error fetching details:', error);
    return { success: false, message: 'Failed to fetch details' };
  }
}

async function formatPromoResult(claim: any): Promise<TicketValidationResult> {
    const tx = await prisma.transaction.findFirst({
        where: {
          userId: claim.userId,
          source: `PROMO_REDEEM:${claim.id}`,
        },
        orderBy: { createdAt: 'desc' },
    });

    const status = tx ? 'USED' : 'ACTIVE';
    const promoItem = {
        id: claim.id,
        status,
        usedAt: tx?.createdAt ?? null,
        user: claim.user,
        promo: claim.promo,
    };

    return {
        success: true,
        message: 'Partner promo claim found',
        type: 'PROMO',
        data: promoItem,
    };
}

export async function getRedemptionHistory(limit: number = 20, dateStr?: string): Promise<RedemptionHistoryItem[]> {
  const whereDate = dateStr ? {
    gte: new Date(`${dateStr}T00:00:00`),
    lt: new Date(`${dateStr}T23:59:59.999`)
  } : undefined;

  const [usedTickets, usedVouchers, promoTxs] = await Promise.all([
    prisma.ticket.findMany({
      where: { 
        status: 'USED', 
        usedAt: whereDate || { not: null } 
      },
      include: { user: { select: { name: true } } },
      orderBy: { usedAt: 'desc' },
      take: limit,
    }),
    prisma.userReward.findMany({
      where: { 
        status: 'USED', 
        usedAt: whereDate || { not: null } 
      },
      include: { user: { select: { name: true } }, reward: true },
      orderBy: { usedAt: 'desc' },
      take: limit,
    }),
    prisma.transaction.findMany({
      where: { 
        source: { startsWith: 'PROMO_REDEEM:' },
        createdAt: whereDate ? whereDate : undefined
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);

  const promoIds = promoTxs.map(tx => tx.source?.split(':')[1]).filter(Boolean) as string[];
  const promoClaims = promoIds.length
    ? await prisma.partnerPromoClaim.findMany({
        where: { id: { in: promoIds } },
        include: { promo: true, user: { select: { name: true } } },
      })
    : [];
  const claimMap = new Map(promoClaims.map(c => [c.id, c]));

  const items: RedemptionHistoryItem[] = [
    ...usedTickets.map(t => ({
      id: t.id,
      type: 'TICKET' as const,
      title: t.title,
      description: t.description || 'Ticket',
      userName: t.user?.name || 'Unknown',
      usedAt: t.usedAt as Date,
    })),
    ...usedVouchers.map(v => ({
      id: v.id,
      type: 'VOUCHER' as const,
      title: v.reward?.name || 'Voucher',
      description: v.reward?.description || '',
      userName: v.user?.name || 'Unknown',
      usedAt: v.usedAt as Date,
    })),
    ...promoTxs.map(tx => {
      const claimId = tx.source?.split(':')[1] || '';
      const claim = claimMap.get(claimId);
      return {
        id: claimId || tx.id,
        type: 'PROMO' as const,
        title: claim?.promo?.title || 'Partner Promo',
        description: claim?.promo?.description || '',
        userName: claim?.user?.name || 'Unknown',
        usedAt: tx.createdAt,
      };
    }),
  ];

  items.sort((a, b) => b.usedAt.getTime() - a.usedAt.getTime());
  return items.slice(0, limit);
}

export async function redeemTicket(id: string): Promise<TicketValidationResult> {
  try {
    // 1. Try Ticket
    const ticket = await prisma.ticket.findUnique({ where: { id } });


    if (ticket) {
      if (ticket.status !== 'ACTIVE') {
        return { success: false, message: `Ticket is already ${ticket.status}` };
      }
      if (new Date(ticket.validUntil) < new Date()) {
        return { success: false, message: 'Ticket has expired' };
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id },
        data: {
          status: 'USED',
          usedAt: new Date()
        },
        include: {
          user: { select: { name: true, email: true } }
        }
      });

      revalidatePath('/admin/validate');
      return { success: true, message: 'Ticket successfully redeemed', type: 'TICKET', ticket: updatedTicket, data: updatedTicket };
    }

    // 2. Try Voucher
    const voucher = await prisma.userReward.findUnique({ 
        where: { id },
        include: { reward: true } 
    });

    if (voucher) {
      if (voucher.status !== 'ACTIVE') {
        return { success: false, message: `Voucher is already ${voucher.status}` };
      }

      const updatedVoucher = await prisma.userReward.update({
        where: { id },
        data: {
          status: 'USED',
          usedAt: new Date()
        },
        include: {
          user: { select: { name: true, email: true } },
          reward: true
        }
      });
      
      revalidatePath('/admin/validate');
      return { success: true, message: 'Voucher successfully redeemed', type: 'VOUCHER', data: updatedVoucher };
    }

    // 3. Try Partner Promo Claim
    const promoClaim = await prisma.partnerPromoClaim.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            tier: true,
          },
        },
        promo: true,
      },
    });

    if (promoClaim) {
      const existingTx = await prisma.transaction.findFirst({
        where: {
          userId: promoClaim.userId,
          source: `PROMO_REDEEM:${promoClaim.id}`,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingTx) {
        return { success: false, message: 'Promo already redeemed' };
      }

      const tx = await prisma.transaction.create({
        data: {
          userId: promoClaim.userId,
          amount: 0,
          type: 'REDEEM',
          description: `Partner promo redeemed: ${promoClaim.promo.title}`,
          source: `PROMO_REDEEM:${promoClaim.id}`,
        },
      });

      const promoItem = {
        id: promoClaim.id,
        status: 'USED',
        usedAt: tx.createdAt,
        user: promoClaim.user,
        promo: promoClaim.promo,
      };

      revalidatePath('/admin/validate');
      return {
        success: true,
        message: 'Promo successfully redeemed',
        type: 'PROMO',
        data: promoItem,
      };
    }

    return { success: false, message: 'Item not found' };
  } catch (error) {
    console.error('Error redeeming:', error);
    return { success: false, message: 'Failed to redeem' };
  }
}

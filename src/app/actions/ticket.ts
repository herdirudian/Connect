'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type TicketValidationResult = {
  success: boolean;
  message: string;
  type?: 'TICKET' | 'VOUCHER' | 'PROMO' | 'LIST' | 'EVENT';
  data?: any;
  ticket?: any;
  items?: any[];
};

export type RedemptionHistoryItem = {
  id: string;
  type: 'TICKET' | 'VOUCHER' | 'PROMO' | 'EVENT';
  title: string;
  description?: string;
  userName: string;
  userEmail?: string;
  amount?: number;
  transactionId?: string;
  usedAt: Date;
  items?: Array<{ name: string; qty: number; price: number }>;
  pax?: number;
  originalSubtotal?: number;
  adminFee?: number;
  discount?: number;
  promoCode?: string;
};

export async function getTicketDetails(id: string): Promise<TicketValidationResult> {
  if (!id) {
    return { success: false, message: 'ID is required' };
  }

  let searchId = id.trim();

  // URL handling: If input is a URL, try to extract 'code' param
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

  try {
    // 0. Handle JSON (User QR - Access Pass)
    try {
        if (searchId.startsWith('{') && searchId.endsWith('}')) {
            const parsed = JSON.parse(searchId);
            if (parsed.type === 'MEMBER' && parsed.id) {
                const userId = parsed.id;
                
                // Fetch all items
                const [tickets, vouchers, promoClaims, bookings] = await Promise.all([
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
                    }),
                    prisma.booking.findMany({
                        where: { 
                            userId, 
                            paymentStatus: 'PAID',
                            status: { notIn: ['CANCELLED', 'COMPLETED', 'USED'] },
                            date: { gte: new Date(new Date().setHours(0,0,0,0)) } // Today or future
                        },
                        include: {
                            user: { select: { name: true, email: true, tier: true } }
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

                // Map bookings to list items
                const activeBookings = bookings.map(b => {
                    let title = `Booking ${b.type}`;
                    let description = `Date: ${b.date.toLocaleDateString()}`;
                    let pax = 0;
                    let items: Array<{ id: string; name: string; qty: number; price: number }> = [];
                    let ktpPromo: any = null;
                    try {
                        const details = JSON.parse(b.details);
                        if (details.items && Array.isArray(details.items)) {
                            title = details.items.map((i: any) => i.name).join(', ');
                            description = `${details.items.length} Items - ${b.date.toLocaleDateString()}`;
                            items = details.items.map((it: any) => ({
                              id: it.id,
                              name: it.name,
                              qty: it.qty || 1,
                              price: it.price || 0
                            }));
                            pax = items.reduce((s, it) => s + (it.qty || 1), 0);
                        }
                        if (details.ktpPromo) {
                          ktpPromo = details.ktpPromo;
                        }
                    } catch (e) {}

                    return {
                        id: b.id,
                        type: 'BOOKING',
                        status: 'ACTIVE',
                        validUntil: b.date,
                        user: b.user,
                        amount: b.amount,
                        pax,
                        items,
                        ktpPromo,
                        reward: { 
                            name: title, 
                            description: description 
                        }
                    };
                });

                const allItems = [
                    ...tickets.map(t => ({ 
                        ...t, 
                        type: 'TICKET', 
                        reward: { name: t.title, description: t.description || 'Entry Ticket' } 
                    })),
                    ...vouchers.map(v => ({ ...v, type: 'VOUCHER' })),
                    ...activePromos,
                    ...activeBookings
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
      // Normalize fields for UI details
      const normalized = {
        ...ticket,
        amount: 0,
        pax: 1,
        items: ticket ? [{ id: ticket.id, name: ticket.title, qty: 1, price: 0 }] : []
      };
      return { success: true, message: 'Ticket found', type: 'TICKET', ticket: normalized, data: normalized };
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
      const normalized = {
        ...voucher,
        amount: voucher.reward?.cost || 0,
        pax: 1,
        items: [{ id: voucher.id, name: voucher.reward?.name || 'Voucher', qty: 1, price: voucher.reward?.cost || 0 }]
      };
      return { success: true, message: 'Voucher found', type: 'VOUCHER', data: normalized };
    }

    // 2.5 Try to find as Booking (Attraction/Glamping)
    const booking = await prisma.booking.findFirst({
        where: {
            OR: [
                { id: searchId },
                { id: { startsWith: searchId } }
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

    if (booking) {
        // Map Booking to Ticket-like structure for UI
        let status = 'ACTIVE';
        if (booking.status === 'COMPLETED' || booking.status === 'USED') {
            status = 'USED';
        } else if (booking.status === 'CANCELLED') {
            status = 'CANCELLED';
        } else if (booking.paymentStatus !== 'PAID') {
             status = 'EXPIRED'; // Treat unpaid as invalid/expired for scanner
        }

        let title = `Booking ${booking.type}`;
        let description = `Date: ${booking.date.toLocaleDateString()}`;
        let detailsObj: any = null;
        try { detailsObj = JSON.parse(booking.details); } catch {}
        if (detailsObj?.items && Array.isArray(detailsObj.items)) {
          title = detailsObj.items.map((i: any) => i.name).join(', ');
          description = `${detailsObj.items.length} Items - ${booking.date.toLocaleDateString()}`;
        }

        // Compute pax and include items for UI
        let pax = 0;
        let items: Array<{ id: string; name: string; qty: number; price: number }> = [];
        if (detailsObj?.items && Array.isArray(detailsObj.items)) {
          items = detailsObj.items.map((it: any) => ({
            id: it.id,
            name: it.name,
            qty: it.qty || 1,
            price: it.price || 0
          }));
          pax = items.reduce((s, it) => s + (it.qty || 1), 0);
        }

        const mappedTicket = {
            id: booking.id,
            title: title,
            description: description,
            status: status, 
            validUntil: booking.date, 
            usedAt: booking.updatedAt, 
            user: booking.user,
            type: 'BOOKING',
            amount: booking.amount,
            pax,
            items,
            ktpPromo: detailsObj?.ktpPromo || null
        };

        // Only return success if it's PAID or valid
        if (booking.paymentStatus === 'PAID') {
             return { 
                success: true, 
                message: 'Booking found', 
                type: 'TICKET', 
                ticket: mappedTicket, 
                data: mappedTicket 
            };
        }
    }

    // 3. Try to find as PartnerPromoClaim (Manual entry support)
    const promoClaim = await prisma.partnerPromoClaim.findFirst({
        where: {
            OR: [
                { id: searchId },
                { uniqueCode: searchId },
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

    // 4. Try to find as Hari Anak Nasional Registration
    const childrensDay = await prisma.childrensDayRegistration.findFirst({
        where: {
            OR: [
                { id: searchId },
                { id: { startsWith: searchId } }
            ]
        }
    });

    if (childrensDay) {
        const mappedTicket = {
            id: childrensDay.id,
            title: 'Promo Hari Anak Nasional (Tiket Anak)',
            description: `Kunjungan: ${childrensDay.visitDate}`,
            status: childrensDay.isUsed ? 'USED' : 'ACTIVE',
            validUntil: new Date(childrensDay.visitDate + 'T23:59:59'),
            usedAt: childrensDay.usedAt,
            user: {
                name: childrensDay.parentName,
                email: childrensDay.parentEmail,
                tier: 'GUEST'
            },
            type: 'PROMO',
            amount: 0,
            pax: 1,
            items: [{ id: childrensDay.id, name: `Tiket Anak Gratis - ${childrensDay.childName} (${childrensDay.childAge} Thn)`, qty: 1, price: 0 }]
        };
        return { success: true, message: 'Promo Hari Anak found', type: 'PROMO', data: mappedTicket };
    }

    // 5. Try to find as Custom Event
    const customEvent = await prisma.customEvent.findFirst({
        where: {
            OR: [
                { id: searchId },
                { voucherCode: searchId },
                { id: { startsWith: searchId } },
                { id: searchId.toLowerCase() },
                { id: { startsWith: searchId.toLowerCase() } }
            ]
        },
        include: { group: true }
    });

    if (customEvent) {
        const eventName = customEvent.group?.name || customEvent.eventName || 'Event Voucher';
        const eventDate = customEvent.group?.eventDate || customEvent.eventDate;

        const mappedTicket = {
            id: customEvent.id,
            title: eventName,
            description: `Event Date: ${eventDate ? eventDate.toLocaleDateString() : 'N/A'}`,
            status: customEvent.status === 'USED' ? 'USED' : 'ACTIVE',
            validUntil: eventDate || new Date(),
            usedAt: customEvent.usedAt,
            user: {
                name: customEvent.participantName,
                email: customEvent.email,
                tier: 'EVENT_GUEST'
            },
            type: 'EVENT',
            amount: 0,
            pax: customEvent.pax,
            items: [{ id: customEvent.id, name: eventName, qty: customEvent.pax, price: 0 }]
        };
        return { success: true, message: 'Custom Event Voucher found', type: 'EVENT', data: mappedTicket };
    }

    return { success: false, message: 'Ticket, Voucher, or Promo not found' };
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

  const [usedTickets, usedVouchers, promoTxs, usedBookings, usedChildrensDay, usedCustomEvents] = await Promise.all([
    prisma.ticket.findMany({
      where: { 
        status: 'USED', 
        usedAt: whereDate || { not: null } 
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { usedAt: 'desc' },
      take: limit,
    }),
    prisma.userReward.findMany({
      where: { 
        status: 'USED', 
        usedAt: whereDate || { not: null } 
      },
      include: { user: { select: { name: true, email: true } }, reward: true },
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
    prisma.booking.findMany({
      where: { 
        status: { in: ['COMPLETED', 'USED'] },
        updatedAt: whereDate ? whereDate : undefined
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    }),
    prisma.childrensDayRegistration.findMany({
      where: {
        isUsed: true,
        usedAt: whereDate || { not: null }
      },
      orderBy: { usedAt: 'desc' },
      take: limit,
    }),
    prisma.customEvent.findMany({
      where: {
        status: 'USED',
        usedAt: whereDate || { not: null }
      },
      include: { group: true },
      orderBy: { usedAt: 'desc' },
      take: limit,
    })
  ]);

  const promoIds = promoTxs.map(tx => tx.source?.split(':')[1]).filter(Boolean) as string[];
  const promoClaims = promoIds.length
    ? await prisma.partnerPromoClaim.findMany({
        where: { id: { in: promoIds } },
        include: { promo: true, user: { select: { name: true, email: true } } },
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
      userEmail: t.user?.email || '',
      amount: 0,
      items: [{ name: t.title, qty: 1, price: 0 }],
      pax: 1,
      transactionId: t.id,
      usedAt: t.usedAt as Date,
    })),
    ...usedVouchers.map(v => ({
      id: v.id,
      type: 'VOUCHER' as const,
      title: v.reward?.name || 'Voucher',
      description: v.reward?.description || '',
      userName: v.user?.name || 'Unknown',
      userEmail: v.user?.email || '',
      amount: v.reward?.cost || 0,
      items: [{ name: v.reward?.name || 'Voucher', qty: 1, price: v.reward?.cost || 0 }],
      pax: 1,
      transactionId: v.id,
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
        userEmail: claim?.user?.email || '',
        amount: 0,
        transactionId: tx.id,
        usedAt: tx.createdAt,
      };
    }),
    ...usedBookings.map(b => {
        let title = `Booking ${b.type}`;
        let itemsArr: Array<{ name: string; qty: number; price: number }> = [];
        let pax = 0;
        let originalSubtotal = 0;
        let adminFee = 0;
        let discount = 0;
        let promoCode = '';
        try {
            const details = JSON.parse(b.details);
            if (details.items && Array.isArray(details.items)) {
                title = details.items.map((i: any) => i.name).join(', ');
                itemsArr = details.items.map((i: any) => ({
                  name: i.name,
                  qty: i.qty || 1,
                  price: i.price || 0
                }));
                pax = itemsArr.reduce((s, it) => s + (it.qty || 1), 0);
            }
            if (Number.isFinite(details.originalSubtotal)) originalSubtotal = details.originalSubtotal;
            if (Number.isFinite(details.adminFee)) adminFee = details.adminFee;
            if (details.promo && Number.isFinite(details.promo.discount)) discount = details.promo.discount;
            if (details.promo && typeof details.promo.code === 'string') promoCode = details.promo.code;
        } catch (e) {}

        return {
            id: b.id,
            type: 'TICKET' as const, // Display as Ticket in history
            title: title,
            description: `Public Booking - ${b.date.toLocaleDateString()}`,
            userName: b.user?.name || 'Guest',
            userEmail: b.user?.email || '',
            amount: b.amount,
            items: itemsArr,
            pax,
            originalSubtotal: originalSubtotal || undefined,
            adminFee: adminFee || undefined,
            discount: discount || undefined,
            promoCode: promoCode || undefined,
            transactionId: b.id,
            usedAt: b.updatedAt // Use updatedAt as redemption time for bookings
        };
    }),
    ...usedChildrensDay.map(c => ({
        id: c.id,
        type: 'PROMO' as const,
        title: 'Promo Hari Anak Nasional (Tiket Anak)',
        description: `Anak: ${c.childName} (${c.childAge} Thn)`,
        userName: c.parentName,
        userEmail: c.parentEmail,
        amount: 0,
        items: [{ name: 'Tiket Anak Gratis', qty: 1, price: 0 }],
        pax: 1,
        transactionId: c.id,
        usedAt: c.usedAt as Date,
    })),
    ...usedCustomEvents.map(ce => {
      const eventName = ce.group?.name || ce.eventName || 'Event Voucher';
      return {
        id: ce.id,
        type: 'EVENT' as const,
        title: eventName,
        description: `Custom Event - ${ce.participantName}`,
        userName: ce.participantName,
        userEmail: ce.email,
        amount: 0,
        items: [{ name: eventName, qty: ce.pax, price: 0 }],
        pax: ce.pax,
        transactionId: ce.id,
        usedAt: ce.usedAt as Date,
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

    // 2.5 Try Booking
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (booking) {
         if (booking.status === 'COMPLETED' || booking.status === 'USED') {
            return { success: false, message: `Booking is already ${booking.status}` };
         }
         if (booking.paymentStatus !== 'PAID') {
            return { success: false, message: 'Booking is not PAID' };
         }
         
         // Update status to COMPLETED
         await prisma.booking.update({
            where: { id },
            data: { status: 'COMPLETED' }
         });

         // Map for return
         let title = `Booking ${booking.type}`;
         try {
             const details = JSON.parse(booking.details);
             if (details.items && Array.isArray(details.items)) {
                 title = details.items.map((i: any) => i.name).join(', ');
             }
         } catch (e) {}
         
         const mappedData = {
            id: booking.id,
            title: title,
            status: 'USED',
            usedAt: new Date(),
            type: 'BOOKING'
         };

         revalidatePath('/admin/validate');
         return { success: true, message: 'Booking redeemed successfully', type: 'TICKET', data: mappedData };
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

    // 4. Try Hari Anak Nasional
    const childrensDay = await prisma.childrensDayRegistration.findUnique({
      where: { id }
    });

    if (childrensDay) {
      if (childrensDay.isUsed) {
        return { success: false, message: 'Voucher Hari Anak Nasional sudah pernah digunakan' };
      }

      const today = new Date();
      // Only check date if needed, but the requirements just say "reedem"
      // Optional: enforce date
      // const visitDate = new Date(childrensDay.visitDate + 'T00:00:00');
      // if (today.toDateString() !== visitDate.toDateString() && today > visitDate) ...

      const updated = await prisma.childrensDayRegistration.update({
        where: { id },
        data: {
          isUsed: true,
          usedAt: today
        }
      });

      const mappedData = {
        id: updated.id,
        title: 'Promo Hari Anak Nasional (Tiket Anak)',
        status: 'USED',
        usedAt: updated.usedAt,
        type: 'PROMO'
      };

      revalidatePath('/admin/validate');
      return { success: true, message: 'Voucher Hari Anak berhasil diredeem', type: 'PROMO', data: mappedData };
    }

    // 5. Try Custom Event
    const customEvent = await prisma.customEvent.findUnique({ where: { id } });
    if (customEvent) {
      if (customEvent.status !== 'ACTIVE') {
        return { success: false, message: `Voucher is already ${customEvent.status}` };
      }

      const updated = await prisma.customEvent.update({
        where: { id },
        data: {
          status: 'USED',
          usedAt: new Date()
        }
      });

      const mappedData = {
        id: updated.id,
        title: updated.eventName,
        status: 'USED',
        usedAt: updated.usedAt,
        type: 'EVENT'
      };

      revalidatePath('/admin/validate');
      return { success: true, message: 'Custom Event Voucher successfully redeemed', type: 'EVENT', data: mappedData };
    }

    return { success: false, message: 'Item not found' };
  } catch (error) {
    console.error('Error redeeming:', error);
    return { success: false, message: 'Failed to redeem' };
  }
}

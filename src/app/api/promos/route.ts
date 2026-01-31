import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawPromos = await prisma.$queryRaw<
      {
        id: string
        title: string
        description: string
        imageUrl: string | null
        validUntil: Date | null
        active: number
        claimable: number
        isPartner: number
        showButton: number
        createdAt: Date
      }[]
    >`SELECT id, title, description, imageUrl, validUntil, active, claimable, isPartner, showButton, createdAt FROM PartnerPromo WHERE active = 1 AND (validUntil IS NULL OR validUntil >= NOW()) ORDER BY createdAt DESC`

    const promos = rawPromos.map((p) => ({
      ...p,
      active: !!p.active,
      claimable: !!p.claimable,
      isPartner: p.isPartner !== 0,
      showButton: p.showButton !== 0,
    }))

    return NextResponse.json(promos);
  } catch (error) {
    console.error('Fetch promos error:', error);
    return NextResponse.json({ error: 'Failed to fetch promos' }, { status: 500 });
  }
}

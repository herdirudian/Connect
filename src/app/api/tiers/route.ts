
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Tier } from '@prisma/client';

const DEFAULTS = [
  { 
    tier: 'EXPLORER', 
    name: 'Explorer', 
    minPoints: 0, 
    icon: 'Star',
    color: 'bg-blue-500',
    benefits: [
      'Access to all booking features',
      'Basic reward redemption',
      'Member-only newsletters'
    ]
  },
  { 
    tier: 'NATURE_LOVER', 
    name: 'Nature Lover', 
    minPoints: 1000, 
    icon: 'Shield',
    color: 'bg-green-600',
    benefits: [
      'All Explorer benefits',
      '5% Discount on Glamping Stays',
      'Priority Booking Access',
      'Special Birthday Reward'
    ]
  },
  { 
    tier: 'LODGE_GUARDIAN', 
    name: 'Lodge Guardian', 
    minPoints: 5000, 
    icon: 'Crown',
    color: 'bg-amber-500',
    benefits: [
      'All Nature Lover benefits',
      '10% Discount on Glamping Stays',
      'Free Welcome Drink upon arrival',
      'Exclusive VIP Events Access',
      'Dedicated Support Line'
    ]
  }
];

export async function GET() {
  try {
    // Check if configs exist
    // @ts-ignore - TierConfig might not be in generated client yet due to EPERM
    const count = await prisma.tierConfig.count();

    if (count === 0) {
      // Seed defaults
      for (const def of DEFAULTS) {
        // @ts-ignore
        await prisma.tierConfig.create({
          data: {
            tier: def.tier as Tier,
            name: def.name,
            minPoints: def.minPoints,
            benefits: JSON.stringify(def.benefits),
            icon: def.icon,
            color: def.color
          }
        });
      }
    }

    // @ts-ignore
    const tiers = await prisma.tierConfig.findMany({
      orderBy: { minPoints: 'asc' }
    });

    // Parse benefits
    const formattedTiers = tiers.map((t: any) => ({
      ...t,
      benefits: JSON.parse(t.benefits)
    }));

    return NextResponse.json(formattedTiers);
  } catch (error) {
    console.error('Error fetching tiers:', error);
    return NextResponse.json({ error: 'Failed to fetch tiers' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, minPoints, benefits, icon, color } = body;

    // @ts-ignore
    const updated = await prisma.tierConfig.update({
      where: { id },
      data: {
        name,
        minPoints: parseInt(minPoints),
        benefits: JSON.stringify(benefits),
        icon,
        color
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating tier:', error);
    return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 });
  }
}

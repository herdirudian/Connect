import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const revalidate = 60; // Cache for 60 seconds

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');
    const attractions = await prisma.attraction.findMany({
      orderBy: { createdAt: 'desc' },
      include: dateParam ? { priceSchedules: true } : undefined,
    });
    if (dateParam) {
      const d = new Date(dateParam);
      const mapped = attractions.map(a => {
        const eff = (a as any).priceSchedules?.find((ps: any) => 
          new Date(ps.validFrom) <= d && new Date(ps.validUntil) >= d
        );
        return {
          id: a.id,
          name: a.name,
          description: a.description,
          price: eff ? eff.price : a.price,
          originalPrice: eff ? a.price : a.originalPrice,
          points: a.points,
          rating: a.rating,
          imageUrl: a.imageUrl,
          benefits: a.benefits,
          active: a.active,
        };
      });
      return NextResponse.json(mapped);
    } else {
      return NextResponse.json(attractions);
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch attractions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    
    let payload = null;
    if (token) {
        payload = verifyToken(token) as any;
    }
    
    // Check if user is Admin
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, price, originalPrice, points, benefits, imageUrl, active } = body;

    const attraction = await prisma.attraction.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        points: points ? parseInt(points) : 0,
        benefits: JSON.stringify(benefits || []),
        imageUrl: imageUrl || null,
        active: active !== undefined ? active : true,
      },
    });

    return NextResponse.json(attraction);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create attraction' }, { status: 500 });
  }
}

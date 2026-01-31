import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const attractions = await prisma.attraction.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(attractions);
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
    const { name, description, price, originalPrice, benefits, imageUrl, active } = body;

    const attraction = await prisma.attraction.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
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

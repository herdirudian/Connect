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
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ],
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
          category: a.category,
          price: eff ? eff.price : (a.isEvent && a.eventPromoPrice && a.eventPromoQuota && a.eventSoldQuota < a.eventPromoQuota ? a.eventPromoPrice : a.price),
          originalPrice: eff ? a.price : (a.isEvent && a.eventPromoPrice && a.eventPromoQuota && a.eventSoldQuota < a.eventPromoQuota ? a.price : a.originalPrice),
          points: a.points,
          rating: a.rating,
          imageUrl: a.imageUrl,
          benefits: a.benefits,
          active: a.active,
          isEvent: a.isEvent,
          eventDate: a.eventDate,
          eventMaxQuota: a.eventMaxQuota,
          eventSoldQuota: a.eventSoldQuota,
          eventPromoPrice: a.eventPromoPrice,
          eventPromoQuota: a.eventPromoQuota,
          normalPrice: a.price,
        };
      });
      return NextResponse.json(mapped);
    } else {
      return NextResponse.json(attractions);
    }
  } catch (error: any) {
    console.error('[Attractions API] Error fetching attractions:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch attractions',
      message: error.message,
      prismaError: error.code 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    console.log('[Attractions API] POST request received');
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    
    let payload = null;
    if (token) {
      try {
        payload = verifyToken(token) as any;
      } catch (e) {
        console.error('[Attractions API] Token verification failed:', e);
      }
    }
    
    // Check if user is Admin
    if (!payload || payload.role !== 'ADMIN') {
      console.warn('[Attractions API] Unauthorized access attempt', { payload });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('[Attractions API] Request body:', JSON.stringify(body));
    const { 
      name, 
      description, 
      category, 
      price, 
      originalPrice, 
      points, 
      benefits, 
      imageUrl, 
      videoUrl, 
      images, 
      status, 
      waitTime, 
      tags, 
      active, 
      rating,
      displayTarget,
      allowVoucherClaim,
      maxVoucherPax,
      voucherExpiry,
      isEvent,
      eventDate,
      eventMaxQuota,
      eventPromoPrice,
      eventPromoQuota,
      sortOrder
    } = body;

    console.log('[Attractions API] Creating attraction in database...');
    const attraction = await prisma.attraction.create({
      data: {
        name,
        description,
        category: category || 'RIDE',
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        points: points ? parseInt(points) : 0,
        rating: rating ? parseFloat(rating) : 0,
        benefits: typeof benefits === 'string' ? benefits : JSON.stringify(benefits || []),
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        images: images ? (typeof images === 'string' ? images : JSON.stringify(images)) : '[]',
        status: status || 'OPEN',
        waitTime: waitTime || null,
        tags: tags || null,
        active: active !== undefined ? active : true,
        displayTarget: displayTarget || 'BOTH',
        allowVoucherClaim: allowVoucherClaim !== undefined ? allowVoucherClaim : false,
        maxVoucherPax: maxVoucherPax ? parseInt(maxVoucherPax) : 10,
        voucherExpiry: voucherExpiry ? new Date(voucherExpiry) : null,
        isEvent: isEvent || false,
        eventDate: eventDate ? new Date(eventDate) : null,
        eventMaxQuota: eventMaxQuota ? parseInt(eventMaxQuota) : null,
        eventPromoPrice: eventPromoPrice ? parseFloat(eventPromoPrice) : null,
        eventPromoQuota: eventPromoQuota ? parseInt(eventPromoQuota) : null,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      }
    });

    console.log('[Attractions API] Attraction created successfully:', attraction.id);
    return NextResponse.json(attraction);
  } catch (error: any) {
    console.error('[Attractions API] Error creating attraction:', error);
    return NextResponse.json({ 
      error: 'Failed to create attraction',
      message: error.message,
      stack: error.stack,
      prismaError: error.code // Prisma error code if available
    }, { status: 500 });
  }
}

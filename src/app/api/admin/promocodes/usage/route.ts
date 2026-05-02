import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value || '';
  if (!token) return false;
  const payload = verifyToken(token) as any;
  if (!payload || payload.role !== 'ADMIN') return false;
  return true;
}

export async function GET(req: Request) {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Parameter code wajib diisi' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();
    const pattern = `"code":"${normalizedCode}"`;

    const bookings = await prisma.booking.findMany({
      where: {
        details: {
          contains: pattern,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });

    const usage = bookings.map((b) => {
      let details: any = {};
      try {
        details = JSON.parse(b.details);
      } catch (e) {
        details = {};
      }

      const items = details.items || [];
      const itemNames = items.map((i: any) => `${i.name} (x${i.qty || 1})`).join(', ');
      const discount = details.promo?.discount || 0;

      return {
        id: b.id,
        date: b.createdAt,
        type: b.type,
        amount: b.amount,
        status: b.status,
        paymentStatus: b.paymentStatus,
        userName: b.user?.name || '',
        userEmail: b.user?.email || '',
        items: itemNames,
        discount: discount,
      };
    });

    return NextResponse.json({
      code: normalizedCode,
      total: usage.length,
      bookings: usage,
    });
  } catch (error: any) {
    console.error('Error fetching promo usage:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch promo usage' },
      { status: 500 }
    );
  }
}


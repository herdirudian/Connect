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

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const promoCodes = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(promoCodes);
  } catch (error: any) {
    console.error('Error fetching promo codes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch promo codes' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const {
      code,
      description,
      discountType,
      value,
      maxDiscount,
      minAmount,
      applicableTo,
      validFrom,
      validUntil,
      active,
    } = body;

    if (!code || !discountType || !value) {
      return NextResponse.json(
        { error: 'Code, discountType, dan value wajib diisi' },
        { status: 400 }
      );
    }

    const promo = await prisma.promoCode.create({
      data: {
        code: String(code).trim().toUpperCase(),
        description: description || null,
        discountType,
        value: Number(value),
        maxDiscount: maxDiscount !== undefined && maxDiscount !== null ? Number(maxDiscount) : null,
        minAmount: minAmount !== undefined && minAmount !== null ? Number(minAmount) : null,
        applicableTo: applicableTo || 'ALL',
        active: typeof active === 'boolean' ? active : true,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });

    return NextResponse.json(promo);
  } catch (error: any) {
    console.error('Error creating promo code:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create promo code' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const {
      id,
      code,
      description,
      discountType,
      value,
      maxDiscount,
      minAmount,
      applicableTo,
      validFrom,
      validUntil,
      active,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });
    }

    const promo = await prisma.promoCode.update({
      where: { id },
      data: {
        code: code ? String(code).trim().toUpperCase() : undefined,
        description: description !== undefined ? description : undefined,
        discountType: discountType || undefined,
        value: value !== undefined ? Number(value) : undefined,
        maxDiscount:
          maxDiscount !== undefined
            ? maxDiscount === null
              ? null
              : Number(maxDiscount)
            : undefined,
        minAmount:
          minAmount !== undefined
            ? minAmount === null
              ? null
              : Number(minAmount)
            : undefined,
        applicableTo: applicableTo || undefined,
        validFrom:
          validFrom !== undefined
            ? validFrom
              ? new Date(validFrom)
              : null
            : undefined,
        validUntil:
          validUntil !== undefined
            ? validUntil
              ? new Date(validUntil)
              : null
            : undefined,
        active: typeof active === 'boolean' ? active : undefined,
      },
    });

    return NextResponse.json(promo);
  } catch (error: any) {
    console.error('Error updating promo code:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update promo code' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });
    }

    await prisma.promoCode.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting promo code:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete promo code' },
      { status: 500 }
    );
  }
}


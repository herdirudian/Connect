import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateFee } from '@/lib/fees';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, type, items, paymentMethod } = body as {
      code: string;
      type: string;
      items: { id: string; name: string; price: number; qty: number }[];
      paymentMethod: string;
    };

    if (!code || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { valid: false, error: 'Kode promo dan items wajib diisi' },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    const promo = await prisma.promoCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!promo || !promo.active) {
      return NextResponse.json(
        { valid: false, error: 'Kode promo tidak ditemukan atau tidak aktif' },
        { status: 404 }
      );
    }

    const now = new Date();
    if ((promo.validFrom && promo.validFrom > now) || (promo.validUntil && promo.validUntil < now)) {
      return NextResponse.json(
        { valid: false, error: 'Kode promo sudah tidak berlaku' },
        { status: 400 }
      );
    }

    if (promo.applicableTo !== 'ALL' && promo.applicableTo !== type) {
      return NextResponse.json(
        { valid: false, error: 'Kode promo tidak berlaku untuk jenis booking ini' },
        { status: 400 }
      );
    }

    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const adminFee = calculateFee(subtotal, paymentMethod);
    const baseAmount = subtotal + adminFee;

    if (promo.minAmount && baseAmount < promo.minAmount) {
      return NextResponse.json(
        { valid: false, error: `Minimal transaksi untuk kode ini adalah ${promo.minAmount}` },
        { status: 400 }
      );
    }

    let discount = 0;
    if (promo.discountType === 'PERCENT') {
      discount = (subtotal * promo.value) / 100;
    } else if (promo.discountType === 'FIXED') {
      discount = promo.value;
    }

    if (promo.maxDiscount && discount > promo.maxDiscount) {
      discount = promo.maxDiscount;
    }

    if (discount <= 0) {
      return NextResponse.json(
        { valid: false, error: 'Kode promo tidak menghasilkan potongan' },
        { status: 400 }
      );
    }

    const finalAmount = baseAmount - discount;

    return NextResponse.json({
      valid: true,
      code: promo.code,
      discount,
      baseAmount,
      finalAmount,
      description: promo.description || '',
    });
  } catch (error: any) {
    console.error('Promo validate error:', error);
    return NextResponse.json(
      { valid: false, error: 'Gagal memproses kode promo' },
      { status: 500 }
    );
  }
}


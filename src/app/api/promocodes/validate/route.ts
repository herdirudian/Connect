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

    // 1. Try to find in regular PromoCode
    let promo = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    // 2. If not found, try to find in VoucherClaim
    if (!promo) {
      const voucherClaim = await prisma.voucherClaim.findUnique({
        where: { voucherCode: code.toUpperCase() },
      });

      if (voucherClaim) {
        if (voucherClaim.isUsed) {
          return NextResponse.json({ error: 'Voucher sudah pernah digunakan' }, { status: 400 });
        }

        // Check validity (until 31 July 2026 as per user instruction)
        const expiryDate = new Date('2026-12-31T23:59:59');
        if (new Date() > expiryDate) {
          return NextResponse.json({ error: 'Voucher sudah kedaluwarsa' }, { status: 400 });
        }

        // Validate items in cart
        let discountAmount = 0;
        const validatedItems = [];
        let totalOriginalPrice = 0;

        for (const item of items) {
          const attraction = await prisma.attraction.findUnique({
            where: { id: item.id }
          });

          if (!attraction || !attraction.allowVoucherClaim) {
            // Item does not support voucher, skip discount for this item
            validatedItems.push({ ...item, discount: 0 });
            totalOriginalPrice += (attraction?.price || 0) * item.qty;
            continue;
          }

          // Check dynamic expiry from attraction settings
          const itemExpiry = attraction.voucherExpiry ? new Date(attraction.voucherExpiry) : new Date('2026-12-31T23:59:59');
          if (new Date() > itemExpiry) {
            return NextResponse.json({ error: `Voucher untuk ${attraction.name} sudah kedaluwarsa` }, { status: 400 });
          }

          if (item.qty > attraction.maxVoucherPax) {
             return NextResponse.json({ 
               error: `Maksimal ${attraction.maxVoucherPax} pax untuk tiket ${attraction.name} per voucher` 
             }, { status: 400 });
          }

          const itemTotal = attraction.price * item.qty;
          const itemDiscount = itemTotal * 0.20; // 20% discount
          
          discountAmount += itemDiscount;
          totalOriginalPrice += itemTotal;
          validatedItems.push({ ...item, discount: itemDiscount });
        }

        if (discountAmount === 0) {
          return NextResponse.json({ error: 'Voucher tidak berlaku untuk tiket yang dipilih' }, { status: 400 });
        }

        return NextResponse.json({
          valid: true,
          code: code.toUpperCase(),
          type: 'PERCENTAGE',
          value: 20,
          discount: discountAmount,
          isVoucherClaim: true // Flag to identify it's from VoucherClaim table
        });
      }
    }

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


import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch all voucher claims
export async function GET() {
  try {
    const vouchers = await prisma.voucherClaim.findMany({
      orderBy: { claimedAt: 'desc' },
    });
    return NextResponse.json(vouchers);
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    return NextResponse.json({ error: 'Gagal mengambil data voucher' }, { status: 500 });
  }
}

// POST: Redeem a voucher
export async function POST(req: Request) {
  try {
    const { voucherCode } = await req.json();

    if (!voucherCode) {
      return NextResponse.json({ error: 'Kode voucher wajib diisi' }, { status: 400 });
    }

    const voucher = await prisma.voucherClaim.findUnique({
      where: { voucherCode },
    });

    if (!voucher) {
      return NextResponse.json({ error: 'Voucher tidak ditemukan' }, { status: 404 });
    }

    if (voucher.isUsed) {
      return NextResponse.json({ error: 'Voucher sudah pernah digunakan' }, { status: 400 });
    }

    const updatedVoucher = await prisma.voucherClaim.update({
      where: { voucherCode },
      data: { isUsed: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Voucher berhasil di-redeem',
      voucher: updatedVoucher
    });
  } catch (error) {
    console.error('Error redeeming voucher:', error);
    return NextResponse.json({ error: 'Gagal memproses redeem voucher' }, { status: 500 });
  }
}

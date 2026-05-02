
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return false;
  try {
    const payload = verifyToken(token) as any;
    return payload && payload.role === 'ADMIN';
  } catch (error) {
    return false;
  }
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        paymentStatus: 'PAID',
        details: {
          contains: '"ktpPromo"',
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phoneNumber: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // CSV Header
    const headers = [
      'Booking ID',
      'Tanggal Transaksi',
      'Nama Pembeli',
      'Email',
      'No HP',
      'Provinsi (KTP)',
      'Kota/Kabupaten (KTP)',
      'Kecamatan (KTP)',
      'Tanggal Kunjungan',
      'Total Bayar'
    ].join(',');

    // CSV Rows
    const rows = bookings.map((b) => {
      let ktp = { province: '-', regency: '-', district: '-', visitDate: '-' };
      try {
        const details = JSON.parse(b.details);
        if (details.ktpPromo) {
          ktp = {
            province: details.ktpPromo.province || '-',
            regency: details.ktpPromo.regency || '-',
            district: details.ktpPromo.district || '-',
            visitDate: details.ktpPromo.visitDate || '-',
          };
        }
      } catch (e) {}

      return [
        b.id,
        new Date(b.createdAt).toLocaleString('id-ID'),
        `"${(b.user?.name || '-').replace(/"/g, '""')}"`,
        b.user?.email || '-',
        `'${b.user?.phoneNumber || '-'}`, // Prefix with ' to prevent Excel from scientific notation
        `"${ktp.province.replace(/"/g, '""')}"`,
        `"${ktp.regency.replace(/"/g, '""')}"`,
        `"${ktp.district.replace(/"/g, '""')}"`,
        ktp.visitDate,
        b.amount
      ].join(',');
    });

    const csvContent = [headers, ...rows].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="ktp-promo-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error: any) {
    console.error('KTP Export API Error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

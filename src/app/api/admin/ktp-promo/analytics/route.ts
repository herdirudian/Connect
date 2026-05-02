
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

export async function GET(req: Request) {
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
      select: {
        details: true,
        amount: true,
        createdAt: true,
      },
    });

    const provinceStats: Record<string, { count: number; revenue: number }> = {};
    const regencyStats: Record<string, { count: number; revenue: number }> = {};
    const districtStats: Record<string, { count: number; revenue: number; regency: string; province: string }> = {};
    const dailyStats: Record<string, { count: number; revenue: number }> = {};

    bookings.forEach((b) => {
      try {
        const details = JSON.parse(b.details);
        const ktp = details.ktpPromo;
        if (!ktp) return;

        const prov = ktp.province || 'Unknown';
        const reg = ktp.regency || 'Unknown';
        const dist = ktp.district || 'Unknown';
        const date = b.createdAt.toISOString().split('T')[0];

        // Province
        if (!provinceStats[prov]) provinceStats[prov] = { count: 0, revenue: 0 };
        provinceStats[prov].count += 1;
        provinceStats[prov].revenue += b.amount;

        // Regency
        if (!regencyStats[reg]) regencyStats[reg] = { count: 0, revenue: 0 };
        regencyStats[reg].count += 1;
        regencyStats[reg].revenue += b.amount;

        // District
        if (!districtStats[dist]) districtStats[dist] = { count: 0, revenue: 0, regency: reg, province: prov };
        districtStats[dist].count += 1;
        districtStats[dist].revenue += b.amount;

        // Daily
        if (!dailyStats[date]) dailyStats[date] = { count: 0, revenue: 0 };
        dailyStats[date].count += 1;
        dailyStats[date].revenue += b.amount;
      } catch (e) {}
    });

    const provinces = Object.entries(provinceStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.count - a.count);

    const regencies = Object.entries(regencyStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.count - a.count);

    const districts = Object.entries(districtStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.count - a.count);

    const daily = Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      total: bookings.length,
      totalRevenue: bookings.reduce((sum, b) => sum + b.amount, 0),
      provinces,
      regencies,
      districts,
      daily,
    });
  } catch (error: any) {
    console.error('KTP Analytics API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

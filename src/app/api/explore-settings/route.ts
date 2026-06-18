import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const DEFAULT_COMPARISON = [
  { name: 'Tiket Masuk Kawasan', bas: true, reg: true, ter: true },
  { name: 'Free Welcome Drink', bas: false, reg: true, ter: true },
  { name: 'Funicular (In & Out)', bas: false, reg: true, ter: true },
  { name: 'Akses Wahana Sky Hammock', bas: false, reg: false, ter: true },
  { name: 'Akses Wahana Zip Bike', bas: false, reg: false, ter: true },
  { name: 'Akses Wahana Valley Swing', bas: false, reg: false, ter: true },
  { name: 'Akses Wahana Hot Air Balloon', bas: false, reg: false, ter: true },
  { name: 'Meal Voucher (10k/50k)', bas: false, reg: false, ter: true },
  { name: 'Free 1 Soft File Photo', bas: false, reg: false, ter: true },
];

export async function GET() {
  try {
    let settings = await prisma.exploreSettings.findUnique({
      where: { id: 'singleton' }
    });

    if (!settings) {
      settings = await prisma.exploreSettings.create({
        data: {
          id: 'singleton',
          comparisonData: JSON.stringify(DEFAULT_COMPARISON),
          priceBasic: 'Rp 50.000',
          priceReguler: 'Rp 125.000',
          priceTerusan: 'Rp 165.000',
        }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token);
    if (!decoded || (decoded as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { comparisonData, priceBasic, priceReguler, priceTerusan, operationalStatus, weatherInfo, statusMessage } = body;

    const updated = await prisma.exploreSettings.upsert({
      where: { id: 'singleton' },
      update: {
        comparisonData: comparisonData ? (typeof comparisonData === 'string' ? comparisonData : JSON.stringify(comparisonData)) : undefined,
        priceBasic,
        priceReguler,
        priceTerusan,
        operationalStatus,
        weatherInfo,
        statusMessage,
      },
      create: {
        id: 'singleton',
        comparisonData: comparisonData ? (typeof comparisonData === 'string' ? comparisonData : JSON.stringify(comparisonData)) : JSON.stringify([]),
        priceBasic: priceBasic || 'Rp 0',
        priceReguler: priceReguler || 'Rp 0',
        priceTerusan: priceTerusan || 'Rp 0',
        operationalStatus: operationalStatus || 'NORMAL',
        weatherInfo: weatherInfo || 'Cerah',
        statusMessage: statusMessage || 'Seluruh Wahana Beroperasi Normal',
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
